import { useState, useEffect, useRef, useCallback } from 'react';
import type { GremienTermine, Unternehmen, Personen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId, createRecordUrl, cleanFieldsForApi, getUserProfile } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Combobox } from '@/components/Combobox';
import { Checkbox } from '@/components/ui/checkbox';
import { IconCamera, IconChevronDown, IconCircleCheck, IconClipboard, IconFileText, IconLoader2, IconPhotoPlus, IconSparkles, IconUpload, IconX } from '@tabler/icons-react';
import { fileToDataUri, extractFromInput, extractPhotoMeta, reverseGeocode } from '@/lib/ai';
import { lookupKey } from '@/lib/formatters';

interface GremienTermineDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (fields: GremienTermine['fields']) => Promise<void>;
  defaultValues?: GremienTermine['fields'];
  unternehmenList: Unternehmen[];
  personenList: Personen[];
  enablePhotoScan?: boolean;
  enablePhotoLocation?: boolean;
}

export function GremienTermineDialog({ open, onClose, onSubmit, defaultValues, unternehmenList, personenList, enablePhotoScan = true, enablePhotoLocation = true }: GremienTermineDialogProps) {
  const [fields, setFields] = useState<Partial<GremienTermine['fields']>>({});
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [usePersonalInfo, setUsePersonalInfo] = useState(() => {
    try { return localStorage.getItem('ai-use-personal-info') === 'true'; } catch { return false; }
  });
  const [showProfileInfo, setShowProfileInfo] = useState(false);
  const [profileData, setProfileData] = useState<Record<string, unknown> | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [aiText, setAiText] = useState('');

  useEffect(() => {
    if (open) {
      setFields(defaultValues ?? {});
      setPreview(null);
      setScanSuccess(false);
      setAiText('');
    }
  }, [open, defaultValues]);
  useEffect(() => {
    try { localStorage.setItem('ai-use-personal-info', String(usePersonalInfo)); } catch {}
  }, [usePersonalInfo]);
  async function handleShowProfileInfo() {
    if (showProfileInfo) { setShowProfileInfo(false); return; }
    setProfileLoading(true);
    try {
      const p = await getUserProfile();
      setProfileData(p);
    } catch {
      setProfileData(null);
    } finally {
      setProfileLoading(false);
      setShowProfileInfo(true);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const clean = cleanFieldsForApi({ ...fields }, 'gremien_&_termine');
      await onSubmit(clean as GremienTermine['fields']);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleAiExtract(file?: File) {
    if (!file && !aiText.trim()) return;
    setScanning(true);
    setScanSuccess(false);
    try {
      let uri: string | undefined;
      let gps: { latitude: number; longitude: number } | null = null;
      let geoAddr = '';
      const parts: string[] = [];
      if (file) {
        const [dataUri, meta] = await Promise.all([fileToDataUri(file), extractPhotoMeta(file)]);
        uri = dataUri;
        if (file.type.startsWith('image/')) setPreview(uri);
        gps = enablePhotoLocation ? meta?.gps ?? null : null;
        if (gps) {
          geoAddr = await reverseGeocode(gps.latitude, gps.longitude);
          parts.push(`Location coordinates: ${gps.latitude}, ${gps.longitude}`);
          if (geoAddr) parts.push(`Reverse-geocoded address: ${geoAddr}`);
        }
        if (meta?.dateTime) {
          parts.push(`Date taken: ${meta.dateTime.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3')}`);
        }
      }
      const contextParts: string[] = [];
      if (parts.length) {
        contextParts.push(`<photo-metadata>\nThe following metadata was extracted from the photo\'s EXIF data:\n${parts.join('\n')}\n</photo-metadata>`);
      }
      contextParts.push(`<available-records field="unternehmen" entity="Unternehmen">\n${JSON.stringify(unternehmenList.map(r => ({ record_id: r.record_id, ...r.fields })), null, 2)}\n</available-records>`);
      contextParts.push(`<available-records field="teilnehmer" entity="Personen">\n${JSON.stringify(personenList.map(r => ({ record_id: r.record_id, ...r.fields })), null, 2)}\n</available-records>`);
      if (usePersonalInfo) {
        try {
          const profile = await getUserProfile();
          contextParts.push(`<user-profile>\nThe following is the logged-in user\'s personal information. Use this to pre-fill relevant fields like name, email, address, company etc. when appropriate:\n${JSON.stringify(profile, null, 2)}\n</user-profile>`);
        } catch (err) {
          console.warn('Failed to fetch user profile:', err);
        }
      }
      const photoContext = contextParts.length ? contextParts.join('\n') : undefined;
      const schema = `{\n  "unternehmen": string | null, // Display name from Unternehmen (see <available-records>)\n  "teilnehmer": string | null, // Display name from Personen (see <available-records>)\n  "titel": string | null, // Titel\n  "terminart": LookupValue | null, // Terminart (select one key: "aufsichtsrat" | "beirat" | "gesellschafterversammlung" | "hauptversammlung" | "investorengespraech" | "strategiemeeting" | "sonstiges") mapping: aufsichtsrat=Aufsichtsratssitzung, beirat=Beiratssitzung, gesellschafterversammlung=Gesellschafterversammlung, hauptversammlung=Hauptversammlung, investorengespraech=Investorengespräch, strategiemeeting=Strategiemeeting, sonstiges=Sonstiges\n  "datum_uhrzeit": string | null, // YYYY-MM-DDTHH:MM\n  "ort": string | null, // Ort / Videokonferenz-Link\n  "wiederkehrend": boolean | null, // Wiederkehrender Termin\n  "wiederholungsintervall": LookupValue | null, // Wiederholungsintervall (select one key: "monatlich" | "quartalsweise" | "halbjaehrlich" | "jaehrlich") mapping: monatlich=Monatlich, quartalsweise=Quartalsweise, halbjaehrlich=Halbjährlich, jaehrlich=Jährlich\n  "agenda": string | null, // Agenda / Beschreibung\n  "notizen_termin": string | null, // Notizen\n}`;
      const raw = await extractFromInput<Record<string, unknown>>(schema, {
        dataUri: uri,
        userText: aiText.trim() || undefined,
        photoContext,
        intent: DIALOG_INTENT,
      });
      setFields(prev => {
        const merged = { ...prev } as Record<string, unknown>;
        function matchName(name: string, candidates: string[]): boolean {
          const n = name.toLowerCase().trim();
          return candidates.some(c => c.toLowerCase().includes(n) || n.includes(c.toLowerCase()));
        }
        const applookupKeys = new Set<string>(["unternehmen", "teilnehmer"]);
        for (const [k, v] of Object.entries(raw)) {
          if (applookupKeys.has(k)) continue;
          if (v != null) merged[k] = v;
        }
        const unternehmenName = raw['unternehmen'] as string | null;
        if (unternehmenName) {
          const unternehmenMatch = unternehmenList.find(r => matchName(unternehmenName!, [String(r.fields.unternehmensname ?? '')]));
          if (unternehmenMatch) merged['unternehmen'] = createRecordUrl(APP_IDS.UNTERNEHMEN, unternehmenMatch.record_id);
        }
        const teilnehmerName = raw['teilnehmer'] as string | null;
        if (teilnehmerName) {
          const teilnehmerMatch = personenList.find(r => matchName(teilnehmerName!, [[r.fields.vorname ?? '', r.fields.nachname ?? ''].filter(Boolean).join(' ')]));
          if (teilnehmerMatch) merged['teilnehmer'] = createRecordUrl(APP_IDS.PERSONEN, teilnehmerMatch.record_id);
        }
        return merged as Partial<GremienTermine['fields']>;
      });
      setAiText('');
      setScanSuccess(true);
      setTimeout(() => setScanSuccess(false), 3000);
    } catch (err) {
      console.error('Scan fehlgeschlagen:', err);
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setScanning(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleAiExtract(f);
    e.target.value = '';
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
      handleAiExtract(file);
    }
  }, []);

  const DIALOG_INTENT = defaultValues ? 'Gremien & Termine bearbeiten' : 'Gremien & Termine hinzufügen';

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[92vh] flex flex-col overflow-hidden p-0 gap-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b">
          <DialogTitle>{DIALOG_INTENT}</DialogTitle>
        </DialogHeader>
        {enablePhotoScan && (
          <details className="group border-b bg-muted/20">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-6 py-3 text-sm font-medium hover:bg-muted/40 transition-colors [&::-webkit-details-marker]:hidden">
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <IconSparkles className="h-3.5 w-3.5 text-primary" />
              </span>
              <span className="flex-1">Mit Foto/Text füllen</span>
              <span className="text-xs text-muted-foreground">Versteht Fotos, Dokumente und Text und füllt alles für dich aus</span>
              <IconChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="px-6 pb-4 pt-1 space-y-3">
            <div className="flex items-start gap-2 pl-0.5">
              <Checkbox
                id="ai-use-personal-info"
                checked={usePersonalInfo}
                onCheckedChange={(v) => setUsePersonalInfo(!!v)}
                className="mt-0.5"
              />
              <span className="text-xs text-muted-foreground leading-snug">
                <Label htmlFor="ai-use-personal-info" className="text-xs font-normal text-muted-foreground cursor-pointer inline">
                  KI-Assistent darf zusätzlich Informationen zu meiner Person verwenden
                </Label>
                {' '}
                <button type="button" onClick={handleShowProfileInfo} className="text-xs text-primary hover:underline whitespace-nowrap">
                  {profileLoading ? 'Lade...' : '(mehr Infos)'}
                </button>
              </span>
            </div>
            {showProfileInfo && (
              <div className="rounded-md border bg-muted/50 p-2 text-xs max-h-40 overflow-y-auto">
                <p className="font-medium mb-1">Folgende Infos über dich können von der KI genutzt werden:</p>
                {profileData ? Object.values(profileData).map((v, i) => (
                  <span key={i}>{i > 0 && ", "}{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                )) : (
                  <span className="text-muted-foreground">Profil konnte nicht geladen werden</span>
                )}
              </div>
            )}

            <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileSelect} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !scanning && fileInputRef.current?.click()}
              className={`
                relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer
                ${scanning
                  ? 'border-primary/40 bg-primary/5'
                  : scanSuccess
                    ? 'border-green-500/40 bg-green-50/50 dark:bg-green-950/20'
                    : dragOver
                      ? 'border-primary bg-primary/10 scale-[1.01]'
                      : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
                }
              `}
            >
              {scanning ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <IconLoader2 className="h-7 w-7 text-primary animate-spin" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">KI analysiert...</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Felder werden automatisch ausgefüllt</p>
                  </div>
                </div>
              ) : scanSuccess ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <IconCircleCheck className="h-7 w-7 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">Felder ausgefüllt!</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Prüfe die Werte und passe sie ggf. an</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-primary/8 flex items-center justify-center">
                    <IconPhotoPlus className="h-7 w-7 text-primary/70" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">Foto oder Dokument hierher ziehen oder auswählen</p>
                  </div>
                </div>
              )}

              {preview && !scanning && (
                <div className="absolute top-2 right-2">
                  <div className="relative group">
                    <img src={preview} alt="" className="h-10 w-10 rounded-md object-cover border shadow-sm" />
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setPreview(null); }}
                      className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-muted-foreground/80 text-white flex items-center justify-center"
                    >
                      <IconX className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button type="button" variant="outline" size="sm" className="h-10 text-xs" disabled={scanning}
                onClick={e => { e.stopPropagation(); cameraInputRef.current?.click(); }}>
                <IconCamera className="h-3.5 w-3.5 mr-1" />Kamera
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-10 text-xs" disabled={scanning}
                onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                <IconUpload className="h-3.5 w-3.5 mr-1" />Foto wählen
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-10 text-xs" disabled={scanning}
                onClick={e => {
                  e.stopPropagation();
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = 'application/pdf,.pdf';
                    fileInputRef.current.click();
                    setTimeout(() => { if (fileInputRef.current) fileInputRef.current.accept = 'image/*,application/pdf'; }, 100);
                  }
                }}>
                <IconFileText className="h-3.5 w-3.5 mr-1" />Dokument
              </Button>
            </div>

            <div className="relative">
              <Textarea
                placeholder="Text eingeben oder einfügen, z.B. Notizen, E-Mails, Beschreibungen..."
                value={aiText}
                onChange={e => {
                  setAiText(e.target.value);
                  const el = e.target;
                  el.style.height = 'auto';
                  el.style.height = Math.min(Math.max(el.scrollHeight, 56), 96) + 'px';
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && aiText.trim() && !scanning) {
                    e.preventDefault();
                    handleAiExtract();
                  }
                }}
                disabled={scanning}
                rows={2}
                className="pr-12 resize-none text-sm overflow-y-auto"
              />
              <button
                type="button"
                className="absolute right-2 top-2 h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                disabled={scanning}
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText();
                    if (text) setAiText(prev => prev ? prev + '\n' + text : text);
                  } catch {}
                }}
                title="Paste"
              >
                <IconClipboard className="h-4 w-4" />
              </button>
            </div>
            {aiText.trim() && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full h-9 text-xs"
                disabled={scanning}
                onClick={() => handleAiExtract()}
              >
                <IconSparkles className="h-3.5 w-3.5 mr-1.5" />Analysieren
              </Button>
            )}
            </div>
          </details>
        )}

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="unternehmen">Unternehmen</Label>
            <Combobox
              id="unternehmen"
              items={unternehmenList.map(r => ({
                id: r.record_id,
                label: String(r.fields.unternehmensname ?? r.record_id),
              }))}
              value={extractRecordId(fields.unternehmen)}
              onChange={id => setFields(f => ({ ...f, unternehmen: id ? createRecordUrl(APP_IDS.UNTERNEHMEN, id) : undefined }))}
              placeholder="Auswählen..."
              searchPlaceholder="Suchen…"
              emptyText="Kein Treffer"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="teilnehmer">Teilnehmer</Label>
            <Combobox
              id="teilnehmer"
              items={personenList.map(r => ({
                id: r.record_id,
                label: String(r.fields.vorname ?? r.record_id),
              }))}
              value={extractRecordId(fields.teilnehmer)}
              onChange={id => setFields(f => ({ ...f, teilnehmer: id ? createRecordUrl(APP_IDS.PERSONEN, id) : undefined }))}
              placeholder="Auswählen..."
              searchPlaceholder="Suchen…"
              emptyText="Kein Treffer"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="titel">Titel</Label>
            <Input
              id="titel"
              value={fields.titel ?? ''}
              onChange={e => setFields(f => ({ ...f, titel: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="terminart">Terminart</Label>
            <Select
              value={lookupKey(fields.terminart) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, terminart: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="terminart"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="aufsichtsrat">Aufsichtsratssitzung</SelectItem>
                <SelectItem value="beirat">Beiratssitzung</SelectItem>
                <SelectItem value="gesellschafterversammlung">Gesellschafterversammlung</SelectItem>
                <SelectItem value="hauptversammlung">Hauptversammlung</SelectItem>
                <SelectItem value="investorengespraech">Investorengespräch</SelectItem>
                <SelectItem value="strategiemeeting">Strategiemeeting</SelectItem>
                <SelectItem value="sonstiges">Sonstiges</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="datum_uhrzeit">Datum & Uhrzeit</Label>
            <Input
              id="datum_uhrzeit"
              type="datetime-local"
              step="60"
              value={fields.datum_uhrzeit ?? ''}
              onChange={e => setFields(f => ({ ...f, datum_uhrzeit: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ort">Ort / Videokonferenz-Link</Label>
            <Input
              id="ort"
              value={fields.ort ?? ''}
              onChange={e => setFields(f => ({ ...f, ort: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wiederkehrend">Wiederkehrender Termin</Label>
            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="wiederkehrend"
                checked={!!fields.wiederkehrend}
                onCheckedChange={(v) => setFields(f => ({ ...f, wiederkehrend: !!v }))}
              />
              <Label htmlFor="wiederkehrend" className="font-normal">Wiederkehrender Termin</Label>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wiederholungsintervall">Wiederholungsintervall</Label>
            <div role="radiogroup" className="flex flex-wrap gap-1.5">
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.wiederholungsintervall) === 'monatlich'}
                onClick={() => setFields(f => ({ ...f, wiederholungsintervall: (lookupKey(f.wiederholungsintervall) === 'monatlich' ? undefined : 'monatlich') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.wiederholungsintervall) === 'monatlich'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Monatlich
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.wiederholungsintervall) === 'quartalsweise'}
                onClick={() => setFields(f => ({ ...f, wiederholungsintervall: (lookupKey(f.wiederholungsintervall) === 'quartalsweise' ? undefined : 'quartalsweise') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.wiederholungsintervall) === 'quartalsweise'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Quartalsweise
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.wiederholungsintervall) === 'halbjaehrlich'}
                onClick={() => setFields(f => ({ ...f, wiederholungsintervall: (lookupKey(f.wiederholungsintervall) === 'halbjaehrlich' ? undefined : 'halbjaehrlich') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.wiederholungsintervall) === 'halbjaehrlich'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Halbjährlich
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.wiederholungsintervall) === 'jaehrlich'}
                onClick={() => setFields(f => ({ ...f, wiederholungsintervall: (lookupKey(f.wiederholungsintervall) === 'jaehrlich' ? undefined : 'jaehrlich') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.wiederholungsintervall) === 'jaehrlich'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                Jährlich
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="agenda">Agenda / Beschreibung</Label>
            <Textarea
              id="agenda"
              value={fields.agenda ?? ''}
              onChange={e => setFields(f => ({ ...f, agenda: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notizen_termin">Notizen</Label>
            <Textarea
              id="notizen_termin"
              value={fields.notizen_termin ?? ''}
              onChange={e => setFields(f => ({ ...f, notizen_termin: e.target.value }))}
              rows={3}
            />
          </div>
          </div>
          <DialogFooter className="sticky bottom-0 border-t bg-background/95 backdrop-blur px-6 py-3 gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Abbrechen</Button>
            <Button
              type="submit"
              disabled={saving}
            >
              {saving ? 'Speichern...' : defaultValues ? 'Speichern' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
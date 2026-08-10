import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { IntentWizardShell } from '@/components/IntentWizardShell';
import { EntitySelectStep } from '@/components/EntitySelectStep';
import { StatusBadge } from '@/components/StatusBadge';
import { GremienTermineDialog } from '@/components/dialogs/GremienTermineDialog';
import { PersonenDialog } from '@/components/dialogs/PersonenDialog';
import { DokumenteDialog } from '@/components/dialogs/DokumenteDialog';
import { NotizenDialog } from '@/components/dialogs/NotizenDialog';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichGremienTermine, enrichPersonen, enrichDokumente, enrichNotizen } from '@/lib/enrich';
import type { EnrichedGremienTermine, EnrichedPersonen, EnrichedDokumente, EnrichedNotizen } from '@/types/enriched';
import { APP_IDS } from '@/types/app';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { Button } from '@/components/ui/button';
import {
  IconCalendar,
  IconUsers,
  IconFile,
  IconNotes,
  IconCheck,
  IconAlertCircle,
  IconPlus,
  IconMapPin,
  IconExternalLink,
  IconChevronRight,
  IconArrowRight,
  IconRefresh,
  IconFileText,
  IconPresentation,
  IconClipboard,
  IconBuildingBank,
  IconFileCheck,
} from '@tabler/icons-react';

function formatDateTime(val: string | undefined): string {
  if (!val) return '–';
  try {
    return format(new Date(val), 'dd.MM.yyyy HH:mm', { locale: de });
  } catch {
    return val;
  }
}

function formatDate(val: string | undefined): string {
  if (!val) return '–';
  try {
    return format(new Date(val), 'dd.MM.yyyy', { locale: de });
  } catch {
    return val;
  }
}

function DokumentTypIcon({ typeKey }: { typeKey: string | undefined }) {
  switch (typeKey) {
    case 'protokoll': return <IconClipboard size={16} className="text-muted-foreground" />;
    case 'jahresabschluss': return <IconBuildingBank size={16} className="text-muted-foreground" />;
    case 'praesentation': return <IconPresentation size={16} className="text-muted-foreground" />;
    case 'beschluss': return <IconFileCheck size={16} className="text-muted-foreground" />;
    default: return <IconFileText size={16} className="text-muted-foreground" />;
  }
}

export default function TerminVorbereitenPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { personen, unternehmen, beteiligungen, gremienTermine, dokumente, notizen, loading, error, fetchAll, personenMap, unternehmenMap, beteiligungenMap, gremienTermineMap, dokumenteMap } = useDashboardData();

  // Step state — initialized from URL param
  const initialStep = (() => {
    const urlStep = parseInt(searchParams.get('step') ?? '', 10);
    if (urlStep >= 1 && urlStep <= 5) return urlStep;
    return 1;
  })();
  const [currentStep, setCurrentStep] = useState(initialStep);

  const [selectedTerminId, setSelectedTerminId] = useState<string | null>(
    searchParams.get('terminId') ?? null
  );

  // Dialog open states
  const [terminDialogOpen, setTerminDialogOpen] = useState(false);
  const [personenDialogOpen, setPersonenDialogOpen] = useState(false);
  const [dokumentDialogOpen, setDokumentDialogOpen] = useState(false);
  const [notizDialogOpen, setNotizDialogOpen] = useState(false);

  // Deep-link: if terminId is in URL, jump to step 2
  useEffect(() => {
    const terminId = searchParams.get('terminId');
    if (terminId && currentStep === 1) {
      setSelectedTerminId(terminId);
      setCurrentStep(2);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep URL in sync with step and selection
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (currentStep > 1) {
      params.set('step', String(currentStep));
    } else {
      params.delete('step');
    }
    if (selectedTerminId) {
      params.set('terminId', selectedTerminId);
    } else {
      params.delete('terminId');
    }
    setSearchParams(params, { replace: true });
  }, [currentStep, selectedTerminId, searchParams, setSearchParams]);

  // Enriched data
  const enrichedTermine = useMemo<EnrichedGremienTermine[]>(() => {
    return enrichGremienTermine(gremienTermine, { unternehmenMap, personenMap });
  }, [gremienTermine, unternehmenMap, personenMap]);

  const enrichedPersonen = useMemo<EnrichedPersonen[]>(() => {
    return enrichPersonen(personen, { unternehmenMap });
  }, [personen, unternehmenMap]);

  const enrichedDokumente = useMemo<EnrichedDokumente[]>(() => {
    return enrichDokumente(dokumente, { unternehmenMap, gremienTermineMap, personenMap });
  }, [dokumente, unternehmenMap, gremienTermineMap, personenMap]);

  const enrichedNotizen = useMemo<EnrichedNotizen[]>(() => {
    return enrichNotizen(notizen, { unternehmenMap, beteiligungenMap, gremienTermineMap, dokumenteMap, personenMap });
  }, [notizen, unternehmenMap, beteiligungenMap, gremienTermineMap, dokumenteMap, personenMap]);

  // Sort termine ascending by datum_uhrzeit
  const sortedTermine = useMemo(() => {
    return [...enrichedTermine].sort((a, b) => {
      const da = a.fields.datum_uhrzeit ?? '';
      const db = b.fields.datum_uhrzeit ?? '';
      return da.localeCompare(db);
    });
  }, [enrichedTermine]);

  // Selected termin
  const selectedTermin = useMemo<EnrichedGremienTermine | null>(() => {
    if (!selectedTerminId) return null;
    return enrichedTermine.find(t => t.record_id === selectedTerminId) ?? null;
  }, [selectedTerminId, enrichedTermine]);

  // Participants: parse multipleapplookup URLs stored in teilnehmer field
  const terminTeilnehmerIds = useMemo<string[]>(() => {
    if (!selectedTermin?.fields.teilnehmer) return [];
    // multipleapplookup: may be stored as a single URL or multiple (comma-separated) or array-like string
    const raw = selectedTermin.fields.teilnehmer;
    if (typeof raw === 'string') {
      // try splitting by common delimiters
      const parts = raw.split(/[\s,]+/).filter(Boolean);
      return parts.map(p => extractRecordId(p)).filter((id): id is string => id !== null);
    }
    return [];
  }, [selectedTermin]);

  const terminTeilnehmer = useMemo<EnrichedPersonen[]>(() => {
    return terminTeilnehmerIds
      .map(id => enrichedPersonen.find(p => p.record_id === id))
      .filter((p): p is EnrichedPersonen => p !== undefined);
  }, [terminTeilnehmerIds, enrichedPersonen]);

  // Documents linked to selected termin
  const linkedDokumente = useMemo<EnrichedDokumente[]>(() => {
    if (!selectedTerminId) return [];
    return enrichedDokumente.filter(d => {
      const id = extractRecordId(d.fields.termin as string);
      return id === selectedTerminId;
    });
  }, [enrichedDokumente, selectedTerminId]);

  // Notes linked to selected termin
  const linkedNotizen = useMemo<EnrichedNotizen[]>(() => {
    if (!selectedTerminId) return [];
    return enrichedNotizen.filter(n => {
      const id = extractRecordId(n.fields.termin as string);
      return id === selectedTerminId;
    });
  }, [enrichedNotizen, selectedTerminId]);

  function handleSelectTermin(id: string) {
    setSelectedTerminId(id);
    setCurrentStep(2);
  }

  function handleStepChange(step: number) {
    setCurrentStep(step);
  }

  function handleRestart() {
    setSelectedTerminId(null);
    setCurrentStep(1);
  }

  const steps = [
    { label: 'Termin' },
    { label: 'Teilnehmer' },
    { label: 'Dokumente' },
    { label: 'Notizen' },
    { label: 'Übersicht' },
  ];

  // ---- STEP 1: Termin auswählen ----
  function renderStep1() {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Termin auswählen</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Wähle den Termin, den du vorbereiten möchtest, oder lege einen neuen an.
          </p>
        </div>
        <EntitySelectStep
          items={sortedTermine.map(t => ({
            id: t.record_id,
            title: t.fields.titel ?? '(Ohne Titel)',
            subtitle: t.fields.terminart?.label,
            icon: <IconCalendar size={18} className="text-primary" />,
            stats: [
              { label: 'Datum', value: formatDateTime(t.fields.datum_uhrzeit) },
              { label: 'Ort', value: t.fields.ort || '–' },
            ],
          }))}
          onSelect={handleSelectTermin}
          searchPlaceholder="Termin suchen..."
          emptyText="Keine Termine gefunden. Lege einen neuen Termin an."
          emptyIcon={<IconCalendar size={32} />}
          createLabel="Neuen Termin anlegen"
          onCreateNew={() => setTerminDialogOpen(true)}
          createDialog={
            <GremienTermineDialog
              open={terminDialogOpen}
              onClose={() => setTerminDialogOpen(false)}
              onSubmit={async (fields) => {
                await LivingAppsService.createGremienTermineEntry(fields);
                await fetchAll();
                setTerminDialogOpen(false);
              }}
              unternehmenList={unternehmen}
              personenList={personen}
              enablePhotoScan={AI_PHOTO_SCAN['GremienTermine']}
              enablePhotoLocation={AI_PHOTO_LOCATION['GremienTermine']}
            />
          }
        />
      </div>
    );
  }

  // ---- STEP 2: Teilnehmer bestätigen ----
  function renderStep2() {
    return (
      <div className="space-y-4">
        {/* Context card */}
        {selectedTermin && (
          <div className="rounded-xl border bg-muted/30 p-4 flex flex-col sm:flex-row sm:items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <IconCalendar size={18} className="text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm truncate">{selectedTermin.fields.titel ?? '(Ohne Titel)'}</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {formatDateTime(selectedTermin.fields.datum_uhrzeit)}
                {selectedTermin.fields.ort ? ` · ${selectedTermin.fields.ort}` : ''}
              </p>
            </div>
            {selectedTermin.fields.terminart && (
              <StatusBadge statusKey={selectedTermin.fields.terminart.key} label={selectedTermin.fields.terminart.label} />
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Teilnehmer bestätigen</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {terminTeilnehmer.length} Teilnehmer geplant
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setPersonenDialogOpen(true)} className="gap-1.5 shrink-0">
            <IconPlus size={15} />
            Person hinzufügen
          </Button>
        </div>

        <PersonenDialog
          open={personenDialogOpen}
          onClose={() => setPersonenDialogOpen(false)}
          onSubmit={async (fields) => {
            await LivingAppsService.createPersonenEntry(fields);
            await fetchAll();
            setPersonenDialogOpen(false);
          }}
          unternehmenList={unternehmen}
          enablePhotoScan={AI_PHOTO_SCAN['Personen']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Personen']}
        />

        {terminTeilnehmer.length === 0 ? (
          <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
            <div className="flex justify-center mb-3 opacity-40">
              <IconUsers size={32} />
            </div>
            <p className="text-sm">Diesem Termin sind noch keine Teilnehmer zugewiesen.</p>
            <p className="text-xs mt-1">Bearbeite den Termin, um Teilnehmer hinzuzufügen, oder lege neue Personen an.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {terminTeilnehmer.map(person => (
              <div
                key={person.record_id}
                className="flex items-center gap-3 p-4 rounded-xl border bg-card overflow-hidden"
              >
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-sm font-bold text-primary">
                  {(person.fields.vorname?.[0] ?? '') + (person.fields.nachname?.[0] ?? '')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {[person.fields.vorname, person.fields.nachname].filter(Boolean).join(' ') || '(Unbekannt)'}
                  </p>
                  {person.fields.email && (
                    <p className="text-xs text-muted-foreground truncate">{person.fields.email}</p>
                  )}
                </div>
                {person.fields.rolle && (
                  <StatusBadge statusKey={person.fields.rolle.key} label={person.fields.rolle.label} />
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-between pt-2">
          <Button variant="ghost" size="sm" onClick={() => setCurrentStep(1)}>
            Zurück
          </Button>
          <Button onClick={() => setCurrentStep(3)} className="gap-1.5">
            Weiter zu Dokumente
            <IconArrowRight size={16} />
          </Button>
        </div>
      </div>
    );
  }

  // ---- STEP 3: Dokumente verknüpfen ----
  function renderStep3() {
    return (
      <div className="space-y-4">
        {/* Context card */}
        {selectedTermin && (
          <div className="rounded-xl border bg-muted/30 p-4 flex flex-col sm:flex-row sm:items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <IconCalendar size={18} className="text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm truncate">{selectedTermin.fields.titel ?? '(Ohne Titel)'}</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {formatDateTime(selectedTermin.fields.datum_uhrzeit)}
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Dokumente verknüpfen</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {linkedDokumente.length} Dokument{linkedDokumente.length !== 1 ? 'e' : ''} verknüpft
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setDokumentDialogOpen(true)} className="gap-1.5 shrink-0">
            <IconPlus size={15} />
            Neues Dokument
          </Button>
        </div>

        <DokumenteDialog
          open={dokumentDialogOpen}
          onClose={() => setDokumentDialogOpen(false)}
          onSubmit={async (fields) => {
            await LivingAppsService.createDokumenteEntry(fields);
            await fetchAll();
            setDokumentDialogOpen(false);
          }}
          defaultValues={selectedTerminId ? {
            termin: createRecordUrl(APP_IDS.GREMIEN_TERMINE, selectedTerminId),
          } : undefined}
          unternehmenList={unternehmen}
          gremienTermineList={gremienTermine}
          personenList={personen}
          enablePhotoScan={AI_PHOTO_SCAN['Dokumente']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Dokumente']}
        />

        {linkedDokumente.length === 0 ? (
          <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
            <div className="flex justify-center mb-3 opacity-40">
              <IconFile size={32} />
            </div>
            <p className="text-sm">Noch keine Dokumente mit diesem Termin verknüpft.</p>
            <Button variant="outline" size="sm" onClick={() => setDokumentDialogOpen(true)} className="mt-3 gap-1.5">
              <IconPlus size={14} />
              Neues Dokument erstellen
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {linkedDokumente.map(dok => (
              <div
                key={dok.record_id}
                className="flex items-center gap-3 p-4 rounded-xl border bg-card overflow-hidden"
              >
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <DokumentTypIcon typeKey={dok.fields.dokumenttyp?.key} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{dok.fields.titel ?? '(Ohne Titel)'}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {dok.fields.datum_dokument ? formatDate(dok.fields.datum_dokument) : '–'}
                  </p>
                </div>
                {dok.fields.dokumenttyp && (
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full shrink-0">
                    {dok.fields.dokumenttyp.label}
                  </span>
                )}
                {dok.fields.externer_link && (
                  <a
                    href={dok.fields.externer_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary transition-colors shrink-0"
                    onClick={e => e.stopPropagation()}
                  >
                    <IconExternalLink size={15} />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-between pt-2">
          <Button variant="ghost" size="sm" onClick={() => setCurrentStep(2)}>
            Zurück
          </Button>
          <Button onClick={() => setCurrentStep(4)} className="gap-1.5">
            Weiter zu Notizen
            <IconArrowRight size={16} />
          </Button>
        </div>
      </div>
    );
  }

  // ---- STEP 4: Notizen & Agenda ----
  function renderStep4() {
    return (
      <div className="space-y-4">
        {/* Context card */}
        {selectedTermin && (
          <div className="rounded-xl border bg-muted/30 p-4 flex flex-col sm:flex-row sm:items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <IconCalendar size={18} className="text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm truncate">{selectedTermin.fields.titel ?? '(Ohne Titel)'}</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {formatDateTime(selectedTermin.fields.datum_uhrzeit)}
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Notizen &amp; Agenda</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {linkedNotizen.length} Notiz{linkedNotizen.length !== 1 ? 'en' : ''} erstellt
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setNotizDialogOpen(true)} className="gap-1.5 shrink-0">
            <IconPlus size={15} />
            Neue Notiz
          </Button>
        </div>

        <NotizenDialog
          open={notizDialogOpen}
          onClose={() => setNotizDialogOpen(false)}
          onSubmit={async (fields) => {
            await LivingAppsService.createNotizenEntry(fields);
            await fetchAll();
            setNotizDialogOpen(false);
          }}
          defaultValues={selectedTerminId ? {
            termin: createRecordUrl(APP_IDS.GREMIEN_TERMINE, selectedTerminId),
          } : undefined}
          unternehmenList={unternehmen}
          beteiligungenList={beteiligungen}
          gremienTermineList={gremienTermine}
          dokumenteList={dokumente}
          personenList={personen}
          enablePhotoScan={AI_PHOTO_SCAN['Notizen']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Notizen']}
        />

        {linkedNotizen.length === 0 ? (
          <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
            <div className="flex justify-center mb-3 opacity-40">
              <IconNotes size={32} />
            </div>
            <p className="text-sm">Noch keine Notizen für diesen Termin.</p>
            <Button variant="outline" size="sm" onClick={() => setNotizDialogOpen(true)} className="mt-3 gap-1.5">
              <IconPlus size={14} />
              Erste Notiz erstellen
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {linkedNotizen.map(notiz => (
              <div
                key={notiz.record_id}
                className="p-4 rounded-xl border bg-card overflow-hidden"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0 mt-0.5">
                    <IconNotes size={16} className="text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium truncate">{notiz.fields.titel ?? '(Ohne Titel)'}</p>
                      {notiz.fields.kategorie && (
                        <StatusBadge statusKey={notiz.fields.kategorie.key} label={notiz.fields.kategorie.label} />
                      )}
                    </div>
                    {notiz.fields.inhalt && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{notiz.fields.inhalt}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-between pt-2">
          <Button variant="ghost" size="sm" onClick={() => setCurrentStep(3)}>
            Zurück
          </Button>
          <Button onClick={() => setCurrentStep(5)} className="gap-1.5">
            Zur Übersicht
            <IconArrowRight size={16} />
          </Button>
        </div>
      </div>
    );
  }

  // ---- STEP 5: Übersicht ----
  function renderStep5() {
    const hasTeilnehmer = terminTeilnehmer.length > 0;
    const hasDokumente = linkedDokumente.length > 0;
    const hasNotizen = linkedNotizen.length > 0;

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Vorbereitung abgeschlossen</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Hier ist eine Zusammenfassung der Terminvorbereitung.
          </p>
        </div>

        {/* Summary card */}
        {selectedTermin && (
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="p-5 border-b bg-muted/20">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <IconCalendar size={18} className="text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-base truncate">{selectedTermin.fields.titel ?? '(Ohne Titel)'}</h3>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <IconCalendar size={12} />
                      {formatDateTime(selectedTermin.fields.datum_uhrzeit)}
                    </span>
                    {selectedTermin.fields.ort && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <IconMapPin size={12} />
                        {selectedTermin.fields.ort}
                      </span>
                    )}
                  </div>
                </div>
                {selectedTermin.fields.terminart && (
                  <StatusBadge statusKey={selectedTermin.fields.terminart.key} label={selectedTermin.fields.terminart.label} />
                )}
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 divide-x">
              <div className="p-4 text-center">
                <div className="flex justify-center mb-1">
                  <IconUsers size={18} className="text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold">{terminTeilnehmer.length}</p>
                <p className="text-xs text-muted-foreground">Teilnehmer</p>
              </div>
              <div className="p-4 text-center">
                <div className="flex justify-center mb-1">
                  <IconFile size={18} className="text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold">{linkedDokumente.length}</p>
                <p className="text-xs text-muted-foreground">Dokumente</p>
              </div>
              <div className="p-4 text-center">
                <div className="flex justify-center mb-1">
                  <IconNotes size={18} className="text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold">{linkedNotizen.length}</p>
                <p className="text-xs text-muted-foreground">Notizen</p>
              </div>
            </div>
          </div>
        )}

        {/* Checklist */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-sm">Checkliste</h3>
          </div>
          <div className="divide-y">
            {/* Teilnehmer */}
            <div className="flex items-center gap-3 p-4">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${hasTeilnehmer ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                {hasTeilnehmer
                  ? <IconCheck size={14} stroke={2.5} />
                  : <IconAlertCircle size={14} stroke={2} />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Teilnehmer</p>
                {hasTeilnehmer ? (
                  <p className="text-xs text-muted-foreground truncate">
                    {terminTeilnehmer.slice(0, 3).map(p => [p.fields.vorname, p.fields.nachname].filter(Boolean).join(' ')).join(', ')}
                    {terminTeilnehmer.length > 3 ? ` +${terminTeilnehmer.length - 3} weitere` : ''}
                  </p>
                ) : (
                  <p className="text-xs text-amber-600">Keine Teilnehmer zugewiesen</p>
                )}
              </div>
              <button
                onClick={() => setCurrentStep(2)}
                className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-0.5 shrink-0"
              >
                Bearbeiten <IconChevronRight size={12} />
              </button>
            </div>

            {/* Dokumente */}
            <div className="flex items-center gap-3 p-4">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${hasDokumente ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                {hasDokumente
                  ? <IconCheck size={14} stroke={2.5} />
                  : <IconAlertCircle size={14} stroke={2} />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Dokumente</p>
                {hasDokumente ? (
                  <p className="text-xs text-muted-foreground truncate">
                    {linkedDokumente.slice(0, 2).map(d => d.fields.titel ?? '(Ohne Titel)').join(', ')}
                    {linkedDokumente.length > 2 ? ` +${linkedDokumente.length - 2} weitere` : ''}
                  </p>
                ) : (
                  <p className="text-xs text-amber-600">Keine Dokumente verknüpft</p>
                )}
              </div>
              <button
                onClick={() => setCurrentStep(3)}
                className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-0.5 shrink-0"
              >
                Bearbeiten <IconChevronRight size={12} />
              </button>
            </div>

            {/* Notizen */}
            <div className="flex items-center gap-3 p-4">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${hasNotizen ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                {hasNotizen
                  ? <IconCheck size={14} stroke={2.5} />
                  : <IconAlertCircle size={14} stroke={2} />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Notizen</p>
                {hasNotizen ? (
                  <p className="text-xs text-muted-foreground truncate">
                    {linkedNotizen.slice(0, 2).map(n => n.fields.titel ?? '(Ohne Titel)').join(', ')}
                    {linkedNotizen.length > 2 ? ` +${linkedNotizen.length - 2} weitere` : ''}
                  </p>
                ) : (
                  <p className="text-xs text-amber-600">Keine Notizen erstellt</p>
                )}
              </div>
              <button
                onClick={() => setCurrentStep(4)}
                className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-0.5 shrink-0"
              >
                Bearbeiten <IconChevronRight size={12} />
              </button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href={`#/gremien-termine`}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border bg-card text-sm font-medium hover:bg-accent transition-colors"
          >
            <IconExternalLink size={16} />
            Termin öffnen
          </a>
          <Button variant="outline" onClick={handleRestart} className="flex-1 gap-2">
            <IconRefresh size={16} />
            Neuen Termin vorbereiten
          </Button>
        </div>

        <div className="flex justify-start pt-2">
          <Button variant="ghost" size="sm" onClick={() => setCurrentStep(4)}>
            Zurück
          </Button>
        </div>
      </div>
    );
  }

  return (
    <IntentWizardShell
      title="Termin vorbereiten"
      subtitle="Bereite einen Gremiumstermin vor — Teilnehmer bestätigen, Dokumente verknüpfen, Notizen anlegen."
      steps={steps}
      currentStep={currentStep}
      onStepChange={handleStepChange}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && renderStep2()}
      {currentStep === 3 && renderStep3()}
      {currentStep === 4 && renderStep4()}
      {currentStep === 5 && renderStep5()}
    </IntentWizardShell>
  );
}

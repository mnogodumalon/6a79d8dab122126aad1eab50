import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { IntentWizardShell } from '@/components/IntentWizardShell';
import { EntitySelectStep } from '@/components/EntitySelectStep';
import { BudgetTracker } from '@/components/BudgetTracker';
import { StatusBadge } from '@/components/StatusBadge';
import { UnternehmenDialog } from '@/components/dialogs/UnternehmenDialog';
import { PersonenDialog } from '@/components/dialogs/PersonenDialog';
import { BeteiligungenDialog } from '@/components/dialogs/BeteiligungenDialog';
import { GremienTermineDialog } from '@/components/dialogs/GremienTermineDialog';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import type { Unternehmen, Personen, Beteiligungen, GremienTermine } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  IconBuilding,
  IconUsers,
  IconCoin,
  IconCalendar,
  IconCheck,
  IconPlus,
  IconArrowRight,
  IconArrowLeft,
  IconRefresh,
  IconMail,
  IconBriefcase,
} from '@tabler/icons-react';

const WIZARD_STEPS = [
  { label: 'Unternehmen' },
  { label: 'Personen' },
  { label: 'Beteiligung' },
  { label: 'Gremium' },
  { label: 'Abschluss' },
];

function formatEuro(value: number | undefined): string {
  if (value == null) return '—';
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
}

export default function NeueBeteiligungPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Wizard state
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Data
  const [unternehmen, setUnternehmen] = useState<Unternehmen[]>([]);
  const [personen, setPersonen] = useState<Personen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Selections
  const [selectedUnternehmenId, setSelectedUnternehmenId] = useState<string | null>(null);
  const [selectedPersonenIds, setSelectedPersonenIds] = useState<Set<string>>(new Set());
  const [createdBeteiligung, setCreatedBeteiligung] = useState<Beteiligungen | null>(null);
  const [createdTermin, setCreatedTermin] = useState<GremienTermine | null>(null);

  // Dialog open states
  const [unternehmenDialogOpen, setUnternehmenDialogOpen] = useState(false);
  const [personenDialogOpen, setPersonenDialogOpen] = useState(false);
  const [beteiligungenDialogOpen, setBeteiligungenDialogOpen] = useState(false);
  const [gremienTermineDialogOpen, setGremienTermineDialogOpen] = useState(false);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [unternehmenData, personenData] = await Promise.all([
        LivingAppsService.getUnternehmen(),
        LivingAppsService.getPersonen(),
      ]);
      setUnternehmen(unternehmenData);
      setPersonen(personenData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  // Deep-link: ?unternehmenId=xxx pre-selects company and jumps to step 2
  useEffect(() => {
    const urlUnternehmenId = searchParams.get('unternehmenId');
    if (urlUnternehmenId && !selectedUnternehmenId) {
      setSelectedUnternehmenId(urlUnternehmenId);
      setCurrentStep(2);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Derived: selected company object
  const selectedUnternehmen = useMemo(
    () => unternehmen.find(u => u.record_id === selectedUnternehmenId) ?? null,
    [unternehmen, selectedUnternehmenId]
  );

  // Derived: persons linked to selected company
  const linkedPersonen = useMemo(() => {
    if (!selectedUnternehmenId) return personen;
    return personen.filter(p => {
      const urls = p.fields.unternehmen;
      if (!urls) return false;
      // unternehmen is multipleapplookup stored as a single URL or multiple
      if (typeof urls === 'string') {
        return extractRecordId(urls) === selectedUnternehmenId;
      }
      return false;
    });
  }, [personen, selectedUnternehmenId]);

  // Step 1: select company
  function handleUnternehmenSelect(id: string) {
    setSelectedUnternehmenId(id);
    setSelectedPersonenIds(new Set());
    setCurrentStep(2);
  }

  // Step 2: toggle person selection
  function togglePerson(personId: string) {
    setSelectedPersonenIds(prev => {
      const next = new Set(prev);
      if (next.has(personId)) {
        next.delete(personId);
      } else {
        next.add(personId);
      }
      return next;
    });
  }

  // Step 3: after beteiligung created
  function handleBeteiligungenCreated(b: Beteiligungen) {
    setCreatedBeteiligung(b);
    setBeteiligungenDialogOpen(false);
    setCurrentStep(4);
  }

  // Step 4: after gremium created or skipped
  function handleGremiumCreated(t: GremienTermine) {
    setCreatedTermin(t);
    setGremienTermineDialogOpen(false);
    setCurrentStep(5);
  }

  // Restart wizard
  function handleRestart() {
    setSelectedUnternehmenId(null);
    setSelectedPersonenIds(new Set());
    setCreatedBeteiligung(null);
    setCreatedTermin(null);
    setCurrentStep(1);
  }

  // Build defaultValues for BeteiligungenDialog
  const beteiligungenDefaultValues = useMemo((): Beteiligungen['fields'] | undefined => {
    if (!selectedUnternehmenId) return undefined;
    const unternehmenUrl = createRecordUrl(APP_IDS.UNTERNEHMEN, selectedUnternehmenId);
    const personenUrls = Array.from(selectedPersonenIds).map(id =>
      createRecordUrl(APP_IDS.PERSONEN, id)
    );
    return {
      unternehmen: unternehmenUrl,
      beteiligte_personen: personenUrls.length > 0 ? personenUrls.join(',') : undefined,
    };
  }, [selectedUnternehmenId, selectedPersonenIds]);

  // Build defaultValues for GremienTermineDialog
  const gremienTermineDefaultValues = useMemo((): GremienTermine['fields'] | undefined => {
    if (!selectedUnternehmenId) return undefined;
    const unternehmenUrl = createRecordUrl(APP_IDS.UNTERNEHMEN, selectedUnternehmenId);
    return {
      unternehmen: unternehmenUrl,
    };
  }, [selectedUnternehmenId]);

  // Step content rendering
  function renderStep() {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Unternehmen auswählen</h2>
              <p className="text-sm text-muted-foreground">
                Wähle das Unternehmen aus, für das du eine neue Beteiligung erfassen möchtest.
              </p>
            </div>
            <EntitySelectStep
              items={unternehmen.map(u => ({
                id: u.record_id,
                title: u.fields.unternehmensname ?? '(Kein Name)',
                subtitle: u.fields.branche?.label,
                status: u.fields.status
                  ? { key: u.fields.status.key, label: u.fields.status.label }
                  : undefined,
                stats: [
                  ...(u.fields.stadt ? [{ label: 'Stadt', value: u.fields.stadt }] : []),
                  ...(u.fields.rechtsform ? [{ label: 'Rechtsform', value: u.fields.rechtsform.label }] : []),
                ],
                icon: <IconBuilding size={20} className="text-primary" stroke={1.5} />,
              }))}
              onSelect={handleUnternehmenSelect}
              searchPlaceholder="Unternehmen suchen..."
              emptyIcon={<IconBuilding size={32} stroke={1.5} />}
              emptyText="Noch keine Unternehmen vorhanden. Erstelle ein neues Unternehmen."
              createLabel="Neues Unternehmen"
              onCreateNew={() => setUnternehmenDialogOpen(true)}
              createDialog={
                <UnternehmenDialog
                  open={unternehmenDialogOpen}
                  onClose={() => setUnternehmenDialogOpen(false)}
                  onSubmit={async (fields) => {
                    const result = await LivingAppsService.createUnternehmenEntry(fields);
                    await fetchAll();
                    // Auto-select newly created company
                    const entries = Object.entries(result as Record<string, unknown>);
                    if (entries.length > 0) {
                      const newId = entries[0][0];
                      handleUnternehmenSelect(newId);
                    }
                    setUnternehmenDialogOpen(false);
                  }}
                  personenList={personen}
                  enablePhotoScan={AI_PHOTO_SCAN['Unternehmen']}
                  enablePhotoLocation={AI_PHOTO_LOCATION['Unternehmen']}
                />
              }
            />
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            {/* Company summary banner */}
            {selectedUnternehmen && (
              <div className="flex items-center gap-3 p-3 rounded-xl border bg-muted/40 overflow-hidden">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <IconBuilding size={18} className="text-primary" stroke={1.5} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">
                    {selectedUnternehmen.fields.unternehmensname ?? '(Kein Name)'}
                  </p>
                  {selectedUnternehmen.fields.branche && (
                    <p className="text-xs text-muted-foreground truncate">
                      {selectedUnternehmen.fields.branche.label}
                    </p>
                  )}
                </div>
                {selectedUnternehmen.fields.status && (
                  <StatusBadge
                    statusKey={selectedUnternehmen.fields.status.key}
                    label={selectedUnternehmen.fields.status.label}
                  />
                )}
              </div>
            )}

            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Personen verknüpfen</h2>
              <p className="text-sm text-muted-foreground">
                Wähle die beteiligten Personen für diese Investition aus.
              </p>
            </div>

            {/* Live counter */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <IconUsers size={16} className="text-muted-foreground" stroke={1.5} />
                <span className={selectedPersonenIds.size > 0 ? 'text-primary' : 'text-muted-foreground'}>
                  {selectedPersonenIds.size} {selectedPersonenIds.size === 1 ? 'Person' : 'Personen'} ausgewählt
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPersonenDialogOpen(true)}
                className="gap-1.5"
              >
                <IconPlus size={14} stroke={2} />
                Neue Person
              </Button>
            </div>

            <PersonenDialog
              open={personenDialogOpen}
              onClose={() => setPersonenDialogOpen(false)}
              onSubmit={async (fields) => {
                // Pre-link the new person to the selected company
                const enrichedFields = {
                  ...fields,
                  unternehmen: selectedUnternehmenId
                    ? createRecordUrl(APP_IDS.UNTERNEHMEN, selectedUnternehmenId)
                    : fields.unternehmen,
                };
                const result = await LivingAppsService.createPersonenEntry(enrichedFields);
                await fetchAll();
                // Auto-select newly created person
                const entries = Object.entries(result as Record<string, unknown>);
                if (entries.length > 0) {
                  const newId = entries[0][0];
                  setSelectedPersonenIds(prev => new Set([...prev, newId]));
                }
                setPersonenDialogOpen(false);
              }}
              unternehmenList={unternehmen}
              enablePhotoScan={AI_PHOTO_SCAN['Personen']}
              enablePhotoLocation={AI_PHOTO_LOCATION['Personen']}
            />

            {/* Person list */}
            {linkedPersonen.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground border rounded-xl">
                <IconUsers size={28} stroke={1.5} className="mb-2 opacity-40" />
                <p className="text-sm">Noch keine Personen mit diesem Unternehmen verknüpft.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPersonenDialogOpen(true)}
                  className="mt-3 gap-1.5"
                >
                  <IconPlus size={14} stroke={2} />
                  Person hinzufügen
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {linkedPersonen.map(p => {
                  const pid = p.record_id;
                  const isChecked = selectedPersonenIds.has(pid);
                  return (
                    <button
                      key={pid}
                      onClick={() => togglePerson(pid)}
                      className={`w-full text-left flex items-center gap-3 p-4 rounded-xl border transition-colors overflow-hidden ${
                        isChecked
                          ? 'bg-primary/5 border-primary/40'
                          : 'bg-card hover:bg-accent hover:border-primary/20'
                      }`}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => togglePerson(pid)}
                        className="shrink-0"
                        onClick={e => e.stopPropagation()}
                      />
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-sm font-semibold text-primary">
                        {(p.fields.vorname?.[0] ?? '') + (p.fields.nachname?.[0] ?? '')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {[p.fields.vorname, p.fields.nachname].filter(Boolean).join(' ') || '(Kein Name)'}
                        </p>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                          {p.fields.rolle && (
                            <span className="flex items-center gap-1">
                              <IconBriefcase size={11} stroke={1.5} />
                              {p.fields.rolle.label}
                            </span>
                          )}
                          {p.fields.email && (
                            <span className="flex items-center gap-1 truncate">
                              <IconMail size={11} stroke={1.5} />
                              <span className="truncate">{p.fields.email}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between pt-2">
              <Button variant="ghost" onClick={() => setCurrentStep(1)} className="gap-1.5">
                <IconArrowLeft size={16} stroke={2} />
                Zurück
              </Button>
              <Button onClick={() => setCurrentStep(3)} className="gap-1.5">
                Weiter
                <IconArrowRight size={16} stroke={2} />
              </Button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            {/* Company + persons summary */}
            {selectedUnternehmen && (
              <div className="p-4 rounded-xl border bg-muted/40 space-y-3 overflow-hidden">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <IconBuilding size={18} className="text-primary" stroke={1.5} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">
                      {selectedUnternehmen.fields.unternehmensname ?? '(Kein Name)'}
                    </p>
                    {selectedUnternehmen.fields.branche && (
                      <p className="text-xs text-muted-foreground">{selectedUnternehmen.fields.branche.label}</p>
                    )}
                  </div>
                  {selectedUnternehmen.fields.status && (
                    <StatusBadge
                      statusKey={selectedUnternehmen.fields.status.key}
                      label={selectedUnternehmen.fields.status.label}
                    />
                  )}
                </div>
                {selectedPersonenIds.size > 0 && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <IconUsers size={13} stroke={1.5} />
                    <span>{selectedPersonenIds.size} beteiligte {selectedPersonenIds.size === 1 ? 'Person' : 'Personen'}</span>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Beteiligung erfassen</h2>
              <p className="text-sm text-muted-foreground">
                Erfasse jetzt die Details zur neuen Beteiligung. Alle relevanten Daten werden vorausgefüllt.
              </p>
            </div>

            {createdBeteiligung ? (
              <div className="space-y-4">
                {/* Success state */}
                <div className="flex items-center gap-3 p-4 rounded-xl border border-green-200 bg-green-50">
                  <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <IconCheck size={18} className="text-green-700" stroke={2.5} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-green-800">Beteiligung erfolgreich erfasst</p>
                    {createdBeteiligung.fields.beteiligungsart && (
                      <p className="text-xs text-green-700">
                        Art: {createdBeteiligung.fields.beteiligungsart.label}
                      </p>
                    )}
                  </div>
                </div>

                {/* Key figures */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl border bg-card text-center">
                    <p className="text-xs text-muted-foreground mb-1">Beteiligungsart</p>
                    <p className="font-semibold text-sm">
                      {createdBeteiligung.fields.beteiligungsart?.label ?? '—'}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl border bg-card text-center">
                    <p className="text-xs text-muted-foreground mb-1">Anteil</p>
                    <p className="font-semibold text-sm">
                      {createdBeteiligung.fields.anteil_prozent != null
                        ? `${createdBeteiligung.fields.anteil_prozent} %`
                        : '—'}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl border bg-card text-center">
                    <p className="text-xs text-muted-foreground mb-1">Invest. Kapital</p>
                    <p className="font-semibold text-sm">
                      {formatEuro(createdBeteiligung.fields.investiertes_kapital)}
                    </p>
                  </div>
                </div>

                {/* Budget tracker if both values available */}
                {createdBeteiligung.fields.investiertes_kapital != null &&
                  createdBeteiligung.fields.aktueller_wert != null && (
                  <BudgetTracker
                    budget={createdBeteiligung.fields.aktueller_wert}
                    booked={createdBeteiligung.fields.investiertes_kapital}
                    label="Investiertes Kapital vs. Aktueller Wert"
                    showRemaining={true}
                  />
                )}

                <div className="flex items-center justify-between pt-2">
                  <Button variant="ghost" onClick={() => setCurrentStep(2)} className="gap-1.5">
                    <IconArrowLeft size={16} stroke={2} />
                    Zurück
                  </Button>
                  <Button onClick={() => setCurrentStep(4)} className="gap-1.5">
                    Weiter
                    <IconArrowRight size={16} stroke={2} />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col items-center justify-center py-8 gap-4 border rounded-xl bg-muted/20">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <IconCoin size={24} className="text-primary" stroke={1.5} />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="font-medium text-sm">Beteiligung anlegen</p>
                    <p className="text-xs text-muted-foreground max-w-xs">
                      Das Unternehmen und die beteiligten Personen werden automatisch vorausgefüllt.
                    </p>
                  </div>
                  <Button onClick={() => setBeteiligungenDialogOpen(true)} className="gap-1.5">
                    <IconPlus size={16} stroke={2} />
                    Beteiligung erfassen
                  </Button>
                </div>

                <BeteiligungenDialog
                  open={beteiligungenDialogOpen}
                  onClose={() => setBeteiligungenDialogOpen(false)}
                  onSubmit={async (fields) => {
                    const firstPersonId = Array.from(selectedPersonenIds)[0];
                    const enrichedFields = {
                      ...fields,
                      unternehmen: selectedUnternehmenId
                        ? createRecordUrl(APP_IDS.UNTERNEHMEN, selectedUnternehmenId)
                        : fields.unternehmen,
                      beteiligte_personen: firstPersonId
                        ? createRecordUrl(APP_IDS.PERSONEN, firstPersonId)
                        : fields.beteiligte_personen,
                    };
                    const result = await LivingAppsService.createBeteiligungenEntry(enrichedFields);
                    // Build a local representation for the success card
                    const entries = Object.entries(result as Record<string, unknown>);
                    const newId = entries.length > 0 ? entries[0][0] : 'new';
                    const synthetic: Beteiligungen = {
                      record_id: newId,
                      createdat: new Date().toISOString(),
                      updatedat: null,
                      fields: enrichedFields as Beteiligungen['fields'],
                    };
                    handleBeteiligungenCreated(synthetic);
                  }}
                  defaultValues={beteiligungenDefaultValues}
                  unternehmenList={unternehmen}
                  personenList={personen}
                  enablePhotoScan={AI_PHOTO_SCAN['Beteiligungen']}
                  enablePhotoLocation={AI_PHOTO_LOCATION['Beteiligungen']}
                />

                <div className="flex items-center justify-between pt-2">
                  <Button variant="ghost" onClick={() => setCurrentStep(2)} className="gap-1.5">
                    <IconArrowLeft size={16} stroke={2} />
                    Zurück
                  </Button>
                </div>
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Erstes Gremium planen</h2>
              <p className="text-sm text-muted-foreground">
                Möchtest du direkt einen ersten Gremiumstermin für dieses Unternehmen anlegen?
              </p>
            </div>

            {createdTermin ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-xl border border-green-200 bg-green-50 overflow-hidden">
                  <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <IconCheck size={18} className="text-green-700" stroke={2.5} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-green-800">Termin erfolgreich geplant</p>
                    {createdTermin.fields.titel && (
                      <p className="text-xs text-green-700 truncate">{createdTermin.fields.titel}</p>
                    )}
                    {createdTermin.fields.datum_uhrzeit && (
                      <p className="text-xs text-green-600">
                        {new Date(createdTermin.fields.datum_uhrzeit).toLocaleDateString('de-DE', {
                          day: '2-digit', month: '2-digit', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <Button variant="ghost" onClick={() => setCurrentStep(3)} className="gap-1.5">
                    <IconArrowLeft size={16} stroke={2} />
                    Zurück
                  </Button>
                  <Button onClick={() => setCurrentStep(5)} className="gap-1.5">
                    Abschließen
                    <IconArrowRight size={16} stroke={2} />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col items-center justify-center py-8 gap-4 border rounded-xl bg-muted/20">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <IconCalendar size={24} className="text-primary" stroke={1.5} />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="font-medium text-sm">Ersten Gremiumstermin planen</p>
                    <p className="text-xs text-muted-foreground max-w-xs">
                      Das Unternehmen wird automatisch vorausgefüllt. Dieser Schritt ist optional.
                    </p>
                  </div>
                  <Button onClick={() => setGremienTermineDialogOpen(true)} className="gap-1.5">
                    <IconPlus size={16} stroke={2} />
                    Termin anlegen
                  </Button>
                </div>

                <GremienTermineDialog
                  open={gremienTermineDialogOpen}
                  onClose={() => setGremienTermineDialogOpen(false)}
                  onSubmit={async (fields) => {
                    const enrichedFields = {
                      ...fields,
                      unternehmen: selectedUnternehmenId
                        ? createRecordUrl(APP_IDS.UNTERNEHMEN, selectedUnternehmenId)
                        : fields.unternehmen,
                    };
                    const result = await LivingAppsService.createGremienTermineEntry(enrichedFields);
                    const entries = Object.entries(result as Record<string, unknown>);
                    const newId = entries.length > 0 ? entries[0][0] : 'new';
                    const synthetic: GremienTermine = {
                      record_id: newId,
                      createdat: new Date().toISOString(),
                      updatedat: null,
                      fields: enrichedFields as GremienTermine['fields'],
                    };
                    handleGremiumCreated(synthetic);
                  }}
                  defaultValues={gremienTermineDefaultValues}
                  unternehmenList={unternehmen}
                  personenList={personen}
                  enablePhotoScan={AI_PHOTO_SCAN['GremienTermine']}
                  enablePhotoLocation={AI_PHOTO_LOCATION['GremienTermine']}
                />

                <div className="flex items-center justify-between pt-2">
                  <Button variant="ghost" onClick={() => setCurrentStep(3)} className="gap-1.5">
                    <IconArrowLeft size={16} stroke={2} />
                    Zurück
                  </Button>
                  <Button variant="outline" onClick={() => setCurrentStep(5)} className="gap-1.5">
                    Überspringen
                    <IconArrowRight size={16} stroke={2} />
                  </Button>
                </div>
              </div>
            )}
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            {/* Success header */}
            <div className="flex flex-col items-center justify-center py-6 gap-3 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <IconCheck size={28} className="text-green-700" stroke={2.5} />
              </div>
              <div>
                <h2 className="text-xl font-bold">Beteiligung erfolgreich angelegt!</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Das Onboarding deiner neuen Portfolio-Investition ist abgeschlossen.
                </p>
              </div>
            </div>

            {/* Summary card */}
            <div className="rounded-2xl border bg-card overflow-hidden">
              {/* Company row */}
              <div className="p-4 border-b">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <IconBuilding size={20} className="text-primary" stroke={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Unternehmen</p>
                    <p className="font-semibold text-sm truncate">
                      {selectedUnternehmen?.fields.unternehmensname ?? '—'}
                    </p>
                    {selectedUnternehmen?.fields.branche && (
                      <p className="text-xs text-muted-foreground">
                        {selectedUnternehmen.fields.branche.label}
                      </p>
                    )}
                  </div>
                  {selectedUnternehmen?.fields.status && (
                    <StatusBadge
                      statusKey={selectedUnternehmen.fields.status.key}
                      label={selectedUnternehmen.fields.status.label}
                    />
                  )}
                </div>
              </div>

              {/* Persons row */}
              <div className="p-4 border-b">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                    <IconUsers size={20} className="text-blue-600" stroke={1.5} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Beteiligte Personen</p>
                    <p className="font-semibold text-sm">
                      {selectedPersonenIds.size}{' '}
                      {selectedPersonenIds.size === 1 ? 'Person' : 'Personen'} verknüpft
                    </p>
                  </div>
                </div>
              </div>

              {/* Beteiligung row */}
              {createdBeteiligung && (
                <div className="p-4 border-b">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                      <IconCoin size={20} className="text-amber-600" stroke={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground mb-1">Beteiligung</p>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <p className="text-xs text-muted-foreground">Art</p>
                          <p className="text-sm font-medium truncate">
                            {createdBeteiligung.fields.beteiligungsart?.label ?? '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Anteil</p>
                          <p className="text-sm font-medium">
                            {createdBeteiligung.fields.anteil_prozent != null
                              ? `${createdBeteiligung.fields.anteil_prozent} %`
                              : '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Kapital</p>
                          <p className="text-sm font-medium truncate">
                            {formatEuro(createdBeteiligung.fields.investiertes_kapital)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Gremium row */}
              {createdTermin && (
                <div className="p-4">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                      <IconCalendar size={20} className="text-purple-600" stroke={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Geplanter Termin</p>
                      <p className="font-semibold text-sm truncate">
                        {createdTermin.fields.titel ?? '(Kein Titel)'}
                      </p>
                      {createdTermin.fields.datum_uhrzeit && (
                        <p className="text-xs text-muted-foreground">
                          {new Date(createdTermin.fields.datum_uhrzeit).toLocaleDateString('de-DE', {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => navigate('/beteiligungen')}
                className="gap-2 w-full"
              >
                <IconCoin size={16} stroke={1.5} />
                Zur Beteiligungsübersicht
              </Button>
              <Button
                variant="outline"
                onClick={() => selectedUnternehmenId && navigate('/unternehmen')}
                disabled={!selectedUnternehmenId}
                className="gap-2 w-full"
              >
                <IconBuilding size={16} stroke={1.5} />
                Zum Unternehmen
              </Button>
            </div>

            <div className="flex justify-center pt-2">
              <Button variant="ghost" onClick={handleRestart} className="gap-2">
                <IconRefresh size={16} stroke={2} />
                Neue Beteiligung erfassen
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <IntentWizardShell
      title="Neue Beteiligung"
      subtitle="Onboarding einer neuen Portfolio-Investition in vier Schritten"
      steps={WIZARD_STEPS}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {renderStep()}
    </IntentWizardShell>
  );
}

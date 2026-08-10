import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichUnternehmen, enrichBeteiligungen, enrichGremienTermine } from '@/lib/enrich';
import type { EnrichedUnternehmen, EnrichedBeteiligungen, EnrichedGremienTermine } from '@/types/enriched';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { formatDate, formatCurrency } from '@/lib/formatters';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { IconAlertCircle, IconTool, IconRefresh, IconCheck, IconPlus, IconPencil, IconTrash, IconBuilding, IconChartBar, IconCalendar, IconUsers, IconCoin, IconTrendingUp, IconTrendingDown, IconSearch, IconChevronRight, IconMapPin, IconBriefcase } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { StatCard } from '@/components/StatCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { UnternehmenDialog } from '@/components/dialogs/UnternehmenDialog';
import { BeteiligungenDialog } from '@/components/dialogs/BeteiligungenDialog';
import { GremienTermineDialog } from '@/components/dialogs/GremienTermineDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';

const APPGROUP_ID = '6a79d8dab122126aad1eab50';
const REPAIR_ENDPOINT = '/claude/build/repair';

type DialogMode =
  | { type: 'createUnternehmen' }
  | { type: 'editUnternehmen'; record: EnrichedUnternehmen }
  | { type: 'createBeteiligung'; unternehmenId?: string }
  | { type: 'editBeteiligung'; record: EnrichedBeteiligungen }
  | { type: 'createTermin'; unternehmenId?: string }
  | { type: 'editTermin'; record: EnrichedGremienTermine }
  | null;

export default function DashboardOverview() {
  const {
    unternehmen, beteiligungen, gremienTermine,
    unternehmenMap, personenMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const enrichedUnternehmen = enrichUnternehmen(unternehmen, { personenMap });
  const enrichedBeteiligungen = enrichBeteiligungen(beteiligungen, { unternehmenMap, personenMap });
  const enrichedGremienTermine = enrichGremienTermine(gremienTermine, { unternehmenMap, personenMap });

  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogMode>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'unternehmen' | 'beteiligung' | 'termin'; id: string } | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('alle');

  // KPI calculations — ALL hooks before any returns
  const totalKapital = useMemo(() =>
    enrichedBeteiligungen.reduce((s, b) => s + (b.fields.investiertes_kapital ?? 0), 0),
    [enrichedBeteiligungen]
  );
  const totalWert = useMemo(() =>
    enrichedBeteiligungen.reduce((s, b) => s + (b.fields.aktueller_wert ?? 0), 0),
    [enrichedBeteiligungen]
  );
  const aktiveUnternehmen = useMemo(() =>
    enrichedUnternehmen.filter(u => u.fields.status?.key === 'aktiv').length,
    [enrichedUnternehmen]
  );

  const now = new Date();
  const upcomingTermine = useMemo(() =>
    enrichedGremienTermine
      .filter(t => t.fields.datum_uhrzeit && new Date(t.fields.datum_uhrzeit) >= now)
      .sort((a, b) => new Date(a.fields.datum_uhrzeit!).getTime() - new Date(b.fields.datum_uhrzeit!).getTime())
      .slice(0, 5),
    [enrichedGremienTermine]
  );

  const filteredUnternehmen = useMemo(() => {
    let list = enrichedUnternehmen;
    if (statusFilter !== 'alle') list = list.filter(u => u.fields.status?.key === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(u =>
        u.fields.unternehmensname?.toLowerCase().includes(q) ||
        u.fields.branche?.label?.toLowerCase().includes(q) ||
        u.fields.stadt?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [enrichedUnternehmen, search, statusFilter]);

  const selectedUnternehmen = useMemo(() =>
    selectedId ? enrichedUnternehmen.find(u => u.record_id === selectedId) ?? null : null,
    [selectedId, enrichedUnternehmen]
  );

  const selectedBeteiligungen = useMemo(() =>
    selectedId
      ? enrichedBeteiligungen.filter(b => {
          const id = b.fields.unternehmen?.match(/([a-f0-9]{24})$/i)?.[1];
          return id === selectedId;
        })
      : [],
    [selectedId, enrichedBeteiligungen]
  );

  const selectedTermine = useMemo(() =>
    selectedId
      ? enrichedGremienTermine.filter(t => {
          if (!t.fields.unternehmen) return false;
          return t.fields.unternehmen.includes(selectedId);
        })
      : [],
    [selectedId, enrichedGremienTermine]
  );

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  const performance = totalKapital > 0 ? ((totalWert - totalKapital) / totalKapital) * 100 : 0;
  const performancePositive = performance >= 0;

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'unternehmen') {
      await LivingAppsService.deleteUnternehmenEntry(deleteTarget.id);
      if (selectedId === deleteTarget.id) setSelectedId(null);
    } else if (deleteTarget.type === 'beteiligung') {
      await LivingAppsService.deleteBeteiligungenEntry(deleteTarget.id);
    } else if (deleteTarget.type === 'termin') {
      await LivingAppsService.deleteGremienTermineEntry(deleteTarget.id);
    }
    setDeleteTarget(null);
    fetchAll();
  };

  const statusColors: Record<string, string> = {
    aktiv: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    inaktiv: 'bg-slate-100 text-slate-600 border-slate-200',
    exit: 'bg-amber-100 text-amber-700 border-amber-200',
  };

  const brancheIcon = (key?: string) => {
    if (key === 'technologie') return '💻';
    if (key === 'gesundheit') return '🏥';
    if (key === 'finanzen') return '🏦';
    if (key === 'immobilien') return '🏢';
    if (key === 'energie') return '⚡';
    if (key === 'medien') return '📡';
    if (key === 'bildung') return '🎓';
    return '🏭';
  };

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Portfolio-Wert"
          value={totalWert >= 1_000_000
            ? `${(totalWert / 1_000_000).toFixed(1)} Mio €`
            : formatCurrency(totalWert)}
          description={performancePositive ? `+${performance.toFixed(1)} % Rendite` : `${performance.toFixed(1)} % Rendite`}
          icon={<IconChartBar size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Investiert"
          value={totalKapital >= 1_000_000
            ? `${(totalKapital / 1_000_000).toFixed(1)} Mio €`
            : formatCurrency(totalKapital)}
          description={`${enrichedBeteiligungen.length} Beteiligung${enrichedBeteiligungen.length !== 1 ? 'en' : ''}`}
          icon={<IconCoin size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Aktive Portfolio-Unternehmen"
          value={String(aktiveUnternehmen)}
          description={`von ${enrichedUnternehmen.length} gesamt`}
          icon={<IconBuilding size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Nächste Termine"
          value={String(upcomingTermine.length)}
          description="bevorstehend"
          icon={<IconCalendar size={18} className="text-muted-foreground" />}
        />
      </div>

      {/* Main area: Portfolio List + Detail Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Portfolio List */}
        <div className="lg:col-span-2 space-y-3">
          {/* Search + filter + add */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-0">
              <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground shrink-0" />
              <Input
                placeholder="Unternehmen suchen..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-1 flex-wrap">
              {['alle', 'aktiv', 'inaktiv', 'exit'].map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                    statusFilter === s
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border hover:border-primary/50'
                  }`}
                >
                  {s === 'alle' ? 'Alle' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
            <Button size="sm" onClick={() => setDialog({ type: 'createUnternehmen' })}>
              <IconPlus size={15} className="shrink-0 mr-1" />
              <span className="hidden sm:inline">Unternehmen</span>
            </Button>
          </div>

          {/* Portfolio cards */}
          {filteredUnternehmen.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <IconBuilding size={48} className="text-muted-foreground" stroke={1.5} />
              <div>
                <p className="font-medium text-foreground">Keine Unternehmen gefunden</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {search || statusFilter !== 'alle' ? 'Filter anpassen oder' : ''} Neues Unternehmen anlegen
                </p>
              </div>
              <Button size="sm" onClick={() => setDialog({ type: 'createUnternehmen' })}>
                <IconPlus size={15} className="mr-1" /> Unternehmen hinzufügen
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredUnternehmen.map(u => {
                const beteil = enrichedBeteiligungen.filter(b =>
                  b.fields.unternehmen?.match(/([a-f0-9]{24})$/i)?.[1] === u.record_id
                );
                const totalInvest = beteil.reduce((s, b) => s + (b.fields.investiertes_kapital ?? 0), 0);
                const totalVal = beteil.reduce((s, b) => s + (b.fields.aktueller_wert ?? 0), 0);
                const perf = totalInvest > 0 ? ((totalVal - totalInvest) / totalInvest) * 100 : null;
                const isSelected = selectedId === u.record_id;

                return (
                  <div
                    key={u.record_id}
                    onClick={() => setSelectedId(isSelected ? null : u.record_id)}
                    className={`rounded-xl border p-4 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border bg-card hover:border-primary/40 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      {/* Branche-Icon */}
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-lg shrink-0">
                        {brancheIcon(u.fields.branche?.key)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground truncate">
                              {u.fields.unternehmensname ?? '—'}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              {u.fields.branche && (
                                <span className="text-xs text-muted-foreground">{u.fields.branche.label}</span>
                              )}
                              {u.fields.stadt && (
                                <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                                  <IconMapPin size={11} className="shrink-0" />
                                  {u.fields.stadt}
                                </span>
                              )}
                              {u.fields.rechtsform && (
                                <span className="text-xs text-muted-foreground">{u.fields.rechtsform.label}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {u.fields.status && (
                              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusColors[u.fields.status.key] ?? 'bg-muted text-muted-foreground border-border'}`}>
                                {u.fields.status.label}
                              </span>
                            )}
                            <button
                              onClick={e => { e.stopPropagation(); setDialog({ type: 'editUnternehmen', record: u }); }}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                            >
                              <IconPencil size={14} className="shrink-0" />
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); setDeleteTarget({ type: 'unternehmen', id: u.record_id }); }}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            >
                              <IconTrash size={14} className="shrink-0" />
                            </button>
                          </div>
                        </div>

                        {/* Financial row */}
                        {beteil.length > 0 && (
                          <div className="flex items-center gap-4 mt-2 flex-wrap">
                            <div>
                              <p className="text-xs text-muted-foreground">Investiert</p>
                              <p className="text-sm font-medium">
                                {totalInvest >= 1_000_000
                                  ? `${(totalInvest / 1_000_000).toFixed(1)} Mio €`
                                  : formatCurrency(totalInvest)}
                              </p>
                            </div>
                            {totalVal > 0 && (
                              <div>
                                <p className="text-xs text-muted-foreground">Aktuell</p>
                                <p className="text-sm font-medium">
                                  {totalVal >= 1_000_000
                                    ? `${(totalVal / 1_000_000).toFixed(1)} Mio €`
                                    : formatCurrency(totalVal)}
                                </p>
                              </div>
                            )}
                            {perf !== null && (
                              <div className={`flex items-center gap-0.5 text-sm font-semibold ${perf >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                {perf >= 0
                                  ? <IconTrendingUp size={14} className="shrink-0" />
                                  : <IconTrendingDown size={14} className="shrink-0" />}
                                {perf >= 0 ? '+' : ''}{perf.toFixed(1)} %
                              </div>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {beteil.length} Beteiligung{beteil.length !== 1 ? 'en' : ''}
                            </span>
                          </div>
                        )}
                      </div>

                      <IconChevronRight
                        size={16}
                        className={`shrink-0 text-muted-foreground transition-transform mt-1 ${isSelected ? 'rotate-90' : ''}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Detail Panel + Upcoming Termine */}
        <div className="space-y-4">
          {/* Detail Panel */}
          {selectedUnternehmen ? (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="bg-primary/5 border-b border-border px-4 py-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate">{selectedUnternehmen.fields.unternehmensname ?? '—'}</p>
                  <p className="text-xs text-muted-foreground">{selectedUnternehmen.fields.branche?.label ?? ''}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDialog({ type: 'createBeteiligung', unternehmenId: selectedUnternehmen.record_id })}
                >
                  <IconPlus size={13} className="mr-1 shrink-0" />
                  Beteiligung
                </Button>
              </div>

              <div className="p-4 space-y-4">
                {/* Company info */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {selectedUnternehmen.fields.rechtsform && (
                    <div>
                      <p className="text-xs text-muted-foreground">Rechtsform</p>
                      <p className="font-medium">{selectedUnternehmen.fields.rechtsform.label}</p>
                    </div>
                  )}
                  {selectedUnternehmen.fields.gruendungsjahr && (
                    <div>
                      <p className="text-xs text-muted-foreground">Gegründet</p>
                      <p className="font-medium">{selectedUnternehmen.fields.gruendungsjahr}</p>
                    </div>
                  )}
                  {selectedUnternehmen.fields.stadt && (
                    <div>
                      <p className="text-xs text-muted-foreground">Stadt</p>
                      <p className="font-medium">{selectedUnternehmen.fields.stadt}</p>
                    </div>
                  )}
                  {selectedUnternehmen.fields.land && (
                    <div>
                      <p className="text-xs text-muted-foreground">Land</p>
                      <p className="font-medium">{selectedUnternehmen.fields.land}</p>
                    </div>
                  )}
                </div>

                {selectedUnternehmen.fields.kurzprofil && (
                  <p className="text-xs text-muted-foreground line-clamp-3">{selectedUnternehmen.fields.kurzprofil}</p>
                )}

                {selectedUnternehmen.fields.website && (
                  <a
                    href={selectedUnternehmen.fields.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline truncate block"
                  >
                    {selectedUnternehmen.fields.website}
                  </a>
                )}

                {/* Beteiligungen */}
                {selectedBeteiligungen.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                      <IconBriefcase size={12} className="shrink-0" />
                      Beteiligungen
                    </p>
                    <div className="space-y-2">
                      {selectedBeteiligungen.map(b => (
                        <div key={b.record_id} className="rounded-lg bg-muted/50 p-2.5 flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-medium">{b.fields.beteiligungsart?.label ?? 'Beteiligung'}</p>
                            {b.fields.anteil_prozent != null && (
                              <p className="text-xs text-muted-foreground">{b.fields.anteil_prozent} % Anteil</p>
                            )}
                            {b.fields.investiertes_kapital != null && (
                              <p className="text-xs text-muted-foreground">
                                {formatCurrency(b.fields.investiertes_kapital)} investiert
                              </p>
                            )}
                            {b.fields.eintrittsdatum && (
                              <p className="text-xs text-muted-foreground">seit {formatDate(b.fields.eintrittsdatum)}</p>
                            )}
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <button
                              onClick={() => setDialog({ type: 'editBeteiligung', record: b })}
                              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                            >
                              <IconPencil size={13} className="shrink-0" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget({ type: 'beteiligung', id: b.record_id })}
                              className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            >
                              <IconTrash size={13} className="shrink-0" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Termine für dieses Unternehmen */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                      <IconCalendar size={12} className="shrink-0" />
                      Termine
                    </p>
                    <button
                      onClick={() => setDialog({ type: 'createTermin', unternehmenId: selectedUnternehmen.record_id })}
                      className="text-xs text-primary hover:underline flex items-center gap-0.5"
                    >
                      <IconPlus size={12} className="shrink-0" /> Neu
                    </button>
                  </div>
                  {selectedTermine.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Keine Termine</p>
                  ) : (
                    <div className="space-y-1.5">
                      {selectedTermine.slice(0, 4).map(t => (
                        <div key={t.record_id} className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">{t.fields.titel ?? t.fields.terminart?.label ?? '—'}</p>
                            {t.fields.datum_uhrzeit && (
                              <p className="text-xs text-muted-foreground">{formatDate(t.fields.datum_uhrzeit)}</p>
                            )}
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <button
                              onClick={() => setDialog({ type: 'editTermin', record: t })}
                              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                            >
                              <IconPencil size={12} className="shrink-0" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget({ type: 'termin', id: t.record_id })}
                              className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            >
                              <IconTrash size={12} className="shrink-0" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-card p-6 flex flex-col items-center justify-center text-center gap-2 min-h-[200px]">
              <IconBuilding size={32} className="text-muted-foreground" stroke={1.5} />
              <p className="text-sm text-muted-foreground">Unternehmen auswählen für Details</p>
            </div>
          )}

          {/* Upcoming Termine Panel */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="border-b border-border px-4 py-3 flex items-center justify-between">
              <p className="font-semibold text-sm flex items-center gap-2">
                <IconCalendar size={16} className="text-primary shrink-0" />
                Bevorstehende Termine
              </p>
              <Button size="sm" variant="outline" onClick={() => setDialog({ type: 'createTermin' })}>
                <IconPlus size={13} className="mr-1 shrink-0" />
                <span className="hidden sm:inline">Termin</span>
              </Button>
            </div>
            <div className="divide-y divide-border">
              {upcomingTermine.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Keine bevorstehenden Termine
                </div>
              ) : (
                upcomingTermine.map(t => {
                  const termDate = t.fields.datum_uhrzeit ? new Date(t.fields.datum_uhrzeit) : null;
                  const isToday = termDate && termDate.toDateString() === now.toDateString();
                  const isSoon = termDate && termDate.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000;

                  return (
                    <div key={t.record_id} className="px-4 py-3 flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${isToday ? 'bg-red-500' : isSoon ? 'bg-amber-500' : 'bg-primary'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{t.fields.titel ?? t.fields.terminart?.label ?? '—'}</p>
                        <div className="flex items-center gap-2 flex-wrap mt-0.5">
                          {t.fields.datum_uhrzeit && (
                            <span className={`text-xs ${isToday ? 'text-red-600 font-semibold' : 'text-muted-foreground'}`}>
                              {formatDate(t.fields.datum_uhrzeit)}
                            </span>
                          )}
                          {t.unternehmenName && (
                            <span className="text-xs text-muted-foreground truncate">{t.unternehmenName}</span>
                          )}
                          {t.fields.terminart && (
                            <Badge variant="outline" className="text-xs py-0 h-4">
                              {t.fields.terminart.label}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => setDialog({ type: 'editTermin', record: t })}
                        className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
                      >
                        <IconPencil size={13} className="shrink-0" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Portfolio Performance Summary */}
          {enrichedBeteiligungen.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1">
                <IconUsers size={12} className="shrink-0" />
                Portfolio nach Beteiligungsart
              </p>
              <div className="space-y-2">
                {(['direkt', 'indirekt', 'fonds', 'wandeldarlehen', 'sonstige'] as const).map(key => {
                  const group = enrichedBeteiligungen.filter(b => b.fields.beteiligungsart?.key === key);
                  if (group.length === 0) return null;
                  const kapital = group.reduce((s, b) => s + (b.fields.investiertes_kapital ?? 0), 0);
                  const labels: Record<string, string> = {
                    direkt: 'Direkt',
                    indirekt: 'Indirekt',
                    fonds: 'Über Fonds',
                    wandeldarlehen: 'Wandeldarlehen',
                    sonstige: 'Sonstige',
                  };
                  const pct = totalKapital > 0 ? (kapital / totalKapital) * 100 : 0;
                  return (
                    <div key={key}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">{labels[key]}</span>
                        <span className="font-medium">{pct.toFixed(0)} %</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      {dialog?.type === 'createUnternehmen' && (
        <UnternehmenDialog
          open
          onClose={() => setDialog(null)}
          onSubmit={async fields => { await LivingAppsService.createUnternehmenEntry(fields); fetchAll(); }}
          personenList={[]}
          enablePhotoScan={AI_PHOTO_SCAN['Unternehmen']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Unternehmen']}
        />
      )}
      {dialog?.type === 'editUnternehmen' && (
        <UnternehmenDialog
          open
          onClose={() => setDialog(null)}
          onSubmit={async fields => { await LivingAppsService.updateUnternehmenEntry(dialog.record.record_id, fields); fetchAll(); }}
          defaultValues={dialog.record.fields}
          personenList={[]}
          enablePhotoScan={AI_PHOTO_SCAN['Unternehmen']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Unternehmen']}
        />
      )}
      {dialog?.type === 'createBeteiligung' && (
        <BeteiligungenDialog
          open
          onClose={() => setDialog(null)}
          onSubmit={async fields => { await LivingAppsService.createBeteiligungenEntry(fields); fetchAll(); }}
          defaultValues={
            dialog.unternehmenId
              ? { unternehmen: createRecordUrl(APP_IDS.UNTERNEHMEN, dialog.unternehmenId) }
              : undefined
          }
          unternehmenList={unternehmen}
          personenList={[]}
          enablePhotoScan={AI_PHOTO_SCAN['Beteiligungen']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Beteiligungen']}
        />
      )}
      {dialog?.type === 'editBeteiligung' && (
        <BeteiligungenDialog
          open
          onClose={() => setDialog(null)}
          onSubmit={async fields => { await LivingAppsService.updateBeteiligungenEntry(dialog.record.record_id, fields); fetchAll(); }}
          defaultValues={dialog.record.fields}
          unternehmenList={unternehmen}
          personenList={[]}
          enablePhotoScan={AI_PHOTO_SCAN['Beteiligungen']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Beteiligungen']}
        />
      )}
      {dialog?.type === 'createTermin' && (
        <GremienTermineDialog
          open
          onClose={() => setDialog(null)}
          onSubmit={async fields => { await LivingAppsService.createGremienTermineEntry(fields); fetchAll(); }}
          defaultValues={
            dialog.unternehmenId
              ? { unternehmen: createRecordUrl(APP_IDS.UNTERNEHMEN, dialog.unternehmenId) }
              : undefined
          }
          unternehmenList={unternehmen}
          personenList={[]}
          enablePhotoScan={AI_PHOTO_SCAN['GremienTermine']}
          enablePhotoLocation={AI_PHOTO_LOCATION['GremienTermine']}
        />
      )}
      {dialog?.type === 'editTermin' && (
        <GremienTermineDialog
          open
          onClose={() => setDialog(null)}
          onSubmit={async fields => { await LivingAppsService.updateGremienTermineEntry(dialog.record.record_id, fields); fetchAll(); }}
          defaultValues={dialog.record.fields}
          unternehmenList={unternehmen}
          personenList={[]}
          enablePhotoScan={AI_PHOTO_SCAN['GremienTermine']}
          enablePhotoLocation={AI_PHOTO_LOCATION['GremienTermine']}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Eintrag löschen"
        description="Dieser Eintrag wird unwiderruflich gelöscht. Fortfahren?"
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          <Skeleton className="h-10 rounded-xl" />
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <div className="space-y-4">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);

    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });

    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });

      if (!resp.ok || !resp.body) {
        setRepairing(false);
        setRepairFailed(true);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) {
            setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          }
          if (content.startsWith('[DONE]')) {
            setRepairDone(true);
            setRepairing(false);
          }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) {
            setRepairFailed(true);
          }
        }
      }
    } catch {
      setRepairing(false);
      setRepairFailed(true);
    }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte laden Sie die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" />Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {repairing ? repairStatus : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>Erneut versuchen</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? 'Reparatur läuft...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen. Bitte kontaktieren Sie den Support.</p>}
    </div>
  );
}

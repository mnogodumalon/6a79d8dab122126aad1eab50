import type { EnrichedBeteiligungen, EnrichedDokumente, EnrichedGremienTermine, EnrichedNotizen, EnrichedPersonen, EnrichedUnternehmen } from '@/types/enriched';
import type { Beteiligungen, Dokumente, GremienTermine, Notizen, Personen, Unternehmen } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface PersonenMaps {
  unternehmenMap: Map<string, Unternehmen>;
}

export function enrichPersonen(
  personen: Personen[],
  maps: PersonenMaps
): EnrichedPersonen[] {
  return personen.map(r => ({
    ...r,
    unternehmenName: resolveDisplay(r.fields.unternehmen, maps.unternehmenMap, 'unternehmensname'),
  }));
}

interface UnternehmenMaps {
  personenMap: Map<string, Personen>;
}

export function enrichUnternehmen(
  unternehmen: Unternehmen[],
  maps: UnternehmenMaps
): EnrichedUnternehmen[] {
  return unternehmen.map(r => ({
    ...r,
    ansprechpartnerName: resolveDisplay(r.fields.ansprechpartner, maps.personenMap, 'vorname', 'nachname'),
  }));
}

interface BeteiligungenMaps {
  unternehmenMap: Map<string, Unternehmen>;
  personenMap: Map<string, Personen>;
}

export function enrichBeteiligungen(
  beteiligungen: Beteiligungen[],
  maps: BeteiligungenMaps
): EnrichedBeteiligungen[] {
  return beteiligungen.map(r => ({
    ...r,
    unternehmenName: resolveDisplay(r.fields.unternehmen, maps.unternehmenMap, 'unternehmensname'),
    beteiligte_personenName: resolveDisplay(r.fields.beteiligte_personen, maps.personenMap, 'vorname', 'nachname'),
  }));
}

interface GremienTermineMaps {
  unternehmenMap: Map<string, Unternehmen>;
  personenMap: Map<string, Personen>;
}

export function enrichGremienTermine(
  gremienTermine: GremienTermine[],
  maps: GremienTermineMaps
): EnrichedGremienTermine[] {
  return gremienTermine.map(r => ({
    ...r,
    unternehmenName: resolveDisplay(r.fields.unternehmen, maps.unternehmenMap, 'unternehmensname'),
    teilnehmerName: resolveDisplay(r.fields.teilnehmer, maps.personenMap, 'vorname', 'nachname'),
  }));
}

interface DokumenteMaps {
  unternehmenMap: Map<string, Unternehmen>;
  gremienTermineMap: Map<string, GremienTermine>;
  personenMap: Map<string, Personen>;
}

export function enrichDokumente(
  dokumente: Dokumente[],
  maps: DokumenteMaps
): EnrichedDokumente[] {
  return dokumente.map(r => ({
    ...r,
    unternehmenName: resolveDisplay(r.fields.unternehmen, maps.unternehmenMap, 'unternehmensname'),
    terminName: resolveDisplay(r.fields.termin, maps.gremienTermineMap, 'titel'),
    bereitgestellt_vonName: resolveDisplay(r.fields.bereitgestellt_von, maps.personenMap, 'vorname', 'nachname'),
  }));
}

interface NotizenMaps {
  unternehmenMap: Map<string, Unternehmen>;
  beteiligungenMap: Map<string, Beteiligungen>;
  gremienTermineMap: Map<string, GremienTermine>;
  dokumenteMap: Map<string, Dokumente>;
  personenMap: Map<string, Personen>;
}

export function enrichNotizen(
  notizen: Notizen[],
  maps: NotizenMaps
): EnrichedNotizen[] {
  return notizen.map(r => ({
    ...r,
    unternehmenName: resolveDisplay(r.fields.unternehmen, maps.unternehmenMap, 'unternehmensname'),
    beteiligungName: resolveDisplay(r.fields.beteiligung, maps.beteiligungenMap, 'bewertung'),
    terminName: resolveDisplay(r.fields.termin, maps.gremienTermineMap, 'titel'),
    dokumentName: resolveDisplay(r.fields.dokument, maps.dokumenteMap, 'titel'),
    personName: resolveDisplay(r.fields.person, maps.personenMap, 'vorname', 'nachname'),
  }));
}

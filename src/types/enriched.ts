import type { Beteiligungen, Dokumente, GremienTermine, Notizen, Personen, Unternehmen } from './app';

export type EnrichedPersonen = Personen & {
  unternehmenName: string;
};

export type EnrichedUnternehmen = Unternehmen & {
  ansprechpartnerName: string;
};

export type EnrichedBeteiligungen = Beteiligungen & {
  unternehmenName: string;
  beteiligte_personenName: string;
};

export type EnrichedGremienTermine = GremienTermine & {
  unternehmenName: string;
  teilnehmerName: string;
};

export type EnrichedDokumente = Dokumente & {
  unternehmenName: string;
  terminName: string;
  bereitgestellt_vonName: string;
};

export type EnrichedNotizen = Notizen & {
  unternehmenName: string;
  beteiligungName: string;
  terminName: string;
  dokumentName: string;
  personName: string;
};

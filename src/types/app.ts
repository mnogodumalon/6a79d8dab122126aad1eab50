// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export interface Personen {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    unternehmen?: string;
    vorname?: string;
    nachname?: string;
    email?: string;
    telefon?: string;
    rolle?: LookupValue;
    linkedin?: string;
    notizen_person?: string;
  };
}

export interface Unternehmen {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    ansprechpartner?: string;
    unternehmensname?: string;
    branche?: LookupValue;
    rechtsform?: LookupValue;
    gruendungsjahr?: number;
    website?: string;
    stadt?: string;
    land?: string;
    status?: LookupValue;
    kurzprofil?: string;
    notizen_unternehmen?: string;
  };
}

export interface Beteiligungen {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    unternehmen?: string; // applookup -> URL zu 'Unternehmen' Record
    beteiligte_personen?: string;
    beteiligungsart?: LookupValue;
    anteil_prozent?: number;
    investiertes_kapital?: number;
    aktueller_wert?: number;
    eintrittsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    exitdatum?: string; // Format: YYYY-MM-DD oder ISO String
    bewertung?: string;
    notizen_beteiligung?: string;
  };
}

export interface GremienTermine {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    unternehmen?: string;
    teilnehmer?: string;
    titel?: string;
    terminart?: LookupValue;
    datum_uhrzeit?: string; // Format: YYYY-MM-DD oder ISO String
    ort?: string;
    wiederkehrend?: boolean;
    wiederholungsintervall?: LookupValue;
    agenda?: string;
    notizen_termin?: string;
  };
}

export interface Dokumente {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    titel?: string;
    dokumenttyp?: LookupValue;
    datei?: string;
    externer_link?: string;
    datum_dokument?: string; // Format: YYYY-MM-DD oder ISO String
    beschreibung?: string;
    notizen_dokument?: string;
    unternehmen?: string; // applookup -> URL zu 'Unternehmen' Record
    termin?: string; // applookup -> URL zu 'GremienTermine' Record
    bereitgestellt_von?: string; // applookup -> URL zu 'Personen' Record
  };
}

export interface Notizen {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    inhalt?: string;
    kategorie?: LookupValue;
    erstellt_am?: string; // Format: YYYY-MM-DD oder ISO String
    unternehmen?: string; // applookup -> URL zu 'Unternehmen' Record
    beteiligung?: string; // applookup -> URL zu 'Beteiligungen' Record
    termin?: string; // applookup -> URL zu 'GremienTermine' Record
    titel?: string;
    dokument?: string; // applookup -> URL zu 'Dokumente' Record
    person?: string; // applookup -> URL zu 'Personen' Record
  };
}

export const APP_IDS = {
  PERSONEN: '6a79d8a60736c3a4a7d1e59f',
  UNTERNEHMEN: '6a79d8abade761cee4db4fd8',
  BETEILIGUNGEN: '6a79d8abfa6a40eb0b31e8a2',
  GREMIEN_TERMINE: '6a79d8ac29dbb6ecfa9f3968',
  DOKUMENTE: '6a79d8ac54dfdf327d8f29f9',
  NOTIZEN: '6a79d8ac812ce284dbd988c6',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'personen': {
    rolle: [{ key: "ansprechpartner", label: "Ansprechpartner" }, { key: "beirat", label: "Beirat" }, { key: "geschaeftsfuehrer", label: "Geschäftsführer" }, { key: "investor", label: "Investor" }, { key: "berater", label: "Berater" }, { key: "sonstiges", label: "Sonstiges" }],
  },
  'unternehmen': {
    branche: [{ key: "technologie", label: "Technologie" }, { key: "gesundheit", label: "Gesundheit & Pharma" }, { key: "finanzen", label: "Finanzen & Versicherung" }, { key: "immobilien", label: "Immobilien" }, { key: "handel", label: "Handel & Konsumgüter" }, { key: "industrie", label: "Industrie & Produktion" }, { key: "energie", label: "Energie & Umwelt" }, { key: "medien", label: "Medien & Kommunikation" }, { key: "bildung", label: "Bildung" }, { key: "sonstiges", label: "Sonstiges" }],
    rechtsform: [{ key: "gmbh", label: "GmbH" }, { key: "ag", label: "AG" }, { key: "gmbh_co_kg", label: "GmbH & Co. KG" }, { key: "ug", label: "UG (haftungsbeschränkt)" }, { key: "kg", label: "KG" }, { key: "ohg", label: "OHG" }, { key: "se", label: "SE" }, { key: "sonstige", label: "Sonstige" }],
    status: [{ key: "aktiv", label: "Aktiv" }, { key: "inaktiv", label: "Inaktiv" }, { key: "exit", label: "Exit" }],
  },
  'beteiligungen': {
    beteiligungsart: [{ key: "direkt", label: "Direkt" }, { key: "indirekt", label: "Indirekt" }, { key: "fonds", label: "Über Fonds" }, { key: "wandeldarlehen", label: "Wandeldarlehen" }, { key: "sonstige", label: "Sonstige" }],
  },
  'gremien_&_termine': {
    terminart: [{ key: "aufsichtsrat", label: "Aufsichtsratssitzung" }, { key: "beirat", label: "Beiratssitzung" }, { key: "gesellschafterversammlung", label: "Gesellschafterversammlung" }, { key: "hauptversammlung", label: "Hauptversammlung" }, { key: "investorengespraech", label: "Investorengespräch" }, { key: "strategiemeeting", label: "Strategiemeeting" }, { key: "sonstiges", label: "Sonstiges" }],
    wiederholungsintervall: [{ key: "monatlich", label: "Monatlich" }, { key: "quartalsweise", label: "Quartalsweise" }, { key: "halbjaehrlich", label: "Halbjährlich" }, { key: "jaehrlich", label: "Jährlich" }],
  },
  'dokumente': {
    dokumenttyp: [{ key: "protokoll", label: "Sitzungsprotokoll" }, { key: "jahresabschluss", label: "Jahresabschluss" }, { key: "vertrag", label: "Vertrag" }, { key: "praesentation", label: "Präsentation" }, { key: "beschluss", label: "Gesellschafterbeschluss" }, { key: "beteiligungsvertrag", label: "Beteiligungsvertrag" }, { key: "sonstiges", label: "Sonstiges" }],
  },
  'notizen': {
    kategorie: [{ key: "allgemein", label: "Allgemein" }, { key: "strategie", label: "Strategie" }, { key: "finanzen", label: "Finanzen" }, { key: "risiko", label: "Risiko" }, { key: "todo", label: "To-do" }, { key: "sonstiges", label: "Sonstiges" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'personen': {
    'unternehmen': 'multipleapplookup/select',
    'vorname': 'string/text',
    'nachname': 'string/text',
    'email': 'string/email',
    'telefon': 'string/tel',
    'rolle': 'lookup/select',
    'linkedin': 'string/url',
    'notizen_person': 'string/textarea',
  },
  'unternehmen': {
    'ansprechpartner': 'multipleapplookup/select',
    'unternehmensname': 'string/text',
    'branche': 'lookup/select',
    'rechtsform': 'lookup/select',
    'gruendungsjahr': 'number',
    'website': 'string/url',
    'stadt': 'string/text',
    'land': 'string/text',
    'status': 'lookup/radio',
    'kurzprofil': 'string/textarea',
    'notizen_unternehmen': 'string/textarea',
  },
  'beteiligungen': {
    'unternehmen': 'applookup/select',
    'beteiligte_personen': 'multipleapplookup/select',
    'beteiligungsart': 'lookup/select',
    'anteil_prozent': 'number',
    'investiertes_kapital': 'number',
    'aktueller_wert': 'number',
    'eintrittsdatum': 'date/date',
    'exitdatum': 'date/date',
    'bewertung': 'string/textarea',
    'notizen_beteiligung': 'string/textarea',
  },
  'gremien_&_termine': {
    'unternehmen': 'multipleapplookup/select',
    'teilnehmer': 'multipleapplookup/select',
    'titel': 'string/text',
    'terminart': 'lookup/select',
    'datum_uhrzeit': 'date/datetimeminute',
    'ort': 'string/text',
    'wiederkehrend': 'bool',
    'wiederholungsintervall': 'lookup/radio',
    'agenda': 'string/textarea',
    'notizen_termin': 'string/textarea',
  },
  'dokumente': {
    'titel': 'string/text',
    'dokumenttyp': 'lookup/select',
    'datei': 'file',
    'externer_link': 'string/url',
    'datum_dokument': 'date/date',
    'beschreibung': 'string/textarea',
    'notizen_dokument': 'string/textarea',
    'unternehmen': 'applookup/select',
    'termin': 'applookup/select',
    'bereitgestellt_von': 'applookup/select',
  },
  'notizen': {
    'inhalt': 'string/textarea',
    'kategorie': 'lookup/select',
    'erstellt_am': 'date/date',
    'unternehmen': 'applookup/select',
    'beteiligung': 'applookup/select',
    'termin': 'applookup/select',
    'titel': 'string/text',
    'dokument': 'applookup/select',
    'person': 'applookup/select',
  },
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreatePersonen = StripLookup<Personen['fields']>;
export type CreateUnternehmen = StripLookup<Unternehmen['fields']>;
export type CreateBeteiligungen = StripLookup<Beteiligungen['fields']>;
export type CreateGremienTermine = StripLookup<GremienTermine['fields']>;
export type CreateDokumente = StripLookup<Dokumente['fields']>;
export type CreateNotizen = StripLookup<Notizen['fields']>;
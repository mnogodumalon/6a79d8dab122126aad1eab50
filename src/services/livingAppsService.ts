// AUTOMATICALLY GENERATED SERVICE
import { APP_IDS, LOOKUP_OPTIONS, FIELD_TYPES } from '@/types/app';
import type { Personen, Unternehmen, Beteiligungen, GremienTermine, Dokumente, Notizen, CreatePersonen, CreateUnternehmen, CreateBeteiligungen, CreateGremienTermine, CreateDokumente, CreateNotizen } from '@/types/app';

// Base Configuration
const API_BASE_URL = 'https://test.living-apps.de/rest';

// --- HELPER FUNCTIONS ---
export function extractRecordId(url: unknown): string | null {
  if (!url) return null;
  if (typeof url !== 'string') return null;
  const match = url.match(/([a-f0-9]{24})$/i);
  return match ? match[1] : null;
}

export function createRecordUrl(appId: string, recordId: string): string {
  return `https://test.living-apps.de/rest/apps/${appId}/records/${recordId}`;
}

export class LivingAppsApiError extends Error {
  status: number;
  type?: string;
  control_identifier?: string;
  control_type?: string;
  field_type?: string;
  detail?: string;
  constructor(message: string, status: number, raw?: Record<string, unknown>) {
    super(message);
    this.name = 'LivingAppsApiError';
    this.status = status;
    if (raw) {
      this.type = typeof raw.type === 'string' ? raw.type : undefined;
      this.control_identifier = typeof raw.control_identifier === 'string' ? raw.control_identifier : undefined;
      this.control_type = typeof raw.control_type === 'string' ? raw.control_type : undefined;
      this.field_type = typeof raw.field_type === 'string' ? raw.field_type : undefined;
      this.detail = typeof raw.detail === 'string' ? raw.detail : undefined;
    }
  }
}

async function parseErrorBody(response: Response): Promise<{ message: string; raw?: Record<string, unknown> }> {
  const text = await response.text();
  if (!text) return { message: `HTTP ${response.status}` };
  try {
    const raw = JSON.parse(text);
    if (raw && typeof raw === 'object') {
      const obj = raw as Record<string, unknown>;
      const message = typeof obj.detail === 'string' ? obj.detail
        : typeof obj.title === 'string' ? obj.title
        : text;
      return { message, raw: obj };
    }
  } catch { /* fall through to text */ }
  return { message: text };
}

export interface CallApiOptions {
  /** Skip errorbus dispatch for expected failures (e.g. optional-param 404s). */
  silent?: boolean;
}

async function callApi(method: string, endpoint: string, data?: any, options?: CallApiOptions) {
  const silent = options?.silent === true;
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',  // Nutze Session Cookies für Auth
      body: data ? JSON.stringify(data) : undefined
    });
  } catch (netErr) {
    const message = netErr instanceof Error ? netErr.message : String(netErr);
    if (!silent) {
      window.dispatchEvent(new CustomEvent('errorbus:emit', { detail: {
        source: 'network', message, status: 0,
      } }));
    }
    throw netErr;
  }
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) window.dispatchEvent(new Event('auth-error'));
    const { message, raw } = await parseErrorBody(response);
    const err = new LivingAppsApiError(message, response.status, raw);
    if (!silent) {
      window.dispatchEvent(new CustomEvent('errorbus:emit', { detail: {
        source: 'api',
        status: err.status,
        type: err.type,
        control_identifier: err.control_identifier,
        control_type: err.control_type,
        field_type: err.field_type,
        detail: err.detail,
        message: err.message,
      } }));
    }
    throw err;
  }
  // DELETE returns often empty body or simple status
  if (method === 'DELETE') return true;
  return response.json();
}

/** Upload a file to LivingApps. Returns the file URL for use in record fields. */
export async function uploadFile(file: File | Blob, filename?: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', file, filename ?? (file instanceof File ? file.name : 'upload'));
  const res = await fetch(`${API_BASE_URL}/files`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) window.dispatchEvent(new Event('auth-error'));
    throw new Error(`File upload failed: ${res.status}`);
  }
  const data = await res.json();
  return data.url;
}

function enrichLookupFields<T extends { fields: Record<string, unknown> }>(
  records: T[], entityKey: string
): T[] {
  const opts = LOOKUP_OPTIONS[entityKey];
  if (!opts) return records;
  return records.map(r => {
    const fields = { ...r.fields };
    for (const [fieldKey, options] of Object.entries(opts)) {
      const val = fields[fieldKey];
      if (typeof val === 'string') {
        const m = options.find(o => o.key === val);
        fields[fieldKey] = m ?? { key: val, label: val };
      } else if (Array.isArray(val)) {
        fields[fieldKey] = val.map(v => {
          if (typeof v === 'string') {
            const m = options.find(o => o.key === v);
            return m ?? { key: v, label: v };
          }
          return v;
        });
      }
    }
    return { ...r, fields } as T;
  });
}

/** Normalize fields for API writes: strip lookup objects to keys, fix date formats. */
export function cleanFieldsForApi(
  fields: Record<string, unknown>,
  entityKey: string
): Record<string, unknown> {
  const clean: Record<string, unknown> = { ...fields };
  for (const [k, v] of Object.entries(clean)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && 'key' in v) clean[k] = (v as any).key;
    if (Array.isArray(v)) clean[k] = v.map((item: any) => item && typeof item === 'object' && 'key' in item ? item.key : item);
  }
  const types = FIELD_TYPES[entityKey];
  if (types) {
    for (const [k, ft] of Object.entries(types)) {
      if (!(k in clean)) continue;
      const val = clean[k];
      // applookup fields: undefined → null (clear single reference)
      if ((ft === 'applookup/select' || ft === 'applookup/choice') && val === undefined) { clean[k] = null; continue; }
      // multipleapplookup fields: undefined/null → [] (clear multi reference)
      if ((ft === 'multipleapplookup/select' || ft === 'multipleapplookup/choice') && (val === undefined || val === null)) { clean[k] = []; continue; }
      // lookup fields: undefined → null (clear single lookup)
      if ((ft.startsWith('lookup/')) && val === undefined) { clean[k] = null; continue; }
      // multiplelookup fields: undefined/null → [] (clear multi lookup)
      if ((ft.startsWith('multiplelookup/')) && (val === undefined || val === null)) { clean[k] = []; continue; }
      if (typeof val !== 'string' || !val) continue;
      if (ft === 'date/datetimeminute') clean[k] = val.slice(0, 16);
      else if (ft === 'date/date') clean[k] = val.slice(0, 10);
    }
  }
  return clean;
}

let _cachedUserProfile: Record<string, unknown> | null = null;

export async function getUserProfile(): Promise<Record<string, unknown>> {
  if (_cachedUserProfile) return _cachedUserProfile;
  const raw = await callApi('GET', '/user');
  const skip = new Set(['id', 'image', 'lang', 'gender', 'title', 'fax', 'menus', 'initials']);
  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v != null && !skip.has(k)) data[k] = v;
  }
  _cachedUserProfile = data;
  return data;
}

export interface HeaderProfile {
  firstname: string;
  surname: string;
  email: string;
  image: string | null;
  company: string | null;
}

let _cachedHeaderProfile: HeaderProfile | null = null;

export async function getHeaderProfile(): Promise<HeaderProfile> {
  if (_cachedHeaderProfile) return _cachedHeaderProfile;
  const raw = await callApi('GET', '/user');
  _cachedHeaderProfile = {
    firstname: raw.firstname ?? '',
    surname: raw.surname ?? '',
    email: raw.email ?? '',
    image: raw.image ?? null,
    company: raw.company ?? null,
  };
  return _cachedHeaderProfile;
}

export interface AppGroupInfo {
  id: string;
  name: string;
  image: string | null;
  createdat: string;
  /** Resolved link: /objects/{id}/ if the dashboard exists, otherwise /gateway/apps/{firstAppId}?template=list_page */
  href: string;
}

let _cachedAppGroups: AppGroupInfo[] | null = null;

export async function getAppGroups(): Promise<AppGroupInfo[]> {
  if (_cachedAppGroups) return _cachedAppGroups;
  const raw = await callApi('GET', '/appgroups?with=apps');
  const groups: AppGroupInfo[] = Object.values(raw)
    .map((g: any) => {
      const firstAppId = Object.keys(g.apps ?? {})[0] ?? g.id;
      return {
        id: g.id,
        name: g.name,
        image: g.image ?? null,
        createdat: g.createdat ?? '',
        href: `/gateway/apps/${firstAppId}?template=list_page`,
        _firstAppId: firstAppId,
      };
    })
    .sort((a, b) => b.createdat.localeCompare(a.createdat));

  // Check which appgroups have a deployed dashboard via app params
  const paramChecks = await Promise.allSettled(
    groups.map(g => callApi('GET', `/apps/${(g as any)._firstAppId}/params/la_page_header_additional_url`, undefined, { silent: true }))
  );
  paramChecks.forEach((result, i) => {
    if (result.status !== 'fulfilled' || !result.value) return;
    const url = result.value.value;
    if (typeof url === 'string' && url.length > 0) {
      try { groups[i].href = new URL(url).pathname; } catch { groups[i].href = url; }
    }
  });

  // Clean up internal helper property
  groups.forEach(g => delete (g as any)._firstAppId);

  _cachedAppGroups = groups;
  return _cachedAppGroups;
}

export class LivingAppsService {
  // --- PERSONEN ---
  static async getPersonen(): Promise<Personen[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.PERSONEN}/records`);
    const records = Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    })) as Personen[];
    return enrichLookupFields(records, 'personen');
  }
  static async getPersonenEntry(id: string): Promise<Personen | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.PERSONEN}/records/${id}`);
    const record = { record_id: data.id, ...data } as Personen;
    return enrichLookupFields([record], 'personen')[0];
  }
  static async createPersonenEntry(fields: CreatePersonen) {
    return callApi('POST', `/apps/${APP_IDS.PERSONEN}/records`, { fields: cleanFieldsForApi(fields as any, 'personen') });
  }
  static async updatePersonenEntry(id: string, fields: Partial<CreatePersonen>) {
    return callApi('PATCH', `/apps/${APP_IDS.PERSONEN}/records/${id}`, { fields: cleanFieldsForApi(fields as any, 'personen') });
  }
  static async deletePersonenEntry(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.PERSONEN}/records/${id}`);
  }

  // --- UNTERNEHMEN ---
  static async getUnternehmen(): Promise<Unternehmen[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.UNTERNEHMEN}/records`);
    const records = Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    })) as Unternehmen[];
    return enrichLookupFields(records, 'unternehmen');
  }
  static async getUnternehmenEntry(id: string): Promise<Unternehmen | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.UNTERNEHMEN}/records/${id}`);
    const record = { record_id: data.id, ...data } as Unternehmen;
    return enrichLookupFields([record], 'unternehmen')[0];
  }
  static async createUnternehmenEntry(fields: CreateUnternehmen) {
    return callApi('POST', `/apps/${APP_IDS.UNTERNEHMEN}/records`, { fields: cleanFieldsForApi(fields as any, 'unternehmen') });
  }
  static async updateUnternehmenEntry(id: string, fields: Partial<CreateUnternehmen>) {
    return callApi('PATCH', `/apps/${APP_IDS.UNTERNEHMEN}/records/${id}`, { fields: cleanFieldsForApi(fields as any, 'unternehmen') });
  }
  static async deleteUnternehmenEntry(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.UNTERNEHMEN}/records/${id}`);
  }

  // --- BETEILIGUNGEN ---
  static async getBeteiligungen(): Promise<Beteiligungen[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.BETEILIGUNGEN}/records`);
    const records = Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    })) as Beteiligungen[];
    return enrichLookupFields(records, 'beteiligungen');
  }
  static async getBeteiligungenEntry(id: string): Promise<Beteiligungen | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.BETEILIGUNGEN}/records/${id}`);
    const record = { record_id: data.id, ...data } as Beteiligungen;
    return enrichLookupFields([record], 'beteiligungen')[0];
  }
  static async createBeteiligungenEntry(fields: CreateBeteiligungen) {
    return callApi('POST', `/apps/${APP_IDS.BETEILIGUNGEN}/records`, { fields: cleanFieldsForApi(fields as any, 'beteiligungen') });
  }
  static async updateBeteiligungenEntry(id: string, fields: Partial<CreateBeteiligungen>) {
    return callApi('PATCH', `/apps/${APP_IDS.BETEILIGUNGEN}/records/${id}`, { fields: cleanFieldsForApi(fields as any, 'beteiligungen') });
  }
  static async deleteBeteiligungenEntry(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.BETEILIGUNGEN}/records/${id}`);
  }

  // --- GREMIEN_&_TERMINE ---
  static async getGremienTermine(): Promise<GremienTermine[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.GREMIEN_TERMINE}/records`);
    const records = Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    })) as GremienTermine[];
    return enrichLookupFields(records, 'gremien_&_termine');
  }
  static async getGremienTermineEntry(id: string): Promise<GremienTermine | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.GREMIEN_TERMINE}/records/${id}`);
    const record = { record_id: data.id, ...data } as GremienTermine;
    return enrichLookupFields([record], 'gremien_&_termine')[0];
  }
  static async createGremienTermineEntry(fields: CreateGremienTermine) {
    return callApi('POST', `/apps/${APP_IDS.GREMIEN_TERMINE}/records`, { fields: cleanFieldsForApi(fields as any, 'gremien_&_termine') });
  }
  static async updateGremienTermineEntry(id: string, fields: Partial<CreateGremienTermine>) {
    return callApi('PATCH', `/apps/${APP_IDS.GREMIEN_TERMINE}/records/${id}`, { fields: cleanFieldsForApi(fields as any, 'gremien_&_termine') });
  }
  static async deleteGremienTermineEntry(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.GREMIEN_TERMINE}/records/${id}`);
  }

  // --- DOKUMENTE ---
  static async getDokumente(): Promise<Dokumente[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.DOKUMENTE}/records`);
    const records = Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    })) as Dokumente[];
    return enrichLookupFields(records, 'dokumente');
  }
  static async getDokumenteEntry(id: string): Promise<Dokumente | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.DOKUMENTE}/records/${id}`);
    const record = { record_id: data.id, ...data } as Dokumente;
    return enrichLookupFields([record], 'dokumente')[0];
  }
  static async createDokumenteEntry(fields: CreateDokumente) {
    return callApi('POST', `/apps/${APP_IDS.DOKUMENTE}/records`, { fields: cleanFieldsForApi(fields as any, 'dokumente') });
  }
  static async updateDokumenteEntry(id: string, fields: Partial<CreateDokumente>) {
    return callApi('PATCH', `/apps/${APP_IDS.DOKUMENTE}/records/${id}`, { fields: cleanFieldsForApi(fields as any, 'dokumente') });
  }
  static async deleteDokumenteEntry(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.DOKUMENTE}/records/${id}`);
  }

  // --- NOTIZEN ---
  static async getNotizen(): Promise<Notizen[]> {
    const data = await callApi('GET', `/apps/${APP_IDS.NOTIZEN}/records`);
    const records = Object.entries(data).map(([id, rec]: [string, any]) => ({
      record_id: id, ...rec
    })) as Notizen[];
    return enrichLookupFields(records, 'notizen');
  }
  static async getNotizenEntry(id: string): Promise<Notizen | undefined> {
    const data = await callApi('GET', `/apps/${APP_IDS.NOTIZEN}/records/${id}`);
    const record = { record_id: data.id, ...data } as Notizen;
    return enrichLookupFields([record], 'notizen')[0];
  }
  static async createNotizenEntry(fields: CreateNotizen) {
    return callApi('POST', `/apps/${APP_IDS.NOTIZEN}/records`, { fields: cleanFieldsForApi(fields as any, 'notizen') });
  }
  static async updateNotizenEntry(id: string, fields: Partial<CreateNotizen>) {
    return callApi('PATCH', `/apps/${APP_IDS.NOTIZEN}/records/${id}`, { fields: cleanFieldsForApi(fields as any, 'notizen') });
  }
  static async deleteNotizenEntry(id: string) {
    return callApi('DELETE', `/apps/${APP_IDS.NOTIZEN}/records/${id}`);
  }

}
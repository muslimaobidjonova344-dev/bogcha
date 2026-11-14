export class ApiError extends Error {
  status: number;
  code: string;
  fields?: { field: string; message: string }[];
  constructor(status: number, code: string, message: string, fields?: any) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

const BASE = '/api/v1';
let refreshing: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (!refreshing) {
    refreshing = fetch(`${BASE}/auth/refresh`, { method: 'POST', credentials: 'include', headers: { 'X-Requested-With': 'bogcha' } })
      .then((r) => r.ok)
      .catch(() => false)
      .finally(() => { setTimeout(() => (refreshing = null), 500); });
  }
  return refreshing;
}

export async function api<T = any>(path: string, opts: { method?: string; body?: any; query?: Record<string, any>; formData?: FormData; noRefresh?: boolean } = {}): Promise<T> {
  const { method = 'GET', body, query, formData, noRefresh } = opts;
  let url = BASE + path;
  if (query) {
    const qs = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '' && v !== false) qs.set(k, String(v)); });
    const s = qs.toString();
    if (s) url += (url.includes('?') ? '&' : '?') + s;
  }
  const headers: Record<string, string> = { 'X-Requested-With': 'bogcha' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(url, { method, credentials: 'include', headers, body: formData ?? (body !== undefined ? JSON.stringify(body) : undefined) });
  if (res.status === 401 && !noRefresh && !path.startsWith('/auth/login') && !path.startsWith('/auth/refresh')) {
    if (await tryRefresh()) return api<T>(path, { ...opts, noRefresh: true });
  }
  if (!res.ok) {
    let data: any = null;
    try { data = await res.json(); } catch {}
    const e = data?.error;
    throw new ApiError(res.status, e?.code || 'error', e?.message || 'Xatolik yuz berdi', e?.fields);
  }
  if (res.status === 204) return undefined as T;
  const ct = res.headers.get('content-type') || '';
  return (ct.includes('json') ? res.json() : (res.text() as any)) as Promise<T>;
}

export const get = <T = any>(p: string, query?: Record<string, any>) => api<T>(p, { query });
export const post = <T = any>(p: string, body?: any) => api<T>(p, { method: 'POST', body: body ?? {} });
export const put = <T = any>(p: string, body?: any) => api<T>(p, { method: 'PUT', body: body ?? {} });
export const patch = <T = any>(p: string, body?: any) => api<T>(p, { method: 'PATCH', body: body ?? {} });
export const del = <T = any>(p: string) => api<T>(p, { method: 'DELETE' });

export async function uploadFile(file: File, kind: 'public-image' | 'private') {
  const fd = new FormData();
  fd.append('file', file);
  return api<any>(`/files/${kind}`, { method: 'POST', formData: fd });
}

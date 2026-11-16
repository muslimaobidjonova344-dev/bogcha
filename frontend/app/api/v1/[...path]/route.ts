import { NextRequest } from 'next/server';

// Backendga ishonchli proxy: ulanish uzilsa (ECONNRESET, uxlab turgan server) qayta urinadi,
// muvaffaqiyatsiz bo'lsa sababini JSON ko'rinishida qaytaradi (UI shuni ko'rsatadi).
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const BACKEND = (process.env.BACKEND_URL || 'http://localhost:8000').replace(/\/$/, '');
const SKIP_REQ = new Set(['host', 'connection', 'keep-alive', 'transfer-encoding', 'te', 'upgrade', 'content-length', 'accept-encoding', 'proxy-authorization']);
const SKIP_RES = new Set(['connection', 'keep-alive', 'transfer-encoding', 'content-encoding', 'content-length', 'set-cookie']);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function proxy(req: NextRequest, ctx: { params: { path: string[] } }) {
  const url = `${BACKEND}/api/v1/${ctx.params.path.join('/')}${req.nextUrl.search}`;
  const headers = new Headers();
  req.headers.forEach((v, k) => { if (!SKIP_REQ.has(k.toLowerCase())) headers.set(k, v); });
  const hasBody = !['GET', 'HEAD'].includes(req.method);
  const body = hasBody ? await req.arrayBuffer() : undefined;

  let lastErr = '';
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url, { method: req.method, headers, body: body && body.byteLength ? body : undefined, redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(60_000) });
      const out = new Headers();
      res.headers.forEach((v, k) => { if (!SKIP_RES.has(k.toLowerCase())) out.set(k, v); });
      const cookies: string[] = (res.headers as any).getSetCookie?.() || [];
      cookies.forEach((c) => out.append('set-cookie', c));
      return new Response(res.status === 204 || res.status === 304 ? null : res.body, { status: res.status, headers: out });
    } catch (e: any) {
      lastErr = `${e?.cause?.code || e?.name || 'xato'}: ${e?.cause?.message || e?.message || ''}`.slice(0, 160);
      console.error(`[proxy] ${req.method} ${url} urinish ${attempt + 1} muvaffaqiyatsiz: ${lastErr}`);
      await sleep(600 * (attempt + 1));
    }
  }
  return Response.json({ error: { code: 'upstream_unreachable', message: `Server bilan aloqa o‘rnatilmadi (${lastErr}). Birozdan so‘ng qayta urinib ko‘ring.` } }, { status: 502 });
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE, proxy as HEAD };

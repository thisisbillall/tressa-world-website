'use client';

// Fetch + parse helper that tolerates empty bodies and surfaces server errors.
// Server routes all return JSON via lib/apiError; but if a middleware, proxy or
// crash produces an empty body, we synthesise a readable Error instead of the
// opaque "Unexpected end of JSON input".

export type ApiResult<T = any> = { success: true; data: T } & Record<string, any>;

export async function apiFetch<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(input, init);
  } catch (e: any) {
    throw new Error(`Network error: ${e?.message || 'fetch failed'}`);
  }

  const text = await res.text();
  let json: any = null;
  if (text) {
    try { json = JSON.parse(text); } catch { /* keep null */ }
  }

  if (!res.ok) {
    const msg = json?.error || text || `Request failed (${res.status} ${res.statusText || ''})`.trim();
    const err = new Error(msg);
    (err as any).status = res.status;
    (err as any).code = json?.code;
    throw err;
  }

  if (!json) {
    throw new Error(`Empty response from ${typeof input === 'string' ? input : String(input)}`);
  }
  if (json.success === false) {
    const err = new Error(json.error || 'Request failed');
    (err as any).code = json.code;
    throw err;
  }

  return json as ApiResult<T>;
}


const BASE = new URL('../api/', document.baseURI);
let csrfToken = null;

export class ApiError extends Error {
  constructor(message, status, fields = null) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

export function setCsrf(token) {
  csrfToken = token;
}

export async function api(path, { method = 'GET', body, timeout = 12000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  const headers = { Accept: 'application/json' };
  if (method !== 'GET') {
    headers['Content-Type'] = 'application/json';
    if (csrfToken) headers['X-CSRF-Token'] = csrfToken;
  }

  let res;
  try {
    res = await fetch(new URL(path, BASE), {
      method,
      headers,
      credentials: 'same-origin',
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    throw new ApiError(err.name === 'AbortError' ? 'The jungle is taking too long to answer — try again!' : 'Connection lost — check your internet and try again.', 0);
  } finally {
    clearTimeout(timer);
  }

  let data = {};
  try {
    data = await res.json();
  } catch {
  }
  if (!res.ok) throw new ApiError(data.error || `Request failed (${res.status})`, res.status, data.fields || null);
  if (data.csrf) setCsrf(data.csrf);
  return data;
}

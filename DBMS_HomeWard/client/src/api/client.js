// One small helper around fetch so every request:
// 1. sends the login cookie (credentials: 'include')
// 2. turns JSON responses into objects
// 3. throws a readable Error when the server says something went wrong
const BASE = import.meta.env.VITE_API_URL || ''; // empty = same origin (Vite proxy)

export async function api(path, { method = 'GET', body, headers } = {}) {
  const isFormData = body instanceof FormData;

  const res = await fetch(`${BASE}/api${path}`, {
    method,
    credentials: 'include',
    headers: isFormData ? headers : { 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.message || `Request failed (${res.status})`);
    error.status = res.status;
    throw error;
  }
  return data;
}

// Builds the full URL for an uploaded photo like "/uploads/abc.jpg".
export function photoUrl(path) {
  if (!path) return '';
  return `${BASE}${path}`;
}

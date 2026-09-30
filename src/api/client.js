// Cliente HTTP central: un solo lugar que conoce la URL base de la API y
// adjunta el token JWT en las peticiones autenticadas.
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

export function getToken() {
  return localStorage.getItem('token');
}

export async function apiFetch(path, { method = 'GET', body, auth = false, isForm = false, apiKey } = {}) {
  const headers = {};
  if (body && !isForm) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  if (apiKey) headers['X-API-Key'] = apiKey;

  const res = await fetch(BASE_URL + path, {
    method,
    headers,
    body: isForm ? body : body ? JSON.stringify(body) : undefined
  });

  let data = null;
  try { data = await res.json(); } catch { /* respuesta sin cuerpo JSON */ }

  // Sesión caducada o inválida en una petición autenticada: se cierra la
  // sesión y se manda a iniciar sesión. Antes el panel se quedaba mostrando
  // "Token inválido o expirado" (y la lista de productos vacía) sin salida.
  const codigo = data && data.error && data.error.code;
  if (auth && res.status === 401 && ['INVALID_TOKEN', 'NO_TOKEN', 'ACCOUNT_INACTIVE'].includes(codigo)) {
    let role = null;
    try { role = JSON.parse(localStorage.getItem('user') || 'null')?.role; } catch { /* user corrupto */ }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Un cliente (role usuario) vuelve a /clientes y regresa a la misma página.
    const destino = role === 'usuario'
      ? `/clientes?expirada=1&next=${encodeURIComponent(window.location.pathname + window.location.search)}`
      : '/login?expirada=1';
    if (!/^\/(login|clientes)/.test(window.location.pathname)) window.location.assign(destino);
  }

  if (!res.ok) {
    const error = new Error((data && data.message) || `Error ${res.status}`);
    error.status = res.status;
    error.code = data && data.error && data.error.code;
    error.fields = data && data.error && data.error.fields; // errores de validación por campo
    throw error;
  }
  return data;
}

export { BASE_URL };

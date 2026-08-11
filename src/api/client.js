// Cliente HTTP central: un solo lugar que conoce la URL base de la API y
// adjunta el token JWT en las peticiones autenticadas.
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

export function getToken() {
  return localStorage.getItem('token');
}

export async function apiFetch(path, { method = 'GET', body, auth = false, isForm = false } = {}) {
  const headers = {};
  if (body && !isForm) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(BASE_URL + path, {
    method,
    headers,
    body: isForm ? body : body ? JSON.stringify(body) : undefined
  });

  let data = null;
  try { data = await res.json(); } catch { /* respuesta sin cuerpo JSON */ }

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

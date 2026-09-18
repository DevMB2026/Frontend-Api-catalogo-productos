import { apiFetch } from './client';

const BASE = '/usuarios-precios';

// Gestión de "usuarios con acceso a precios" desde el panel admin (JWT).
// Nunca toca /distribuidores ni /products — recurso completamente aparte.
export const listPriceUsers = () => apiFetch(BASE, { auth: true });
export const getPriceUser = (id) => apiFetch(`${BASE}/${id}`, { auth: true });
export const createPriceUser = (body) => apiFetch(BASE, { method: 'POST', body, auth: true });
export const updatePriceUser = (id, body) => apiFetch(`${BASE}/${id}`, { method: 'PATCH', body, auth: true });
export const resetPriceUserPassword = (id) => apiFetch(`${BASE}/${id}/reset-password`, { method: 'POST', auth: true });

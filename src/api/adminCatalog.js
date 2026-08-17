import { apiFetch } from './client';

const BASE = '/catalogos';

// El listado es público (WordPress también puede usarlo), pero el detalle
// completo (con los productos adicionales populados) es solo admin.
export const listCatalogs = () => apiFetch(BASE);
export const getCatalog = (id) => apiFetch(`${BASE}/${id}`, { auth: true });
export const createCatalog = (body) => apiFetch(BASE, { method: 'POST', body, auth: true });
export const updateCatalog = (id, body) => apiFetch(`${BASE}/${id}`, { method: 'PATCH', body, auth: true });
export const deleteCatalog = (id) => apiFetch(`${BASE}/${id}`, { method: 'DELETE', auth: true });

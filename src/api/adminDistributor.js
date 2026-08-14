import { apiFetch } from './client';

const BASE = '/distribuidores';

// Gestión de distribuidores desde el panel admin (JWT). Sin marcas: el admin
// solo crea la cuenta y controla la API Key; el propio distribuidor elige
// qué marcas consultar desde /distribuidor.
export const listDistributors = () => apiFetch(BASE, { auth: true });
export const getDistributor = (id) => apiFetch(`${BASE}/${id}`, { auth: true });
export const createDistributor = (body) => apiFetch(BASE, { method: 'POST', body, auth: true });
export const updateDistributor = (id, body) => apiFetch(`${BASE}/${id}`, { method: 'PATCH', body, auth: true });
export const regenerateDistributorKey = (id) => apiFetch(`${BASE}/${id}/regenerar-key`, { method: 'POST', auth: true });
export const revokeDistributorKey = (id) => apiFetch(`${BASE}/${id}/revocar-key`, { method: 'POST', auth: true });

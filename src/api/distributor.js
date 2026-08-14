import { apiFetch } from './client';

// Catálogo para distribuidores — requiere API Key propia (header X-API-Key),
// no el JWT de admin. La key se recibe como parámetro y nunca se persiste aquí.
export const listDistributorProducts = (apiKey) => apiFetch('/distribuidores/productos', { apiKey });

import { apiFetch } from './client';

// Precios privados de un producto — SOLO admin (protect+requireAdmin en el
// backend). A propósito en su propio módulo, separado de src/api/catalog.js
// (el cliente del catálogo público): así es imposible que un payload de
// producto público termine arrastrando un precio por copiar/pegar entre
// funciones de ese archivo.
export const getProductPrices = (id) => apiFetch(`/products/${id}/prices`, { auth: true });
export const updateProductPrices = (id, body) => apiFetch(`/products/${id}/prices`, { method: 'PATCH', body, auth: true });

import { apiFetch } from './client';

// Precios de un producto para la persona con sesión iniciada (JWT +
// pricePermissions, ver /precios en el backend). El backend devuelve SOLO los
// niveles que esa persona tiene permitidos. En su propio módulo, separado de
// src/api/catalog.js (catálogo público) y de adminPrice.js (panel admin).
export const getMisPrecios = (productId) => apiFetch(`/precios/productos/${productId}`, { auth: true });

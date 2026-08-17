import { apiFetch } from './client';

// --- Lectura (pública) ---
export const listProducts = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return apiFetch(`/products${qs ? '?' + qs : ''}`);
};
export const getProduct = (id) => apiFetch(`/products/${id}`);
export const getProductBySlug = (slug) => apiFetch(`/products/slug/${slug}`);
export const listBrands = () => apiFetch('/brands');
export const listCategories = () => apiFetch('/categories');

// --- Escritura (requiere token admin) ---
export const createProduct = (body) => apiFetch('/products', { method: 'POST', body, auth: true });
export const updateProduct = (id, body) => apiFetch(`/products/${id}`, { method: 'PATCH', body, auth: true });
export const deleteProduct = (id, hard = false) =>
  apiFetch(`/products/${id}${hard ? '?hard=true' : ''}`, { method: 'DELETE', auth: true });

// Subida de imágenes a una variante (multipart)
export const uploadImages = (id, files, { color, variantId } = {}) => {
  const form = new FormData();
  for (const file of files) form.append('imagenes', file);
  if (color) form.append('color', color);
  if (variantId) form.append('variantId', variantId);
  return apiFetch(`/products/${id}/images`, { method: 'POST', body: form, auth: true, isForm: true });
};

// Borrar una imagen concreta (por public_id) — también la elimina de Cloudinary.
export const deleteImage = (id, publicId) =>
  apiFetch(`/products/${id}/images?public_id=${encodeURIComponent(publicId)}`, { method: 'DELETE', auth: true });

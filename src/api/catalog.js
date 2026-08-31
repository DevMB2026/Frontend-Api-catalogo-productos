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

// Subida de imágenes a la galería del producto. `optionValue` (opcional) es
// el id del color al que quedan ligadas — se comparten entre todas las
// tallas de ese color. Sin `optionValue`, la imagen es general.
export const uploadImages = (id, files, { optionValue } = {}) => {
  const form = new FormData();
  for (const file of files) form.append('imagenes', file);
  if (optionValue) form.append('optionValue', optionValue);
  return apiFetch(`/products/${id}/images`, { method: 'POST', body: form, auth: true, isForm: true });
};

// Borrar una imagen concreta (por public_id) — también la elimina de Cloudinary.
export const deleteImage = (id, publicId) =>
  apiFetch(`/products/${id}/images?public_id=${encodeURIComponent(publicId)}`, { method: 'DELETE', auth: true });

// Etiqueta a qué género corresponde una foto (null = sirve para ambos).
export const setImageGenero = (id, publicId, sexo) =>
  apiFetch(`/products/${id}/images`, { method: 'PATCH', body: { public_id: publicId, sexo }, auth: true });

// Mueve una foto ya subida a otro color (o a la galería general si
// optionValue es null) sin volver a subirla.
export const setImageColor = (id, publicId, optionValue) =>
  apiFetch(`/products/${id}/images`, { method: 'PATCH', body: { public_id: publicId, optionValue: optionValue || null }, auth: true });

// Reordena las imágenes de un color (o de la galería general si no se manda
// optionValue). `publicIds` debe traer TODAS las imágenes de ese grupo, en
// el orden deseado.
export const reorderImages = (id, { optionValue, publicIds }) =>
  apiFetch(`/products/${id}/images/order`, { method: 'PATCH', body: { optionValue: optionValue || null, publicIds }, auth: true });

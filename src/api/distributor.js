import { apiFetch } from './client';

// Catálogo para distribuidores — requiere API Key propia (header X-API-Key),
// no el JWT de admin. La key se recibe como parámetro y nunca se persiste aquí.
// brandSlugs: marcas que el propio distribuidor eligió consultar (libre,
// no hay restricción por cuenta) -> ?brands=marca-a,marca-b.
export const listDistributorProducts = (apiKey, brandSlugs = []) => {
  const qs = brandSlugs.length > 0 ? `?brands=${brandSlugs.map(encodeURIComponent).join(',')}` : '';
  return apiFetch(`/distribuidores/productos${qs}`, { apiKey });
};

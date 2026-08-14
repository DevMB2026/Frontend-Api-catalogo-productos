import { apiFetch } from './client';

const qs = (params = {}) => {
  const s = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  ).toString();
  return s ? `?${s}` : '';
};

// Genera las funciones CRUD estándar para un recurso del motor PIM.
function crud(base) {
  return {
    list: (params) => apiFetch(`${base}${qs(params)}`),
    get: (id) => apiFetch(`${base}/${id}`),
    create: (body) => apiFetch(base, { method: 'POST', body, auth: true }),
    update: (id, body) => apiFetch(`${base}/${id}`, { method: 'PATCH', body, auth: true }),
    remove: (id) => apiFetch(`${base}/${id}`, { method: 'DELETE', auth: true })
  };
}

export const attributesApi = crud('/attributes');
export const featuresApi = crud('/features');
export const applicationsApi = crud('/applications');
export const optionsApi = crud('/options');
export const optionValuesApi = crud('/option-values');
export const sizeChartsApi = crud('/size-charts');
export const categoriesApi = crud('/categories'); // list/create/update/remove (get(id) no aplica: usar list)
export const brandsApi = crud('/brands'); // CRUD dinámico de marcas

// Esquema del formulario dinámico (atributos de la categoría, con herencia).
export const getAttributeSchema = (categoryId) => apiFetch(`/categories/${categoryId}/attribute-schema`);

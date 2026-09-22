// Reglas de presentación de los niveles de precio — compartidas por el panel
// admin (PreciosManager) y la ficha pública para personas con permiso
// (MisPrecios), para que ambos muestren los mismos niveles y rangos.
//
// Menudeo, mayoreo y volumen son por cantidad; distribuidor y master son
// precios especiales (no dependen de la cantidad). Cada marca define sus
// rangos y qué niveles usa; una marca que no esté aquí muestra los 5 niveles
// sin rango. `ocultos` no se muestran en el panel ni se envían al guardar.
// Esto es solo presentación: qué precios puede LEER cada persona lo decide
// siempre el backend (pricePermissions).
export const TIPOS = [
  { key: 'menudeo', label: 'Menudeo' },
  { key: 'mayoreo', label: 'Mayoreo' },
  { key: 'volumen', label: 'Volumen' },
  { key: 'distribuidor', label: 'Distribuidor' },
  { key: 'master', label: 'Master' }
];
const REGLAS_BE_FRESH = {
  rangos: { menudeo: '1–11 pzas', mayoreo: '12 pzas o más', master: 'precio especial' },
  ocultos: ['volumen', 'distribuidor'] // volumen (201+) es solo de Prezenza; distribuidor no aplica en Be Fresh ni Security
};
const REGLAS_CINCO_NIVELES = {
  rangos: { menudeo: '1–30 pzas', mayoreo: '31–200 pzas', volumen: '201 pzas o más', distribuidor: 'precio especial', master: 'precio especial' },
  ocultos: []
};
const REGLAS_POR_MARCA = {
  prezenza: REGLAS_CINCO_NIVELES,
  fitbefresh: REGLAS_BE_FRESH,
  befreshsecurity: REGLAS_BE_FRESH
};
// Excepciones puntuales a la regla de su marca (por _id de producto).
const REGLAS_POR_PRODUCTO = {
  '6a7decbc3d905ef7b12aaa27': REGLAS_CINCO_NIVELES // Camisa Pescadora (Fit Be Fresh): maneja los 5 niveles
};
const SIN_REGLAS = { rangos: {}, ocultos: [] };

export const reglasPrecio = (productId, brandSlug) =>
  REGLAS_POR_PRODUCTO[productId] || REGLAS_POR_MARCA[brandSlug] || SIN_REGLAS;

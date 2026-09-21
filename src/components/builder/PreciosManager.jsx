import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getProductPrices, updateProductPrices } from '../../api/adminPrice';

const inputCls = 'w-full border border-gray-300 rounded-md pl-6 pr-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

// Menudeo, mayoreo y volumen son por cantidad; distribuidor y master son
// precios especiales (no dependen de la cantidad). Cada marca define sus
// rangos y qué niveles usa; una marca que no esté aquí muestra los 5 niveles
// sin rango. `ocultos` no se muestran ni se envían al guardar (no se tocan).
const TIPOS = [
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
const REGLAS_POR_MARCA = {
  prezenza: {
    rangos: { menudeo: '1–30 pzas', mayoreo: '31–200 pzas', volumen: '201 pzas o más', distribuidor: 'precio especial', master: 'precio especial' },
    ocultos: []
  },
  fitbefresh: REGLAS_BE_FRESH,
  befreshsecurity: REGLAS_BE_FRESH
};
const EMPTY_FORM = { menudeo: '', mayoreo: '', volumen: '', distribuidor: '', master: '' };

const toInputValue = (v) => (v === null || v === undefined ? '' : String(v));

// Precios: SIEMPRE se leen y guardan por su propio endpoint admin
// (/products/:id/prices) — nunca vienen embebidos en `product` (el catálogo
// público jamás los incluye, así que tampoco existen en la respuesta de
// getProduct que usa el resto del formulario). Guardar aquí NO toca
// variantes, colores, tallas, imágenes, marca ni categoría, y viceversa: es
// independiente del submit general del producto. Sin overridesPorVariante:
// esta pantalla solo maneja los 5 precios a nivel producto.
export default function PreciosManager({ productId, brandSlug }) {
  const qc = useQueryClient();
  const reglas = REGLAS_POR_MARCA[brandSlug] || { rangos: {}, ocultos: [] };
  const visibles = TIPOS.filter(({ key }) => !reglas.ocultos.includes(key));
  const { data, isLoading } = useQuery({
    queryKey: ['product-prices', productId],
    queryFn: () => getProductPrices(productId),
    enabled: !!productId
  });
  const prices = data?.data;

  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [saved, setSaved] = useState(false);

  // Precarga los valores actuales cuando llegan del servidor. Un precio en
  // null se muestra vacío ("aún no definido") — nunca se inventa un valor.
  // OJO: no resetea `saved` aquí — este efecto también corre justo después
  // de guardar (el refetch de save() cambia `prices`), y resetearlo ahí
  // taparía el "Guardado ✓" antes de que el admin llegue a verlo. `setField`
  // ya se encarga de apagarlo en cuanto el admin vuelve a escribir.
  useEffect(() => {
    if (!prices) return;
    setForm({
      menudeo: toInputValue(prices.menudeo),
      mayoreo: toInputValue(prices.mayoreo),
      volumen: toInputValue(prices.volumen),
      distribuidor: toInputValue(prices.distribuidor),
      master: toInputValue(prices.master)
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prices]);

  const setField = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setSaved(false); setFieldErrors((fe) => ({ ...fe, [k]: undefined })); };

  const dirty = !!prices && visibles.some(({ key }) => toInputValue(prices[key]) !== form[key]);

  const save = async () => {
    setBusy(true); setError(null); setFieldErrors({});
    try {
      const payload = {};
      const errs = {};
      for (const { key, label } of visibles) {
        const raw = form[key].trim();
        if (raw === '') { payload[key] = null; continue; }
        const num = Number(raw);
        if (Number.isNaN(num) || num < 0) { errs[key] = `${label} debe ser un número válido, mayor o igual a 0`; continue; }
        payload[key] = num;
      }
      if (Object.keys(errs).length > 0) { setFieldErrors(errs); return; }

      await updateProductPrices(productId, payload);
      await qc.invalidateQueries({ queryKey: ['product-prices', productId] });
      setSaved(true);
    } catch (e) {
      setError(e.message || 'No se pudieron guardar los precios');
      setFieldErrors(e.fields || {});
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) return <p className="text-sm text-gray-400">Cargando precios…</p>;

  return (
    <div className="space-y-3">
      {error && <div className="bg-red-50 text-red-700 text-sm rounded-md px-3 py-2">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {visibles.map(({ key, label }) => (
          <div key={key}>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              {label}{reglas.rangos[key] && <span className="text-gray-400 font-normal"> · {reglas.rangos[key]}</span>}
            </label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                type="number" min="0" step="0.01" placeholder="Sin definir"
                className={inputCls}
                value={form[key]}
                onChange={(e) => setField(key, e.target.value)}
              />
            </div>
            {fieldErrors[key] && <p className="text-xs text-red-600 mt-1">{fieldErrors[key]}</p>}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button type="button" disabled={busy || !dirty} onClick={save}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-md">
          {busy ? 'Guardando…' : 'Guardar precios'}
        </button>
        {saved && !dirty && <span className="text-xs text-green-600">Guardado ✓</span>}
      </div>
    </div>
  );
}

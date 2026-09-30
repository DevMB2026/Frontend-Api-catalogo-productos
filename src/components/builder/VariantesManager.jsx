import { useState, useEffect } from 'react';
import { updateProduct } from '../../api/catalog';
import { valoresComunes } from '../../lib/variantModel';

const idOf = (x) => (x && x._id) ? x._id : x;
const inputCls = 'w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

// Stock y composición son un solo valor para TODO el producto (no varían por
// talla/color en la práctica) — se aplican a todas las variantes al guardar.
// Necesita el _id de cada variante, que solo existe tras crear el producto.
// Las imágenes NO se tocan aquí: viven en product.media (ver MediaManager).
export default function VariantesManager({ productId, product, onChanged }) {
  const variants = product.variants || [];
  const [stock, setStockValue] = useState(0);
  const [composicion, setComposicion] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  // Si el producto se recarga (tras guardar u otra edición), precarga los
  // valores actuales: el que más se repite, ignorando variantes vacías. Antes
  // bastaba UNA variante sin composición (ej. una talla agregada después)
  // para que el campo saliera vacío y pareciera que no se había guardado.
  useEffect(() => {
    setSaved(false);
    const comunes = valoresComunes(variants);
    setComposicion(comunes.composicion);
    setStockValue(comunes.stock);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product]);

  const dirty = variants.some((v) => (v.composicion || '') !== composicion || (v.stock || 0) !== Number(stock));
  const sinComposicion = composicion ? variants.filter((v) => (v.composicion || '') !== composicion).length : 0;

  const save = async () => {
    setBusy(true); setError(null);
    try {
      const payload = variants.map((v) => ({
        sku: v.sku,
        skusErp: v.skusErp?.length ? v.skusErp.map(({ sku, sexo }) => ({ sku, sexo })) : undefined,
        optionValues: (v.optionValues || []).map(idOf),
        composicion: composicion || undefined,
        stock: Number(stock) || 0,
        activo: v.activo !== false
      }));
      await updateProduct(productId, { variants: payload });
      await onChanged();
      setSaved(true);
    } catch (e) {
      setError(e.message || 'No se pudo guardar');
    } finally {
      setBusy(false);
    }
  };

  if (variants.length === 0) {
    return <p className="text-sm text-gray-400">Aún no hay variantes. Define tallas y colores arriba y guarda el producto primero.</p>;
  }

  return (
    <div className="space-y-3">
      {error && <div className="bg-red-50 text-red-700 text-sm rounded-md px-3 py-2">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-[8rem_1fr] gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Stock (todas las tallas y colores)</label>
          <input type="number" min="0" className={inputCls} value={stock}
            onChange={(e) => { setStockValue(e.target.value); setSaved(false); }} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Composición (todas las tallas y colores)</label>
          <input className={inputCls} placeholder="60% algodón, 40% poliéster"
            value={composicion} onChange={(e) => { setComposicion(e.target.value); setSaved(false); }} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button type="button" disabled={busy || !dirty} onClick={save}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-md">
          {busy ? 'Guardando…' : 'Guardar stock y composición'}
        </button>
        {saved && !dirty && <span className="text-xs text-green-600">Guardado ✓</span>}
        {!busy && sinComposicion > 0 && (
          <span className="text-xs text-amber-700">
            {sinComposicion} de {variants.length} variantes tienen otra composición o ninguna (ej. tallas agregadas después). Guarda para aplicarla a todas.
          </span>
        )}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { updateProduct } from '../../api/catalog';
import { swatchBg } from '../../lib/colors';

const idOf = (x) => String((x && x._id) ? x._id : x);

// Oculta colores del catálogo SIN borrarlos (Product.valoresOcultos): sus
// variantes, SKUs y fotos se conservan, pero la API no los manda a WordPress,
// distribuidores ni clientes. Se guarda al instante, aparte del formulario.
export default function ColoresOcultos({ productId, product, colorOptionId, onChanged }) {
  const colorOpt = (product.options || []).find((o) => idOf(o.option) === String(colorOptionId));
  const colores = colorOpt?.values || [];
  const ocultos = new Set((product.valoresOcultos || []).map(idOf));
  const [busy, setBusy] = useState(null); // id del color que se está guardando
  const [error, setError] = useState(null);

  const alternar = async (valor) => {
    const id = idOf(valor);
    const siguiente = new Set(ocultos);
    if (siguiente.has(id)) siguiente.delete(id); else siguiente.add(id);
    if (colores.every((c) => siguiente.has(idOf(c)))) {
      setError('Debe quedar al menos un color visible.');
      return;
    }
    setBusy(id); setError(null);
    try {
      await updateProduct(productId, { valoresOcultos: [...siguiente] });
      await onChanged();
    } catch (e) {
      setError(e.message || 'No se pudo guardar');
    } finally {
      setBusy(null);
    }
  };

  if (colores.length === 0) {
    return <p className="text-sm text-gray-400">Este producto no tiene colores guardados todavía.</p>;
  }

  const variantesDe = (valor) => (product.variants || [])
    .filter((v) => (v.optionValues || []).some((ov) => idOf(ov) === idOf(valor))).length;

  return (
    <div className="space-y-3">
      {error && <div className="bg-red-50 text-red-700 text-sm rounded-md px-3 py-2">{error}</div>}
      <div className="flex flex-wrap gap-2">
        {colores.map((c) => {
          const id = idOf(c);
          const oculto = ocultos.has(id);
          return (
            <button key={id} type="button" disabled={busy !== null} onClick={() => alternar(c)}
              title={oculto ? 'Oculto en el catálogo — clic para mostrarlo' : 'Visible en el catálogo — clic para ocultarlo'}
              className={`flex items-center gap-2 border rounded-full pl-1.5 pr-3 py-1 text-sm transition disabled:opacity-60 ${oculto
                ? 'border-dashed border-gray-300 bg-gray-50 text-gray-400'
                : 'border-gray-300 bg-white text-gray-800 hover:border-indigo-400'}`}>
              <span className={`w-5 h-5 rounded-full border border-gray-300 ${oculto ? 'opacity-40' : ''}`}
                style={{ background: swatchBg(c.valor, c.meta?.hex) }} />
              <span className={oculto ? 'line-through' : ''}>{c.valor}</span>
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${oculto ? 'bg-gray-200 text-gray-600' : 'bg-green-50 text-green-700'}`}>
                {busy === id ? 'Guardando…' : oculto ? 'Oculto' : 'Visible'}
              </span>
            </button>
          );
        })}
      </div>
      {ocultos.size > 0 && (
        <p className="text-xs text-gray-500">
          Ocultos: {colores.filter((c) => ocultos.has(idOf(c))).map((c) => `${c.valor} (${variantesDe(c)} variantes)`).join(', ')}.
          Sus SKUs, precios y fotos se conservan; al volver a mostrarlo aparece igual que antes.
        </p>
      )}
    </div>
  );
}

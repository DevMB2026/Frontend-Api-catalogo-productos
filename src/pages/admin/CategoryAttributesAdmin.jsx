import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { categoriesApi, attributesApi, getAttributeSchema } from '../../api/pim';

const TYPE_LABEL = { text: 'Texto', number: 'Número', boolean: 'Sí/No', select: 'Selección', multiselect: 'Multi' };

export default function CategoryAttributesAdmin() {
  const { id } = useParams();
  const qc = useQueryClient();

  const { data: catsData } = useQuery({ queryKey: ['categories', { activo: 'all' }], queryFn: () => categoriesApi.list({ activo: 'all' }) });
  const { data: attrsData } = useQuery({ queryKey: ['attributes', { activo: 'all' }], queryFn: () => attributesApi.list({ activo: 'all' }) });
  const { data: schemaData, refetch: refetchSchema } = useQuery({ queryKey: ['attr-schema', id], queryFn: () => getAttributeSchema(id) });

  const category = (catsData?.data || []).find((c) => c._id === id);
  const allAttrs = attrsData?.data ?? [];
  const attrById = Object.fromEntries(allAttrs.map((a) => [a._id, a]));
  const schema = schemaData?.data;

  const [assigned, setAssigned] = useState(null); // [{ attribute, required, orden }]
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [toAdd, setToAdd] = useState('');

  useEffect(() => {
    if (category && assigned === null) {
      setAssigned((category.attributeDefs || []).map((d) => ({ attribute: String(d.attribute), required: !!d.required, orden: d.orden ?? 0 })));
    }
  }, [category, assigned]);

  if (!category || assigned === null) return <p className="text-gray-500">Cargando…</p>;

  const assignedIds = new Set(assigned.map((a) => a.attribute));
  const available = allAttrs.filter((a) => !assignedIds.has(a._id));
  const inherited = (schema?.attributes || []).filter((a) => a.heredadoDe);

  const add = () => { if (!toAdd) return; setAssigned((a) => [...a, { attribute: toAdd, required: false, orden: a.length }]); setToAdd(''); };
  const remove = (attrId) => setAssigned((a) => a.filter((x) => x.attribute !== attrId));
  const toggleReq = (attrId) => setAssigned((a) => a.map((x) => (x.attribute === attrId ? { ...x, required: !x.required } : x)));
  const setOrden = (attrId, v) => setAssigned((a) => a.map((x) => (x.attribute === attrId ? { ...x, orden: Number(v) || 0 } : x)));

  async function save() {
    setSaving(true); setMsg(null);
    try {
      await categoriesApi.update(id, { attributeDefs: assigned });
      await qc.invalidateQueries({ queryKey: ['categories'] });
      await refetchSchema();
      setMsg({ type: 'ok', text: 'Atributos guardados' });
    } catch (e) {
      setMsg({ type: 'error', text: e.message || 'No se pudo guardar' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <Link to="/admin/categorias" className="text-sm text-gray-500 hover:text-gray-900">← Categorías</Link>
      <h1 className="text-2xl font-bold text-gray-900 mt-2 mb-1">Atributos de "{category.nombre}"</h1>
      <p className="text-sm text-gray-500 mb-6">Elige qué atributos aplican a esta categoría. Los del padre se heredan automáticamente.</p>

      {msg && <div className={`text-sm rounded-md px-3 py-2 mb-4 ${msg.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{msg.text}</div>}

      {/* Atributos propios */}
      <section className="bg-white rounded-lg shadow p-5 mb-5">
        <h2 className="font-semibold text-gray-900 mb-3">Atributos propios</h2>
        {assigned.length === 0 ? (
          <p className="text-sm text-gray-500 mb-3">Sin atributos propios todavía.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-gray-500 text-left"><tr>
                <th className="py-2 pr-4 font-medium">Atributo</th><th className="py-2 pr-4 font-medium">Tipo</th>
                <th className="py-2 pr-4 font-medium">Requerido</th><th className="py-2 pr-4 font-medium">Orden</th><th />
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {assigned.map((d) => {
                  const a = attrById[d.attribute];
                  return (
                    <tr key={d.attribute}>
                      <td className="py-2 pr-4 font-medium text-gray-900">{a ? a.label : '(atributo eliminado)'}</td>
                      <td className="py-2 pr-4 text-gray-600">{a ? (TYPE_LABEL[a.type] || a.type) : '—'}</td>
                      <td className="py-2 pr-4"><label className="inline-flex items-center gap-2"><input type="checkbox" checked={d.required} onChange={() => toggleReq(d.attribute)} /> obligatorio</label></td>
                      <td className="py-2 pr-4"><input type="number" value={d.orden} onChange={(e) => setOrden(d.attribute, e.target.value)} className="w-16 border border-gray-300 rounded px-2 py-1" /></td>
                      <td className="py-2"><button onClick={() => remove(d.attribute)} className="text-red-600 hover:text-red-800">Quitar</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center gap-2 mt-4">
          <select value={toAdd} onChange={(e) => setToAdd(e.target.value)} className="border border-gray-300 rounded-md px-3 py-2 text-sm">
            <option value="">Añadir atributo…</option>
            {available.map((a) => <option key={a._id} value={a._id}>{a.label} ({TYPE_LABEL[a.type] || a.type})</option>)}
          </select>
          <button onClick={add} disabled={!toAdd} className="text-sm bg-gray-100 hover:bg-gray-200 disabled:opacity-50 px-3 py-2 rounded-md">+ Añadir</button>
          <div className="flex-1" />
          <button onClick={save} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium px-5 py-2 rounded-md">
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </section>

      {/* Heredados */}
      {inherited.length > 0 && (
        <section className="bg-white rounded-lg shadow p-5 mb-5">
          <h2 className="font-semibold text-gray-900 mb-3">Heredados del padre</h2>
          <ul className="text-sm text-gray-700 space-y-1">
            {inherited.map((a) => (
              <li key={a._id} className="flex items-center gap-2">
                <span className="font-medium">{a.label}</span>
                <span className="text-gray-400">· {TYPE_LABEL[a.type] || a.type}</span>
                <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">heredado de {a.heredadoDe}</span>
                {a.required && <span className="text-xs text-amber-600">obligatorio</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Vista previa del formulario resuelto */}
      <section className="bg-white rounded-lg shadow p-5">
        <h2 className="font-semibold text-gray-900 mb-1">Vista previa del formulario</h2>
        <p className="text-xs text-gray-500 mb-3">Así se resolverá el formulario del producto en esta categoría (propios + heredados). Guarda para actualizar.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(schema?.attributes || []).map((a) => (
            <div key={a._id} className="border border-gray-200 rounded-md px-3 py-2 text-sm">
              <span className="font-medium text-gray-900">{a.label}</span>
              {a.required && <span className="text-red-500"> *</span>}
              <span className="text-gray-400"> · {TYPE_LABEL[a.type] || a.type}{a.unit ? ` (${a.unit})` : ''}</span>
              {a.heredadoDe && <span className="text-xs text-gray-400 block">heredado de {a.heredadoDe}</span>}
            </div>
          ))}
          {(schema?.attributes || []).length === 0 && <p className="text-sm text-gray-500">Sin atributos aún.</p>}
        </div>
      </section>
    </div>
  );
}

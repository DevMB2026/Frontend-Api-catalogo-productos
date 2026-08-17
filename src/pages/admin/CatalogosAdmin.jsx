import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listCatalogs, getCatalog, createCatalog, updateCatalog, deleteCatalog } from '../../api/adminCatalog';
import { brandsApi } from '../../api/pim';
import { listProducts } from '../../api/catalog';

const inputCls = 'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';
const btnPrimary = 'bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-md';
const btnGhost = 'px-4 py-2 rounded-md border border-gray-300 text-gray-700 text-sm hover:bg-gray-50';

// Buscador simple: escribe, busca por nombre/SKU, agrega a la lista de
// "productos adicionales" con un clic. No filtra por marca — a propósito:
// el sentido de esto es traer productos de CUALQUIER otra marca.
function ProductPicker({ selected, onChange }) {
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');

  const { data, isFetching } = useQuery({
    queryKey: ['catalogos-product-search', search],
    queryFn: () => listProducts({ q: search, limit: 8 }),
    enabled: search.length > 0
  });

  const resultados = (data?.data ?? []).filter((p) => !selected.some((s) => s._id === p._id));

  const agregar = (p) => onChange([...selected, { _id: p._id, nombre: p.nombre, sku: p.sku, brand: p.brand }]);
  const quitar = (id) => onChange(selected.filter((s) => s._id !== id));

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Productos adicionales (de cualquier otra marca)</label>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selected.map((p) => (
            <span key={p._id} className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 text-xs rounded-full px-3 py-1">
              {p.nombre}{p.brand?.nombre ? ` · ${p.brand.nombre}` : ''}
              <button type="button" onClick={() => quitar(p._id)} className="text-indigo-400 hover:text-indigo-700">✕</button>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          className={inputCls}
          placeholder="Buscar por nombre o SKU…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); setSearch(q); } }}
        />
        <button type="button" onClick={() => setSearch(q)} className={btnGhost}>Buscar</button>
      </div>

      {isFetching && <p className="text-xs text-gray-400 mt-2">Buscando…</p>}

      {resultados.length > 0 && (
        <ul className="mt-2 border border-gray-200 rounded-md divide-y divide-gray-100 max-h-48 overflow-y-auto">
          {resultados.map((p) => (
            <li key={p._id} className="flex items-center justify-between px-3 py-2 text-sm">
              <span>{p.nombre} <span className="text-gray-400">· {p.brand?.nombre} · {p.sku}</span></span>
              <button type="button" onClick={() => agregar(p)} className="text-indigo-600 hover:text-indigo-800 text-xs font-medium">+ Agregar</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FormModal({ mode, initial, brands, onClose, onSubmit, saving }) {
  const [nombre, setNombre] = useState(initial.nombre || '');
  const [marcaPrincipal, setMarcaPrincipal] = useState(initial.marcaPrincipal?._id || '');
  const [productosAdicionales, setProductosAdicionales] = useState(initial.productosAdicionales || []);
  const [activo, setActivo] = useState(initial.activo ?? true);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await onSubmit({
        nombre,
        marcaPrincipal: marcaPrincipal || null,
        productosAdicionales: productosAdicionales.map((p) => p._id),
        ...(mode === 'edit' ? { activo } : {})
      });
    } catch (err) {
      setError(err.message || 'No se pudo guardar');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center p-4 z-20 overflow-y-auto">
      <form onSubmit={submit} className="bg-white rounded-xl shadow-xl w-full max-w-lg my-8">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">{mode === 'create' ? 'Nuevo catálogo' : 'Editar catálogo'}</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700">✕</button>
        </div>
        <div className="p-6 space-y-4">
          {error && <div className="bg-red-50 text-red-700 text-sm rounded-md px-3 py-2">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
            <input className={inputCls} value={nombre} onChange={(e) => setNombre(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Marca principal</label>
            <select className={inputCls} value={marcaPrincipal} onChange={(e) => setMarcaPrincipal(e.target.value)}>
              <option value="">Ninguna (100% curado a mano)</option>
              {brands.map((b) => <option key={b._id} value={b._id}>{b.nombre}</option>)}
            </select>
            <p className="text-xs text-gray-400 mt-1">Incluye automáticamente TODOS los productos de esta marca.</p>
          </div>
          <ProductPicker selected={productosAdicionales} onChange={setProductosAdicionales} />
          {mode === 'edit' && (
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
              Catálogo activo
            </label>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end">
          <button type="button" onClick={onClose} className={btnGhost}>Cancelar</button>
          <button type="submit" disabled={saving} className={btnPrimary}>{saving ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </form>
    </div>
  );
}

export default function CatalogosAdmin() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ['catalogos'], queryFn: listCatalogs });
  const { data: brandsData } = useQuery({ queryKey: ['brands'], queryFn: brandsApi.list });
  const rows = data?.data ?? [];
  const brands = brandsData?.data ?? [];

  const [modal, setModal] = useState(null); // { mode, row? }
  const [editDetail, setEditDetail] = useState(null); // detalle completo cargado para editar

  const invalidate = () => qc.invalidateQueries({ queryKey: ['catalogos'] });
  const createMut = useMutation({ mutationFn: createCatalog, onSuccess: invalidate });
  const updateMut = useMutation({ mutationFn: ({ id, body }) => updateCatalog(id, body), onSuccess: invalidate });
  const deleteMut = useMutation({ mutationFn: deleteCatalog, onSuccess: invalidate });

  const abrirEditar = async (row) => {
    const full = await getCatalog(row._id);
    setEditDetail(full.data);
    setModal({ mode: 'edit', row: full.data });
  };

  const handleSubmit = async (payload) => {
    if (modal.mode === 'create') await createMut.mutateAsync(payload);
    else await updateMut.mutateAsync({ id: modal.row._id, body: payload });
    setModal(null);
    setEditDetail(null);
  };

  const toggleActivo = (row) => updateMut.mutate({ id: row._id, body: { activo: !row.activo } });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Catálogos</h1>
          <p className="text-sm text-gray-500">Escaparates curados: marca principal completa + productos elegidos a mano de otras marcas. No modifica a qué marca pertenece cada producto.</p>
        </div>
        <button onClick={() => { setEditDetail(null); setModal({ mode: 'create' }); }} className={btnPrimary}>+ Crear catálogo</button>
      </div>

      {isLoading ? (
        <p className="text-gray-500">Cargando…</p>
      ) : error ? (
        <p className="text-red-600">Error: {error.message}</p>
      ) : rows.length === 0 ? (
        <p className="text-gray-500">Aún no hay catálogos. Crea el primero.</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Marca principal</th>
                <th className="px-4 py-3 font-medium">Adicionales</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => (
                <tr key={row._id} className={`hover:bg-gray-50 ${row.activo === false ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 font-medium text-gray-900">{row.nombre} <span className="text-gray-400 font-normal">({row.slug})</span></td>
                  <td className="px-4 py-3 text-gray-700">{row.marcaPrincipal?.nombre || '—'}</td>
                  <td className="px-4 py-3 text-gray-700">{row.totalProductosAdicionales}</td>
                  <td className="px-4 py-3">
                    {row.activo ? <span className="text-emerald-600 text-xs">Activo</span> : <span className="text-red-500 text-xs">Desactivado</span>}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap space-x-3">
                    <button onClick={() => abrirEditar(row)} className="text-indigo-600 hover:text-indigo-800">Editar</button>
                    <button onClick={() => toggleActivo(row)} className="text-gray-600 hover:text-gray-900">{row.activo ? 'Desactivar' : 'Activar'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <FormModal
          mode={modal.mode}
          initial={modal.mode === 'edit' ? editDetail : {}}
          brands={brands}
          onClose={() => { setModal(null); setEditDetail(null); }}
          onSubmit={handleSubmit}
          saving={createMut.isPending || updateMut.isPending}
        />
      )}
    </div>
  );
}

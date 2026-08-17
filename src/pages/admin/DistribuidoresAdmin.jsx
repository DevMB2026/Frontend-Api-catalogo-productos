import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listDistributors, createDistributor, updateDistributor,
  regenerateDistributorKey, revokeDistributorKey
} from '../../api/adminDistributor';
import { listCatalogs } from '../../api/adminCatalog';

const inputCls = 'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';
const btnPrimary = 'bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-md';
const btnGhost = 'px-4 py-2 rounded-md border border-gray-300 text-gray-700 text-sm hover:bg-gray-50';

// Modal de solo-lectura para mostrar una API Key generada. Vive únicamente en
// el estado de este componente — nunca se guarda ni se puede volver a pedir
// (el backend tampoco la devuelve de nuevo en ningún otro endpoint).
function RevealKeyModal({ apiKey, onClose }) {
  const [copiado, setCopiado] = useState(false);
  const copiar = async () => {
    try { await navigator.clipboard.writeText(apiKey); setCopiado(true); } catch { /* clipboard no disponible */ }
  };
  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center p-4 z-30 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg my-8">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">API Key generada</h3>
        </div>
        <div className="p-6 space-y-3">
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            Copia esta key ahora y entrégasela al distribuidor. No volverá a mostrarse.
          </p>
          <code className="block break-all bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900">{apiKey}</code>
          <button type="button" onClick={copiar} className={btnGhost}>{copiado ? 'Copiada ✓' : 'Copiar'}</button>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <button type="button" onClick={onClose} className={btnPrimary}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

function FormModal({ mode, initial, catalogos, onClose, onSubmit, saving }) {
  const [nombre, setNombre] = useState(initial.nombre || '');
  const [email, setEmail] = useState(initial.email || '');
  const [activo, setActivo] = useState(initial.activo ?? true);
  const [catalogo, setCatalogo] = useState(initial.catalogo?._id || '');
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      if (mode === 'create') await onSubmit({ nombre, email, catalogo: catalogo || null });
      else await onSubmit({ nombre, activo, catalogo: catalogo || null });
    } catch (err) {
      setError(err.message || 'No se pudo guardar');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center p-4 z-20 overflow-y-auto">
      <form onSubmit={submit} className="bg-white rounded-xl shadow-xl w-full max-w-lg my-8">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">{mode === 'create' ? 'Nuevo distribuidor' : 'Editar distribuidor'}</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700">✕</button>
        </div>
        <div className="p-6 space-y-4">
          {error && <div className="bg-red-50 text-red-700 text-sm rounded-md px-3 py-2">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
            <input className={inputCls} value={nombre} onChange={(e) => setNombre(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              className={inputCls}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={mode === 'edit'}
            />
            {mode === 'edit' && <p className="text-xs text-gray-400 mt-1">El email no se puede editar.</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Catálogo asignado</label>
            <select className={inputCls} value={catalogo} onChange={(e) => setCatalogo(e.target.value)}>
              <option value="">Sin asignar (acceso al catálogo completo)</option>
              {catalogos.map((c) => <option key={c._id} value={c._id}>{c.nombre}</option>)}
            </select>
            <p className="text-xs text-gray-400 mt-1">Si se asigna, este distribuidor solo verá los productos de ese catálogo, sin poder cambiarlo.</p>
          </div>
          {mode === 'edit' && (
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
              Cuenta activa
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

export default function DistribuidoresAdmin() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ['distribuidores'], queryFn: listDistributors });
  const { data: catalogosData } = useQuery({ queryKey: ['catalogos'], queryFn: listCatalogs });
  const rows = data?.data ?? [];
  const catalogos = catalogosData?.data ?? [];

  const [modal, setModal] = useState(null); // { mode: 'create' | 'edit', row? }
  const [revealKey, setRevealKey] = useState(null);
  const [actionError, setActionError] = useState(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['distribuidores'] });

  const createMut = useMutation({ mutationFn: createDistributor, onSuccess: invalidate });
  const updateMut = useMutation({ mutationFn: ({ id, body }) => updateDistributor(id, body), onSuccess: invalidate });
  const regenMut = useMutation({ mutationFn: regenerateDistributorKey, onSuccess: invalidate });
  const revokeMut = useMutation({ mutationFn: revokeDistributorKey, onSuccess: invalidate });

  const handleFormSubmit = async (payload) => {
    if (modal.mode === 'create') {
      const res = await createMut.mutateAsync(payload);
      setModal(null);
      setRevealKey(res.data.apiKey);
    } else {
      await updateMut.mutateAsync({ id: modal.row._id, body: payload });
      setModal(null);
    }
  };

  const toggleActivo = (row) => updateMut.mutate({ id: row._id, body: { activo: !row.activo } });

  const regenerar = async (row) => {
    if (!confirm(`¿Generar una nueva API Key para "${row.nombre}"? La anterior dejará de funcionar.`)) return;
    setActionError(null);
    try {
      const res = await regenMut.mutateAsync(row._id);
      setRevealKey(res.data.apiKey);
    } catch (err) {
      setActionError(err.message);
    }
  };

  const revocar = async (row) => {
    if (!confirm(`¿Revocar la API Key de "${row.nombre}"? Dejará de poder consultar el catálogo hasta que le generes una nueva.`)) return;
    setActionError(null);
    try {
      await revokeMut.mutateAsync(row._id);
    } catch (err) {
      setActionError(err.message);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Distribuidores</h1>
          <p className="text-sm text-gray-500">Crea cuentas de distribuidor y gestiona su API Key. Las marcas a consultar las elige cada distribuidor desde /distribuidor.</p>
        </div>
        <button onClick={() => setModal({ mode: 'create' })} className={btnPrimary}>+ Crear distribuidor</button>
      </div>

      {actionError && <div className="bg-red-50 text-red-700 text-sm rounded-md px-3 py-2 mb-4">{actionError}</div>}

      {isLoading ? (
        <p className="text-gray-500">Cargando…</p>
      ) : error ? (
        <p className="text-red-600">Error: {error.message}</p>
      ) : rows.length === 0 ? (
        <p className="text-gray-500">Aún no hay distribuidores. Crea el primero.</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Catálogo</th>
                <th className="px-4 py-3 font-medium">API Key</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => (
                <tr key={row._id} className={`hover:bg-gray-50 ${row.activo === false ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 font-medium text-gray-900">{row.nombre}</td>
                  <td className="px-4 py-3 text-gray-700">{row.email}</td>
                  <td className="px-4 py-3">
                    {row.activo ? <span className="text-emerald-600 text-xs">Activo</span> : <span className="text-red-500 text-xs">Desactivado</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {row.catalogo?.nombre || <span className="text-gray-400">Completo</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {row.apiKey ? (
                      <>
                        <code>{row.apiKey.prefijo}</code>{' '}
                        {row.apiKey.revocada ? <span className="text-red-500">(revocada)</span> : row.apiKey.activo ? <span className="text-emerald-600">(activa)</span> : <span className="text-gray-400">(inactiva)</span>}
                      </>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap space-x-3">
                    <button onClick={() => setModal({ mode: 'edit', row })} className="text-indigo-600 hover:text-indigo-800">Editar</button>
                    <button onClick={() => toggleActivo(row)} className="text-gray-600 hover:text-gray-900">{row.activo ? 'Desactivar' : 'Activar'}</button>
                    <button onClick={() => regenerar(row)} className="text-indigo-600 hover:text-indigo-800">Regenerar key</button>
                    <button onClick={() => revocar(row)} className="text-red-600 hover:text-red-800">Revocar key</button>
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
          initial={modal.mode === 'edit' ? modal.row : {}}
          catalogos={catalogos}
          onClose={() => setModal(null)}
          onSubmit={handleFormSubmit}
          saving={createMut.isPending || updateMut.isPending}
        />
      )}

      {revealKey && <RevealKeyModal apiKey={revealKey} onClose={() => setRevealKey(null)} />}
    </div>
  );
}

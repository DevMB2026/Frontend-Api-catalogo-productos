import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listPriceUsers, createPriceUser, updatePriceUser, resetPriceUserPassword
} from '../../api/adminPriceUser';

const inputCls = 'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';
const btnPrimary = 'bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-md';
const btnGhost = 'px-4 py-2 rounded-md border border-gray-300 text-gray-700 text-sm hover:bg-gray-50';

const TIPOS = [
  { key: 'menudeo', label: 'Menudeo' },
  { key: 'mayoreo', label: 'Mayoreo' },
  { key: 'volumen', label: 'Volumen' },
  { key: 'distribuidor', label: 'Distribuidor' },
  { key: 'master', label: 'Master' }
];

// Modal de solo-lectura para mostrar una contraseña generada por el
// servidor. Vive ÚNICAMENTE en el estado de este componente — nunca se
// guarda en localStorage/sessionStorage, nunca entra al cache de React
// Query (no es el resultado de ningún useQuery, solo del useState local de
// abajo), y desaparece de memoria en cuanto se cierra el modal. El backend
// tampoco la vuelve a devolver en ningún otro endpoint. Mismo patrón que la
// API Key de distribuidor (ver RevealKeyModal en DistribuidoresAdmin.jsx).
function RevealPasswordModal({ password, onClose }) {
  const [copiado, setCopiado] = useState(false);
  const copiar = async () => {
    try { await navigator.clipboard.writeText(password); setCopiado(true); } catch { /* clipboard no disponible */ }
  };
  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center p-4 z-30 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg my-8">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Contraseña generada</h3>
        </div>
        <div className="p-6 space-y-3">
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            Copia esta contraseña ahora y entrégasela a la persona. No volverá a mostrarse.
          </p>
          <code className="block break-all bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900">{password}</code>
          <button type="button" onClick={copiar} className={btnGhost}>{copiado ? 'Copiada ✓' : 'Copiar'}</button>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <button type="button" onClick={onClose} className={btnPrimary}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

function FormModal({ mode, initial, onClose, onSubmit, saving }) {
  const [nombre, setNombre] = useState(initial.nombre || '');
  const [email, setEmail] = useState(initial.email || '');
  const [activo, setActivo] = useState(initial.activo ?? true);
  const [permisos, setPermisos] = useState(initial.pricePermissions || []);
  const [error, setError] = useState(null);

  const togglePermiso = (key) =>
    setPermisos((p) => (p.includes(key) ? p.filter((x) => x !== key) : [...p, key]));

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      if (mode === 'create') await onSubmit({ nombre, email, pricePermissions: permisos });
      else await onSubmit({ nombre, activo, pricePermissions: permisos });
    } catch (err) {
      setError(err.message || 'No se pudo guardar');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center p-4 z-20 overflow-y-auto">
      <form onSubmit={submit} className="bg-white rounded-xl shadow-xl w-full max-w-lg my-8">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">{mode === 'create' ? 'Nuevo usuario de precios' : 'Editar usuario de precios'}</h3>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Precios que puede consultar</label>
            <div className="grid grid-cols-2 gap-2">
              {TIPOS.map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={permisos.includes(key)} onChange={() => togglePermiso(key)} />
                  {label}
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">Cada uno se asigna por separado — tener uno no otorga los demás.</p>
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

export default function PreciosUsuariosAdmin() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ['usuarios-precios'], queryFn: listPriceUsers });
  const rows = data?.data ?? [];

  const [modal, setModal] = useState(null); // { mode: 'create' | 'edit', row? }
  const [revealPassword, setRevealPassword] = useState(null);
  const [actionError, setActionError] = useState(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['usuarios-precios'] });

  const createMut = useMutation({ mutationFn: createPriceUser, onSuccess: invalidate });
  const updateMut = useMutation({ mutationFn: ({ id, body }) => updatePriceUser(id, body), onSuccess: invalidate });
  const resetMut = useMutation({ mutationFn: resetPriceUserPassword, onSuccess: invalidate });

  const handleFormSubmit = async (payload) => {
    if (modal.mode === 'create') {
      const res = await createMut.mutateAsync(payload);
      setModal(null);
      setRevealPassword(res.data.password);
    } else {
      await updateMut.mutateAsync({ id: modal.row._id, body: payload });
      setModal(null);
    }
  };

  const toggleActivo = (row) => updateMut.mutate({ id: row._id, body: { activo: !row.activo } });

  const resetPassword = async (row) => {
    if (!confirm(`¿Restablecer la contraseña de "${row.nombre}"? La anterior dejará de funcionar de inmediato.`)) return;
    setActionError(null);
    try {
      const res = await resetMut.mutateAsync(row._id);
      setRevealPassword(res.data.password);
    } catch (err) {
      setActionError(err.message);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuarios con acceso a precios</h1>
          <p className="text-sm text-gray-500">Personas autorizadas a consultar precios (no distribuidores ni administradores). Los permisos son independientes entre sí.</p>
        </div>
        <button onClick={() => setModal({ mode: 'create' })} className={btnPrimary}>+ Crear usuario</button>
      </div>

      {actionError && <div className="bg-red-50 text-red-700 text-sm rounded-md px-3 py-2 mb-4">{actionError}</div>}

      {isLoading ? (
        <p className="text-gray-500">Cargando…</p>
      ) : error ? (
        <p className="text-red-600">Error: {error.message}</p>
      ) : rows.length === 0 ? (
        <p className="text-gray-500">Aún no hay usuarios de precios. Crea el primero.</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Precios permitidos</th>
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
                    {(row.pricePermissions || []).length === 0 ? (
                      <span className="text-gray-400 text-xs">Ninguno</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {TIPOS.filter((t) => row.pricePermissions.includes(t.key)).map((t) => (
                          <span key={t.key} className="text-xs bg-indigo-50 text-indigo-700 rounded px-1.5 py-0.5">{t.label}</span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap space-x-3">
                    <button onClick={() => setModal({ mode: 'edit', row })} className="text-indigo-600 hover:text-indigo-800">Editar</button>
                    <button onClick={() => toggleActivo(row)} className="text-gray-600 hover:text-gray-900">{row.activo ? 'Desactivar' : 'Activar'}</button>
                    <button onClick={() => resetPassword(row)} className="text-indigo-600 hover:text-indigo-800">Resetear contraseña</button>
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
          onClose={() => setModal(null)}
          onSubmit={handleFormSubmit}
          saving={createMut.isPending || updateMut.isPending}
        />
      )}

      {revealPassword && <RevealPasswordModal password={revealPassword} onClose={() => setRevealPassword(null)} />}
    </div>
  );
}

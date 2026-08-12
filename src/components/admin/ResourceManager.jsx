import { useState } from 'react';
import { useResourceList, useResourceMutations } from '../../hooks/useResource';

const inputCls = 'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

// Convierte el valor del form al payload según el tipo de campo.
function coerce(field, value) {
  if (field.coerce) return field.coerce(value);
  switch (field.type) {
    case 'number': return value === '' || value == null ? undefined : Number(value);
    case 'boolean': return !!value;
    case 'tags': return typeof value === 'string'
      ? value.split(',').map((s) => s.trim()).filter(Boolean)
      : (value || []);
    default: return value === '' ? undefined : value;
  }
}

function FieldControl({ field, value, onChange, form, error }) {
  const common = { className: inputCls, value: value ?? '', onChange: (e) => onChange(e.target.value) };
  let control;
  switch (field.type) {
    case 'custom':
      control = field.render(value, onChange, form);
      break;
    case 'textarea':
      control = <textarea rows={3} {...common} />;
      break;
    case 'number':
      control = <input type="number" {...common} placeholder={field.placeholder} />;
      break;
    case 'boolean':
      control = (
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
          {field.checkboxLabel || 'Sí'}
        </label>
      );
      break;
    case 'select':
      control = (
        <select {...common}>
          <option value="">{field.placeholder || 'Selecciona…'}</option>
          {(field.options || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
      break;
    case 'tags':
      control = <input {...common} value={Array.isArray(value) ? value.join(', ') : (value ?? '')} placeholder={field.placeholder || 'coma, separado'} />;
      break;
    default:
      control = <input {...common} placeholder={field.placeholder} />;
  }
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {field.label}{field.required && ' *'}
      </label>
      {control}
      {field.help && <p className="text-xs text-gray-400 mt-1">{field.help}</p>}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}

function FormModal({ title, fields, initial, onClose, onSubmit, saving }) {
  const [form, setForm] = useState(initial);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState(null);
  const set = (name, v) => setForm((f) => ({ ...f, [name]: v }));

  const visibleFields = fields.filter((f) => !f.visible || f.visible(form));

  async function submit(e) {
    e.preventDefault();
    setError(null); setFieldErrors({});
    const payload = {};
    for (const f of visibleFields) {
      const v = coerce(f, form[f.name]);
      if (v !== undefined) payload[f.name] = v;
    }
    try {
      await onSubmit(payload);
    } catch (err) {
      setError(err.message || 'No se pudo guardar');
      setFieldErrors(err.fields || {});
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center p-4 z-20 overflow-y-auto">
      <form onSubmit={submit} className="bg-white rounded-xl shadow-xl w-full max-w-lg my-8">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700">✕</button>
        </div>
        <div className="p-6 space-y-4">
          {error && <div className="bg-red-50 text-red-700 text-sm rounded-md px-3 py-2">{error}</div>}
          {visibleFields.map((f) => (
            <FieldControl
              key={f.name}
              field={f}
              value={form[f.name]}
              onChange={(v) => set(f.name, v)}
              form={form}
              error={fieldErrors[f.name] || fieldErrors[`${f.name}`]}
            />
          ))}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 text-sm hover:bg-gray-50">Cancelar</button>
          <button type="submit" disabled={saving} className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium">
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  );
}

/**
 * Gestor CRUD genérico para los catálogos del PIM.
 * props: title, subtitle, queryKey, api, columns, fields, listParams, itemName,
 *        toForm(row) -> valores iniciales del form al editar.
 */
export default function ResourceManager({
  title, subtitle, queryKey, api, columns, fields, listParams = { activo: 'all' }, itemName = 'registro',
  toForm, extraPayload, transformPayload
}) {
  const { data, isLoading, error } = useResourceList(queryKey, api, listParams);
  const { create, update, remove } = useResourceMutations(queryKey, api);
  const [modal, setModal] = useState(null); // { mode:'create'|'edit', row? }

  const rows = data?.data ?? [];

  const emptyForm = Object.fromEntries(fields.map((f) => [f.name, f.type === 'boolean' ? false : (f.type === 'tags' ? '' : '')]));
  const initialFor = (row) => (toForm ? toForm(row) : Object.fromEntries(fields.map((f) => [f.name, row[f.name] ?? (f.type === 'boolean' ? false : '')])));

  async function handleSubmit(payload) {
    let body = { ...(extraPayload || {}), ...payload };
    if (transformPayload) body = transformPayload(body);
    if (modal.mode === 'edit') await update.mutateAsync({ id: modal.row._id, body });
    else await create.mutateAsync(body);
    setModal(null);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
        <button onClick={() => setModal({ mode: 'create' })} className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-md">
          + Nuevo
        </button>
      </div>

      {isLoading ? (
        <p className="text-gray-500">Cargando…</p>
      ) : error ? (
        <p className="text-red-600">Error: {error.message}</p>
      ) : rows.length === 0 ? (
        <p className="text-gray-500">Aún no hay {itemName}s. Crea el primero.</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-left">
              <tr>
                {columns.map((c) => <th key={c.header} className="px-4 py-3 font-medium">{c.header}</th>)}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => (
                <tr key={row._id} className={`hover:bg-gray-50 ${row.activo === false ? 'opacity-50' : ''}`}>
                  {columns.map((c) => <td key={c.header} className="px-4 py-3 text-gray-700">{c.render ? c.render(row) : row[c.key]}</td>)}
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => setModal({ mode: 'edit', row })} className="text-indigo-600 hover:text-indigo-800 mr-4">Editar</button>
                    {row.activo !== false && (
                      <button
                        onClick={() => { if (confirm(`¿Desactivar "${row.nombre || row.label || row.valor}"?`)) remove.mutate(row._id); }}
                        className="text-red-600 hover:text-red-800"
                      >
                        Desactivar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <FormModal
          title={modal.mode === 'edit' ? `Editar ${itemName}` : `Nuevo ${itemName}`}
          fields={fields}
          initial={modal.mode === 'edit' ? initialFor(modal.row) : emptyForm}
          onClose={() => setModal(null)}
          onSubmit={handleSubmit}
          saving={create.isPending || update.isPending}
        />
      )}
    </div>
  );
}

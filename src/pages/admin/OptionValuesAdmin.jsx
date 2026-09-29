import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import ResourceManager from '../../components/admin/ResourceManager';
import { optionValuesApi, optionsApi } from '../../api/pim';
import { swatchBg, colorHex } from '../../lib/colors';

export default function OptionValuesAdmin() {
  const { optionId } = useParams();
  const { data: opt } = useQuery({ queryKey: ['option', optionId], queryFn: () => optionsApi.get(optionId) });
  const nombre = opt?.data?.nombre || 'opción';

  return (
    <div>
      <Link to="/admin/opciones" className="text-sm text-gray-500 hover:text-gray-900">← Opciones</Link>
      <div className="mt-3">
        <ResourceManager
          title={`Valores de "${nombre}"`}
          subtitle="Ej: Negro, Blanco, M, L, 32… (usa el hex para colores)"
          queryKey={`option-values-${optionId}`}
          api={optionValuesApi}
          itemName="valor"
          listParams={{ option: optionId, activo: 'all' }}
          extraPayload={{ option: optionId }}
          // hex llega como '' al pulsar "Quitar" → meta vacío para volver al color automático.
          transformPayload={(p) => { if ('hex' in p) p.meta = p.hex ? { hex: p.hex.toLowerCase() } : {}; delete p.hex; return p; }}
          columns={[
            { header: 'Valor', render: (r) => r.valor },
            { header: 'Slug', render: (r) => <code className="text-xs">{r.slug}</code> },
            {
              // Sin hex guardado se muestra el tono que la tienda deduce del
              // nombre, para que se note cuál color falta corregir.
              header: 'Color', render: (r) => (
                <span className="inline-flex items-center gap-2">
                  <span className="w-4 h-4 rounded border border-gray-300" style={{ background: swatchBg(r.valor, r.meta?.hex) }} />
                  {r.meta?.hex || <span className="text-xs text-gray-400">automático</span>}
                </span>
              )
            }
          ]}
          fields={[
            { name: 'valor', label: 'Valor', required: true, placeholder: 'Negro / M / 32' },
            {
              name: 'hex', label: 'Color', type: 'color', placeholder: '#000000',
              coerce: (v) => (v || '').trim(), // conserva '' (no undefined) para poder borrar
              fallback: (form) => colorHex(form.valor),
              help: 'Elige el tono en el selector o pega el hex. Vacío = se deduce del nombre.'
            },
            { name: 'orden', label: 'Orden', type: 'number' }
          ]}
          toForm={(r) => ({ valor: r.valor, hex: r.meta?.hex || '', orden: r.orden ?? 0 })}
        />
      </div>
    </div>
  );
}

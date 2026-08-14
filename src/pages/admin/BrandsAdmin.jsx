import ResourceManager from '../../components/admin/ResourceManager';
import { brandsApi } from '../../api/pim';

// Administración dinámica de marcas: agregar/editar/desactivar sin tocar código.
export default function BrandsAdmin() {
  return (
    <ResourceManager
      title="Marcas"
      subtitle="Firmas del catálogo. Agrega las que necesites; el slug se genera solo."
      queryKey="brands"
      api={brandsApi}
      itemName="marca"
      columns={[
        {
          header: 'Marca',
          render: (r) => (
            <span className="flex items-center gap-2">
              {r.logo?.url && <img src={r.logo.url} alt="" className="w-6 h-6 rounded object-cover ring-1 ring-gray-200" />}
              <span className="font-medium text-gray-900">{r.nombre}</span>
            </span>
          )
        },
        { header: 'Slug', render: (r) => <code className="text-xs">{r.slug}</code> },
        { header: 'Dominio', render: (r) => r.dominio || '—' },
        { header: 'Estado', render: (r) => (r.activo === false ? <span className="text-red-500 text-xs">Inactiva</span> : <span className="text-emerald-600 text-xs">Activa</span>) }
      ]}
      fields={[
        { name: 'nombre', label: 'Nombre', required: true, placeholder: 'Ej. Prezenza' },
        { name: 'dominio', label: 'Dominio', placeholder: 'ej. prezenza.com', help: 'Sitio de la marca (referencia).' },
        { name: 'logo', label: 'Logo (URL)', placeholder: 'https://…/logo.png', help: 'Opcional.' }
      ]}
      toForm={(r) => ({ nombre: r.nombre, dominio: r.dominio || '', logo: r.logo?.url || '' })}
      transformPayload={(body) => {
        const { logo, ...rest } = body;
        return logo ? { ...rest, logo: { url: logo } } : rest;
      }}
    />
  );
}

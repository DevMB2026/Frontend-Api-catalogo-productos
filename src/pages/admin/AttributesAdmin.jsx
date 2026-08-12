import ResourceManager from '../../components/admin/ResourceManager';
import OptionsEditor from '../../components/admin/OptionsEditor';
import { attributesApi } from '../../api/pim';

const TYPE_OPTS = [
  { value: 'text', label: 'Texto' },
  { value: 'number', label: 'Número' },
  { value: 'boolean', label: 'Sí/No' },
  { value: 'select', label: 'Selección' },
  { value: 'multiselect', label: 'Selección múltiple' }
];

export default function AttributesAdmin() {
  return (
    <ResourceManager
      title="Atributos"
      subtitle="Definiciones tipadas reutilizables (Protección UV, Gramaje, Tipo de cuello…)"
      queryKey="attributes"
      api={attributesApi}
      itemName="atributo"
      columns={[
        { header: 'Etiqueta', render: (r) => r.label },
        { header: 'Key', render: (r) => <code className="text-xs text-indigo-700">{r.key}</code> },
        { header: 'Tipo', render: (r) => r.type },
        { header: 'Unidad', render: (r) => r.unit || '—' },
        { header: 'Filtrable', render: (r) => (r.filterable ? 'Sí' : '—') }
      ]}
      fields={[
        { name: 'label', label: 'Etiqueta', required: true, placeholder: 'Protección UV' },
        { name: 'type', label: 'Tipo', type: 'select', options: TYPE_OPTS, required: true },
        { name: 'unit', label: 'Unidad', placeholder: 'g/m²', visible: (f) => f.type === 'number' },
        {
          name: 'options', label: 'Opciones', type: 'custom',
          render: (v, onChange) => <OptionsEditor value={v} onChange={onChange} />,
          visible: (f) => ['select', 'multiselect'].includes(f.type),
          help: 'Requerido para selección / selección múltiple'
        },
        { name: 'filterable', label: '¿Filtrable en el catálogo?', type: 'boolean', checkboxLabel: 'Sí' },
        { name: 'group', label: 'Grupo', placeholder: 'Especificaciones' },
        { name: 'orden', label: 'Orden', type: 'number' }
      ]}
      toForm={(r) => ({
        label: r.label, type: r.type, unit: r.unit || '', options: r.options || [],
        filterable: !!r.filterable, group: r.group || '', orden: r.orden ?? 0
      })}
    />
  );
}

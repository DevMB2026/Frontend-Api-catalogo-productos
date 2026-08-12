import { Link } from 'react-router-dom';
import ResourceManager from '../../components/admin/ResourceManager';
import { optionsApi } from '../../api/pim';

const TIPO_OPTS = [
  { value: 'swatch', label: 'Swatch (color)' },
  { value: 'size', label: 'Talla' },
  { value: 'text', label: 'Texto' }
];

export default function OptionsAdmin() {
  return (
    <ResourceManager
      title="Opciones"
      subtitle="Ejes de variación (Color, Talla, Cintura…). Sus valores se gestionan aparte."
      queryKey="options"
      api={optionsApi}
      itemName="opción"
      columns={[
        { header: 'Nombre', render: (r) => r.nombre },
        { header: 'Slug', render: (r) => <code className="text-xs">{r.slug}</code> },
        { header: 'Tipo', render: (r) => r.tipo },
        { header: 'Valores', render: (r) => <Link to={`/admin/opciones/${r._id}/valores`} className="text-indigo-600 hover:text-indigo-800">Gestionar →</Link> }
      ]}
      fields={[
        { name: 'nombre', label: 'Nombre', required: true, placeholder: 'Color' },
        { name: 'tipo', label: 'Tipo', type: 'select', options: TIPO_OPTS },
        { name: 'orden', label: 'Orden', type: 'number' }
      ]}
      toForm={(r) => ({ nombre: r.nombre, tipo: r.tipo || 'text', orden: r.orden ?? 0 })}
    />
  );
}

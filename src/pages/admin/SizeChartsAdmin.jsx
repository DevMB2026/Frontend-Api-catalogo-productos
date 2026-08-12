import ResourceManager from '../../components/admin/ResourceManager';
import SizeChartRows from '../../components/admin/SizeChartRows';
import { sizeChartsApi } from '../../api/pim';

const UNIDAD_OPTS = [{ value: 'cm', label: 'cm' }, { value: 'in', label: 'in' }];

export default function SizeChartsAdmin() {
  return (
    <ResourceManager
      title="Tablas de medidas"
      subtitle="Tablas reutilizables que se asignan a los productos"
      queryKey="size-charts"
      api={sizeChartsApi}
      itemName="tabla"
      columns={[
        { header: 'Nombre', render: (r) => r.nombre },
        { header: 'Unidad', render: (r) => r.unidad },
        { header: 'Columnas', render: (r) => (r.columns || []).join(', ') || '—' },
        { header: 'Tallas', render: (r) => (r.rows || []).length }
      ]}
      fields={[
        { name: 'nombre', label: 'Nombre', required: true, placeholder: 'Playera unisex estándar' },
        { name: 'unidad', label: 'Unidad', type: 'select', options: UNIDAD_OPTS },
        { name: 'columns', label: 'Columnas', type: 'tags', placeholder: 'Pecho, Largo, Hombros', help: 'Separadas por coma' },
        { name: 'rows', label: 'Filas (tallas)', type: 'custom', render: (v, onChange, form) => <SizeChartRows value={v} onChange={onChange} form={form} /> }
      ]}
      toForm={(r) => ({ nombre: r.nombre, unidad: r.unidad || 'cm', columns: (r.columns || []).join(', '), rows: r.rows || [] })}
    />
  );
}

import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Layout from './components/Layout';
import PublicLayout from './components/PublicLayout';
import ProtectedRoute from './components/ProtectedRoute';
import ProductsList from './pages/ProductsList';
import ProductBuilder from './pages/ProductBuilder';
import Catalogo from './pages/Catalogo';
import ProductoDetalle from './pages/ProductoDetalle';
import DistributorAccess from './pages/DistributorAccess';
import AttributesAdmin from './pages/admin/AttributesAdmin';
import FeaturesAdmin from './pages/admin/FeaturesAdmin';
import ApplicationsAdmin from './pages/admin/ApplicationsAdmin';
import OptionsAdmin from './pages/admin/OptionsAdmin';
import OptionValuesAdmin from './pages/admin/OptionValuesAdmin';
import SizeChartsAdmin from './pages/admin/SizeChartsAdmin';
import CategoriesAdmin from './pages/admin/CategoriesAdmin';
import CategoryAttributesAdmin from './pages/admin/CategoryAttributesAdmin';
import BrandsAdmin from './pages/admin/BrandsAdmin';
import DistribuidoresAdmin from './pages/admin/DistribuidoresAdmin';
import CatalogosAdmin from './pages/admin/CatalogosAdmin';

export default function App() {
  return (
    <Routes>
      {/* Público (catálogo) */}
      <Route path="/" element={<PublicLayout />}>
        <Route index element={<Catalogo />} />
        <Route path="producto/:slug" element={<ProductoDetalle />} />
        <Route path="distribuidor" element={<DistributorAccess />} />
      </Route>

      {/* Autenticación */}
      <Route path="/login" element={<Login />} />

      {/* Admin (protegido) */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<ProductsList />} />
        <Route path="productos/nuevo" element={<ProductBuilder />} />
        <Route path="productos/:id/editar" element={<ProductBuilder />} />
        {/* Configuración del motor (PIM) */}
        <Route path="atributos" element={<AttributesAdmin />} />
        <Route path="caracteristicas" element={<FeaturesAdmin />} />
        <Route path="aplicaciones" element={<ApplicationsAdmin />} />
        <Route path="opciones" element={<OptionsAdmin />} />
        <Route path="opciones/:optionId/valores" element={<OptionValuesAdmin />} />
        <Route path="tablas-medidas" element={<SizeChartsAdmin />} />
        <Route path="categorias" element={<CategoriesAdmin />} />
        <Route path="categorias/:id/atributos" element={<CategoryAttributesAdmin />} />
        <Route path="marcas" element={<BrandsAdmin />} />
        <Route path="catalogos" element={<CatalogosAdmin />} />
        <Route path="distribuidores" element={<DistribuidoresAdmin />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

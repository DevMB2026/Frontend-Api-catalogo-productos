import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Layout from './components/Layout';
import PublicLayout from './components/PublicLayout';
import ProtectedRoute from './components/ProtectedRoute';
import ProductsList from './pages/ProductsList';
import ProductForm from './pages/ProductForm';
import ProductEdit from './pages/ProductEdit';
import Catalogo from './pages/Catalogo';
import ProductoDetalle from './pages/ProductoDetalle';

export default function App() {
  return (
    <Routes>
      {/* Público (catálogo) */}
      <Route path="/" element={<PublicLayout />}>
        <Route index element={<Catalogo />} />
        <Route path="producto/:slug" element={<ProductoDetalle />} />
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
        <Route path="productos/nuevo" element={<ProductForm />} />
        <Route path="productos/:id/editar" element={<ProductEdit />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

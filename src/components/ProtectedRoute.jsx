import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Envuelve TODO el árbol de rutas /admin (un solo punto en App.jsx) — así
// cualquier ruta que se agregue después queda protegida por defecto, sin
// tener que acordarse de repetir la comprobación en cada página nueva
// (mismo principio que requireAdmin/apiKeyAuth en el backend).
//
// No basta con "hay token": un role:'usuario' (solo consulta precios, ver
// pricePermissions) puede tener un JWT perfectamente válido y aun así no
// debe entrar al panel — el panel es para admin (y, sin cambiar su
// comportamiento actual, distribuidor). pricePermissions NUNCA decide esto;
// la única fuente de verdad aquí es el role.
// Pantallas públicas que no son para clientes (role usuario): acceso de
// distribuidor y login del panel. Un cliente con sesión vuelve al catálogo.
export function SoloNoClientes({ children }) {
  const { user } = useAuth();
  if (user?.role === 'usuario') return <Navigate to="/" replace />;
  return children;
}

export default function ProtectedRoute({ children }) {
  const { isAuth, user } = useAuth();
  if (!isAuth) return <Navigate to="/login" replace />;
  if (user?.role === 'usuario') return <Navigate to="/" replace />;
  return children;
}

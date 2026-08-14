import { Link, Outlet } from 'react-router-dom';

export default function PublicLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="font-bold text-lg text-gray-900">Catálogo</Link>
          <div className="flex items-center gap-4">
            <Link to="/distribuidor" className="text-sm text-gray-500 hover:text-gray-900">Acceso distribuidor</Link>
            <Link to="/admin" className="text-sm text-gray-500 hover:text-gray-900">Admin</Link>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto p-4 sm:p-6">
        <Outlet />
      </main>
    </div>
  );
}

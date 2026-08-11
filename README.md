# Catálogo — Frontend (React)

Panel de administración y catálogo público que consume la [API de catálogo multi-marca](https://github.com/DevMB2026/Api-catalogo-productos).

## Stack

Vite · React · React Router · TanStack Query · Tailwind CSS

## Desarrollo

1. Instala dependencias:
   ```bash
   npm install
   ```
2. Crea `.env` a partir de `.env.example` y ajusta la URL de la API:
   ```bash
   cp .env.example .env
   ```
   ```
   VITE_API_URL=https://api-catalogo-productos.onrender.com/api/v1
   ```
   Para backend local: `VITE_API_URL=http://localhost:4000/api/v1`.
3. Arranca:
   ```bash
   npm run dev
   ```
   Abre http://localhost:5173

> El origen del frontend (ej. `http://localhost:5173` o el dominio desplegado) debe estar en `ALLOWED_ORIGINS` de la API, o el navegador dará error de CORS.

## Rutas

| Ruta | Descripción |
|---|---|
| `/` | Catálogo público (grid + filtros) |
| `/producto/:slug` | Detalle de producto |
| `/login` | Acceso admin |
| `/admin` | Panel (protegido con JWT) |

## Build de producción

```bash
npm run build      # genera dist/
npm run preview    # previsualiza el build
```

## Estructura

```
src/
├── api/          # client.js (VITE_API_URL + token), auth.js, catalog.js
├── components/   # PublicLayout, Layout, ProtectedRoute, ProductCard
├── context/      # AuthContext
├── pages/        # Catalogo, ProductoDetalle, Login, ProductsList, ProductForm, ProductEdit
├── App.jsx       # rutas
└── main.jsx      # providers (Query + Router + Auth)
```

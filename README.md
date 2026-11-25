# Habitar — Frontend

Frontend del proyecto Habitar (Astro + React + Tailwind), PWA e íntegramente responsive (mobile-first).

El backend está en [Tesis-Habitar-Backend-Productivo](https://github.com/facumartinez04/Tesis-Habitar-Backend-Productivo).
Para desarrollo local, copiar `.env.example` a `.env` y apuntar `PUBLIC_API_URL` a la API.

## Stack

- **Astro 7** — routing basado en archivos, salida estática
- **React** — islas interactivas (`client:load`) para las pantallas con estado
- **TailwindCSS 4** — utilidades responsive (`sm:`/`md:` mobile-first) en todo el proyecto
- **vite-plugin-pwa** — manifest + service worker (ver sección PWA)

## Comandos

| Comando | Acción |
| :--- | :--- |
| `npm install` | Instala dependencias |
| `npm run dev` | Levanta el server de desarrollo en `localhost:4321` |
| `npm run build` | Build de producción a `./dist/` (incluye generar el service worker) |
| `npm run preview` | Sirve el build de `./dist/` localmente para probarlo |
| `npm run astro check` | Chequeo de tipos de todo el proyecto (Astro + React) |

## PWA

La app es instalable y funciona offline sobre las páginas ya visitadas:

- **Manifest** (`vite-plugin-pwa`, configurado en `astro.config.mjs`): nombre, ícono, `theme_color`,
  `display: standalone`. Íconos en `public/icons/` (192, 512 y 512 maskable, generados a partir del
  isotipo de `public/favicon.svg`).
- **Service worker**: durante `npm run dev`, `vite-plugin-pwa` sirve un SW de desarrollo automáticamente.
  En producción, `astro build` no genera el SW por sí solo (Astro compila en dos pasadas y el plugin de
  Vite no llega a engancharse a la salida final) — por eso `npm run build` encadena
  `scripts/generate-sw.mjs`, que usa `workbox-build` para precachear `dist/` y escribir `dist/sw.js`
  directamente. Se registra desde `src/layouts/SiteLayout.astro` vía `virtual:pwa-register`.
- **Estrategia de cache**: `NetworkFirst` para el HTML de las páginas y especialmente para `/actividad`
  (CU-02-06/CU-01-04) — si el alumno pierde conexión a mitad de una actividad ya cargada, la pantalla
  sigue disponible desde cache mientras las respuestas se guardan en `localStorage` (ver
  `ActivityScreen.tsx`) para reintentar el envío cuando vuelva la conexión.

## Responsive

Todo el layout es mobile-first con Tailwind (`grid-cols-1 sm:grid-cols-N`, `flex-col sm:flex-row`,
tablas con scroll horizontal propio vía `TableWrap`). El sidebar (`AppSidebar.astro`) es un drawer
colapsable en mobile (`< md`) con botón de apertura y backdrop, y estático en desktop.

## Estructura

```text
src/
  components/app/       Layout Astro (sidebar, header)
  components/react/     Islas React: features/ (pantallas) y ui/ (componentes base)
  layouts/               SiteLayout (shell HTML + PWA) y AppShell (sidebar + header)
  pages/                 Rutas (una .astro por página)
  services/               Clientes HTTP hacia el backend
  store/                  Estado compartido (nanostores): sesión y wizard de actividad
  types/                  Tipos compartidos entre servicios y componentes
```

El backend vive en un repo aparte: [Tesis-Habitar-Backend](https://github.com/facumartinez04/Tesis-Habitar-Backend).

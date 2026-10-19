// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: false,
        includeAssets: ['favicon.svg', 'favicon.ico'],
        manifest: {
          id: '/',
          name: 'Habitar',
          short_name: 'Habitar',
          description: 'Comprensión lectora asistida por IA para instituciones educativas',
          lang: 'es',
          theme_color: '#0F6E56',
          background_color: '#EDECEA',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          orientation: 'portrait-primary',
          icons: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          // Sin navigateFallback a propósito: es multi-página (cada ruta tiene su propio
          // HTML precacheado), no una SPA con app-shell — Workbox precachea /login/
          // (con barra), no /login, así que un fallback fijo rompía con "non-precached-url".
          runtimeCaching: [
            {
              // Pantalla del alumno (CU-02-06 / RNF-09): que quede disponible offline
              // una vez visitada, y que la app la sirva rápido en conexiones de baja velocidad.
              urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname === '/actividad',
              handler: 'NetworkFirst',
              options: { cacheName: 'habitar-actividad', networkTimeoutSeconds: 3 },
            },
            {
              urlPattern: ({ sameOrigin, request }) => sameOrigin && request.destination === 'document',
              handler: 'NetworkFirst',
              options: { cacheName: 'habitar-pages', networkTimeoutSeconds: 3 },
            },
          ],
        },
        devOptions: {
          enabled: true,
        },
      }),
    ],
  },

  integrations: [react()],
});

import { generateSW } from 'workbox-build';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '..', 'dist');

const { count, size, warnings } = await generateSW({
  swDest: path.join(distDir, 'sw.js'),
  globDirectory: distDir,
  globPatterns: ['**/*.{html,css,js,svg,png,ico,webmanifest,woff2}'],
  globIgnores: ['sw.js', 'workbox-*.js'],
  cleanupOutdatedCaches: true,
  clientsClaim: true,
  skipWaiting: true,
  navigateFallback: '/login',
  navigateFallbackDenylist: [/^\/api\//],
  runtimeCaching: [
    {
      urlPattern: ({ url }) => url.pathname === '/actividad',
      handler: 'NetworkFirst',
      options: { cacheName: 'habitar-actividad', networkTimeoutSeconds: 3 },
    },
    {
      urlPattern: ({ request }) => request.destination === 'document',
      handler: 'NetworkFirst',
      options: { cacheName: 'habitar-pages', networkTimeoutSeconds: 3 },
    },
  ],
});

warnings.forEach((w) => console.warn('[generate-sw]', w));
console.log(`[generate-sw] wrote dist/sw.js — ${count} files precached, ${(size / 1024).toFixed(1)} KB`);

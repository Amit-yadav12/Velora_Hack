import { defineConfig, loadEnv, type PluginOption } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { stampSiteAssets } from './scripts/stamp-site-assets.mjs'

// https://vite.dev/config/
export default defineConfig(async ({ mode }) => {
  const plugins: PluginOption[] = [react(), tailwindcss()];
  try {
    // @ts-expect-error - dev-only API middleware (plain JS, serve only)
    const api = await import('./dev-api.js');
    if (typeof api.devApi === 'function') plugins.push(api.devApi());
  } catch {
    // dev api middleware absent — /api calls fall back gracefully
  }

  // Load env values for the Node-side config/API middleware, but never map
  // process.env.* into client code. Calendar refresh tokens, OAuth client
  // secrets, mail keys and QR signing secrets must stay server-side.
  const env = loadEnv(mode, process.cwd(), '');
  for (const [key, value] of Object.entries(env)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }

  // Stamp the deployment origin into index.html (canonical / og:url /
  // structured data) at BUILD time. Crawlers do not execute JS, so a runtime
  // rewrite alone cannot fix SEO on a new domain; the host's APP_URL /
  // VITE_APP_URL is the single source of truth.
  const appUrl = String(process.env.APP_URL || process.env.VITE_APP_URL || env.VITE_APP_URL || '').replace(/\/$/, '');
  if (appUrl) {
    plugins.push({
      name: 'velora-seo-origin',
      transformIndexHtml(html: string) {
        return html.replace(/https:\/\/velora-ai-in\.netlify\.app/g, appUrl);
      },
    });
  }
  // Static crawlers do not run the origin-rewrite script in index.html. Stamp
  // sitemap.xml and robots.txt after Vite copies public/ into dist/ so custom
  // domains and deploy previews use the same canonical origin as the HTML.
  plugins.push({
    name: 'velora-public-seo-assets',
    apply: 'build',
    closeBundle() {
      const origin = appUrl || 'https://velora-ai-in.netlify.app';
      console.log(`[velora] Stamped sitemap and robots for ${stampSiteAssets(path.resolve(process.cwd(), 'dist'), origin)}`);
    },
  });
  if (env.GOOGLE_MAPS_API_KEY) process.env.GOOGLE_MAPS_API_KEY = env.GOOGLE_MAPS_API_KEY;
  if (!process.env.GOOGLE_MAPS_API_KEY && env.VITE_GOOGLE_MAPS_API_KEY) {
    process.env.GOOGLE_MAPS_API_KEY = env.VITE_GOOGLE_MAPS_API_KEY;
  }
  const devAllowedHosts = String(env.VITE_DEV_ALLOWED_HOSTS || '')
    .split(',')
    .map((host) => host.trim())
    .filter(Boolean);

  return {
    plugins,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    // Only VITE_* values are public in import.meta.env. Never expose generic
    // server envs (including NEXT_PUBLIC_* and GOOGLE_* credentials) to bundles.
    envPrefix: 'VITE_',
    server: {
      host: '0.0.0.0',
      // Do not disable Vite's host validation. Add a comma-separated list to
      // VITE_DEV_ALLOWED_HOSTS only when a trusted remote preview needs it.
      ...(devAllowedHosts.length ? { allowedHosts: devAllowedHosts } : {}),
    },
    build: {
      // Split large vendor libs into their own cacheable chunks so the initial
      // parse/eval stays small and navigations feel instant.
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-motion': ['framer-motion'],
            'vendor-supabase': ['@supabase/supabase-js'],
          },
        },
      },
      chunkSizeWarningLimit: 900,
    },
  };
})

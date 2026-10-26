// Dependency-free checks for the assets and metadata shown by GitHub and browsers.
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(root, path));
const text = (path) => read(path).toString('utf8');
const checks = [];
const check = (label, condition) => checks.push({ label, condition: Boolean(condition) });

function pngSize(path) {
  const bytes = read(path);
  if (bytes.length < 24 || bytes.toString('hex', 0, 8) !== '89504e470d0a1a0a') return null;
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

const manifest = JSON.parse(text('public/manifest.webmanifest'));
const html = text('index.html');
const env = text('.env.example');
const robots = text('public/robots.txt');
const sitemap = text('public/sitemap.xml');
const viteConfig = text('vite.config.ts');
const og = pngSize('public/og-image.png');

check('App icon SVG source exists', existsSync(resolve(root, 'public/app-icon.svg')));
check('Favicon is valid SVG source', /<svg\b/.test(text('public/favicon.svg')) && /<path\b/.test(text('public/favicon.svg')));
check('Open Graph preview is exactly 1200×630', og?.width === 1200 && og?.height === 630);
check('Open Graph artwork has a tracked SVG source', existsSync(resolve(root, 'public/og-image.svg')));
check('Open Graph source and raster use the same dimensions', /width="1200" height="630"/.test(text('public/og-image.svg')) && og?.width === 1200 && og?.height === 630);
check('Open Graph metadata points to the preview asset', /property="og:image" content="https:\/\/[^\"]+\/og-image\.png"/.test(html));
check('Social metadata declares the correct preview dimensions', /property="og:image:width" content="1200"/.test(html) && /property="og:image:height" content="630"/.test(html));
check('192px install icon matches its manifest declaration', manifest.icons.some((icon) => icon.src === '/icon-192.png' && icon.sizes === '192x192' && pngSize('public/icon-192.png')?.width === 192 && pngSize('public/icon-192.png')?.height === 192));
check('512px install icon matches its manifest declaration', manifest.icons.some((icon) => icon.src === '/icon-512.png' && icon.sizes === '512x512' && pngSize('public/icon-512.png')?.width === 512 && pngSize('public/icon-512.png')?.height === 512));
check('Install icons declare maskable-safe backgrounds', manifest.icons.length >= 2 && manifest.icons.every((icon) => icon.purpose?.includes('maskable')));
check('Example origin values do not default to localhost', /^VITE_APP_URL=\s*$/m.test(env) && /^APP_URL=\s*$/m.test(env));
check('Boot screen uses the same icon as the installed app', /<img src="\/icon-192\.png"/.test(html));
check('Default sitemap and robots file agree on the demo origin', /Sitemap: https:\/\/velora-ai-in\.netlify\.app\/sitemap\.xml/.test(robots) && sitemap.includes('https://velora-ai-in.netlify.app/'));
check('Vite build stamps sitemap and robots with the configured deployment origin', /name:\s*'velora-public-seo-assets'/.test(viteConfig) && /stampSiteAssets\(path\.resolve\(process\.cwd\(\), 'dist'\), origin\)/.test(viteConfig));

let failed = 0;
for (const { label, condition } of checks) {
  console.log(`${condition ? 'PASS' : 'FAIL'} ${label}`);
  if (!condition) failed++;
}
console.log(`\nAsset/metadata checks: ${checks.length - failed}/${checks.length} passed`);
if (failed) process.exit(1);

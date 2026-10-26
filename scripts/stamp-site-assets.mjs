// Rewrite public SEO URLs in dist/ after Vite has copied public assets.
// Crawlers do not execute the runtime origin-rewrite script in index.html,
// so sitemap.xml and robots.txt must be stamped during the build as well.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const defaultOrigin = 'https://velora-ai-in.netlify.app';

export function normalizeSiteOrigin(configuredOrigin) {
  let parsed;
  try {
    parsed = new URL(configuredOrigin);
  } catch {
    throw new Error(`APP_URL/VITE_APP_URL must be a valid absolute URL; received: ${configuredOrigin}`);
  }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
    throw new Error('APP_URL/VITE_APP_URL must use HTTP(S) and must not contain credentials.');
  }
  return parsed.origin;
}

export function stampSiteAssets(dist, configuredOrigin = defaultOrigin) {
  const origin = normalizeSiteOrigin(configuredOrigin);
  const sitemapPath = resolve(dist, 'sitemap.xml');
  const robotsPath = resolve(dist, 'robots.txt');
  if (!existsSync(sitemapPath) || !existsSync(robotsPath)) {
    throw new Error('Built dist/sitemap.xml and dist/robots.txt were not found. Run this script after vite build.');
  }

  const sitemap = readFileSync(sitemapPath, 'utf8').replaceAll(defaultOrigin, origin);
  const robots = readFileSync(robotsPath, 'utf8').replace(/^Sitemap:\s*\S+$/m, `Sitemap: ${origin}/sitemap.xml`);
  writeFileSync(sitemapPath, sitemap);
  writeFileSync(robotsPath, robots);
  return origin;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const configuredOrigin = process.env.APP_URL || process.env.VITE_APP_URL || defaultOrigin;
  console.log(`Stamped sitemap.xml and robots.txt for ${stampSiteAssets(resolve(root, 'dist'), configuredOrigin)}`);
}

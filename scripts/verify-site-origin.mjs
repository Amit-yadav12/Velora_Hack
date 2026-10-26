// Verify deployment-origin stamping without needing a Vite build or network access.
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { stampSiteAssets, normalizeSiteOrigin } from './stamp-site-assets.mjs';

const defaultOrigin = 'https://velora-ai-in.netlify.app';
const dir = mkdtempSync(resolve(tmpdir(), 'velora-site-origin-'));
try {
  writeFileSync(resolve(dir, 'sitemap.xml'), `<urlset><loc>${defaultOrigin}/</loc><loc>${defaultOrigin}/explore</loc></urlset>`);
  writeFileSync(resolve(dir, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${defaultOrigin}/sitemap.xml\n`);

  assert.equal(normalizeSiteOrigin('https://preview.example.com/'), 'https://preview.example.com');
  assert.equal(stampSiteAssets(dir, 'https://preview.example.com/'), 'https://preview.example.com');
  const sitemap = readFileSync(resolve(dir, 'sitemap.xml'), 'utf8');
  const robots = readFileSync(resolve(dir, 'robots.txt'), 'utf8');
  assert.match(sitemap, /https:\/\/preview\.example\.com\//);
  assert.match(sitemap, /https:\/\/preview\.example\.com\/explore/);
  assert.doesNotMatch(sitemap, /velora-ai-in\.netlify\.app/);
  assert.match(robots, /Sitemap: https:\/\/preview\.example\.com\/sitemap\.xml/);
  assert.throws(() => normalizeSiteOrigin('javascript:alert(1)'), /must use HTTP\(S\)/);
  assert.throws(() => normalizeSiteOrigin('https://user:pass@example.com'), /must use HTTP\(S\)/);
  console.log('Site-origin checks: 8/8 passed');
} finally {
  rmSync(dir, { recursive: true, force: true });
}

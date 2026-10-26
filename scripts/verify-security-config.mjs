// Dependency-free security/configuration guard. It runs in CI before provider
// credentials exist, catching regressions that could expose server env values.
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const vite = readFileSync(resolve(root, 'vite.config.ts'), 'utf8');
const google = readFileSync(resolve(root, 'src/lib/googleAuth.ts'), 'utf8');
const welcome = readFileSync(resolve(root, 'src/pages/customer/Welcome.tsx'), 'utf8');
const authContext = readFileSync(resolve(root, 'src/contexts/AuthContext.tsx'), 'utf8');
const ignore = readFileSync(resolve(root, '.gitignore'), 'utf8');
const rls = readFileSync(resolve(root, 'supabase/migrations/0003_rls_tightening.sql'), 'utf8');
const demoProvision = readFileSync(resolve(root, 'api/provision-demo.js'), 'utf8');
const envExample = readFileSync(resolve(root, '.env.example'), 'utf8');
const smartSlots = readFileSync(resolve(root, 'api/smart-slots.js'), 'utf8');
const businessSlots = readFileSync(resolve(root, 'api/business-slots.js'), 'utf8');
const demoStore = readFileSync(resolve(root, 'src/lib/demoStore.ts'), 'utf8');
const customerShell = readFileSync(resolve(root, 'src/app/CustomerShell.tsx'), 'utf8');
const bookingTests = readFileSync(resolve(root, 'scripts/test-demo-engine.mjs'), 'utf8');
const welcomeCopy = readFileSync(resolve(root, 'src/pages/customer/Welcome.tsx'), 'utf8');
const offlineStore = readFileSync(resolve(root, 'src/lib/offlineStore.ts'), 'utf8');
const clientSynthetic = readFileSync(resolve(root, 'src/lib/synthetic.ts'), 'utf8');
const serverSynthetic = readFileSync(resolve(root, 'api/_lib/synthetic.js'), 'utf8');
const discoverApi = readFileSync(resolve(root, 'api/discover.js'), 'utf8');
const heatmapApi = readFileSync(resolve(root, 'api/heatmap.js'), 'utf8');
const conciergeApi = readFileSync(resolve(root, 'api/concierge.js'), 'utf8');
const pricing = readFileSync(resolve(root, 'api/_lib/pricing.js'), 'utf8');
const travelPlanner = readFileSync(resolve(root, 'api/travel-planner.js'), 'utf8');
const sampleData = readFileSync(resolve(root, 'src/lib/sampleData.js'), 'utf8');
const businessCard = readFileSync(resolve(root, 'src/components/product.tsx'), 'utf8');
const homePage = readFileSync(resolve(root, 'src/pages/customer/Home.tsx'), 'utf8');
const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const packageLock = JSON.parse(readFileSync(resolve(root, 'package-lock.json'), 'utf8'));
const rlsCode = rls.replace(/--[^\n]*/g, '');
const checks = [];
const check = (label, condition) => checks.push({ label, condition: Boolean(condition) });

check('Vite exposes only VITE_* client environment values', /envPrefix:\s*'VITE_'/.test(vite));
check('Vite does not replace generic process.env values into the client bundle', !/processEnvDefines|define:\s*\{?\s*['"`]process\.env/.test(vite) && !/processEnvDefines/.test(vite));
check('Vite hydrates .env values only in its Node process for API middleware', /loadEnv\(mode, process\.cwd\(\), ''\)/.test(vite) && /process\.env\[key\]\s*===\s*undefined/.test(vite));
check('Vite host validation stays enabled by default', !/allowedHosts:\s*true/.test(vite) && /VITE_DEV_ALLOWED_HOSTS/.test(vite));
check('Untracked workspace source instrumentation is not part of the build config', !/vite-source-tags/i.test(vite));
check('Google OAuth uses Supabase hosted OAuth', /auth\.signInWithOAuth\(\{\s*provider:\s*'google'/s.test(google));
check('Demo mode never creates a fake Google identity', /Google sign-in needs a configured Supabase project/.test(google) && !/signInWithPassword/.test(google));
check('Phone OTP uses Supabase send and verify APIs', /auth\.signInWithOtp\(/.test(welcome) && /auth\.verifyOtp\(/.test(welcome));
check('Cloud demo UI is hidden unless explicitly enabled', /isDemoMode \|\| import\.meta\.env\.VITE_ENABLE_PUBLIC_DEMO_ACCOUNTS === 'true'/.test(welcome));
check('Public demo role provisioning is disabled by default on the server', /process\.env\.ENABLE_PUBLIC_DEMO_ACCOUNTS !== 'true'/.test(demoProvision));
check('Environment template separates client and server demo flags', /VITE_ENABLE_PUBLIC_DEMO_ACCOUNTS=false/.test(envExample) && /ENABLE_PUBLIC_DEMO_ACCOUNTS=false/.test(envExample));
check('Production admin roles cannot be elevated from the local profile cache', /isDemoMode \? cached : \{ \.\.\.cached, role: 'customer' \}/.test(authContext));
check('Credentials and build outputs are excluded from Git', /\.env/.test(ignore) && /node_modules/.test(ignore) && /dist/.test(ignore));
check('RLS tightening migration is present and not universally permissive', /create policy|drop policy/i.test(rlsCode) && !/auth\.role\(\)\s*=\s*'service_role'\s+or\s+true/i.test(rlsCode));
check('Smart-slot API explicitly creates and queries slots in Asia/Kolkata', /istDayBounds\(day\)/.test(smartSlots) && /istWallDate\(day, h, m\)/.test(smartSlots) && /formatISTime\(s\)/.test(smartSlots));
check('Business-slot API uses timezone-safe IST instants and labels', /istDayBounds\(date\)/.test(businessSlots) && /istWallDate\(date, h, m\)/.test(businessSlots) && /formatISTime\(s\)/.test(businessSlots));
check('Local demo staff weekday and slot labels do not depend on browser timezone', /istWeekday\(date\)/.test(demoStore) && /timeZone:\s*'Asia\/Kolkata'/.test(demoStore) && !/istWallDate\(date, 12, 0\)\.getDay\(\)/.test(demoStore));
check('Customer demo state is clearly labelled in the app shell', /<DemoEnvironmentNotice\s*\/>/.test(customerShell));
check('Wrong-salt QR regression test invokes the real verification path', /await verifyToken\(wrongSaltToken\)/.test(bookingTests) && /!alteredTicket\.valid/.test(bookingTests));
check('Welcome copy avoids unconditional instant-confirmation promise', !/instant confirmation/i.test(welcomeCopy));
check('Demo notifications identify sample listings rather than claim verified inventory', /sample local-service listings/i.test(offlineStore) && !/300\+ verified businesses/i.test(offlineStore));
check('Synthetic business descriptions disclose illustrative data rather than fabricated customer counts', /illustrative demo data/i.test(clientSynthetic) && /illustrative data/i.test(serverSynthetic) && !/rated \$\{rating\} by \$\{reviewCount\}\+ customers/i.test(clientSynthetic + serverSynthetic));
check('Synthetic ranking does not depend on fabricated popularity scores', !/ai_popularity/.test(clientSynthetic + serverSynthetic) && !/popularity scores/i.test(clientSynthetic));
check('API discovery uses the same explainable ranker and timezone-safe opening window', /scoreBusinessMatch/.test(discoverApi) && /nextOpeningWindowLabel/.test(discoverApi) && !/s\.setHours|s\.getHours|toLocaleTimeString\(\[\]/.test(discoverApi));
check('Heatmap uses IST weekdays/hours rather than server-local date fields', /istWeekdayIndex\(d\)/.test(heatmapApi) && /istHour\(d\)/.test(heatmapApi) && !/d\.getDay\(\)|d\.getHours\(\)|d\.setHours\(/.test(heatmapApi));
check('Concierge today/tomorrow/weekday parsing uses IST calendar helpers', /addISTDays/.test(conciergeApi) && /istWeekdayIndex/.test(conciergeApi) && !/d\.getDay\(\)|d\.setDate\(/.test(conciergeApi));
check('Dynamic time pricing uses IST hour and weekday', /istHour\(d\)/.test(pricing) && /istWeekdayIndex\(d\)/.test(pricing) && !/d\.getHours\(\)|d\.getDay\(\)/.test(pricing));
check('Travel planner formats its leave time in IST', /formatISTime\(leaveAt\)/.test(travelPlanner) && !/leaveAt\.toLocaleTimeString\(\[\]/.test(travelPlanner));

check('Sample/demo listing classification is centralized and covers reserved synthetic IDs', /export function isSampleBusiness/.test(sampleData) && /startsWith\('demo-'\)/.test(sampleData) && /startsWith\('local-'\)/.test(sampleData) && /numericId >= 100000/.test(sampleData));
check('Home screen distinguishes sample opening-hours estimates and ratings', /Hours say open/.test(homePage) && /Sample listing/.test(homePage) && /isSampleBusiness\(b\)/.test(homePage));
check('Shared provider cards label sample inventory and ratings', /Sample listing/.test(businessCard) && /sample rating/.test(businessCard) && /isSampleBusiness\(b\)/.test(businessCard));
check('Client and server synthetic catalogues avoid guaranteed-slot marketing claims', !/Guaranteed charger slot/i.test(clientSynthetic + serverSynthetic) && /subject to charger availability/i.test(clientSynthetic + serverSynthetic));
check('Package and lockfile release versions match', packageJson.version === packageLock.version && packageJson.version === packageLock.packages[''].version);

let failed = 0;
for (const item of checks) {
  console.log(`${item.condition ? 'PASS' : 'FAIL'} ${item.label}`);
  if (!item.condition) failed++;
}
console.log(`\nSecurity/configuration checks: ${checks.length - failed}/${checks.length} passed`);
if (failed) process.exit(1);

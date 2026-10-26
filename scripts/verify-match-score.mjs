// Dependency-free regression checks for the explainable recommendation engine.
import { scoreBusinessMatch } from '../src/lib/matchScore.js';
import { explainSlotChoice } from '../src/lib/slotRecommendation.js';
import { isSampleBusiness } from '../src/lib/sampleData.js';

let passed = 0;
let failed = 0;
const check = (label, condition) => {
  if (condition) { passed++; console.log(`PASS ${label}`); }
  else { failed++; console.error(`FAIL ${label}`); }
};

const base = { rating: 4.6, review_count: 240 };
const near = scoreBusinessMatch(base, { id: 42, distanceKm: 1.2, openNow: true, nextOpeningLabel: '10:30 AM' });
const far = scoreBusinessMatch(base, { id: 42, distanceKm: 9.5, openNow: true, nextOpeningLabel: '10:30 AM' });
const closed = scoreBusinessMatch(base, { id: 42, distanceKm: 1.2, openNow: false });
const noDistance = scoreBusinessMatch(base, { id: 42, distanceKm: null, openNow: true });
const premiumRating = scoreBusinessMatch({ id: 43, rating: 4.9, review_count: 30 }, { distanceKm: 1.2, openNow: true });
const sample = scoreBusinessMatch({ id: 100001, synthetic: true, rating: 4.9, review_count: 999 }, { distanceKm: 1.2, openNow: true, nextOpeningLabel: '10:30 AM' });
const noSlotGuarantee = scoreBusinessMatch(base, { id: 42, distanceKm: 1.2, openNow: true, nextOpeningLabel: '10:30 AM' });
const noSignals = scoreBusinessMatch({}, {});

check('score is normalized between 0 and 100', near.score >= 0 && near.score <= 100);
check('nearby business outranks distant business when other signals match', near.score > far.score);
check('opening status improves the score without pretending a slot is confirmed', near.score > closed.score);
check('unknown distance is excluded instead of treated as far away', noDistance.factors.every((factor) => factor.key !== 'distance'));
check('unknown signals are excluded from the denominator', noDistance.signalCount === 2);
check('rating factors are visible in the breakdown', near.factors.some((factor) => factor.key === 'rating' && /4\.6/.test(factor.detail)));
check('distance reasons use measured distance', near.reasons.includes('Within 2 km'));
check('opening window label is visible without claiming a confirmed appointment slot', near.reasons.includes('Opening window 10:30 AM'));
check('review count is shown in the rating factor, not used as a hidden ranking boost', near.factors.some((factor) => /240 reviews/.test(factor.detail)));
check('a business with stronger rating can still be assessed fairly across signals', premiumRating.score !== null && premiumRating.score <= 100);
check('sample listings do not present generated review counts as customer evidence', sample.factors.some((factor) => factor.key === 'rating' && /sample rating/i.test(factor.label) && !/999/.test(factor.detail)) && !sample.reasons.some((reason) => /customer reviews|highly rated/i.test(reason)));
check('opening-window estimates are explanatory only and do not add fake slot-availability points', noSlotGuarantee.score === near.score && !noSlotGuarantee.factors.some((factor) => /next slot|available slot/i.test(factor.detail))); 
check('no measurable signals produce no misleading numeric score', noSignals.score === null && noSignals.signalCount === 0);
check('sample-data classifier flags synthetic catalogue IDs consistently', isSampleBusiness({ id: 100001, rating: 4.8 }) && isSampleBusiness({ id: 'demo-biz-1' }) && isSampleBusiness({ id: 'local-custom' }));
check('sample-data classifier leaves ordinary provider records unlabelled', !isSampleBusiness({ id: 42, rating: 4.8 }) && !isSampleBusiness({ id: 'place:abc123', live: true }));

const slots = [
  { time: 'a', available: true, wait_min: 5, crowd: 0 },
  { time: 'b', available: true, wait_min: 18, crowd: 3 },
  { time: 'c', available: false, wait_min: null, crowd: 5 },
];
const best = explainSlotChoice(slots[0], slots, [slots[0]]);
const userChoice = explainSlotChoice(slots[1], slots, [slots[0]]);
const unavailable = explainSlotChoice(slots[2], slots, [slots[0]]);
check('top recommendation is identified explicitly', best.recommended && best.signals.some((signal) => signal.key === 'rank'));
check('wait estimate is disclosed', best.signals.some((signal) => /5 min/.test(signal.label)));
check('higher estimated crowd is presented without false certainty', userChoice.signals.some((signal) => signal.key === 'crowd' && signal.positive === false));
check('slot explanation includes its estimate caveat', /not a live queue sensor/.test(best.caveat));
check('unavailable slot cannot be presented as a recommendation', unavailable.recommended === false && unavailable.signals.length === 0);

console.log(`\nRecommendation checks: ${passed}/${passed + failed} passed`);
if (failed) process.exit(1);

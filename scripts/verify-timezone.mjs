// Timezone regression tests are deliberately dependency-free and host-zone agnostic.
import { addISTDays, formatISTime, istDateKey, istDayBounds, istHour, istWallDate, istWeekdayIndex, isValidDateKey } from '../api/_lib/time.js';
import { syntheticSlots } from '../api/_lib/synthetic.js';
import { istHour as clientISTHour, nextOpeningWindowLabel } from '../shared/istTime.js';

let passed = 0;
let failed = 0;
const check = (label, condition, extra = '') => {
  if (condition) { passed++; console.log(`PASS ${label}`); }
  else { failed++; console.error(`FAIL ${label}${extra ? ` — ${extra}` : ''}`); }
};

const nineAm = istWallDate('2099-10-27', 9, 0);
const sixThirtyPm = istWallDate('2099-10-27', 18, 30);
const bounds = istDayBounds('2099-10-27');
check('09:00 IST maps to the same absolute instant on any server timezone', nineAm.toISOString() === '2099-10-27T03:30:00.000Z', nineAm.toISOString());
check('18:30 IST maps to the expected UTC instant', sixThirtyPm.toISOString() === '2099-10-27T13:00:00.000Z', sixThirtyPm.toISOString());
check('IST day starts at the correct UTC boundary', bounds.start.toISOString() === '2099-10-26T18:30:00.000Z', bounds.start.toISOString());
check('IST day ends one millisecond before the next IST day', bounds.end.toISOString() === '2099-10-27T18:29:59.999Z', bounds.end.toISOString());
check('formatting explicitly uses Asia/Kolkata', /9:00\s?AM/i.test(formatISTime(nineAm)), formatISTime(nineAm));
check('current date key is interpreted in IST across midnight UTC', istDateKey(new Date('2026-10-26T19:00:00.000Z')) === '2026-10-27', istDateKey(new Date('2026-10-26T19:00:00.000Z')));
check('valid date accepted', isValidDateKey('2099-10-27'));
check('impossible calendar date rejected', !isValidDateKey('2026-02-30'));
check('malformed date rejected', !isValidDateKey('27-10-2026'));
check('IST weekday index ignores host timezone', istWeekdayIndex(istWallDate('2099-10-27', 12, 0)) === 2);
check('IST hour is stable for a known absolute instant', istHour(new Date('2026-10-26T03:30:00.000Z')) === 9);
check('calendar-day addition handles month/year boundaries', addISTDays('2099-12-31', 1) === '2100-01-01');

const slots = syntheticSlots(100001, '2099-10-27', 30, '09:00', '12:00');
check('synthetic business slots use the same IST instant', slots[0]?.time === '2099-10-27T03:30:00.000Z', slots[0]?.time || 'no slots');
check('synthetic slot labels use IST wall-clock time', /9:00\s?AM/i.test(slots[0]?.label || ''), slots[0]?.label || 'no label');
const morning = new Date('2026-10-26T03:05:00.000Z'); // 08:35 IST
const openNow = new Date('2026-10-26T03:35:00.000Z'); // 09:05 IST
const nearClose = new Date('2026-10-26T12:30:00.000Z'); // 18:00 IST
check('shared client helper reads the India hour even on a non-India device', clientISTHour(morning) === 8, String(clientISTHour(morning)));
check('before opening, helper labels the business opening window in IST', /9:00\s?AM/i.test(nextOpeningWindowLabel(morning, 9, 18) || ''), nextOpeningWindowLabel(morning, 9, 18) || 'no label');
check('during business hours, next half-hour window is rounded in IST', /9:30\s?AM/i.test(nextOpeningWindowLabel(openNow, 9, 18) || ''), nextOpeningWindowLabel(openNow, 9, 18) || 'no label');
check('after closing, helper does not invent a same-day opening window', nextOpeningWindowLabel(nearClose, 9, 18) === null);
check('opening-hours helper returns only an opening time, not a free-slot promise', !/book|free slot|available/i.test(nextOpeningWindowLabel(morning, 9, 18) || '')); 

console.log(`\nTimezone checks: ${passed}/${passed + failed} passed`);
if (failed) process.exit(1);

const IST_OFFSET_MINUTES = 330;
const DAY_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isValidDateKey(value) {
  if (typeof value !== 'string') return false;
  const match = DAY_KEY.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const check = new Date(Date.UTC(year, month - 1, day));
  return check.getUTCFullYear() === year && check.getUTCMonth() === month - 1 && check.getUTCDate() === day;
}

/** Convert an Asia/Kolkata wall-clock time into an absolute instant. */
export function istWallDate(dateKey, hours, minutes = 0, seconds = 0, milliseconds = 0) {
  if (!isValidDateKey(dateKey)) throw new RangeError(`Invalid date; expected YYYY-MM-DD: ${dateKey}`);
  if (![hours, minutes, seconds, milliseconds].every(Number.isInteger)
    || hours < 0 || hours > 23 || minutes < 0 || minutes > 59
    || seconds < 0 || seconds > 59 || milliseconds < 0 || milliseconds > 999) {
    throw new RangeError('Invalid IST wall-clock time');
  }
  const [year, month, day] = dateKey.split('-').map(Number);
  const utc = Date.UTC(year, month - 1, day, hours, minutes, seconds, milliseconds)
    - IST_OFFSET_MINUTES * 60_000;
  return new Date(utc);
}

export function istDayBounds(dateKey) {
  const start = istWallDate(dateKey, 0, 0, 0, 0);
  const [year, month, day] = dateKey.split('-').map(Number);
  const nextUtcDate = new Date(Date.UTC(year, month - 1, day + 1));
  const nextKey = `${nextUtcDate.getUTCFullYear()}-${String(nextUtcDate.getUTCMonth() + 1).padStart(2, '0')}-${String(nextUtcDate.getUTCDate()).padStart(2, '0')}`;
  const end = new Date(istWallDate(nextKey, 0, 0, 0, 0).getTime() - 1);
  return { start, end };
}

export function istDateKey(instant = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(instant);
  const part = (type) => parts.find((item) => item.type === type)?.value || '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function formatISTime(instant) {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(instant);
}

export function istWeekday(instant) {
  return new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short' }).format(instant);
}

export function istHour(instant) {
  const hour = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', hourCycle: 'h23' }).format(instant);
  return Number(hour);
}

export function istWeekdayIndex(instant) {
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', weekday: 'short' }).format(instant);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday);
}

export function addISTDays(dateKey, days) {
  if (!isValidDateKey(dateKey) || !Number.isInteger(days)) throw new RangeError('Invalid IST date or day offset');
  const [year, month, day] = dateKey.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}-${String(shifted.getUTCDate()).padStart(2, '0')}`;
}

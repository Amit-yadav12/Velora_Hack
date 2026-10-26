const IST_TZ = 'Asia/Kolkata';
const IST_OFFSET = '+05:30';
const HALF_HOUR_MS = 30 * 60 * 1000;

function numericPart(instant, type) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: IST_TZ,
    hour: type === 'hour' ? '2-digit' : undefined,
    minute: type === 'minute' ? '2-digit' : undefined,
    hourCycle: 'h23',
  }).formatToParts(instant);
  return Number(parts.find((part) => part.type === type)?.value);
}

export function istHour(instant = new Date()) {
  return numericPart(instant, 'hour');
}

export function istMinute(instant = new Date()) {
  return numericPart(instant, 'minute');
}

export function istDateKey(instant = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(instant);
  const value = (type) => parts.find((part) => part.type === type)?.value || '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

export function formatISTime(instant) {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: IST_TZ, hour: 'numeric', minute: '2-digit',
  }).format(instant);
}

/**
 * Returns the next half-hour opening-hours window label, not a booking guarantee.
 * The caller should check actual slot availability in the booking flow.
 */
export function nextOpeningWindowLabel(now, openHour, closeHour) {
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) return null;
  if (!Number.isInteger(openHour) || !Number.isInteger(closeHour)
    || openHour < 0 || openHour > 23 || closeHour < 1 || closeHour > 24 || openHour >= closeHour) return null;

  const currentHour = istHour(now);
  if (currentHour >= openHour && currentHour < closeHour) {
    // India has no daylight-saving transitions. Epoch half-hour boundaries map
    // exactly to :00/:30 in IST and do not depend on the browser/server timezone.
    const next = new Date((Math.floor(now.getTime() / HALF_HOUR_MS) + 1) * HALF_HOUR_MS);
    return istHour(next) < closeHour ? formatISTime(next) : null;
  }

  if (currentHour < openHour) {
    const dateKey = istDateKey(now);
    const opening = new Date(`${dateKey}T${String(openHour).padStart(2, '0')}:00:00${IST_OFFSET}`);
    return formatISTime(opening);
  }
  return null;
}

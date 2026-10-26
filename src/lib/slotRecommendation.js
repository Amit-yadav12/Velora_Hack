/**
 * Plain-language explanation for Velora's slot-ranking heuristic.
 * Wait and crowd values are estimates based on booking data, not live sensors.
 */
const numericValues = (slots, key) => slots
  .filter((slot) => slot.available && typeof slot[key] === 'number' && Number.isFinite(slot[key]))
  .map((slot) => slot[key])
  .sort((a, b) => a - b);

const median = (values) => {
  if (!values.length) return null;
  const middle = Math.floor(values.length / 2);
  return values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2;
};

/** @param {{time:string, label?:string, available:boolean, wait_min?:number|null, crowd?:number, score?:number}} selected
 * @param {Array<{time:string, available:boolean, wait_min?:number|null, crowd?:number, score?:number}>} slots
 * @param {Array<{time:string}>} recommended
 */
export function explainSlotChoice(selected, slots = [], recommended = []) {
  if (!selected || !selected.available) {
    return {
      recommended: false,
      signals: [],
      summary: 'Choose an available time to see the scheduling signals.',
      caveat: 'Recommendations are estimates, not a guarantee of waiting time.',
    };
  }

  const isRecommended = recommended.some((slot) => slot.time === selected.time);
  const signals = [];
  const waits = numericValues(slots, 'wait_min');
  const medianWait = median(waits);
  if (typeof selected.wait_min === 'number' && Number.isFinite(selected.wait_min)) {
    signals.push({
      label: `Estimated wait · ${Math.max(0, Math.round(selected.wait_min))} min`,
      positive: medianWait == null || selected.wait_min <= medianWait,
      key: 'wait',
    });
  }

  const crowds = numericValues(slots, 'crowd');
  const medianCrowd = median(crowds);
  if (typeof selected.crowd === 'number' && Number.isFinite(selected.crowd)) {
    const crowd = Math.max(0, Math.round(selected.crowd));
    const crowdText = crowd === 0 ? 'No nearby bookings in estimate' : `${crowd} nearby booking${crowd === 1 ? '' : 's'} in estimate`;
    signals.push({
      label: crowdText,
      positive: medianCrowd == null || selected.crowd <= medianCrowd,
      key: 'crowd',
    });
  }

  if (isRecommended) signals.push({ label: 'Among Velora’s top suggested times', positive: true, key: 'rank' });

  const summary = isRecommended
    ? 'This time ranks well against the other available slots using estimated waiting time, nearby booking load and time-of-day preferences.'
    : 'You selected this time. Velora shows the available signals so you can compare it with the suggested options.';

  return {
    recommended: isRecommended,
    signals,
    summary,
    caveat: 'Wait and crowd figures are estimates derived from booking records and a scheduling heuristic—not a live queue sensor or a guarantee.',
  };
}

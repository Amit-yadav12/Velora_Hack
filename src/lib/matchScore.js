import { isSampleBusiness } from './sampleData.js';

/**
 * Explainable local-service ranking.
 *
 * This is a deterministic, data-backed heuristic—not a trained ML model.
 * Every factor shown to the customer is derived from a value the app already
 * has. Unknown factors are omitted rather than silently treated as failures.
 */

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const round1 = (value) => Math.round(value * 10) / 10;

/** @typedef {{ key: string, label: string, detail: string, points: number, maxPoints: number, percent: number }} MatchFactor */

/**
 * Score a business match using the available rating, distance, and reported opening status.
 * @param {{rating?:number, review_count?:number, id?:number|string, synthetic?:boolean, demo?:boolean}} business
 * @param {{distanceKm?:number|null, openNow?:boolean, nextOpeningLabel?:string|null}} context
 * @returns {{score:number|null, signalCount:number, reasons:string[], factors:MatchFactor[]}}
 */
export function scoreBusinessMatch(business, context = {}) {
  const factors = [];
  const isSample = isSampleBusiness(business);
  const addFactor = (key, label, detail, points, maxPoints) => {
    factors.push({
      key,
      label,
      detail,
      points: round1(points),
      maxPoints,
      percent: Math.round((points / maxPoints) * 100),
    });
  };

  const rating = Number(business?.rating);
  if (Number.isFinite(rating) && rating > 0 && rating <= 5) {
    const reviews = Math.max(0, Number(business?.review_count) || 0);
    const ratingDetail = isSample
      ? `Illustrative sample rating · ${round1(rating).toFixed(1)} / 5`
      : reviews > 0 ? `${round1(rating).toFixed(1)} / 5 · ${reviews.toLocaleString('en-IN')} reviews` : `${round1(rating).toFixed(1)} / 5`;
    addFactor(
      'rating',
      isSample ? 'Sample rating' : 'Customer rating',
      ratingDetail,
      (rating / 5) * 40,
      40,
    );
  }

  const distance = context.distanceKm;
  if (typeof distance === 'number' && Number.isFinite(distance) && distance >= 0) {
    const points = clamp(1 - distance / 12, 0, 1) * 35;
    addFactor(
      'distance',
      'Distance',
      distance < 1 ? `${Math.round(distance * 1000)} m away` : `${round1(distance).toFixed(1)} km away`,
      points,
      35,
    );
  }

  // Opening hours are a valid discovery signal; an actual free slot is not
  // known until the booking endpoint checks duration and existing bookings.
  // Never let a predicted opening window masquerade as confirmed availability.
  if (typeof context.openNow === 'boolean') {
    addFactor('availability', 'Opening status', context.openNow ? 'Currently open by reported hours' : 'Currently closed by reported hours', context.openNow ? 25 : 0, 25);
  }

  const weightAvailable = factors.reduce((sum, factor) => sum + factor.maxPoints, 0);
  const pointsEarned = factors.reduce((sum, factor) => sum + factor.points, 0);
  const score = weightAvailable > 0 ? Math.round((pointsEarned / weightAvailable) * 100) : null;

  const reasons = [];
  if (!isSample && Number.isFinite(rating) && rating >= 4.7) reasons.push(`Highly rated · ${rating.toFixed(1)}★`);
  if (typeof distance === 'number' && Number.isFinite(distance) && distance <= 5) {
    reasons.push(distance <= 2 ? 'Within 2 km' : 'Nearby');
  }
  if (context.openNow === true) reasons.push('Open now');
  if (context.nextOpeningLabel) reasons.push(`Opening window ${context.nextOpeningLabel}`);
  const reviewCount = Math.max(0, Number(business?.review_count) || 0);
  if (!isSample && reviewCount >= 100) reasons.push(`${reviewCount.toLocaleString('en-IN')} customer reviews`);

  return { score, signalCount: factors.length, reasons: reasons.slice(0, 3), factors };
}

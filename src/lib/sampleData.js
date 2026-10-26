/**
 * Returns whether a listing comes from the local/demo catalogue rather than
 * a connected provider record. Keep this distinction visible wherever the UI
 * shows ratings, availability, wait estimates, or booking status.
 */
export function isSampleBusiness(business) {
  if (!business) return false;
  if (business.synthetic === true || business.demo === true) return true;

  const id = String(business.id ?? '');
  if (id.startsWith('demo-') || id.startsWith('local-')) return true;

  // Synthetic catalogue IDs reserve the 100000+ range. Real provider IDs are
  // expected to use the database ID range or an external place identifier.
  const numericId = Number(business.id);
  return id !== '' && Number.isFinite(numericId) && numericId >= 100000;
}

import supabase from './db-client.js';
import { cors, sanitizeText, enforceRateLimit } from './_lib/security.js';
import { cityBusinesses } from './_lib/synthetic.js';
import { scoreBusinessMatch } from '../src/lib/matchScore.js';
import { istHour, nextOpeningWindowLabel } from '../shared/istTime.js';

// FAST location-aware discovery, CITY-SCOPED. Merges Supabase rows with the
// deterministic synthetic city ecosystem so every city feels fully populated.
// One query, pure in-memory math — no per-business booking loops.

const cache = new Map(); // key -> { at, payload }
const TTL = 30000; // 30s micro-cache

function haversineKm(a, b) {
  if (a.lat == null || b.lat == null) return null;
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!enforceRateLimit(req, res, 'discover', { limit: 120, windowMs: 60_000 })) return;
  try {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    const { lat, lng, category, q, sort = 'recommended', open_now, max_km, min_rating, city, price_max } = req.query;
    const origin = lat && lng ? { lat: +lat, lng: +lng } : null;
    const cityName = sanitizeText(city, 40) || null;
    const now = new Date();
    const hour = istHour(now);

    const key = JSON.stringify({ lat, lng, category, q, sort, open_now, max_km, min_rating, city: cityName, price_max, b: Math.floor(Date.now() / TTL) });
    const hit = cache.get(key);
    if (hit) { res.setHeader('X-Cache', 'HIT'); return res.status(200).json(hit); }

    // 1) Supabase rows (best effort — never blocks the synthetic ecosystem)
    let dbRows = [];
    try {
      let query = supabase.from('businesses').select('*').eq('active', true);
      if (category && category !== 'All') query = query.eq('category', category);
      const { data, error } = await query;
      if (!error && Array.isArray(data)) dbRows = data;
    } catch (e) {
      console.error('[discover:db]', e.message);
    }

    // 2) Synthetic city ecosystem (always available)
    let synth = [];
    try {
      synth = cityBusinesses(cityName || 'Jaipur', { category: category && category !== 'All' ? category : undefined });
    } catch (e) {
      console.error('[discover:synth]', e.message);
    }

    // 3) Merge (DB wins on id conflicts), then city-pin
    const seen = new Set(dbRows.map((b) => String(b.id)));
    let list = [...dbRows];
    for (const b of synth) {
      if (!seen.has(String(b.id))) {
        seen.add(String(b.id));
        list.push(b);
      }
    }
    if (cityName) {
      list = list.filter((b) => !b.city || b.city === cityName);
    }

    if (q) {
      const term = (sanitizeText(q, 80) || '').toLowerCase();
      list = list.filter((b) => (b.name || '').toLowerCase().includes(term) || (b.category || '').toLowerCase().includes(term) || (b.description || '').toLowerCase().includes(term) || (b.city || '').toLowerCase().includes(term) || (b.area || '').toLowerCase().includes(term));
    }

    list = list.map((b) => {
      const oh = parseInt((b.open_time || '09:00').split(':')[0], 10);
      const is247 = b.open_time === '00:00';
      const ch = is247 ? 24 : (parseInt((b.close_time || '21:00').split(':')[0], 10) || 21);
      const open = hour >= oh && hour < ch;
      const km = origin ? haversineKm(origin, b) : null;
      const travelMin = km != null ? Math.round((km / 35) * 60) : null;

      // This label is an opening-hours window, not a guarantee of a free slot.
      // The booking endpoint checks actual duration and reservation conflicts.
      const nextLabel = nextOpeningWindowLabel(now, oh, ch);
      const distanceKm = km != null ? Math.round(km * 10) / 10 : null;
      const match = scoreBusinessMatch(b, {
        distanceKm,
        openNow: open,
        nextOpeningLabel: nextLabel,
      });

      return {
        ...b,
        distance_km: distanceKm,
        travel_min: travelMin,
        open_now: open,
        next_available: !!nextLabel, // legacy field; represents an opening-hours window only
        next_available_label: nextLabel,
        fit_score: match.score,
        fit_reasons: match.reasons,
        fit_breakdown: match.factors,
        fit_signal_count: match.signalCount,
        // Temporary compatibility for clients with cached older payloads.
        ai_score: match.score ?? undefined,
        ai_reason: match.reasons,
      };
    });

    if (open_now === 'true') list = list.filter((b) => b.open_now);
    if (max_km) list = list.filter((b) => b.distance_km == null || b.distance_km <= +max_km);
    if (min_rating) list = list.filter((b) => b.rating >= +min_rating);
    if (price_max) {
      list = list.filter((b) => {
        const from = b.price_from ?? (Array.isArray(b.services) && b.services.length ? Math.min(...b.services.map((s) => +s.price || 0)) : null);
        return from == null || from <= +price_max;
      });
    }

    if (sort === 'distance' && origin) list.sort((a, b) => (a.distance_km ?? 999) - (b.distance_km ?? 999));
    else if (sort === 'rating') list.sort((a, b) => b.rating - a.rating);
    else if (sort === 'price_low') list.sort((a, b) => (a.price_from ?? 999999) - (b.price_from ?? 999999));
    else list.sort((a, b) => (b.fit_score ?? b.ai_score ?? 0) - (a.fit_score ?? a.ai_score ?? 0));

    const top_pick = list.length ? [...list].sort((a, b) => (b.fit_score ?? b.ai_score ?? 0) - (a.fit_score ?? a.ai_score ?? 0))[0] : null;
    const payload = { count: list.length, results: list, top_pick, city: cityName || null };
    cache.set(key, payload);
    if (cache.size > 60) cache.delete(cache.keys().next().value);
    res.setHeader('X-Cache', 'MISS');
    return res.status(200).json(payload);
  } catch (err) {
    console.error('[discover:error]', err.message);
    res.status(500).json({ error: err.message });
  }
}

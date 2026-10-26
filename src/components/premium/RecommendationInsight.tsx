import { useState } from 'react';
import { ChevronDown, CircleHelp, MapPin, Star, Clock3, ShieldCheck, Target } from 'lucide-react';
import type { Business } from '../../lib/product';
import { isSampleBusiness } from '../../lib/sampleData.js';

const FACTOR_ICONS = {
  rating: Star,
  distance: MapPin,
  availability: Clock3,
} as const;

export default function RecommendationInsight({ business, city }: { business: Business; city: string }) {
  const [expanded, setExpanded] = useState(false);
  const score = business.fit_score ?? business.ai_score;
  const factors = business.fit_breakdown || [];
  const reasons = business.fit_reasons || (Array.isArray(business.ai_reason) ? business.ai_reason : business.ai_reason ? [business.ai_reason] : []);
  const isSample = isSampleBusiness(business);

  return (
    <section className="mb-4 rounded-2xl border border-[var(--color-brand-indigo)]/25 bg-[linear-gradient(110deg,rgba(99,102,241,0.10),rgba(52,211,153,0.06))] p-4 sm:p-5" aria-labelledby="velora-match-title">
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl grad-btn text-white">
          <Target className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-brand-indigo)]">Velora match · {city}{isSample ? ' · sample data' : ''}</p>
          <h2 id="velora-match-title" className="mt-1 truncate text-lg font-semibold">{business.name}</h2>
          <p className="mt-0.5 text-sm text-muted">A practical match based on the information available right now.</p>
        </div>
        {typeof score === 'number' && Number.isFinite(score) && (
          <div className="shrink-0 rounded-xl border border-app bg-[var(--bg-elev)]/80 px-3 py-2 text-center">
            <p className="text-lg font-semibold tabular-nums">{Math.round(score)}<span className="text-xs font-normal text-dim">/100</span></p>
            <p className="text-[9px] uppercase tracking-wide text-dim">Fit score</p>
          </div>
        )}
      </div>

      {reasons.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {reasons.slice(0, 3).map((reason) => (
            <span key={reason} className="rounded-full border border-app bg-[var(--bg-elev)]/70 px-2.5 py-1 text-[11px] text-muted">{reason}</span>
          ))}
        </div>
      )}

      <button
        type="button"
        className="mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-lg text-xs font-medium text-[var(--color-brand-indigo)] outline-none hover:underline focus-visible:ring-2 focus-visible:ring-[var(--color-brand-indigo)]"
        aria-expanded={expanded}
        aria-controls="velora-match-method"
        onClick={() => setExpanded((value) => !value)}
      >
        <CircleHelp className="h-3.5 w-3.5" aria-hidden="true" />
        How this score is calculated
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {expanded && (
        <div id="velora-match-method" className="mt-3 rounded-xl border border-app bg-[var(--bg-elev)]/80 p-3 sm:p-4">
          {factors.length > 0 ? (
            <div className="space-y-3">
              {factors.map((factor) => {
                const Icon = FACTOR_ICONS[factor.key as keyof typeof FACTOR_ICONS] || ShieldCheck;
                return (
                  <div key={factor.key}>
                    <div className="flex items-start gap-2">
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-brand-indigo)]" aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                          <p className="text-xs font-medium">{factor.label}</p>
                          <p className="text-[10px] tabular-nums text-dim">{Math.round(factor.percent)}% signal</p>
                        </div>
                        <p className="mt-0.5 text-[11px] text-muted">{factor.detail}</p>
                        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[var(--surface-hover)]">
                          <div className="h-full rounded-full bg-[var(--color-brand-indigo)]" style={{ width: `${Math.max(0, Math.min(100, factor.percent))}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted">Detailed scoring signals are not available for this result.</p>
          )}
          <p className="mt-3 border-t border-app pt-3 text-[10px] leading-relaxed text-dim">
            The score is a deterministic heuristic using the available rating, distance and reported opening-hours signals. A free appointment slot is checked separately when you choose a service and time. Missing signals are excluded from the calculation. This is not a trained machine-learning prediction, paid placement, or guarantee of service quality.
          </p>
        </div>
      )}
    </section>
  );
}

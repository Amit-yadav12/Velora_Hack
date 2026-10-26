import { Info } from 'lucide-react';
import { isDemoMode } from '../../lib/supabase';

/** Clearly distinguishes the local demo from a connected production deployment. */
export default function DemoEnvironmentNotice() {
  if (!isDemoMode) return null;

  return (
    <aside className="mb-5 flex items-start gap-2.5 rounded-xl border border-sky-500/25 bg-sky-500/5 px-3.5 py-3 text-xs" role="status" aria-label="Demo environment notice">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" aria-hidden="true" />
      <p className="leading-relaxed text-muted">
        <span className="font-semibold text-[var(--text)]">Interactive demo.</span>{' '}
        Listings may include sample data. Sign-in, bookings and dashboard updates use this browser’s demo store until a Supabase project is configured; this is not a shared production database.
      </p>
    </aside>
  );
}

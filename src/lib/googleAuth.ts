import supabase, { isDemoMode } from './supabase';
import { errMsg } from './types';

export interface GoogleAuthResult {
  ok: boolean;
  method?: 'native';
  reason?: 'provider_disabled' | 'not_configured' | 'network' | 'unknown';
  error?: string;
}

/**
 * Start Google's hosted OAuth flow through Supabase Auth.
 *
 * The client secret stays in Supabase's provider configuration; this app never
 * collects credentials, constructs its own OAuth state, or opens a custom
 * token-exchange popup. Configure the provider and redirect allow-list in the
 * Supabase dashboard before enabling the production flow.
 */
export async function signInWithGoogleNative(nextPath = '/', requestedRole: 'customer' | 'admin' = 'customer'): Promise<GoogleAuthResult> {
  if (isDemoMode) {
    return {
      ok: false,
      reason: 'not_configured',
      error: 'Google sign-in needs a configured Supabase project. The local demo stays available below; set up Supabase and enable Google Auth to use a real Google account.',
    };
  }

  try {
    const safeNext = nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : '/';
    const redirectTo = new URL('/welcome', window.location.origin);
    redirectTo.searchParams.set('next', safeNext);
    // This preserves the selected route only; the database role remains the
    // sole source of business-console authorization.
    redirectTo.searchParams.set('role', requestedRole === 'admin' ? 'business' : 'customer');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectTo.toString(),
        queryParams: { prompt: 'select_account' },
      },
    });

    if (error) throw error;
    return { ok: true, method: 'native' };
  } catch (error: unknown) {
    const message = errMsg(error);
    if (/provider.*(not.*enabled|is not enabled)|unsupported.*provider|provider.*not.*found/i.test(message)) {
      return {
        ok: false,
        reason: 'provider_disabled',
        error: 'Google sign-in is not enabled in Supabase yet. In Authentication → Providers, enable Google and add the Supabase callback URL to your Google Cloud OAuth client. See DEPLOY.md.',
      };
    }

    return {
      ok: false,
      reason: /fetch|network|timeout|failed to fetch/i.test(message) ? 'network' : 'unknown',
      error: 'Google sign-in could not start. Check the Supabase URL, allowed redirect URLs, and network connection, then try again.',
    };
  }
}

/** Stable alias for callers that do not need provider-specific details. */
export async function signInWithGoogle(): Promise<GoogleAuthResult> {
  return signInWithGoogleNative('/');
}

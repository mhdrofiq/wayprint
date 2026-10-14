'use client';

import { useState, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';

// Supabase keeps a signed-in session in localStorage under
// `sb-<project>-auth-token`. Visitors never sign in, so without that key the
// Supabase client (a sizeable chunk of script) isn't loaded at all.
function hasStoredSession(): boolean {
  try {
    return Object.keys(localStorage).some((k) => k.startsWith('sb-') && k.includes('-auth-token'));
  } catch {
    return false;
  }
}

const loadSupabase = () => import('@/lib/supabase').then((m) => m.supabase);

export function useAdminSession() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    if (!hasStoredSession()) return;

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    loadSupabase().then((supabase) => {
      if (cancelled) return;
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!cancelled) setSession(session);
      });
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
      });
      unsubscribe = () => subscription.unsubscribe();
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  async function signOut() {
    const supabase = await loadSupabase();
    await supabase.auth.signOut();
  }

  return { session, signOut };
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { cellAccent, field } from '@/components/admin/tui';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/');
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.replace('/');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-tui-bg text-tui-fg text-xs px-4">
      <div className="w-full max-w-sm bg-tui-panel border border-tui-fg">
        <h1 className="flex items-center gap-2 h-7 px-2.5 bg-tui-fg text-tui-bg">
          <span className="bg-tui-accent text-tui-accent-fg font-bold px-1.5">WAYPRINT</span>
          admin sign-in
        </h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-4">
          <input
            type="email"
            placeholder="Email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`${field} text-sm py-2`}
          />
          <input
            type="password"
            placeholder="Password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`${field} text-sm py-2`}
          />

          {error && (
            <p className="text-tui-danger">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`${cellAccent} h-9 text-sm mt-1`}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoginSplit } from '@/components/engaz/LoginSplit';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const search = useSearchParams();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('No user session');

      const { data: admin } = await supabase
        .from('super_admins')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!admin) {
        await supabase.auth.signOut();
        throw new Error('This account is not an Engaz super admin');
      }

      const redirect = search.get('redirect') || '/';
      router.push(redirect.startsWith('/') ? redirect : '/');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <LoginSplit>
      <div className="rounded-2xl border border-[#E6EAF0] bg-white p-6 shadow-sm sm:p-8">
        <img
          src="/brand/engaz-logo.png"
          alt="Engaz"
          className="mb-6 h-9 w-auto max-w-[140px] object-contain"
        />
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-[#0B1220]">
          Sign in
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Super-admin only — restaurant owners use their own site
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          {error && (
            <div
              role="alert"
              className="bg-destructive/10 text-destructive rounded-2xl p-3 text-sm"
            >
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-10 rounded-2xl focus-visible:border-[#51FE00] focus-visible:ring-[#51FE00]/30"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-10 rounded-2xl pr-10 focus-visible:border-[#51FE00] focus-visible:ring-[#51FE00]/30"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 hover:text-slate-800"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <Button
            type="submit"
            size="lg"
            className="h-10 w-full rounded-2xl bg-[#51FE00] text-[#041200] hover:bg-[#46e000] focus-visible:border-[#51FE00] focus-visible:ring-[#51FE00]/40"
            disabled={loading}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </div>
    </LoginSplit>
  );
}

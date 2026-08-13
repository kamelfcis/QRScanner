'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
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
      <div className="login-fade-up-delay-1 rounded-2xl border border-[#E6EAF0] bg-white p-5 shadow-sm sm:p-6">
        <img
          src="/brand/engaz-logo.png"
          alt="Engaz"
          className="mb-4 h-7 w-auto max-w-[110px] object-contain"
        />
        <h2 className="font-heading text-[22px] font-semibold tracking-tight text-[#0B1220] sm:text-2xl">
          Welcome back
        </h2>
        <p className="mt-1 text-sm text-slate-500">Sign in to Engaz Admin</p>

        <form onSubmit={onSubmit} className="mt-5 space-y-3.5">
          {error && (
            <div
              role="alert"
              className="bg-destructive/10 text-destructive rounded-xl p-2.5 text-sm"
            >
              {error}
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm">
              Email
            </Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="email"
                type="email"
                autoComplete="username"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-10 rounded-xl pl-9 focus-visible:border-[#51FE00] focus-visible:ring-[#51FE00]/30"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-sm">
              Password
            </Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-10 rounded-xl pl-9 pr-10 focus-visible:border-[#51FE00] focus-visible:ring-[#51FE00]/30"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-700"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <Button
            type="submit"
            className="login-fade-up-delay-2 h-10 w-full rounded-xl bg-[#51FE00] text-sm font-semibold text-[#041200] hover:bg-[#46e000] focus-visible:border-[#51FE00] focus-visible:ring-[#51FE00]/40"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
      </div>
    </LoginSplit>
  );
}

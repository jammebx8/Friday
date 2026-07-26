'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { supabase } from '@/utils/supabase/client';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleGoogleLogin() {
    setErrorMsg(null);
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setErrorMsg(error.message);
      setGoogleLoading(false);
    }
    // On success the browser is redirected to Google, so no further
    // client-side state changes happen here.
  }

  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setErrorMsg(error.message);
      setIsSubmitting(false);
      return;
    }
    window.location.href = '/';
  }

  return (
    <div className="flex min-h-screen w-full bg-[#0a0908]">
  {/* Left panel */}
  <div className="relative flex w-full flex-col justify-between px-10 py-8 md:w-1/2 lg:px-20">

    {/* Logo */}
    <img
      src="/fridaylogo.jpg"
      alt="Friday"
      className="absolute top-4 left-4 w-32 h-auto object-contain"
    />

    <div className="mx-auto w-full max-w-sm mt-24">
      <h1 className="text-3xl font-semibold text-white">
        Welcome back
      </h1>

      <p className="mt-2 text-sm text-[#8b8781]">
        Enter your details to access your AI assistant.
      </p>

          {errorMsg && (
            <div className="mt-4 rounded-lg border border-red-900/50 bg-red-950/40 px-4 py-2 text-sm text-red-300">
              {errorMsg}
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="mt-8 flex w-full items-center justify-center gap-3 rounded-xl border border-[#2b2925] bg-transparent py-3 text-sm font-medium text-white transition-colors hover:bg-[#161513] disabled:opacity-60"
          >
            <GoogleIcon />
            {googleLoading ? 'Connecting…' : 'Log in with Google'}
          </button>

          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-[#2b2925]" />
            <span className="text-xs tracking-widest text-[#65625d]">OR</span>
            <div className="h-px flex-1 bg-[#2b2925]" />
          </div>

          <form onSubmit={handleEmailSignIn} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="text-xs font-medium tracking-widest text-[#8b8781]"
              >
                EMAIL
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="mt-2 w-full rounded-xl border border-[#2b2925] bg-transparent px-4 py-3 text-sm text-white placeholder-[#65625d] outline-none focus:border-[#f5a94f]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-xs font-medium tracking-widest text-[#8b8781]"
                >
                  PASSWORD
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-[#f5a94f] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-2 w-full rounded-xl border border-[#2b2925] bg-transparent px-4 py-3 text-sm text-white placeholder-[#65625d] outline-none focus:border-[#f5a94f]"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#f9b968] to-[#f0983a] py-3 text-sm font-semibold text-[#241505] shadow-[0_1px_0_rgba(255,255,255,0.3)_inset] transition-transform hover:brightness-105 active:scale-[0.99] disabled:opacity-60"
            >
              {isSubmitting ? 'Signing in…' : 'Sign In'}
              <ArrowRight size={16} />
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[#8b8781]">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-semibold text-[#f5a94f] hover:underline">
              Sign up
            </Link>
          </p>
        </div>

        <div className="flex gap-6 text-xs text-[#65625d]">
          <Link href="/privacy" className="hover:text-[#8b8781]">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-[#8b8781]">
            Terms of Service
          </Link>
          <Link href="/contact" className="hover:text-[#8b8781]">
            Contact
          </Link>
        </div>
      </div>

      {/* Right panel — hero image */}
      <div className="relative hidden w-1/2 overflow-hidden md:block">
        <Image
          src="/images/eclipse-hero.png"
          alt="Illuminated eclipse over water"
          fill
          priority
          className="object-cover"
        />


        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        <div className="absolute bottom-16 left-12 right-12">
          <div className="mb-4 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#f5a94f]" />
            <span className="text-xs font-medium tracking-[0.2em] text-[#f5a94f]">
              SYSTEM ACTIVE
            </span>
          </div>
          <h2 className="text-4xl font-bold leading-tight text-white lg:text-5xl">
            Intuition.
            <br />
            Illuminated.
          </h2>
        </div>
        
      </div>
      
    </div>
    
  );
}

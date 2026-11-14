'use client';

import { useEffect, useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { ACCOUNT_HOME } from '../lib/routes';
import { Button, Notice, TextField, cx, focusRing } from './ui';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Masuk: Google, or a six-digit code sent by email. No passwords, and the same
 * two steps whether the visitor is new or returning.
 */
export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const router = useRouter();
  const titleId = useId();
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Start fresh each time the dialog opens.
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setStep('email');
      setEmail('');
      setOtp('');
      setLoading(false);
      setError(null);
    }
  }

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // A full-page redirect to our own OAuth route.
  const handleGoogleLogin = () => {
    setLoading(true);
    window.location.href = '/api/auth/google';
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Kode gagal dikirim.');
      setStep('otp');
    } catch (err: unknown) {
      console.error('Error mengirim OTP:', err);
      setError((err instanceof Error && err.message) || 'Periksa koneksi internet Anda lalu coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Kode salah atau kedaluwarsa.');

      // Signing in must not override the theme the member chose.
      onClose();
      router.push(ACCOUNT_HOME);
    } catch (err: unknown) {
      console.error('Error verifikasi OTP:', err);
      setError((err instanceof Error && err.message) || 'Kode salah atau kedaluwarsa. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep('email');
    setOtp('');
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-end justify-center sm:items-center sm:p-4">
      <div data-backdrop className="absolute inset-0 bg-ink/60" onClick={onClose} aria-hidden />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative grid max-h-[100dvh] w-full max-w-md gap-6 overflow-y-auto border border-ink bg-paper p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-ink sm:p-8"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          className={cx(
            'absolute right-2 top-2 flex h-11 w-11 items-center justify-center text-mute transition-colors hover:text-ink',
            focusRing
          )}
        >
          <X size={20} aria-hidden />
        </button>

        <header className="grid gap-2 border-b border-ink pb-4 pr-10">
          <h2 id={titleId} className="font-sans text-3xl font-bold uppercase tracking-[-0.02em]">
            {step === 'email' ? 'Masuk' : 'Masukkan kode'}
          </h2>
          <p className="font-sans text-sm text-mute [overflow-wrap:anywhere]">
            {step === 'email'
              ? 'Masuk atau daftar tanpa kata sandi.'
              : `Kode 6 digit sudah dikirim ke ${email}.`}
          </p>
        </header>

        {error && <Notice tone="error">{error}</Notice>}

        {step === 'email' ? (
          <>
            <Button variant="secondary" fullWidth onClick={handleGoogleLogin} disabled={loading}>
              <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              {loading ? 'Menghubungkan' : 'Lanjut dengan Google'}
            </Button>

            <div className="flex items-center gap-4 font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-mute">
              <span className="h-px flex-grow bg-line" />
              atau
              <span className="h-px flex-grow bg-line" />
            </div>

            <form onSubmit={handleSendOTP} className="grid gap-5">
              <TextField
                id="auth-email"
                label="Email"
                type="email"
                required
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                disabled={loading}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@contoh.com"
              />
              <Button type="submit" fullWidth loading={loading}>
                {loading ? 'Mengirim kode' : 'Kirim kode'}
              </Button>
            </form>
          </>
        ) : (
          <form onSubmit={handleVerifyOTP} className="grid gap-5">
            <TextField
              id="auth-code"
              label="Kode"
              type="text"
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={6}
              disabled={loading}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="6 digit"
              hint="Cek juga folder spam bila belum masuk."
            />
            <Button type="submit" fullWidth loading={loading} disabled={otp.length < 6}>
              {loading ? 'Memeriksa' : 'Masuk'}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleBack} disabled={loading}>
              Ganti email
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

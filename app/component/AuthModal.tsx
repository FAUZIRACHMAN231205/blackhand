'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  // Reset state ketika modal dibuka
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setStep('email');
      setEmail('');
      setOtp('');
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  // 1. FUNGSI AUTH GOOGLE (OAUTH)
  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // Mengarahkan kembali ke localhost setelah user memilih akun Google
          redirectTo: `${window.location.origin}`,
          // ✨ Tampilkan account picker agar user bisa pilih akun Google berbeda
          queryParams: {
            prompt: 'select_account',
          },
        },
      });
      if (error) throw error;
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error('Error Google Auth:', errMsg);
      alert('Gagal menghubungkan ke Google Auth: ' + errMsg);
    } finally {
      setLoading(false);
    }
  };

  // 2. FUNGSI KIRIM OTP EMAIL (MAGIC LINK)
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      // Use Supabase Magic Link (lebih reliable dari OTP)
      const { error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          shouldCreateUser: true,
        },
      });

      if (error) {
        console.error('Supabase error:', error);
        throw new Error(error.message || 'Failed to send OTP');
      }
      
      // Jika sukses mengirim kode, pindah ke langkah input OTP
      setStep('otp');
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error('Error mengirim OTP:', error);
      alert('Gagal mengirim kode OTP: ' + (errMsg || 'Silakan cek koneksi internet dan coba lagi'));
    } finally {
      setLoading(false);
    }
  };

  // 3. FUNGSI VERIFIKASI KODE OTP
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length < 6) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email,
        token: otp,
        type: 'email',
      });

      if (error) throw error;

      // Jika berhasil login, tutup modal dan redirect ke dashboard
      onClose();
      router.push('/dashboard');
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error('Error verifikasi OTP:', error);
      alert('Kode OTP salah atau kedaluwarsa: ' + (errMsg || 'Silakan coba lagi'));
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep('email');
    setOtp('');
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full max-w-[420px] bg-zinc-950 border border-white/10 p-10 rounded-2xl shadow-2xl overflow-hidden">
        <button onClick={onClose} className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors">
          <X size={20} />
        </button>

        <div className="relative z-10 flex flex-col">
          {/* Header Section */}
          <div className="mb-10 text-left">
            <h2 className="font-serif text-4xl italic mb-1 text-white">
              {step === 'email' ? 'Identity' : 'Enter code'}
            </h2>
            <p className="font-sans text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold">
              {step === 'email' 
                ? 'Access your digital archive' 
                : `Sent to ${email || 'your email'}`}
            </p>
          </div>

          {step === 'email' ? (
            /* STEP 1: EMAIL INPUT & GOOGLE BUTTON */
            <>
              {/* TOMBOL GOOGLE SEKARANG MEMILIKI ONCLICK DAN DISABLED STATE SAAT LOADING */}
              <button 
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full bg-white text-black font-sans text-[11px] font-black uppercase tracking-[0.2em] py-4 rounded-xl hover:bg-zinc-200 transition-all mb-8 flex items-center justify-center gap-3 disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                {loading ? 'Connecting...' : 'Continue with Google'}
              </button>

              <div className="w-full flex items-center mb-8 text-zinc-600">
                <div className="flex-grow h-[1px] bg-white/5"></div>
                <span className="px-4 text-[9px] font-bold uppercase tracking-widest italic font-sans">or</span>
                <div className="flex-grow h-[1px] bg-white/5"></div>
              </div>

              <form onSubmit={handleSendOTP} className="space-y-5">
                <div className="space-y-1.5 text-left">
                  <label className="font-sans text-[9px] uppercase tracking-widest text-zinc-400 ml-1">Email Address</label>
                  <input 
                    type="email" 
                    required
                    disabled={loading}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-white/5 border border-white/10 px-4 py-3.5 rounded-xl font-sans text-sm text-white focus:outline-none focus:border-white/30 transition-all placeholder:text-zinc-700 disabled:opacity-50"
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-zinc-900 border border-white/10 text-white font-sans text-[11px] font-black uppercase tracking-[0.2em] py-4 rounded-xl hover:bg-zinc-800 transition-all disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Continue'}
                </button>
              </form>
            </>
          ) : (
            /* STEP 2: OTP INPUT VERIFICATION */
            <form onSubmit={handleVerifyOTP} className="space-y-6">
              <div className="space-y-1.5 text-left">
                <input 
                  type="text" 
                  required
                  maxLength={6}
                  disabled={loading}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="6-digit code"
                  className="w-full bg-white/5 border border-white/10 px-4 py-4 rounded-xl font-sans text-center text-xl tracking-[0.5em] text-white focus:outline-none focus:border-white/30 transition-all placeholder:tracking-normal placeholder:text-sm placeholder:text-zinc-700 disabled:opacity-50"
                />
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-white text-black font-sans text-[11px] font-black uppercase tracking-[0.2em] py-4 rounded-xl hover:bg-zinc-200 transition-all disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Submit'}
              </button>
              <button 
                type="button"
                onClick={handleBack}
                disabled={loading}
                className="w-full text-zinc-500 font-sans text-[9px] uppercase tracking-widest hover:text-white transition-colors disabled:opacity-50"
              >
                Sign in with a different email
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
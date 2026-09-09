'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import Navbar from '../component/Navbar';
import { LoadingSpinner } from '../component/LoadingStates';
import { useToast } from '../context/ToastContext';
import { ArrowLeft, Save, Mail, User as UserIcon, Shield, AlertCircle } from 'lucide-react';
import Link from 'next/link';

const cardClass = 'bg-white/80 dark:bg-zinc-950/60 border border-black/5 dark:border-white/10 rounded-2xl p-6 shadow-sm backdrop-blur-sm transition-colors';
const labelClass = 'block font-sans text-[10px] font-bold uppercase tracking-widest text-black/50 dark:text-white/50 mb-2.5';
const inputClass =
  'w-full px-4 py-3 bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl text-black dark:text-white placeholder-black/30 dark:placeholder-white/30 focus:outline-none focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/10 transition-all font-sans text-sm';
const primaryButtonClass =
  'mt-6 flex items-center gap-2 px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-sans text-[11px] font-black uppercase tracking-[0.2em]';

export default function SettingsPage() {
  const { user, loading, refresh } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');
  const [errorMessage, setErrorMessage] = useState('');

  // Profile form state
  const [fullName, setFullName] = useState('');

  const [prevUser, setPrevUser] = useState(user);
  if (user !== prevUser) {
    setPrevUser(user);
    if (user) {
      setFullName(user.full_name || '');
    }
  }

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSaving(true);

    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to update profile');

      await refresh();
      showToast({ type: 'success', message: 'Profile updated successfully!' });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      setErrorMessage(errMsg || 'Failed to update profile');
      console.error('Error updating profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <Navbar onOpenModal={() => {}} />

      <main className="min-h-[100dvh] bg-white dark:bg-slate-950 text-black dark:text-white pt-24 p-6 md:p-20 transition-colors duration-300">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex items-center gap-4">
            <Link
              href="/dashboard"
              className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="font-serif text-4xl md:text-5xl italic font-medium">
                Settings
              </h1>
              <p className="font-sans text-sm text-black/60 dark:text-white/60">Manage your account and preferences</p>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-6 flex items-start gap-2 bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400 px-4 py-3 rounded-xl font-sans text-xs leading-relaxed">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-8 mb-8 border-b border-black/10 dark:border-white/10">
            <button
              onClick={() => setActiveTab('profile')}
              className={`pb-3 font-sans text-[11px] font-black uppercase tracking-[0.15em] border-b-2 transition-colors ${
                activeTab === 'profile'
                  ? 'text-black dark:text-white border-black dark:border-white'
                  : 'text-black/40 dark:text-white/40 border-transparent hover:text-black/70 dark:hover:text-white/70'
              }`}
            >
              <span className="flex items-center gap-2">
                <UserIcon size={14} strokeWidth={1.5} /> Profile
              </span>
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`pb-3 font-sans text-[11px] font-black uppercase tracking-[0.15em] border-b-2 transition-colors ${
                activeTab === 'security'
                  ? 'text-black dark:text-white border-black dark:border-white'
                  : 'text-black/40 dark:text-white/40 border-transparent hover:text-black/70 dark:hover:text-white/70'
              }`}
            >
              <span className="flex items-center gap-2">
                <Shield size={14} strokeWidth={1.5} /> Security
              </span>
            </button>
          </div>

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* Email Card */}
              <div className={cardClass}>
                <div className="flex items-center gap-2 mb-4">
                  <Mail size={15} strokeWidth={1.5} className="text-violet-500 dark:text-violet-400" />
                  <h2 className="font-serif text-lg italic">Email Address</h2>
                </div>
                <p className="font-sans text-sm text-black/70 dark:text-white/70">{user.email}</p>
                <p className="font-sans text-xs text-black/40 dark:text-white/40 mt-2">
                  Your email is verified and cannot be changed directly. Contact support to change your email.
                </p>
              </div>

              {/* Profile Form */}
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className={cardClass}>
                  <h2 className="font-serif text-lg italic mb-6">Profile Information</h2>

                  <div className="space-y-4">
                    <div>
                      <label className={labelClass}>Full Name</label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Enter your full name"
                        className={inputClass}
                      />
                    </div>

                    {user.avatar_url && (
                      <div>
                        <label className={labelClass}>Profile Picture</label>
                        <img
                          src={user.avatar_url}
                          alt="Profile"
                          referrerPolicy="no-referrer"
                          className="w-24 h-24 rounded-full border-2 border-black/10 dark:border-white/10"
                        />
                        <p className="font-sans text-[11px] text-black/40 dark:text-white/40 mt-2">
                          Profile picture from {user.provider === 'google' ? 'Google' : 'your account'}
                        </p>
                      </div>
                    )}
                  </div>

                  <button type="submit" disabled={isSaving} className={primaryButtonClass}>
                    <Save size={14} strokeWidth={1.5} />
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              {/* Authentication Method */}
              <div className={cardClass}>
                <div className="flex items-center gap-2 mb-4">
                  <Shield size={15} strokeWidth={1.5} className="text-violet-500 dark:text-violet-400" />
                  <h2 className="font-serif text-lg italic">Authentication Method</h2>
                </div>
                <div className="space-y-2 font-sans">
                  <p className="text-sm text-black/70 dark:text-white/70">
                    Current method:{' '}
                    <span className="text-black dark:text-white capitalize font-medium">
                      {user.provider === 'google' ? 'Google OAuth' : 'Email OTP'}
                    </span>
                  </p>
                  <p className="text-xs text-black/40 dark:text-white/40">
                    This account signs in with a one-time code or Google — there&apos;s no password to manage.
                  </p>
                </div>
              </div>

              {/* Session Information */}
              <div className={cardClass}>
                <h2 className="font-serif text-lg italic mb-4">Session Information</h2>
                <div className="space-y-3 font-sans text-sm">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-black/40 dark:text-white/40 mb-1">Last Sign In</p>
                    <p className="text-black/80 dark:text-white/80">
                      {user.last_sign_in_at
                        ? new Date(user.last_sign_in_at).toLocaleString('id-ID')
                        : 'Never'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-black/40 dark:text-white/40 mb-1">Account Created</p>
                    <p className="text-black/80 dark:text-white/80">
                      {user.created_at
                        ? new Date(user.created_at).toLocaleString('id-ID')
                        : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

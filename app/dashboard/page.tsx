'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import Navbar from '../component/Navbar';
import StatsCard from '../component/StatsCard';
import SupportModal from '../component/SupportModal';
import { DashboardSkeleton } from '../component/LoadingStates';
import { 
  User as UserIcon, 
  Mail, 
  Clock, 
  Shield, 
  ArrowRight, 
  ChevronLeft, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  Check, 
  Sun,
  Moon,
  Info,
  Calendar,
  Lock
} from 'lucide-react';
import Link from 'next/link';

export default function Dashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Redirect ke home jika belum login
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (!user) {
    return null;
  }

  // Calculate account age
  const accountCreatedDate = user.created_at ? new Date(user.created_at) : null;
  const now = new Date();
  const accountAge = accountCreatedDate 
    ? Math.floor((now.getTime() - accountCreatedDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  // Get auth provider from user metadata
  const getAuthProvider = () => {
    if (user.user_metadata?.provider) return user.user_metadata.provider;
    if (user.identities?.length) return user.identities[0].provider;
    return 'Email';
  };

  // Format dates
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Copy User ID to Clipboard
  const handleCopyId = () => {
    if (!user.id) return;
    navigator.clipboard.writeText(user.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Dynamic Greeting based on time
  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) return { text: 'Selamat Pagi', icon: <Sun className="text-amber-500 animate-pulse" size={24} /> };
    if (hours < 15) return { text: 'Selamat Siang', icon: <Sun className="text-orange-500" size={24} /> };
    if (hours < 18) return { text: 'Selamat Sore', icon: <Sun className="text-yellow-600" size={24} /> };
    return { text: 'Selamat Malam', icon: <Moon className="text-indigo-400" size={24} /> };
  };

  const greeting = getGreeting();

  return (
    <>
      <Navbar onOpenModal={() => {}} />
      
      <main className="relative min-h-[100dvh] bg-white dark:bg-slate-950 text-black dark:text-white pt-24 p-6 md:p-20 overflow-hidden transition-colors duration-300">
        
        {/* Ambient Glowing Background Ornaments */}
        <div className="absolute top-10 left-1/4 w-96 h-96 bg-violet-400/10 dark:bg-violet-600/5 rounded-full blur-3xl pointer-events-none animate-float-slow" />
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-fuchsia-400/10 dark:bg-fuchsia-600/5 rounded-full blur-3xl pointer-events-none animate-float-slow-reverse" />

        <div className="relative max-w-5xl mx-auto z-10 space-y-12">
          
          {/* Back to Home Button */}
          <button
            onClick={() => router.push('/?home=true')}
            className="flex items-center gap-2 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors group"
          >
            <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="font-sans text-sm font-semibold">Back to Home</span>
          </button>

          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-black/5 dark:border-white/5 pb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                {greeting.icon}
                <span className="text-sm font-sans font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {greeting.text}
                </span>
              </div>
              <h1 className="text-5xl md:text-6xl font-cormorant font-medium tracking-tight">
                Your Digital Identity
              </h1>
            </div>
            <p className="text-black/60 dark:text-white/60 text-lg font-sans">
              Welcome back, <span className="font-semibold text-black/90 dark:text-white/90">{user.user_metadata?.full_name || user.email}</span>
            </p>
          </div>

          {/* User Profile Card (Premium Redesign) */}
          <div className="relative bg-gradient-to-br from-slate-50/50 via-white to-slate-50/50 dark:from-slate-900/60 dark:via-slate-900/40 dark:to-slate-950/60 border border-slate-200/60 dark:border-slate-800/45 rounded-3xl p-8 flex flex-col md:flex-row items-center gap-8 shadow-xl shadow-slate-100/30 dark:shadow-none overflow-hidden group hover:border-violet-500/20 dark:hover:border-violet-500/10 transition-all duration-500">
            {/* Subtle glow edge inside */}
            <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 to-fuchsia-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            {user.user_metadata?.avatar_url ? (
              <div className="relative">
                <div className="absolute -inset-1.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-full blur opacity-30 group-hover:opacity-60 transition duration-500" />
                <img
                  src={user.user_metadata.avatar_url}
                  alt="User Avatar"
                  className="relative w-28 h-28 rounded-full border-4 border-white dark:border-slate-900 object-cover shadow-md"
                />
              </div>
            ) : (
              <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-4xl font-cormorant font-bold border-4 border-white dark:border-slate-900 shadow-md">
                {(user.user_metadata?.full_name || user.email || 'B').charAt(0).toUpperCase()}
              </div>
            )}

            <div className="flex-1 text-center md:text-left space-y-4">
              <div>
                <h2 className="text-3xl font-cormorant font-semibold tracking-tight text-black dark:text-white">
                  {user.user_metadata?.full_name || 'Blackhand User'}
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-sans font-medium mt-1">{user.email}</p>
              </div>

              <div className="flex flex-wrap justify-center md:justify-start gap-3">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/30 rounded-full text-xs font-sans font-bold text-slate-600 dark:text-slate-300">
                  <Lock size={12} className="opacity-60" />
                  Provider: {getAuthProvider()}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-violet-50/80 dark:bg-violet-950/20 border border-violet-100/50 dark:border-violet-900/25 rounded-full text-xs font-sans font-bold text-violet-700 dark:text-violet-400 shadow-sm shadow-violet-100/20 dark:shadow-none">
                  <Calendar size={12} className="opacity-75" />
                  {accountAge} Days Member
                </span>
              </div>
            </div>

            <Link 
              href="/settings"
              className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-2xl hover:bg-black/90 dark:hover:bg-white/90 shadow-md transition-all duration-300 transform hover:scale-[1.02] font-sans font-bold text-sm"
            >
              <span>Edit Profile</span>
              <ArrowRight size={16} />
            </Link>
          </div>

          {/* Statistics Section */}
          <div className="space-y-4">
            <h3 className="text-xl font-cormorant font-bold text-black/85 dark:text-white/85 tracking-wide">Account Statistics</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsCard
                icon={<UserIcon size={18} />}
                title="Account Status"
                value="Active"
                description="Your account is active and verified"
                themeColor="emerald"
              />
              <StatsCard
                icon={<Mail size={18} />}
                title="Primary Email"
                value={user.email || 'N/A'}
                description="Verified and confirmed"
                themeColor="blue"
              />
              <StatsCard
                icon={<Clock size={18} />}
                title="Last Sign In"
                value={user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString('id-ID') : 'N/A'}
                description={user.last_sign_in_at ? formatDate(user.last_sign_in_at) : 'Never'}
                themeColor="violet"
              />
              <StatsCard
                icon={<Shield size={18} />}
                title="Security"
                value="Secure"
                description="2FA recommended"
                themeColor="amber"
              />
            </div>
          </div>

          {/* Quick Actions Section */}
          <div className="space-y-4">
            <h3 className="text-xl font-cormorant font-bold text-black/85 dark:text-white/85 tracking-wide">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              <Link href="/gallery" className="group">
                <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/60 dark:border-slate-800/40 rounded-2xl p-6 hover:-translate-y-1 hover:border-violet-500/20 dark:hover:border-violet-500/20 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-cormorant font-bold">Gallery</h3>
                    <ArrowRight size={16} className="text-slate-400 group-hover:translate-x-1.5 group-hover:text-violet-500 transition-all duration-300" />
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-sans">Browse all published artworks and collections</p>
                </div>
              </Link>

              <Link href="/settings" className="group">
                <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/60 dark:border-slate-800/40 rounded-2xl p-6 hover:-translate-y-1 hover:border-violet-500/20 dark:hover:border-violet-500/20 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-cormorant font-bold">Settings</h3>
                    <ArrowRight size={16} className="text-slate-400 group-hover:translate-x-1.5 group-hover:text-violet-500 transition-all duration-300" />
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-sans">Manage profile identity, security, and credentials</p>
                </div>
              </Link>

              <div 
                onClick={() => setIsSupportOpen(true)}
                className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/60 dark:border-slate-800/40 rounded-2xl p-6 hover:-translate-y-1 hover:border-violet-500/20 dark:hover:border-violet-500/20 hover:shadow-lg transition-all duration-300 cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-cormorant font-bold">Support</h3>
                  <ArrowRight size={16} className="text-slate-400 group-hover:translate-x-1.5 group-hover:text-violet-500 transition-all duration-300" />
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-sans">Need help? Contact support or submit direct feedback</p>
              </div>

            </div>
          </div>

          {/* Collapsible Diagnostics Accordion */}
          <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/60 dark:border-slate-800/40 rounded-2xl p-6 shadow-sm">
            <button 
              onClick={() => setShowDiagnostics(!showDiagnostics)}
              className="w-full flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-2">
                <Info size={16} className="text-violet-500" />
                <h3 className="text-lg font-cormorant font-bold text-black/85 dark:text-white/85">
                  Advanced Diagnostics & Session Info
                </h3>
              </div>
              <div className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                {showDiagnostics ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </button>
            
            {showDiagnostics && (
              <div className="grid md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800/80 animate-fade-in font-sans">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-wider">User ID</p>
                    <button 
                      onClick={handleCopyId}
                      className="inline-flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400 hover:text-violet-700 font-semibold"
                    >
                      {copied ? (
                        <>
                          <Check size={11} className="text-emerald-500" />
                          <span className="text-emerald-500">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={11} />
                          <span>Copy ID</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-slate-800 dark:text-slate-200 font-mono text-xs break-all bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-200/50 dark:border-slate-800/35">
                    {user.id}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <p className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-wider">Account Created</p>
                  <p className="text-slate-800 dark:text-slate-200 text-sm font-semibold p-3 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200/50 dark:border-slate-800/35">
                    {user.created_at ? formatDate(user.created_at) : 'N/A'}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <p className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-wider">Last Login Session</p>
                  <p className="text-slate-800 dark:text-slate-200 text-sm font-semibold p-3 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200/50 dark:border-slate-800/35">
                    {user.last_sign_in_at ? formatDate(user.last_sign_in_at) : 'First login'}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <p className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-wider">Auth Mechanism</p>
                  <p className="text-slate-800 dark:text-slate-200 text-sm font-semibold capitalize p-3 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200/50 dark:border-slate-800/35">
                    {getAuthProvider()}
                  </p>
                </div>
              </div>
            )}
          </div>

        </div>
      </main>

      {/* Support Pop-up Modal */}
      <SupportModal isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} />
    </>
  );
}

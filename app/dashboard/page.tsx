'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import Navbar from '../component/Navbar';
import StatsCard from '../component/StatsCard';
import { User, Mail, Clock, Shield, ArrowRight, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default function Dashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect ke home jika belum login
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-black text-xl">Loading...</div>
      </div>
    );
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

  return (
    <>
      <Navbar onOpenModal={() => {}} />
      
      <main className="min-h-[100dvh] bg-white text-black pt-24 p-6 md:p-20">
        <div className="max-w-5xl mx-auto">
          {/* Back to Home Button */}
          <button
            onClick={() => router.push('/?home=true')}
            className="flex items-center gap-2 mb-8 text-black/60 hover:text-black transition-colors group"
          >
            <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="font-sans text-sm font-medium">Back to Home</span>
          </button>

          {/* Header Section */}
          <div className="mb-12">
            <h1 className="text-5xl md:text-6xl font-cormorant font-medium mb-2">
              Your Digital Identity
            </h1>
            <p className="text-black/60 text-lg">
              Welcome back, <span className="text-black/80">{user.user_metadata?.full_name || user.email}</span>
            </p>
          </div>

          {/* User Profile Card */}
          <div className="bg-white border border-black/10 rounded-lg p-8 mb-12 flex items-center gap-6 shadow-sm">
            {user.user_metadata?.avatar_url && (
              <img
                src={user.user_metadata.avatar_url}
                alt="User Avatar"
                className="w-24 h-24 rounded-full border-2 border-black/10"
              />
            )}
            <div className="flex-1">
              <h2 className="text-2xl font-cormorant font-medium mb-1">
                {user.user_metadata?.full_name || 'Blackhand User'}
              </h2>
              <p className="text-black/60 text-sm mb-3">{user.email}</p>
              <div className="flex flex-wrap gap-4">
                <span className="inline-block px-3 py-1 bg-black/5 border border-black/10 rounded-full text-xs text-black/70">
                  {getAuthProvider()}
                </span>
                <span className="inline-block px-3 py-1 bg-blue-50/50 border border-blue-200/50 rounded-full text-xs text-blue-700">
                  {accountAge} days member
                </span>
              </div>
            </div>
            <Link 
              href="/settings"
              className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-black/90 transition-colors"
            >
              <span className="text-sm">Edit Profile</span>
              <ArrowRight size={16} />
            </Link>
          </div>

          {/* Statistics Section */}
          <div className="mb-12">
            <h3 className="text-lg font-cormorant font-medium mb-4 text-black/80">Account Statistics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsCard
                icon={<User size={20} />}
                title="Account Status"
                value="Active"
                description="Your account is active and verified"
              />
              <StatsCard
                icon={<Mail size={20} />}
                title="Primary Email"
                value={user.email || 'N/A'}
                description="Verified and confirmed"
              />
              <StatsCard
                icon={<Clock size={20} />}
                title="Last Sign In"
                value={user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString('id-ID') : 'N/A'}
                description={user.last_sign_in_at ? formatDate(user.last_sign_in_at) : 'Never'}
              />
              <StatsCard
                icon={<Shield size={20} />}
                title="Security"
                value="Secure"
                description="2FA recommended"
              />
            </div>
          </div>

          {/* Quick Actions Section */}
          <div className="mb-12">
            <h3 className="text-lg font-cormorant font-medium mb-4 text-black/80">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href="/gallery" className="group">
                <div className="bg-white border border-black/10 rounded-lg p-6 hover:border-black/20 transition-all hover:shadow-md">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-cormorant font-medium">Gallery</h3>
                    <ArrowRight size={16} className="text-black/40 group-hover:text-black transition-colors" />
                  </div>
                  <p className="text-black/60 text-sm">Browse all available artworks</p>
                </div>
              </Link>

              <Link href="/settings" className="group">
                <div className="bg-white border border-black/10 rounded-lg p-6 hover:border-black/20 transition-all hover:shadow-md">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-cormorant font-medium">Settings</h3>
                    <ArrowRight size={16} className="text-black/40 group-hover:text-black transition-colors" />
                  </div>
                  <p className="text-black/60 text-sm">Manage profile, security, and preferences</p>
                </div>
              </Link>

              <div className="bg-white border border-black/10 rounded-lg p-6 hover:border-black/20 transition-all cursor-pointer hover:shadow-md">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-cormorant font-medium">Support</h3>
                  <ArrowRight size={16} className="text-black/40" />
                </div>
                <p className="text-black/60 text-sm">Need help? Contact our support team</p>
              </div>
            </div>
          </div>

          {/* Detailed Account Information */}
          <div className="bg-white border border-black/10 rounded-lg p-8 shadow-sm">
            <h3 className="text-lg font-cormorant font-medium mb-6 text-black/80">Account Information</h3>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-black/60 text-sm mb-2">User ID</p>
                <p className="text-black/80 font-mono text-xs break-all bg-black/5 p-3 rounded border border-black/10">
                  {user.id}
                </p>
              </div>

              <div>
                <p className="text-black/60 text-sm mb-2">Account Created</p>
                <p className="text-black/80">
                  {user.created_at ? formatDate(user.created_at) : 'N/A'}
                </p>
              </div>

              <div>
                <p className="text-gray-400 text-sm mb-2">Last Sign In</p>
                <p className="text-gray-200">
                  {user.last_sign_in_at ? formatDate(user.last_sign_in_at) : 'First login'}
                </p>
              </div>

              <div>
                <p className="text-gray-400 text-sm mb-2">Authentication Method</p>
                <p className="text-gray-200 capitalize">
                  {getAuthProvider()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

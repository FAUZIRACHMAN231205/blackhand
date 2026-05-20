'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import Navbar from '../component/Navbar';
import { ArrowLeft, Save, Mail, User as UserIcon, Shield, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Profile form state
  const [fullName, setFullName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
    if (user) {
      setFullName(user.user_metadata?.full_name || '');
    }
  }, [user, loading, router]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsSaving(true);

    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: fullName,
        },
      });

      if (error) throw error;

      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to update profile');
      console.error('Error updating profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters');
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setSuccessMessage('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to update password');
      console.error('Error updating password:', error);
    } finally {
      setIsSaving(false);
    }
  };

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

  return (
    <>
      <Navbar onOpenModal={() => {}} />

      <main className="min-h-[100dvh] bg-white text-black pt-24 p-6 md:p-20">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex items-center gap-4">
            <Link
              href="/dashboard"
              className="p-2 hover:bg-black/5 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-4xl md:text-5xl font-cormorant font-medium">
                Settings
              </h1>
              <p className="text-black/60 text-sm">Manage your account and preferences</p>
            </div>
          </div>

          {/* Alert Messages */}
          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              ✓ {successMessage}
            </div>
          )}
          {errorMessage && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              ✗ {errorMessage}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-4 mb-8 border-b border-black/10">
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'profile'
                  ? 'text-black border-black'
                  : 'text-black/60 border-transparent hover:text-black/80'
              }`}
            >
              <span className="flex items-center gap-2">
                <UserIcon size={16} /> Profile
              </span>
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'security'
                  ? 'text-black border-black'
                  : 'text-black/60 border-transparent hover:text-black/80'
              }`}
            >
              <span className="flex items-center gap-2">
                <Shield size={16} /> Security
              </span>
            </button>
          </div>

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* Email Card */}
              <div className="bg-white border border-black/10 rounded-lg p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Mail size={16} className="text-black/60" />
                  <h2 className="text-lg font-cormorant font-medium">Email Address</h2>
                </div>
                <p className="text-black/60">{user.email}</p>
                <p className="text-gray-600 text-sm mt-2">
                  Your email is verified and cannot be changed directly. Contact support to change your email.
                </p>
              </div>

              {/* Profile Form */}
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="bg-white border border-black/10 rounded-lg p-6 shadow-sm">
                  <h2 className="text-lg font-cormorant font-medium mb-6">Profile Information</h2>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-black/60 mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Enter your full name"
                        className="w-full px-4 py-2 bg-white border border-black/10 rounded-lg text-black placeholder-black/30 focus:outline-none focus:border-black/30 transition-colors"
                      />
                    </div>

                    {user.user_metadata?.avatar_url && (
                      <div>
                        <label className="block text-sm text-black/60 mb-2">
                          Profile Picture
                        </label>
                        <img
                          src={user.user_metadata.avatar_url}
                          alt="Profile"
                          className="w-24 h-24 rounded-full border-2 border-black/10"
                        />
                        <p className="text-black/50 text-xs mt-2">
                          Profile picture from {user.user_metadata?.provider || 'OAuth provider'}
                        </p>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="mt-6 flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-black/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    <Save size={16} />
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
              <div className="bg-white border border-black/10 rounded-lg p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Shield size={16} className="text-black/60" />
                  <h2 className="text-lg font-cormorant font-medium">Authentication Method</h2>
                </div>
                <div className="space-y-2">
                  <p className="text-black/60">
                    Current method:{' '}
                    <span className="text-black capitalize font-medium">
                      {user.user_metadata?.provider || 'Email/OTP'}
                    </span>
                  </p>
                  <p className="text-black/50 text-sm">
                    You are currently using{' '}
                    {user.user_metadata?.provider === 'google'
                      ? 'Google OAuth'
                      : 'Email with OTP'}
                    {' '}for authentication.
                  </p>
                </div>
              </div>

              {/* Password Change Form */}
              {!user.user_metadata?.provider && (
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div className="bg-white border border-black/10 rounded-lg p-6 shadow-sm">
                    <h2 className="text-lg font-cormorant font-medium mb-6">Change Password</h2>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm text-black/60 mb-2">
                          New Password
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Enter new password"
                            className="w-full px-4 py-2 bg-white border border-black/10 rounded-lg text-black placeholder-black/30 focus:outline-none focus:border-black/30 transition-colors"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-black/40 hover:text-black/60"
                          >
                            {showPassword ? (
                              <EyeOff size={16} />
                            ) : (
                              <Eye size={16} />
                            )}
                          </button>
                        </div>
                        <p className="text-black/50 text-xs mt-1">
                          Minimum 6 characters
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm text-black/60 mb-2">
                          Confirm Password
                        </label>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm new password"
                          className="w-full px-4 py-2 bg-white border border-black/10 rounded-lg text-black placeholder-black/30 focus:outline-none focus:border-black/30 transition-colors"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSaving}
                      className="mt-6 flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-black/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      <Save size={16} />
                      {isSaving ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </form>
              )}

              {user.user_metadata?.provider && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-700 text-sm">
                    You are using OAuth authentication. Password management is not available for OAuth accounts.
                  </p>
                </div>
              )}

              {/* Session Information */}
              <div className="bg-gradient-to-br from-gray-900 to-black rounded-lg p-6 border border-gray-800/50">
                <h2 className="text-lg font-cormorant font-medium mb-4">Session Information</h2>
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-gray-400">Last Sign In:</p>
                    <p className="text-gray-300">
                      {user.last_sign_in_at
                        ? new Date(user.last_sign_in_at).toLocaleString('id-ID')
                        : 'Never'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Account Created:</p>
                    <p className="text-gray-300">
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

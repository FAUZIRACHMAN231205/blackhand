'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { isAdmin } from '../lib/adminUtils';
import Navbar from '../component/Navbar';
import { Plus, Edit2, Trash2, BarChart3 } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect jika belum login atau bukan admin
    if (!loading) {
      if (!user) {
        router.push('/');
      } else if (!isAdmin(user.email)) {
        router.push('/dashboard');
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-black text-xl">Loading...</div>
      </div>
    );
  }

  if (!user || !isAdmin(user.email)) {
    return null;
  }

  return (
    <>
      <Navbar onOpenModal={() => {}} />
      
      <main className="min-h-[100dvh] bg-white text-black pt-24 p-6 md:p-20">
        <div className="max-w-6xl mx-auto">
          {/* Header Section */}
          <div className="mb-12">
            <h1 className="text-5xl md:text-6xl font-cormorant font-medium mb-2">
              Admin Panel
            </h1>
            <p className="text-black/60 text-lg">
              Welcome, <span className="text-black/80">{user.email}</span>
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white border border-black/10 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <BarChart3 size={24} className="text-black/60" />
                <h3 className="font-cormorant font-medium text-lg">Total Works</h3>
              </div>
              <p className="text-3xl font-bold text-black">0</p>
              <p className="text-black/60 text-sm mt-2">Artworks published</p>
            </div>

            <div className="bg-white border border-black/10 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <BarChart3 size={24} className="text-black/60" />
                <h3 className="font-cormorant font-medium text-lg">Total Images</h3>
              </div>
              <p className="text-3xl font-bold text-black">0</p>
              <p className="text-black/60 text-sm mt-2">Across all works</p>
            </div>

            <div className="bg-white border border-black/10 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <BarChart3 size={24} className="text-black/60" />
                <h3 className="font-cormorant font-medium text-lg">Featured Works</h3>
              </div>
              <p className="text-3xl font-bold text-black">0</p>
              <p className="text-black/60 text-sm mt-2">Showcased artworks</p>
            </div>
          </div>

          {/* Main Actions */}
          <div className="mb-12">
            <h2 className="text-2xl font-cormorant font-medium mb-6 text-black/80">Management</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Create Work */}
              <Link href="/admin/works/create" className="group">
                <div className="bg-white border border-black/10 rounded-lg p-8 hover:border-black/30 transition-all hover:shadow-lg cursor-pointer">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-black/10 rounded-lg flex items-center justify-center">
                      <Plus size={24} className="text-black" />
                    </div>
                    <h3 className="text-xl font-cormorant font-medium">Upload New Work</h3>
                  </div>
                  <p className="text-black/60">Create a new album with up to 6 images</p>
                </div>
              </Link>

              {/* Manage Works */}
              <Link href="/admin/works" className="group">
                <div className="bg-white border border-black/10 rounded-lg p-8 hover:border-black/30 transition-all hover:shadow-lg cursor-pointer">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-black/10 rounded-lg flex items-center justify-center">
                      <Edit2 size={24} className="text-black" />
                    </div>
                    <h3 className="text-xl font-cormorant font-medium">Manage Works</h3>
                  </div>
                  <p className="text-black/60">View, edit, or delete existing artworks</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Information Section */}
          <div className="bg-black/5 border border-black/10 rounded-lg p-8">
            <h3 className="text-lg font-cormorant font-medium mb-4">📋 Admin Information</h3>
            <ul className="space-y-3 text-black/70">
              <li>• Each work is an album containing up to 6 images</li>
              <li>• You can set one image as featured/showcase</li>
              <li>• Works are published by default but can be unpublished</li>
              <li>• All your works will be visible to logged-in users in the gallery</li>
              <li>• Use Supabase storage for image uploads (max 5MB per image)</li>
            </ul>
          </div>
        </div>
      </main>
    </>
  );
}

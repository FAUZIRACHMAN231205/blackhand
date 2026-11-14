'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import SupportModal from '../../component/SupportModal';
import { Button, TextField } from '../../component/ui';
import { useToast } from '../../context/ToastContext';
import { useAccount } from '../AccountContext';

const NAME_MAX = 80;

function formatDateTime(iso: string | undefined | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-5 border-t border-ink pt-4 md:grid-cols-[12rem_1fr] md:gap-10">
      <h2 className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-ink">{title}</h2>
      <div className="grid min-w-0 gap-5">{children}</div>
    </section>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-line pb-3">
      <dt className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-mute">{label}</dt>
      <dd className="min-w-0 font-sans text-sm text-ink [overflow-wrap:anywhere]">{children}</dd>
    </div>
  );
}

/** Akun › Profil: name, how this member signs in, help, and signing out. */
export default function ProfileTab() {
  const { user, refresh } = useAccount();
  const router = useRouter();
  const { showToast } = useToast();
  const [fullName, setFullName] = useState(user.full_name ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const trimmed = fullName.trim();
  const unchanged = trimmed === (user.full_name ?? '').trim();

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trimmed) {
      setError('Nama tidak boleh kosong.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: trimmed }),
      });
      if (!res.ok) throw new Error(String(res.status));
      await refresh();
      showToast({ type: 'success', message: 'Profil disimpan.' });
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Gagal menyimpan. Periksa koneksi Anda lalu coba lagi.');
    } finally {
      setSaving(false);
    }
  };

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(user.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast({ type: 'error', message: 'Gagal menyalin. Salin ID secara manual.' });
    }
  };

  const signOut = async () => {
    setSigningOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.push('/');
    }
  };

  return (
    <div className="grid gap-12">
      <Section title="Data diri">
        <form onSubmit={save} className="grid gap-5" noValidate>
          <div className="flex items-end gap-4">
            {user.avatar_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatar_url}
                alt=""
                referrerPolicy="no-referrer"
                className="h-14 w-14 shrink-0 rounded-full border border-line object-cover"
              />
            )}
            <TextField
              id="profile-name"
              label="Nama lengkap"
              className="min-w-0 flex-grow"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              maxLength={NAME_MAX}
              autoComplete="name"
              error={error}
            />
          </div>
          <dl className="grid gap-3">
            <Fact label="Email">{user.email}</Fact>
          </dl>
          <p className="-mt-2 font-sans text-xs text-mute">
            Email tidak bisa diubah dari sini. Hubungi dukungan bila perlu menggantinya.
          </p>
          <div>
            <Button type="submit" loading={saving} disabled={unchanged}>
              Simpan
            </Button>
          </div>
        </form>
      </Section>

      <Section title="Masuk dan sesi">
        <dl className="grid gap-3">
          <Fact label="Cara masuk">{user.provider === 'google' ? 'Akun Google' : 'Kode lewat email'}</Fact>
          <Fact label="Bergabung">{formatDateTime(user.created_at)}</Fact>
          <Fact label="Masuk terakhir">{formatDateTime(user.last_sign_in_at)}</Fact>
          <Fact label="ID pengguna">
            <span className="flex flex-wrap items-center justify-between gap-x-4">
              <span className="font-mono text-xs">{user.id}</span>
              <Button variant="ghost" size="sm" onClick={copyId}>
                {copied ? 'Tersalin' : 'Salin'}
              </Button>
            </span>
          </Fact>
        </dl>
        <p className="font-sans text-xs text-mute">
          Akun ini tidak memakai kata sandi: masuk selalu lewat kode email atau Google.
        </p>
      </Section>

      <Section title="Bantuan">
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => setSupportOpen(true)}>
            Hubungi dukungan
          </Button>
          <Button variant="ghost" onClick={signOut} loading={signingOut}>
            Keluar
          </Button>
        </div>
      </Section>

      <SupportModal isOpen={supportOpen} onClose={() => setSupportOpen(false)} />
    </div>
  );
}

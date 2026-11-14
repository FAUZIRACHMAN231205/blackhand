'use client';

import { useState } from 'react';
import {
  Button,
  FilterTabs,
  ImageViewer,
  QuantityStepper,
  SelectField,
  TextAreaField,
  TextField,
} from '../component/ui';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';

export function ThemeSwitch() {
  const { isDark, toggleTheme } = useTheme();
  return (
    <Button variant="secondary" size="sm" onClick={toggleTheme}>
      {isDark ? 'Mode terang' : 'Mode gelap'}
    </Button>
  );
}

type Category = 'Paintings' | 'Digital Art' | 'Sculptures' | null;

export function DemoFilterTabs() {
  const [value, setValue] = useState<Category>(null);
  return (
    <FilterTabs<Category>
      label="Kategori"
      value={value}
      onChange={setValue}
      items={[
        { value: null, label: 'Semua' },
        { value: 'Paintings', label: 'Paintings' },
        { value: 'Digital Art', label: 'Digital Art' },
        { value: 'Sculptures', label: 'Sculptures' },
      ]}
    />
  );
}

export function DemoToasts() {
  const { showToast } = useToast();
  return (
    <div className="flex flex-wrap gap-3">
      <Button variant="secondary" size="sm" onClick={() => showToast({ type: 'success', message: 'Perubahan disimpan.' })}>
        Berhasil
      </Button>
      <Button variant="secondary" size="sm" onClick={() => showToast({ type: 'info', message: 'Pesanan tersimpan. Lanjutkan pembayaran dalam 30 menit.' })}>
        Info
      </Button>
      <Button variant="secondary" size="sm" onClick={() => showToast({ type: 'error', message: 'Pembayaran gagal. Silakan coba lagi.' })}>
        Gagal
      </Button>
    </div>
  );
}

export function DemoQuantity() {
  const [value, setValue] = useState(1);
  return (
    <div className="max-w-sm">
      <QuantityStepper id="demo-qty" label="Jumlah" value={value} max={5} onChange={setValue} />
    </div>
  );
}

export function DemoImageViewer() {
  const [index, setIndex] = useState(0);
  return (
    <div className="max-w-md">
      <ImageViewer
        alt="Contoh"
        fit="cover"
        index={index}
        onIndexChange={setIndex}
        images={[
          { id: 'a', url: '/arte.jpeg' },
          { id: 'b', url: '/arte.jpeg' },
          { id: 'c', url: '/arte.jpeg' },
        ]}
      />
    </div>
  );
}

export function DemoFields() {
  const [phone, setPhone] = useState('0812');
  const phoneError = /^\+?\d{8,15}$/.test(phone.replace(/[^\d+]/g, '')) ? null : 'Nomor HP harus 8–15 digit.';

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <TextField id="demo-name" label="Nama penerima" defaultValue="Budi Santoso" autoComplete="off" />
      <TextField
        id="demo-phone"
        label="Nomor HP"
        inputMode="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        error={phoneError}
        hint="Untuk kurir menghubungi Anda."
      />
      <SelectField id="demo-category" label="Kategori" defaultValue="Paintings">
        <option>Paintings</option>
        <option>Digital Art</option>
        <option>Sculptures</option>
      </SelectField>
      <TextAreaField id="demo-notes" label="Catatan" rows={3} placeholder="Opsional" />
    </div>
  );
}

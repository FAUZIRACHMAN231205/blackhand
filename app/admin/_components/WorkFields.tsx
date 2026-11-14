'use client';

import { SelectField, TextAreaField, TextField } from '../../component/ui';
import { MIN_PRICE_IDR, WORK_CATEGORIES, formatIdr, validatePricing } from '../../lib/categories';
import { FormSection } from './AdminParts';

export interface WorkDraft {
  title: string;
  description: string;
  category: string;
  isPublished: boolean;
  isForSale: boolean;
  /** Rupiah as typed; empty = no price. */
  price: string;
}

export const EMPTY_WORK: WorkDraft = {
  title: '',
  description: '',
  category: WORK_CATEGORIES[0],
  isPublished: true,
  isForSale: false,
  price: '',
};

export type WorkErrors = Partial<Record<'title' | 'price', string>>;

/** The request body for a draft, as the works API expects it. */
export function workPayload(draft: WorkDraft) {
  return {
    title: draft.title.trim(),
    description: draft.description.trim(),
    category: draft.category,
    is_published: draft.isPublished,
    is_for_sale: draft.isForSale,
    price_idr: draft.price === '' ? null : Number(draft.price),
  };
}

/** The same checks the API makes, per field, so mistakes show where they are. */
export function checkWork(draft: WorkDraft): WorkErrors {
  const errors: WorkErrors = {};
  if (!draft.title.trim()) errors.title = 'Judul wajib diisi.';
  const pricing = validatePricing(draft.price === '' ? null : Number(draft.price), draft.isForSale);
  if (pricing) errors.price = pricing;
  return errors;
}

/** Title, description, category, visibility and price of a work. */
export default function WorkFields({
  draft,
  onChange,
  errors = {},
  soldAt = null,
}: {
  draft: WorkDraft;
  onChange: (next: WorkDraft) => void;
  errors?: WorkErrors;
  /** A sold work keeps its price and availability. */
  soldAt?: string | null;
}) {
  const set = <K extends keyof WorkDraft>(key: K, value: WorkDraft[K]) => onChange({ ...draft, [key]: value });
  const price = Number(draft.price);
  const locked = Boolean(soldAt);

  return (
    <>
      <FormSection title="Informasi karya">
        <TextField
          id="work-title"
          label="Judul"
          value={draft.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder="Judul karya"
          error={errors.title}
        />
        <TextAreaField
          id="work-description"
          label="Deskripsi"
          rows={5}
          value={draft.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="Opsional: cerita di balik karya ini"
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField id="work-category" label="Kategori" value={draft.category} onChange={(e) => set('category', e.target.value)}>
            {WORK_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </SelectField>
          <SelectField
            id="work-status"
            label="Status"
            value={draft.isPublished ? 'published' : 'hidden'}
            onChange={(e) => set('isPublished', e.target.value === 'published')}
            hint={draft.isPublished ? 'Tampil di situs.' : 'Hanya terlihat di admin.'}
          >
            <option value="published">Tayang</option>
            <option value="hidden">Disembunyikan</option>
          </SelectField>
        </div>
      </FormSection>

      <FormSection
        title="Penjualan"
        aside={
          locked
            ? `Terjual ${new Date(soldAt as string).toLocaleDateString('id-ID')}. Harga dan status jual tidak bisa diubah lagi; pembelinya ada di Pesanan.`
            : 'Setiap karya dijual kepada satu pembeli saja.'
        }
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField
            id="work-sale"
            label="Ketersediaan"
            value={draft.isForSale ? 'sale' : 'not-for-sale'}
            onChange={(e) => set('isForSale', e.target.value === 'sale')}
            disabled={locked}
          >
            <option value="not-for-sale">Tidak dijual</option>
            <option value="sale">Dijual</option>
          </SelectField>
          <TextField
            id="work-price"
            label="Harga (Rp)"
            type="number"
            inputMode="numeric"
            min={0}
            step={1000}
            value={draft.price}
            onChange={(e) => set('price', e.target.value)}
            disabled={locked}
            placeholder="50000"
            error={errors.price}
            hint={price > 0 ? formatIdr(price) : `Minimal ${formatIdr(MIN_PRICE_IDR)} bila dijual`}
          />
        </div>
      </FormSection>
    </>
  );
}

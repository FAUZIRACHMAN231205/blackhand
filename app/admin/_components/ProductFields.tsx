'use client';

import { formatIdr, MIN_PRICE_IDR } from '../../lib/categories';
import { PRODUCT_DESCRIPTION_MAX, PRODUCT_NAME_MAX, validateProductInput } from '../../lib/shop';
import { FormSection } from './AdminParts';
import { SelectField, TextAreaField, TextField } from '../../component/ui';

export interface ProductDraft {
  name: string;
  description: string;
  price: string;
  /** Original price shown struck through. Empty string = not on sale. */
  compareAtPrice: string;
  stock: string;
  isPublished: boolean;
}

export const EMPTY_PRODUCT: ProductDraft = {
  name: '',
  description: '',
  price: '',
  compareAtPrice: '',
  stock: '0',
  isPublished: true,
};

export type ProductErrors = Partial<Record<'name' | 'description' | 'price' | 'compareAtPrice' | 'stock', string>>;

/** The request body for a draft, with numbers as numbers (or NaN, which the API rejects). */
export function productPayload(draft: ProductDraft) {
  return {
    name: draft.name.trim(),
    description: draft.description.trim(),
    price_idr: draft.price === '' ? null : Number(draft.price),
    compare_at_price_idr: draft.compareAtPrice === '' ? null : Number(draft.compareAtPrice),
    stock: draft.stock === '' ? null : Number(draft.stock),
    is_published: draft.isPublished,
  };
}

/**
 * The API's own rules, run one field at a time so each message lands under
 * the field it is about. Empty means the draft can be sent.
 */
export function checkProduct(draft: ProductDraft): ProductErrors {
  const p = productPayload(draft);
  const errors: ProductErrors = {};

  const name = validateProductInput({ name: p.name }, true);
  if (name) errors.name = name;
  const description = validateProductInput({ description: p.description }, true);
  if (description) errors.description = description;

  const price = draft.price === '' ? 'Harga wajib diisi.' : validateProductInput({ price_idr: p.price_idr }, true);
  if (price) errors.price = price;
  else {
    const compare = validateProductInput({ price_idr: p.price_idr, compare_at_price_idr: p.compare_at_price_idr }, true);
    if (compare) errors.compareAtPrice = compare;
  }

  const stock = draft.stock === '' ? 'Stok wajib diisi.' : validateProductInput({ stock: p.stock }, true);
  if (stock) errors.stock = stock;

  return errors;
}

/** The id of the first field with a problem, to focus it. */
export function firstProductError(errors: ProductErrors): string | null {
  const order: (keyof ProductErrors)[] = ['name', 'description', 'price', 'compareAtPrice', 'stock'];
  const ids: Record<keyof ProductErrors, string> = {
    name: 'product-name',
    description: 'product-description',
    price: 'product-price',
    compareAtPrice: 'product-compare-price',
    stock: 'product-stock',
  };
  const key = order.find((k) => errors[k]);
  return key ? ids[key] : null;
}

/** Name, description, price, stock and visibility of a product. */
export default function ProductFields({
  draft,
  onChange,
  errors = {},
}: {
  draft: ProductDraft;
  onChange: (next: ProductDraft) => void;
  errors?: ProductErrors;
}) {
  const set = <K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) => onChange({ ...draft, [key]: value });
  const price = Number(draft.price);

  return (
    <>
      <FormSection title="Informasi produk">
        <TextField
          id="product-name"
          label="Nama"
          value={draft.name}
          maxLength={PRODUCT_NAME_MAX}
          onChange={(e) => set('name', e.target.value)}
          placeholder="Contoh: Tote Bag Blackhand"
          error={errors.name}
        />
        <TextAreaField
          id="product-description"
          label="Deskripsi"
          rows={5}
          value={draft.description}
          maxLength={PRODUCT_DESCRIPTION_MAX}
          onChange={(e) => set('description', e.target.value)}
          placeholder="Bahan, ukuran, cara merawat…"
          error={errors.description}
        />
        <SelectField
          id="product-status"
          label="Status"
          value={draft.isPublished ? 'published' : 'hidden'}
          onChange={(e) => set('isPublished', e.target.value === 'published')}
          hint={draft.isPublished ? 'Tampil di toko.' : 'Hanya terlihat di admin.'}
        >
          <option value="published">Tayang</option>
          <option value="hidden">Disembunyikan</option>
        </SelectField>
      </FormSection>

      <FormSection title="Harga dan stok">
        <div className="grid gap-5 sm:grid-cols-3">
          <TextField
            id="product-price"
            label="Harga (Rp)"
            type="number"
            inputMode="numeric"
            min={MIN_PRICE_IDR}
            step={1000}
            value={draft.price}
            onChange={(e) => set('price', e.target.value)}
            placeholder="75000"
            error={errors.price}
            hint={price > 0 ? formatIdr(price) : `Minimal ${formatIdr(MIN_PRICE_IDR)}`}
          />
          <TextField
            id="product-compare-price"
            label="Harga coret (Rp)"
            type="number"
            inputMode="numeric"
            min={0}
            step={1000}
            value={draft.compareAtPrice}
            onChange={(e) => set('compareAtPrice', e.target.value)}
            placeholder="Opsional"
            error={errors.compareAtPrice}
            hint="Isi lebih tinggi dari harga untuk menampilkan diskon."
          />
          <TextField
            id="product-stock"
            label="Stok tersedia"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            value={draft.stock}
            onChange={(e) => set('stock', e.target.value)}
            error={errors.stock}
            hint="Barang di checkout yang belum dibayar sudah dikurangi."
          />
        </div>
      </FormSection>
    </>
  );
}

'use client';

import { formatIdr, MIN_PRICE_IDR } from '../lib/categories';
import { PRODUCT_DESCRIPTION_MAX, PRODUCT_NAME_MAX } from '../lib/shop';

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

export const adminInputClass =
  'w-full px-4 py-3.5 bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl text-black dark:text-white placeholder-black/50 dark:placeholder-white/50 focus:outline-none focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/10 transition-all font-sans text-base';
export const adminLabelClass =
  'block font-sans text-[10px] font-bold uppercase tracking-widest text-black/50 dark:text-white/50 mb-2.5';
export const adminCardClass =
  'bg-white/80 dark:bg-zinc-950/60 border border-black/5 dark:border-white/10 rounded-2xl p-5 sm:p-8 space-y-6 transition-colors shadow-sm backdrop-blur-sm';

/** Name, description, price, stock and visibility of a product. */
export default function ProductFields({
  draft,
  onChange,
}: {
  draft: ProductDraft;
  onChange: (next: ProductDraft) => void;
}) {
  const set = <K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) => onChange({ ...draft, [key]: value });
  const price = Number(draft.price);

  return (
    <div className={adminCardClass}>
      <h2 className="font-serif text-lg italic">Product Information</h2>

      <div>
        <label htmlFor="product-name" className={adminLabelClass}>Name *</label>
        <input
          id="product-name"
          type="text"
          value={draft.name}
          maxLength={PRODUCT_NAME_MAX}
          onChange={(e) => set('name', e.target.value)}
          placeholder="e.g. Blackhand Tote Bag"
          className={adminInputClass}
        />
      </div>

      <div>
        <label htmlFor="product-description" className={adminLabelClass}>Description</label>
        <textarea
          id="product-description"
          value={draft.description}
          maxLength={PRODUCT_DESCRIPTION_MAX}
          onChange={(e) => set('description', e.target.value)}
          placeholder="Material, size, care instructions…"
          rows={5}
          className={`${adminInputClass} resize-none`}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label htmlFor="product-price" className={adminLabelClass}>Price (IDR) *</label>
          <input
            id="product-price"
            type="number"
            inputMode="numeric"
            min={MIN_PRICE_IDR}
            step={1000}
            value={draft.price}
            onChange={(e) => set('price', e.target.value)}
            placeholder="75000"
            className={adminInputClass}
          />
          <p className="mt-1.5 font-sans text-[11px] text-black/60 dark:text-white/60">
            {price > 0 ? formatIdr(price) : `Minimum ${formatIdr(MIN_PRICE_IDR)}`}
          </p>
        </div>

        <div>
          <label htmlFor="product-compare-price" className={adminLabelClass}>Compare-at price</label>
          <input
            id="product-compare-price"
            type="number"
            inputMode="numeric"
            min={0}
            step={1000}
            value={draft.compareAtPrice}
            onChange={(e) => set('compareAtPrice', e.target.value)}
            placeholder="Optional"
            className={adminInputClass}
          />
          <p className="mt-1.5 font-sans text-[11px] text-black/60 dark:text-white/60">
            Set higher than price to show a sale badge.
          </p>
        </div>

        <div>
          <label htmlFor="product-stock" className={adminLabelClass}>Stock available</label>
          <input
            id="product-stock"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            value={draft.stock}
            onChange={(e) => set('stock', e.target.value)}
            className={adminInputClass}
          />
          <p className="mt-1.5 font-sans text-[11px] text-black/60 dark:text-white/60">
            Units in an unpaid checkout are already taken off.
          </p>
        </div>

        <div>
          <label htmlFor="product-status" className={adminLabelClass}>Status</label>
          <select
            id="product-status"
            value={draft.isPublished ? 'published' : 'hidden'}
            onChange={(e) => set('isPublished', e.target.value === 'published')}
            className={adminInputClass}
          >
            <option value="published">Published</option>
            <option value="hidden">Hidden</option>
          </select>
        </div>
      </div>
    </div>
  );
}

import { CatalogCard, Price, Tag } from './ui';
import { discountPercent, isNewArrival } from '../lib/shop';
import { publicSaleStatus } from '../lib/sales';
import type { Product, Work } from '../types';

/**
 * An artwork in any grid (Karya, Beranda). One tag at most, by priority:
 * yours, sold, then the studio's pick.
 *
 * No price on the card: a visitor should look at the work first, not decide
 * from a number in the grid. The price is on the detail page, beside "Beli".
 */
export function WorkCard({ work, owned = false }: { work: Work; owned?: boolean }) {
  const status = publicSaleStatus(work);
  const tags = owned ? (
    <Tag>Milik Anda</Tag>
  ) : status === 'sold' ? (
    <Tag variant="solid">Terjual</Tag>
  ) : work.is_featured ? (
    <Tag>Pilihan</Tag>
  ) : null;

  const aside = owned ? 'Milik Anda' : status === 'sold' ? 'Terjual' : null;

  return (
    <CatalogCard
      href={`/gallery/${work.id}`}
      imageUrl={work.featured_image_url}
      title={work.title}
      meta={work.category}
      aside={aside}
      tags={tags}
    />
  );
}

/** A product in any grid (Toko, Beranda): sold out, then discount, then new. */
export function ProductCard({ product }: { product: Product }) {
  const soldOut = product.stock <= 0;
  const pctOff = discountPercent(product.price_idr, product.compare_at_price_idr);
  const isNew = !soldOut && pctOff === null && isNewArrival(product.created_at);

  return (
    <CatalogCard
      href={`/shop/${product.id}`}
      imageUrl={product.cover_image_url}
      title={product.name}
      meta="Merchandise"
      aside={soldOut ? 'Stok habis' : <Price amount={product.price_idr} compareAt={product.compare_at_price_idr} size="sm" />}
      tags={
        soldOut ? (
          <Tag variant="solid">Stok habis</Tag>
        ) : pctOff !== null ? (
          <Tag variant="sale">−{pctOff}%</Tag>
        ) : isNew ? (
          <Tag>Baru</Tag>
        ) : null
      }
      dimmed={soldOut}
    />
  );
}

import { useId } from 'react';
import { siFacebook, siInstagram, siTiktok, siWhatsapp } from 'simple-icons';
import { cn } from '@/lib/utils';

export type BrandSocialName = 'instagram' | 'facebook' | 'tiktok' | 'whatsapp';

const SOLID_MARKS = {
  facebook: { path: siFacebook.path, fill: '#1877F2' },
  whatsapp: { path: siWhatsapp.path, fill: '#25D366' },
} as const;

/**
 * Official brand marks. The SVG is decorative; the parent link keeps the accessible name.
 */
export function BrandSocialIcon({
  brand,
  className,
}: {
  brand: BrandSocialName;
  className?: string;
}) {
  const gradientId = `brand-ig-${useId().replace(/:/g, '')}`;
  const size = cn('h-5 w-5 shrink-0', className);

  if (brand === 'instagram') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={size}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#f9ce34" />
            <stop offset="50%" stopColor="#ee2a7b" />
            <stop offset="100%" stopColor="#6228d7" />
          </linearGradient>
        </defs>
        <path d={siInstagram.path} fill={`url(#${gradientId})`} />
      </svg>
    );
  }

  if (brand === 'tiktok') {
    return (
      <svg viewBox="-1.5 -1.5 27 27" aria-hidden="true" className={size}>
        <path d={siTiktok.path} fill="#25F4EE" transform="translate(-0.8 0.8)" />
        <path d={siTiktok.path} fill="#FE2C55" transform="translate(0.8 -0.8)" />
        <path d={siTiktok.path} fill="#F7F7F7" />
      </svg>
    );
  }

  const mark = SOLID_MARKS[brand];

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={size}>
      <path d={mark.path} fill={mark.fill} />
    </svg>
  );
}

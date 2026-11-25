import React from 'react';
import { useLanguage } from '../lib/i18n';

export const FACEBOOK_PAGE_URL = 'https://www.facebook.com/share/1CmhrkJcwH/';

function FacebookGlyph({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M22.675 0h-21.35C.595 0 0 .595 0 1.326v21.348C0 23.404.595 24 1.325 24H12.82v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116C23.405 24 24 23.404 24 22.674V1.326C24 .595 23.405 0 22.675 0z" />
    </svg>
  );
}

export function FacebookIconButton({
  className = '',
  title
}: {
  className?: string;
  title?: string;
}) {
  const { t } = useLanguage();
  const label = title || t('Follow PLAY & WIN BD on Facebook', 'PLAY & WIN BD ফেসবুক পেজ');
  return (
    <a
      href={FACEBOOK_PAGE_URL}
      target="_blank"
      rel="noopener noreferrer"
      title={label}
      aria-label={label}
      className={`min-w-[40px] min-h-[40px] rounded-xl bg-[#1877F2] hover:bg-[#166FE5] text-white flex items-center justify-center shadow-[0_6px_18px_rgba(24,119,242,0.4)] transition-transform active:scale-95 shrink-0 ${className}`}
    >
      <FacebookGlyph className="w-4 h-4" />
    </a>
  );
}

export function FacebookPillButton({
  className = '',
  compact = false
}: {
  className?: string;
  compact?: boolean;
}) {
  const { t } = useLanguage();
  return (
    <a
      href={FACEBOOK_PAGE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`min-h-[44px] ${
        compact ? 'px-3.5 py-2 text-xs' : 'px-5 py-2.5 text-sm'
      } rounded-xl bg-[#1877F2] hover:bg-[#166FE5] text-white font-bold inline-flex items-center justify-center gap-2 shadow-[0_8px_22px_rgba(24,119,242,0.4)] transition-transform active:scale-95 whitespace-nowrap shrink-0 ${className}`}
    >
      <FacebookGlyph className="w-4 h-4 shrink-0" />
      <span>{t('Facebook Page', 'ফেসবুক পেজ')}</span>
    </a>
  );
}

# Resolve 5360e43 on branches missing MenuContactButtons / phone lib
param([switch]$HasOrderModes)

Set-Location "d:\Graduation Project 2025\QRResturantWarda\warda-shamya"

git checkout hettsamaka -- src/components/icons/WhatsAppIcon.tsx src/components/menu/MenuContactButtons.tsx 2>&1 | Out-Null
git ls-tree HEAD src/lib/phone/normalize.ts 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
  git checkout hettsamaka -- src/lib/phone/normalize.ts src/lib/phone/country-dial.ts 2>&1 | Out-Null
}

if ($HasOrderModes) {
  git checkout 5360e43 -- src/components/menu/MenuHeader.tsx src/components/menu/MenuUtilityBar.tsx 2>&1 | Out-Null
  git checkout HEAD -- src/lib/order/order-modes.ts src/components/menu/DiningModeToggle.tsx 2>&1 | Out-Null
} else {
  @'
'use client';

import { Search } from 'lucide-react';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { DiningModeToggle } from '@/components/menu/DiningModeToggle';
import { MenuContactButtons } from '@/components/menu/MenuContactButtons';
import { useTranslations } from '@/components/providers/RootI18nProvider';

interface MenuUtilityBarProps {
  tableParam: string | null;
  diningMode: 'dining' | 'takeaway';
  onDiningModeChange: (mode: 'dining' | 'takeaway') => void;
  onSearchOpen: () => void;
}

export function MenuUtilityBar({
  tableParam,
  diningMode,
  onDiningModeChange,
  onSearchOpen,
}: MenuUtilityBarProps) {
  const t = useTranslations('menu');

  return (
    <div className="border-b border-[var(--menu-line)] bg-[var(--menu-paper)] sm:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2.5">
        <DiningModeToggle value={diningMode} onChange={onDiningModeChange} />
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onSearchOpen}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-[var(--menu-ink)] transition-colors hover:bg-[var(--menu-gold-wash)]"
            aria-label={t('searchMenu')}
          >
            <Search className="h-[18px] w-[18px]" aria-hidden="true" />
          </button>
          <MenuContactButtons tableParam={tableParam} />
          <LanguageSwitcher
            variant="ghost"
            className="size-11 rounded-full bg-[var(--menu-gold-wash)] text-[var(--menu-gold)] hover:bg-[rgba(184,147,74,0.2)] hover:text-[var(--menu-gold-soft)]"
          />
        </div>
      </div>
    </div>
  );
}
'@ | Set-Content "src/components/menu/MenuUtilityBar.tsx" -NoNewline

  $header = Get-Content "src/components/menu/MenuHeader.tsx" -Raw
  if ($header -notmatch 'MenuContactButtons') {
    $header = $header -replace "import \{ Heart, MessageCircle, Search, ShoppingCart \}", "import { Heart, Search, ShoppingCart }`nimport { MenuContactButtons } from '@/components/menu/MenuContactButtons';"
    $header = $header -replace "(?s)  const whatsapp = settings\?\.whatsapp.*?    : '';\r?\n\r?\n", ""
    $header = $header -replace "(?s)          \{whatsapp && tableParam && \(.*?\)\}\r?\n\r?\n", "          <MenuContactButtons tableParam={tableParam} className=`"hidden sm:flex`" />`n`n"
    $header = $header -replace 'className="hidden rounded-full text-\[var\(--menu-ink-soft\)\].*?sm:px-3"', 'className="hidden rounded-full bg-[var(--menu-gold-wash)] text-[var(--menu-gold)] hover:bg-[rgba(184,147,74,0.2)] hover:text-[var(--menu-gold-soft)] sm:inline-flex sm:h-11 sm:min-w-11 sm:px-3"'
    Set-Content "src/components/menu/MenuHeader.tsx" -Value $header -NoNewline
  }
}

$page = Get-Content "src/components/menu/MenuPageClient.tsx" -Raw
if ($page -notmatch 'MenuUtilityBar[\s\S]*?onSearchOpen') {
  $page = $page -replace '(onDiningModeChange=\{handleDiningModeChange\}\r?\n)(\s*/>)', "`$1        onSearchOpen={() => setSearchOpen(true)}`n`$2"
  Set-Content "src/components/menu/MenuPageClient.tsx" -Value $page -NoNewline
}

git add -A
git diff --cached --quiet
if ($LASTEXITCODE -ne 0) {
  git commit -m "style(menu): add colored contact buttons with official WhatsApp icon" 2>&1 | Out-Null
}

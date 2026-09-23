Set-Location "d:\Graduation Project 2025\QRResturantWarda\warda-shamya"
$path = "src/stores/cart-store.ts"
$content = Get-Content $path -Raw
if ($content -match "triggerHaptic") { return }
$content = $content -replace "(import \{ persist \} from 'zustand/middleware';)", "`$1`nimport { playSound } from '@/lib/ux/sound';`nimport { triggerHaptic } from '@/lib/ux/haptic';"
$content = $content -replace "(\s+const id = makeCartLineId\([^\)]+\);)", "`$1`n        triggerHaptic('light');`n        playSound('add');"
Set-Content $path -Value $content -NoNewline

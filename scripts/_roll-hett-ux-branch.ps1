param(
  [Parameter(Mandatory = $true)][string]$Branch,
  [switch]$Deploy,
  [string]$VercelProject = $Branch,
  [switch]$HasOrderModes,
  [switch]$IsAlaKeefak
)

$ErrorActionPreference = "Continue"
Set-Location "d:\Graduation Project 2025\QRResturantWarda\warda-shamya"

$KEEP_OURS = @(
  "src/app/(menu)/checkout/page.tsx",
  "src/app/(menu)/order-success/page.tsx",
  "src/components/cart/CartDrawer.tsx",
  "src/components/menu/MenuPageClient.tsx",
  "src/lib/order/build-order.ts",
  "src/stores/cart-store.ts"
)
if ($IsAlaKeefak) {
  $KEEP_OURS += @(
    "src/components/menu/MenuHeader.tsx",
    "src/components/menu/MenuUtilityBar.tsx",
    "src/components/menu/MenuPageClient.tsx",
    "src/lib/order/order-modes.ts",
    "src/components/menu/DiningModeToggle.tsx"
  )
}

function Resolve-CherryPickConflicts {
  param([string[]]$KeepOurs)
  foreach ($file in @(git diff --name-only --diff-filter=U)) {
    if ($KeepOurs -contains $file) { git checkout --ours -- $file 2>&1 | Out-Null }
    else { git checkout --theirs -- $file 2>&1 | Out-Null }
    git add $file
  }
}

$row = [ordered]@{ Branch = $Branch; Commit = ""; Push = "skipped"; Deploy = "skipped"; Notes = "" }

git fetch origin $Branch 2>&1 | Out-Null
git checkout $Branch 2>&1 | Out-Null
git reset --hard "origin/$Branch" 2>&1 | Out-Null
git clean -fd -e "scripts/_*.ps1" 2>&1 | Out-Null

$notes = @()
git cherry-pick 5360e43 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
  git cherry-pick --abort 2>&1 | Out-Null
  if ($IsAlaKeefak) {
    git cherry-pick 5360e43 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { Resolve-CherryPickConflicts -KeepOurs $KEEP_OURS; git cherry-pick --continue --no-edit 2>&1 | Out-Null }
    $notes += "5360e43 ala"
  } else {
    & "$PSScriptRoot\_apply-hett-ux-5360.ps1" -HasOrderModes:$HasOrderModes
    $notes += "5360e43 manual"
  }
} else { $notes += "5360e43 ok" }

foreach ($commit in @("591b08f", "1d48934", "818f320", "962ff6d")) {
  git cherry-pick $commit 2>&1 | Out-Null
  if ($LASTEXITCODE -eq 0) { $notes += "$commit ok"; continue }
  Resolve-CherryPickConflicts -KeepOurs $KEEP_OURS
  git cherry-pick --continue --no-edit 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0) { git cherry-pick --skip 2>&1 | Out-Null; $notes += "$commit partial" }
  else { $notes += "$commit resolved" }
}

& "$PSScriptRoot\_patch-ux-cart-store.ps1"
& "$PSScriptRoot\_patch-scroll-spy-menu-page.ps1"
git checkout 962ff6d -- src/lib/ux/haptic.ts src/lib/ux/sound.ts src/hooks/useCategoryScrollSpy.ts src/lib/order/whatsapp-message.ts 2>&1 | Out-Null
git checkout 962ff6d -- tests/unit/ux-feedback.test.ts tests/unit/category-scroll-spy.test.ts tests/unit/whatsapp-message.test.ts 2>&1 | Out-Null
git checkout 962ff6d -- src/messages/ar.json src/messages/en.json src/messages/fr.json src/messages/nl.json 2>&1 | Out-Null
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
git add -A
git diff --cached --quiet
if ($LASTEXITCODE -ne 0) { git commit -m "chore: finalize Hett UX rollout helpers and locales" 2>&1 | Out-Null }

$row.Commit = (git rev-parse --short HEAD)
$row.Notes = ($notes -join "; ")
git push origin $Branch 2>&1 | Out-Null
$row.Push = if ($LASTEXITCODE -eq 0) { "ok" } else { "failed" }

if ($Deploy -and $row.Push -eq "ok") {
  npm run build 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0) { $row.Deploy = "failed (local build)" }
  else {
    $deployOut = vercel deploy --prod --yes --project $VercelProject 2>&1
    $row.Deploy = if ($LASTEXITCODE -eq 0) { "ok" } else { "failed" }
  }
} elseif (-not $Deploy) { $row.Deploy = "n/a (push only)" }

[pscustomobject]$row

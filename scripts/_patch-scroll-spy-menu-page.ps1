Set-Location "d:\Graduation Project 2025\QRResturantWarda\warda-shamya"
$path = "src/components/menu/MenuPageClient.tsx"
$content = Get-Content $path -Raw
if ($content -match "useCategoryScrollSpy") { return }
$content = $content -replace "(import \{ hashSeed, shuffleCopy \}[^\n]+\n)", "`$1import { useCategoryScrollSpy } from '@/hooks/useCategoryScrollSpy';`n"
$content = $content -replace "(const \[activeCategory, setActiveCategory\][^\n]+\n)", "`$1  const [spyCategory, setSpyCategory] = useState<string | null>(null);`n"
$oldHandler = @'
  const handleCategoryChange = useCallback((next: string | null) => {
    setActiveCategory((prev) => {
      if (next === null && prev !== null) {
        setAllShuffleSeed(Date.now());
      }
      return next;
    });
  }, []);
'@
$newHandler = @'
  const categoryIds = useMemo(
    () => (categories ?? []).map((category) => category.id),
    [categories]
  );
  const { setTapGuard } = useCategoryScrollSpy({
    categoryIds,
    enabled: Boolean(categories?.length) && activeCategory === null,
    onActiveChange: setSpyCategory,
  });

  const handleCategoryChange = useCallback(
    (next: string | null) => {
      setTapGuard(next);
      setActiveCategory((prev) => {
        if (next === null && prev !== null) {
          setAllShuffleSeed(Date.now());
        }
        return next;
      });
    },
    [setTapGuard]
  );

  const navActiveCategory = activeCategory ?? spyCategory;
'@
$content = $content.Replace($oldHandler, $newHandler)
$content = $content -replace "activeCategory=\{activeCategory\}", "activeCategory={navActiveCategory}"
$content = $content -replace "\{filteredCategories\.map\(\(category\) =>", "{filteredCategories.map((category, categoryIndex) =>"
$content = $content -replace '<section\s+key=\{category\.id\}\s+className="mb-9 \[contain-intrinsic-size:auto_600px\]', '<section key={category.id} className="mb-9 last:mb-0 sm:mb-12">'
$content = $content -replace '\[content-visibility:auto\] last:mb-0 sm:mb-12"\s*>', ''
if ($content -notmatch "prioritizeImages") {
  $content = $content -replace '(?s)(\{category\.products\.length > 0 \? \(\s*)<ProductGrid', '$1<div className="[contain-intrinsic-size:auto_600px] [content-visibility:auto]">`n                    <ProductGrid'
  $content = $content -replace '(onImageClick=\{handleProductClick\}\s*/>)', 'onImageClick={handleProductClick}`n                      prioritizeImages={categoryIndex === 0}`n                    />`n                  </div>'
}
Set-Content $path -Value $content -NoNewline

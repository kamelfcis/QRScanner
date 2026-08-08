import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, 'data', 'aklet-gambary-menu.json');

const mealDescAr = 'مع الوجبات فقط — يُضاف مع كل وجبة: أرز وسلطة خضراء وطحينة وخبز. الوجبة ثمنها بالكيلو';
const mealDescEn = 'Meals only — Each meal includes rice, green salad, tahini, and bread. Price is per kilo.';

const menu = {
  categories: [
    { key: 'fish', name_ar: '\u0623\u0633\u0645\u0627\u0643', name_en: 'Fish', sort_order: 1 },
    { key: 'sea_fish', name_ar: '\u0623\u0633\u0645\u0627\u0643 \u0628\u062d\u0631\u064a\u0629', name_en: 'Sea Fish', sort_order: 2 },
    { key: 'squid', name_ar: '\u062d\u0628\u0627\u0631', name_en: 'Squid', sort_order: 3 },
    { key: 'fillet', name_ar: '\u0641\u064a\u0644\u064a\u0647 \u0648\u0623\u0633\u0645\u0627\u0643 \u0641\u0627\u062e\u0631\u0629', name_en: 'Fillet & Premium Fish', sort_order: 4 },
    { key: 'crab', name_ar: '\u0643\u0627\u0628\u0648\u0631\u064a\u0627', name_en: 'Crab', sort_order: 5 },
    { key: 'shellfish', name_ar: '\u0645\u062d\u0627\u0631', name_en: 'Shellfish', sort_order: 6 },
    { key: 'caviar', name_ar: '\u0643\u0627\u0641\u064a\u0627\u0631', name_en: 'Caviar', sort_order: 7 },
    { key: 'shrimp', name_ar: '\u062c\u0645\u0628\u0631\u064a', name_en: 'Shrimp', sort_order: 8 },
    { key: 'soups', name_ar: '\u0634\u0648\u0631\u0628\u0627\u062a', name_en: 'Soups', sort_order: 9 },
    { key: 'pasta', name_ar: '\u0645\u0643\u0631\u0648\u0646\u0629', name_en: 'Pasta', sort_order: 10 },
    { key: 'rice', name_ar: '\u0623\u0631\u0632', name_en: 'Rice', sort_order: 11 },
    { key: 'sandwiches', name_ar: '\u0633\u0646\u062f\u0648\u062a\u0634\u0627\u062a', name_en: 'Sandwiches', sort_order: 12 },
    { key: 'rice_plates', name_ar: '\u0623\u0637\u0628\u0627\u0642 \u0623\u0631\u0632', name_en: 'Rice Plates', sort_order: 13 },
    { key: 'meals', name_ar: '\u0648\u062c\u0628\u0627\u062a', name_en: 'Meals', sort_order: 14, description_ar: mealDescAr, description_en: mealDescEn },
    { key: 'salads', name_ar: '\u0633\u0644\u0637\u0627\u062a', name_en: 'Salads', sort_order: 15 },
    { key: 'cooking', name_ar: '\u062a\u0633\u0648\u064a\u0629', name_en: 'Cooking', sort_order: 16 },
  ],
  products: {
    fish: [
      { name_ar: '\u0628\u0644\u0637\u064a \u0648\u0633\u0637', name_en: 'Tilapia Medium', price: 110, sort_order: 1 },
      { name_ar: '\u0628\u0644\u0637\u064a \u0643\u0628\u064a\u0631', name_en: 'Tilapia Large', price: 120, sort_order: 2 },
      { name_ar: '\u0628\u0648\u0631\u064a \u0628\u062d\u0631\u064a \u0643\u0628\u064a\u0631', name_en: 'Large Sea Bream', price: 300, sort_order: 3 },
      { name_ar: '\u0645\u0643\u0631\u0648\u0646\u0629 \u0633\u0648\u064a\u0633\u064a', name_en: 'Swiss Macaroni Fish', price: 300, sort_order: 4 },
      { name_ar: '\u0633\u0631\u062f\u064a\u0646 \u0633\u0648\u064a\u0633\u064a', name_en: 'Swiss Sardine', price: 200, sort_order: 5 },
      { name_ar: '\u0645\u0627\u0643\u0631\u064a\u0644 \u0643\u0628\u064a\u0631', name_en: 'Large Mackerel', price: 300, sort_order: 6 },
    ],
    sea_fish: [
      { name_ar: '\u0642\u0627\u0631\u0648\u0635 \u0628\u062d\u0631\u064a', name_en: 'Sea Bass', price: 800, sort_order: 1 },
      { name_ar: '\u062f\u0646\u064a\u0633 \u0628\u062d\u0631\u064a', name_en: 'Sea Bream (Denis)', price: 800, sort_order: 2 },
      { name_ar: '\u0646\u0627\u062c\u0644 \u0628\u062d\u0631\u064a', name_en: 'Najil Sea Fish', price: 800, sort_order: 3 },
      { name_ar: '\u0648\u0642\u0627\u0631 \u0628\u062d\u0631\u064a', name_en: 'Waqar Sea Fish', price: 800, sort_order: 4 },
      { name_ar: '\u0644\u0648\u062a \u0628\u062d\u0631\u064a', name_en: 'Lout Sea Fish', price: 500, sort_order: 5 },
    ],
    squid: [{ name_ar: '\u0633\u0628\u064a\u0637 \u0628\u0644\u062f\u064a', name_en: 'Local Squid', price: 600, sort_order: 1 }],
    fillet: [
      { name_ar: '\u0641\u064a\u0644\u064a\u0647 \u0642\u0634\u0631 \u0628\u064a\u0636', name_en: 'White Fish Fillet', price: 500, sort_order: 1 },
      { name_ar: '\u0633\u0644\u0645\u0648\u0646 \u062f\u0631\u062c\u0629 \u0623\u0648\u0644\u0649', name_en: 'Premium Salmon', price: 800, sort_order: 2 },
      { name_ar: '\u0628\u0631\u0628\u0648\u0646\u064a \u0641\u0631\u0648\u0644\u0629', name_en: 'Strawberry Grouper', price: 500, sort_order: 3 },
      { name_ar: '\u062b\u0639\u0627\u0628\u064a\u0646 \u0628\u062d\u0631\u064a', name_en: 'Sea Eel', price: 700, sort_order: 4 },
    ],
    crab: [
      { name_ar: '\u0643\u0627\u0628\u0648\u0631\u064a\u0627 \u0643\u0628\u064a\u0631\u0629', name_en: 'Large Crab', price: 500, sort_order: 1 },
      { name_ar: '\u0643\u0627\u0628\u0648\u0631\u064a\u0627 \u0648\u0633\u0637', name_en: 'Medium Crab', price: 400, sort_order: 2 },
    ],
    shellfish: [
      { name_ar: '\u0628\u0644\u062d \u0628\u062d\u0631 \u0643\u0628\u064a\u0631', name_en: 'Large Sea Clams', price: 500, sort_order: 1 },
      { name_ar: '\u062c\u0646\u062f\u0641\u0644\u064a \u0643\u0628\u064a\u0631', name_en: 'Large Scallops', price: 300, sort_order: 2 },
    ],
    caviar: [
      {
        name_ar: '\u0628\u0637\u0627\u0631\u062e \u0628\u0648\u0631\u064a \u0628\u062d\u0631\u064a (\u0643\u0627\u0641\u064a\u0627\u0631)',
        name_en: 'Sea Bream Roe (Caviar)',
        price: 1200,
        sort_order: 1,
      },
    ],
    shrimp: [
      { name_ar: '\u062c\u0645\u0628\u0631\u064a \u0633\u0648\u064a\u0633\u064a \u0648\u0633\u0637', name_en: 'Swiss Shrimp Medium', price: 700, sort_order: 1 },
      { name_ar: '\u062c\u0645\u0628\u0631\u064a \u0633\u0648\u064a\u0633\u064a \u0643\u0628\u064a\u0631', name_en: 'Swiss Shrimp Large', price: 800, sort_order: 2 },
      { name_ar: '\u062c\u0645\u0628\u0631\u064a \u0633\u0648\u064a\u0633\u064a \u062c\u0627\u0645\u0628\u0648', name_en: 'Swiss Shrimp Jumbo', price: 900, sort_order: 3 },
      { name_ar: '\u062c\u0645\u0628\u0631\u064a \u0644\u062d\u0645 \u0648\u0633\u0637', name_en: 'Meaty Shrimp Medium', price: 1200, sort_order: 4 },
      { name_ar: '\u062c\u0645\u0628\u0631\u064a \u0644\u062d\u0645 \u0643\u0628\u064a\u0631', name_en: 'Meaty Shrimp Large', price: 1400, sort_order: 5 },
    ],
    soups: [
      { name_ar: '\u0634\u0648\u0631\u0628\u0629 \u0633\u064a \u0641\u0648\u062f', name_en: 'Seafood Soup', price: 190, sort_order: 1 },
      { name_ar: '\u0634\u0648\u0631\u0628\u0629 \u062c\u0645\u0628\u0631\u064a', name_en: 'Shrimp Soup', price: 150, sort_order: 2 },
    ],
    pasta: [
      { name_ar: '\u0645\u0643\u0631\u0648\u0646\u0629 \u0633\u064a \u0641\u0648\u062f', name_en: 'Seafood Pasta', price: 200, sort_order: 1 },
      { name_ar: '\u0645\u0643\u0631\u0648\u0646\u0629 \u062c\u0645\u0628\u0631\u064a', name_en: 'Shrimp Pasta', price: 200, sort_order: 2 },
    ],
    rice: [
      { name_ar: '\u0623\u0631\u0632 \u0635\u064a\u0627\u062f\u064a\u0629 \u0648\u0633\u0637', name_en: 'Sayadiah Rice Medium', price: 40, sort_order: 1 },
      { name_ar: '\u0623\u0631\u0632 \u0635\u064a\u0627\u062f\u064a\u0629 \u0643\u0628\u064a\u0631', name_en: 'Sayadiah Rice Large', price: 75, sort_order: 2 },
    ],
    sandwiches: [
      { name_ar: '\u0633\u0646\u062f\u0648\u062a\u0634 \u062c\u0645\u0628\u0631\u064a \u0648\u0633\u0637', name_en: 'Shrimp Sandwich Medium', price: 80, sort_order: 1 },
      { name_ar: '\u0633\u0646\u062f\u0648\u062a\u0634 \u062c\u0645\u0628\u0631\u064a \u0643\u0628\u064a\u0631', name_en: 'Shrimp Sandwich Large', price: 100, sort_order: 2 },
      { name_ar: '\u0633\u0646\u062f\u0648\u062a\u0634 \u0641\u064a\u0644\u064a\u0647', name_en: 'Fillet Sandwich', price: 45, sort_order: 3 },
    ],
    rice_plates: [
      { name_ar: '\u0637\u0628\u0642 \u0623\u0631\u0632 \u062c\u0645\u0628\u0631\u064a \u0648\u0633\u0637', name_en: 'Shrimp Rice Plate Medium', price: 120, sort_order: 1 },
      { name_ar: '\u0637\u0628\u0642 \u0623\u0631\u0632 \u062c\u0645\u0628\u0631\u064a \u0643\u0628\u064a\u0631', name_en: 'Shrimp Rice Plate Large', price: 150, sort_order: 2 },
      { name_ar: '\u0637\u0628\u0642 \u0623\u0631\u0632 \u0641\u064a\u0644\u064a\u0647', name_en: 'Fillet Rice Plate', price: 100, sort_order: 3 },
    ],
    meals: [
      { name_ar: '\u0648\u062c\u0628\u0629 \u062c\u0645\u0628\u0631\u064a \u0648\u0633\u0637', name_en: 'Shrimp Meal Medium', price: 170, sort_order: 1, description_ar: mealDescAr, description_en: mealDescEn },
      { name_ar: '\u0648\u062c\u0628\u0629 \u062c\u0645\u0628\u0631\u064a \u0643\u0628\u064a\u0631', name_en: 'Shrimp Meal Large', price: 200, sort_order: 2, description_ar: mealDescAr, description_en: mealDescEn },
      { name_ar: '\u0648\u062c\u0628\u0629 \u0641\u064a\u0644\u064a\u0647', name_en: 'Fillet Meal', price: 100, sort_order: 3, description_ar: mealDescAr, description_en: mealDescEn },
    ],
    salads: [
      { name_ar: '\u0633\u0644\u0637\u0629 \u062e\u0636\u0631\u0627\u0621 \u0635\u063a\u064a\u0631', name_en: 'Green Salad Small', price: 15, sort_order: 1 },
      { name_ar: '\u0633\u0644\u0637\u0629 \u062e\u0636\u0631\u0627\u0621 \u0643\u0628\u064a\u0631', name_en: 'Green Salad Large', price: 25, sort_order: 2 },
      { name_ar: '\u0633\u0644\u0637\u0629 \u0637\u062d\u064a\u0646\u0629 \u0635\u063a\u064a\u0631', name_en: 'Tahini Salad Small', price: 15, sort_order: 3 },
      { name_ar: '\u0633\u0644\u0637\u0629 \u0637\u062d\u064a\u0646\u0629 \u0643\u0628\u064a\u0631', name_en: 'Tahini Salad Large', price: 25, sort_order: 4 },
      { name_ar: '\u0633\u0644\u0637\u0629 \u0628\u0627\u0628\u0627 \u063a\u0646\u0648\u062c \u0635\u063a\u064a\u0631', name_en: 'Baba Ghanoush Salad Small', price: 15, sort_order: 5 },
      { name_ar: '\u0633\u0644\u0637\u0629 \u0628\u0627\u0628\u0627 \u063a\u0646\u0648\u062c \u0643\u0628\u064a\u0631', name_en: 'Baba Ghanoush Salad Large', price: 25, sort_order: 6 },
      { name_ar: '\u0633\u0644\u0637\u0629 \u062c\u0631\u062c\u064a\u0631', name_en: 'Arugula Salad', price: 10, sort_order: 7 },
    ],
    cooking: [
      { name_ar: '\u0645\u0634\u0648\u064a \u0631\u062f\u0629', name_en: 'Grilled (Rada Style)', price: 50, sort_order: 1 },
      { name_ar: '\u0633\u0646\u062c\u0627\u0631\u064a \u0639\u0644\u0649 \u0627\u0644\u0641\u062d\u0645', name_en: 'Sinagari Charcoal', price: 60, sort_order: 2 },
      { name_ar: '\u0632\u064a\u062a \u0648\u0644\u064a\u0645\u0648\u0646 \u0641\u062d\u0645', name_en: 'Charcoal Oil & Lemon', price: 60, sort_order: 3 },
      { name_ar: '\u0645\u0642\u0644\u064a', name_en: 'Fried', price: 70, sort_order: 4 },
      {
        name_ar: '\u062a\u0633\u0648\u064a\u0629 \u062c\u0645\u0628\u0631\u064a/\u0643\u0627\u0628\u0648\u0631\u064a\u0627/\u0633\u0628\u064a\u0637/\u0641\u064a\u0644\u064a\u0647',
        name_en: 'Shrimp/Crab/Squid/Fillet Cooking',
        price: 80,
        sort_order: 5,
        description_ar: '\u0645\u0642\u0644\u064a / \u0645\u0634\u0648\u064a / \u062e\u0644\u0637\u0629 / \u0635\u064a\u0646\u064a\u0629 \u0635\u0648\u0635',
        description_en: 'Fried / grilled / mixed / sauce tray',
      },
    ],
  },
};

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(menu, null, 2) + '\n', 'utf8');
console.log('Wrote', outPath);

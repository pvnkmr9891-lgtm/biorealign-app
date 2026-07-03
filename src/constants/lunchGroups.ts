// Grouped lunch items for the 5-section lunch picker.
// Decomposed from the existing LUNCH_ITEMS combos into individual components
// so users can mix-and-match freely. Macros are per-component expert estimates
// — editable before adding. Covers mainstream South and North Indian patterns.

export interface LunchItem {
  id: string;
  name: string;
  defaultQuantity: string;
  defaultCalories: number;
  defaultProteinG: number;
  defaultCarbsG: number;
  defaultFatG: number;
  qtyUnit: string;
  qtyBase: number;
}

export interface LunchGroup {
  key: string;
  label: string;
  icon: string;
  color: string;
  items: LunchItem[];
}

// ── Group 1: Carb Base ────────────────────────────────────────────────────────
// The starchy foundation — rice OR roti/flatbread. Pick one.
// Cup-based items: normalize to per 1 cup. Roti items: normalize to per 1 roti.
const CARB_BASE: LunchItem[] = [
  { id: 'rice_1c',          name: 'Steamed Rice (1 cup)',              defaultQuantity: '1 cup (cooked)',    defaultCalories: 200, defaultProteinG: 4,  defaultCarbsG: 43, defaultFatG: 1,  qtyUnit: 'cup',     qtyBase: 1 },
  // 1.5 cups → per 1 cup: divide by 1.5
  { id: 'rice_1_5c',        name: 'Steamed Rice (1.5 cups)',           defaultQuantity: '1.5 cups (cooked)', defaultCalories: 200, defaultProteinG: 4,  defaultCarbsG: 43, defaultFatG: 1,  qtyUnit: 'cup',     qtyBase: 1 },
  // 2 cups → per 1 cup: divide by 2
  { id: 'rice_2c',          name: 'Steamed Rice (2 cups)',             defaultQuantity: '2 cups (cooked)',   defaultCalories: 200, defaultProteinG: 4,  defaultCarbsG: 43, defaultFatG: 1,  qtyUnit: 'cup',     qtyBase: 1 },
  { id: 'jeera_rice',       name: 'Jeera Rice',                        defaultQuantity: '1 cup',             defaultCalories: 230, defaultProteinG: 4,  defaultCarbsG: 45, defaultFatG: 4,  qtyUnit: 'cup',     qtyBase: 1 },
  { id: 'brown_rice_1c',    name: 'Brown Rice (1 cup)',                defaultQuantity: '1 cup (cooked)',    defaultCalories: 215, defaultProteinG: 5,  defaultCarbsG: 44, defaultFatG: 2,  qtyUnit: 'cup',     qtyBase: 1 },
  // 2 rotis → per 1 roti: divide by 2
  { id: 'roti_2',           name: 'Wheat Roti (2)',                    defaultQuantity: '2 rotis',           defaultCalories: 100, defaultProteinG: 3,  defaultCarbsG: 17, defaultFatG: 3,  qtyUnit: 'roti',    qtyBase: 1 },
  // 3 rotis → per 1 roti: divide by 3
  { id: 'roti_3',           name: 'Wheat Roti (3)',                    defaultQuantity: '3 rotis',           defaultCalories: 100, defaultProteinG: 3,  defaultCarbsG: 17, defaultFatG: 2,  qtyUnit: 'roti',    qtyBase: 1 },
  // 2 rotis → per 1 roti: divide by 2
  { id: 'millet_roti_2',    name: 'Millet / Bajra Roti (2)',           defaultQuantity: '2 rotis',           defaultCalories: 110, defaultProteinG: 3,  defaultCarbsG: 19, defaultFatG: 3,  qtyUnit: 'roti',    qtyBase: 1 },
  // 2 rotis → per 1 roti: divide by 2
  { id: 'chapati_phulka_2', name: 'Phulka / Chapati (2)',              defaultQuantity: '2 rotis',           defaultCalories: 80,  defaultProteinG: 3,  defaultCarbsG: 14, defaultFatG: 2,  qtyUnit: 'roti',    qtyBase: 1 },
  { id: 'rice_roti_combo',  name: 'Rice (1/2 cup) + Roti (1)',         defaultQuantity: '1 serving',         defaultCalories: 200, defaultProteinG: 5,  defaultCarbsG: 38, defaultFatG: 3,  qtyUnit: 'serving', qtyBase: 1 },
];

// ── Group 2: Protein / Dal ────────────────────────────────────────────────────
// The protein anchor — veg lentils/legumes or non-veg curry. Pick one.
const PROTEIN_DAL: LunchItem[] = [
  // Veg / Dal
  { id: 'toor_dal',         name: 'Toor Dal (Arhar / Yellow Lentil)', defaultQuantity: '1 cup',             defaultCalories: 180, defaultProteinG: 10, defaultCarbsG: 28, defaultFatG: 3,  qtyUnit: 'cup',  qtyBase: 1 },
  { id: 'moong_dal',        name: 'Moong Dal',                        defaultQuantity: '1 cup',             defaultCalories: 150, defaultProteinG: 10, defaultCarbsG: 24, defaultFatG: 1,  qtyUnit: 'cup',  qtyBase: 1 },
  { id: 'dal_tadka',        name: 'Dal Tadka',                        defaultQuantity: '1 cup',             defaultCalories: 190, defaultProteinG: 10, defaultCarbsG: 28, defaultFatG: 5,  qtyUnit: 'cup',  qtyBase: 1 },
  { id: 'dal_makhani',      name: 'Dal Makhani',                      defaultQuantity: '1 cup',             defaultCalories: 240, defaultProteinG: 10, defaultCarbsG: 30, defaultFatG: 9,  qtyUnit: 'cup',  qtyBase: 1 },
  { id: 'sambar',           name: 'Sambar',                           defaultQuantity: '1 cup',             defaultCalories: 75,  defaultProteinG: 4,  defaultCarbsG: 12, defaultFatG: 2,  qtyUnit: 'cup',  qtyBase: 1 },
  { id: 'rajma',            name: 'Rajma Curry (Kidney Beans)',        defaultQuantity: '1 cup',             defaultCalories: 220, defaultProteinG: 12, defaultCarbsG: 35, defaultFatG: 4,  qtyUnit: 'cup',  qtyBase: 1 },
  { id: 'chole',            name: 'Chole (Chickpea Curry)',            defaultQuantity: '1 cup',             defaultCalories: 270, defaultProteinG: 14, defaultCarbsG: 42, defaultFatG: 7,  qtyUnit: 'cup',  qtyBase: 1 },
  { id: 'lobia',            name: 'Lobia Curry (Black-Eyed Peas)',     defaultQuantity: '1 cup',             defaultCalories: 200, defaultProteinG: 12, defaultCarbsG: 32, defaultFatG: 4,  qtyUnit: 'cup',  qtyBase: 1 },
  { id: 'matar_paneer',     name: 'Matar Paneer',                     defaultQuantity: '1 cup',             defaultCalories: 250, defaultProteinG: 12, defaultCarbsG: 20, defaultFatG: 14, qtyUnit: 'cup',  qtyBase: 1 },
  { id: 'paneer_curry',     name: 'Paneer Curry',                     defaultQuantity: '1 cup',             defaultCalories: 270, defaultProteinG: 14, defaultCarbsG: 14, defaultFatG: 18, qtyUnit: 'cup',  qtyBase: 1 },
  // Non-veg — 100g items: normalize to per 25g (divide by 4)
  { id: 'chicken_curry',    name: 'Chicken Curry',                    defaultQuantity: '100g',              defaultCalories: 50,  defaultProteinG: 5,  defaultCarbsG: 2,  defaultFatG: 3,  qtyUnit: 'g',    qtyBase: 1 },
  { id: 'fish_curry',       name: 'Fish Curry',                       defaultQuantity: '100g',              defaultCalories: 40,  defaultProteinG: 5,  defaultCarbsG: 2,  defaultFatG: 2,  qtyUnit: 'g',    qtyBase: 1 },
  // 2 eggs → per 1 egg: divide by 2
  { id: 'egg_curry',        name: 'Egg Curry (2 eggs)',                defaultQuantity: '2 eggs',            defaultCalories: 110, defaultProteinG: 7,  defaultCarbsG: 4,  defaultFatG: 7,  qtyUnit: 'egg',  qtyBase: 1 },
  { id: 'egg_bhurji',       name: 'Egg Bhurji (2 eggs)',              defaultQuantity: '2 eggs',            defaultCalories: 100, defaultProteinG: 7,  defaultCarbsG: 3,  defaultFatG: 7,  qtyUnit: 'egg',  qtyBase: 1 },
];

// ── Group 3: Vegetable Side ───────────────────────────────────────────────────
// Cooked vegetable dish — sabzi, poriyal, or curry-based side. Pick one.
// All are "1 serving" already → qtyUnit: 'serving', qtyBase: 1, no macro change.
const VEGETABLE_SIDE: LunchItem[] = [
  { id: 'bhindi_sabzi',     name: 'Bhindi (Okra) Sabzi',              defaultQuantity: '1 serving (80g)',   defaultCalories: 80,  defaultProteinG: 2,  defaultCarbsG: 10, defaultFatG: 4,  qtyUnit: 'serving', qtyBase: 1 },
  { id: 'cabbage_poriyal',  name: 'Cabbage Poriyal',                  defaultQuantity: '1 serving (80g)',   defaultCalories: 70,  defaultProteinG: 2,  defaultCarbsG: 8,  defaultFatG: 3,  qtyUnit: 'serving', qtyBase: 1 },
  { id: 'palak_sabzi',      name: 'Palak (Spinach) Sabzi',            defaultQuantity: '1 serving (80g)',   defaultCalories: 90,  defaultProteinG: 4,  defaultCarbsG: 8,  defaultFatG: 4,  qtyUnit: 'serving', qtyBase: 1 },
  { id: 'beans_poriyal',    name: 'Beans Poriyal',                    defaultQuantity: '1 serving (80g)',   defaultCalories: 80,  defaultProteinG: 3,  defaultCarbsG: 10, defaultFatG: 3,  qtyUnit: 'serving', qtyBase: 1 },
  { id: 'capsicum_sabzi',   name: 'Capsicum Sabzi',                   defaultQuantity: '1 serving (80g)',   defaultCalories: 70,  defaultProteinG: 2,  defaultCarbsG: 9,  defaultFatG: 3,  qtyUnit: 'serving', qtyBase: 1 },
  { id: 'lauki_curry',      name: 'Bottle Gourd / Lauki Curry',        defaultQuantity: '1 serving (100g)', defaultCalories: 60,  defaultProteinG: 1,  defaultCarbsG: 10, defaultFatG: 2,  qtyUnit: 'serving', qtyBase: 1 },
  { id: 'ridge_gourd',      name: 'Ridge Gourd / Turai Curry',         defaultQuantity: '1 serving (100g)', defaultCalories: 65,  defaultProteinG: 1,  defaultCarbsG: 10, defaultFatG: 2,  qtyUnit: 'serving', qtyBase: 1 },
  { id: 'mixed_veg',        name: 'Mixed Vegetable Curry',             defaultQuantity: '1 serving (100g)', defaultCalories: 80,  defaultProteinG: 2,  defaultCarbsG: 10, defaultFatG: 3,  qtyUnit: 'serving', qtyBase: 1 },
  { id: 'beetroot_poriyal', name: 'Beetroot Poriyal',                 defaultQuantity: '1 serving (80g)',   defaultCalories: 75,  defaultProteinG: 2,  defaultCarbsG: 14, defaultFatG: 2,  qtyUnit: 'serving', qtyBase: 1 },
  { id: 'cauliflower_sabzi',name: 'Cauliflower / Gobi Sabzi',         defaultQuantity: '1 serving (80g)',   defaultCalories: 75,  defaultProteinG: 2,  defaultCarbsG: 9,  defaultFatG: 3,  qtyUnit: 'serving', qtyBase: 1 },
  { id: 'carrot_beans',     name: 'Carrot-Beans Sabzi',               defaultQuantity: '1 serving (80g)',   defaultCalories: 85,  defaultProteinG: 3,  defaultCarbsG: 12, defaultFatG: 3,  qtyUnit: 'serving', qtyBase: 1 },
  { id: 'drumstick_curry',  name: 'Drumstick (Moringa) Curry',         defaultQuantity: '1 serving (100g)', defaultCalories: 70,  defaultProteinG: 3,  defaultCarbsG: 10, defaultFatG: 2,  qtyUnit: 'serving', qtyBase: 1 },
  { id: 'aloo_sabzi',       name: 'Aloo Sabzi (Potato)',              defaultQuantity: '1 serving (80g)',   defaultCalories: 110, defaultProteinG: 2,  defaultCarbsG: 20, defaultFatG: 4,  qtyUnit: 'serving', qtyBase: 1 },
  { id: 'brinjal_curry',    name: 'Brinjal / Baingan Curry',           defaultQuantity: '1 serving (80g)',   defaultCalories: 80,  defaultProteinG: 2,  defaultCarbsG: 10, defaultFatG: 4,  qtyUnit: 'serving', qtyBase: 1 },
];

// ── Group 4: Salad ────────────────────────────────────────────────────────────
// Fresh, raw-vegetable sides that add fibre and micronutrients.
const SALAD: LunchItem[] = [
  { id: 'cucumber_tomato',  name: 'Cucumber-Tomato Salad',            defaultQuantity: '1 small bowl',      defaultCalories: 30,  defaultProteinG: 1,  defaultCarbsG: 6,  defaultFatG: 0,  qtyUnit: 'bowl', qtyBase: 1 },
  { id: 'onion_tomato',     name: 'Onion-Tomato Salad',               defaultQuantity: '1 small bowl',      defaultCalories: 35,  defaultProteinG: 1,  defaultCarbsG: 8,  defaultFatG: 0,  qtyUnit: 'bowl', qtyBase: 1 },
  { id: 'kachumber',        name: 'Kachumber Salad',                  defaultQuantity: '1 small bowl',      defaultCalories: 40,  defaultProteinG: 1,  defaultCarbsG: 8,  defaultFatG: 0,  qtyUnit: 'bowl', qtyBase: 1 },
  { id: 'carrot_salad',     name: 'Grated Carrot Salad',              defaultQuantity: '1 small bowl',      defaultCalories: 30,  defaultProteinG: 1,  defaultCarbsG: 7,  defaultFatG: 0,  qtyUnit: 'bowl', qtyBase: 1 },
  { id: 'green_salad',      name: 'Green Salad (Lettuce / Sprouts)',   defaultQuantity: '1 bowl',            defaultCalories: 25,  defaultProteinG: 2,  defaultCarbsG: 5,  defaultFatG: 0,  qtyUnit: 'bowl', qtyBase: 1 },
  { id: 'sprouts_salad',    name: 'Moong Sprouts Salad',              defaultQuantity: '1 small bowl',      defaultCalories: 55,  defaultProteinG: 4,  defaultCarbsG: 8,  defaultFatG: 0,  qtyUnit: 'bowl', qtyBase: 1 },
  { id: 'beet_carrot_salad',name: 'Beetroot & Carrot Salad',          defaultQuantity: '1 small bowl',      defaultCalories: 45,  defaultProteinG: 1,  defaultCarbsG: 10, defaultFatG: 0,  qtyUnit: 'bowl', qtyBase: 1 },
];

// ── Group 5: Accompaniments ───────────────────────────────────────────────────
// Finishing touches — dairy, condiments, extras.
const ACCOMPANIMENTS: LunchItem[] = [
  // 1/2 cup → qtyUnit: 'cup', macros stay as-is (already per 1/2 cup = treat as 1 unit of "cup" but the label is 1/2 cup serving — use 'serving' to avoid confusion)
  { id: 'curd_half',        name: 'Curd / Dahi (1/2 cup)',            defaultQuantity: '1/2 cup',           defaultCalories: 60,  defaultProteinG: 3,  defaultCarbsG: 5,  defaultFatG: 3,  qtyUnit: 'serving', qtyBase: 1 },
  { id: 'curd_full',        name: 'Curd / Dahi (1 cup)',              defaultQuantity: '1 cup',             defaultCalories: 120, defaultProteinG: 6,  defaultCarbsG: 10, defaultFatG: 6,  qtyUnit: 'cup',     qtyBase: 1 },
  { id: 'raita',            name: 'Cucumber Raita',                   defaultQuantity: '1/2 cup',           defaultCalories: 55,  defaultProteinG: 3,  defaultCarbsG: 6,  defaultFatG: 2,  qtyUnit: 'serving', qtyBase: 1 },
  { id: 'boondi_raita',     name: 'Boondi Raita',                     defaultQuantity: '1/2 cup',           defaultCalories: 80,  defaultProteinG: 3,  defaultCarbsG: 10, defaultFatG: 3,  qtyUnit: 'serving', qtyBase: 1 },
  { id: 'pickle',           name: 'Pickle / Achar',                   defaultQuantity: '1 tsp',             defaultCalories: 10,  defaultProteinG: 0,  defaultCarbsG: 2,  defaultFatG: 0,  qtyUnit: 'tsp',     qtyBase: 1 },
  { id: 'papad_roasted',    name: 'Roasted Papad (1)',                 defaultQuantity: '1 piece',           defaultCalories: 30,  defaultProteinG: 2,  defaultCarbsG: 5,  defaultFatG: 0,  qtyUnit: 'piece',   qtyBase: 1 },
  { id: 'ghee_roti',        name: 'Ghee (on roti/rice)',              defaultQuantity: '1 tsp',             defaultCalories: 45,  defaultProteinG: 0,  defaultCarbsG: 0,  defaultFatG: 5,  qtyUnit: 'tsp',     qtyBase: 1 },
  // 200ml → per 50ml: divide by 4
  { id: 'buttermilk_lunch', name: 'Buttermilk / Chaas',               defaultQuantity: '1 glass (200ml)',   defaultCalories: 10,  defaultProteinG: 1,  defaultCarbsG: 1,  defaultFatG: 0,  qtyUnit: 'ml',      qtyBase: 1 },
  // 2 tbsp → per 1 tbsp: divide by 2
  { id: 'coconut_chutney_l',name: 'Coconut Chutney (with South Indian rice)', defaultQuantity: '2 tbsp', defaultCalories: 30, defaultProteinG: 1,  defaultCarbsG: 2,  defaultFatG: 3,  qtyUnit: 'tbsp',    qtyBase: 1 },
  { id: 'lemon_wedge',      name: 'Lemon / Lime Squeeze',             defaultQuantity: '1 wedge',           defaultCalories: 4,   defaultProteinG: 0,  defaultCarbsG: 1,  defaultFatG: 0,  qtyUnit: 'serving', qtyBase: 1 },
];

export const LUNCH_GROUPS: LunchGroup[] = [
  { key: 'carb',    label: 'Carb Base',           icon: '🍚', color: '#F59E0B', items: CARB_BASE        },
  { key: 'protein', label: 'Protein / Dal',        icon: '🍛', color: '#F87171', items: PROTEIN_DAL     },
  { key: 'veg',     label: 'Vegetable Side',        icon: '🥦', color: '#4ADE80', items: VEGETABLE_SIDE  },
  { key: 'salad',   label: 'Salad',                icon: '🥗', color: '#34D399', items: SALAD           },
  { key: 'extras',  label: 'Accompaniments',        icon: '🥛', color: '#C084FC', items: ACCOMPANIMENTS  },
];

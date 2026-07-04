// Grouped dinner items for the 5-section dinner picker.
// Decomposed from the existing DINNER_ITEMS combos into individual components.
// Dinner skews lighter than lunch — smaller carb portions, emphasis on protein
// and vegetables, lighter accompaniments (no curd bowl by default).
// Macros are per-component expert estimates — editable before adding.

export interface DinnerItem {
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

export interface DinnerGroup {
  key: string;
  label: string;
  icon: string;
  color: string;
  items: DinnerItem[];
}

// ── Group 1: Carb Base ────────────────────────────────────────────────────────
// Dinner carbs are typically smaller than lunch — lighter options included.
const CARB_BASE: DinnerItem[] = [
  { id: 'dn_rice_1c',          name: 'Steamed Rice (1 cup)',          defaultQuantity: '1 cup (cooked)',    defaultCalories: 200, defaultProteinG: 4,  defaultCarbsG: 43, defaultFatG: 1,  qtyUnit: 'cup',     qtyBase: 1 },
  // 1.5 cups → per 1 cup: divide by 1.5
  { id: 'dn_rice_1_5c',        name: 'Steamed Rice (1.5 cups)',       defaultQuantity: '1.5 cups (cooked)', defaultCalories: 200, defaultProteinG: 4,  defaultCarbsG: 43, defaultFatG: 1,  qtyUnit: 'cup',     qtyBase: 1 },
  // 2 cups → per 1 cup: divide by 2
  { id: 'dn_rice_2c',          name: 'Steamed Rice (2 cups)',         defaultQuantity: '2 cups (cooked)',   defaultCalories: 200, defaultProteinG: 4,  defaultCarbsG: 43, defaultFatG: 1,  qtyUnit: 'cup',     qtyBase: 1 },
  { id: 'dn_brown_rice',       name: 'Brown Rice (1 cup)',            defaultQuantity: '1 cup (cooked)',    defaultCalories: 215, defaultProteinG: 5,  defaultCarbsG: 44, defaultFatG: 2,  qtyUnit: 'cup',     qtyBase: 1 },
  // 2 rotis → per 1 roti: divide by 2
  { id: 'dn_roti_2',           name: 'Wheat Roti (2)',                defaultQuantity: '2 rotis',           defaultCalories: 100, defaultProteinG: 3,  defaultCarbsG: 17, defaultFatG: 3,  qtyUnit: 'roti',    qtyBase: 1 },
  // 3 rotis → per 1 roti: divide by 3
  { id: 'dn_roti_3',           name: 'Wheat Roti (3)',                defaultQuantity: '3 rotis',           defaultCalories: 100, defaultProteinG: 3,  defaultCarbsG: 17, defaultFatG: 2,  qtyUnit: 'roti',    qtyBase: 1 },
  // 2 rotis → per 1 roti: divide by 2
  { id: 'dn_chapati_2',        name: 'Phulka / Chapati (2)',          defaultQuantity: '2 rotis',           defaultCalories: 80,  defaultProteinG: 3,  defaultCarbsG: 14, defaultFatG: 2,  qtyUnit: 'roti',    qtyBase: 1 },
  // 2 rotis → per 1 roti: divide by 2
  { id: 'dn_millet_roti',      name: 'Millet / Bajra Roti (2)',       defaultQuantity: '2 rotis',           defaultCalories: 110, defaultProteinG: 3,  defaultCarbsG: 19, defaultFatG: 3,  qtyUnit: 'roti',    qtyBase: 1 },
  { id: 'dn_rice_roti',        name: 'Rice (1/2 cup) + Roti (1)',     defaultQuantity: '1 serving',         defaultCalories: 200, defaultProteinG: 5,  defaultCarbsG: 38, defaultFatG: 3,  qtyUnit: 'serving', qtyBase: 1 },
  { id: 'dn_no_carb',          name: 'No Carb (protein + veg only)',  defaultQuantity: 'skip',              defaultCalories: 0,   defaultProteinG: 0,  defaultCarbsG: 0,  defaultFatG: 0,  qtyUnit: 'serving', qtyBase: 1 },
];

// ── Group 2: Protein / Curry ──────────────────────────────────────────────────
// The main protein anchor — covers non-veg, egg, paneer, and dal options.
const PROTEIN_CURRY: DinnerItem[] = [
  // Non-veg — 100g items: normalize to per 25g (divide by 4)
  { id: 'dn_chicken_curry',    name: 'Chicken Curry',                 defaultQuantity: '100g',              defaultCalories: 50,  defaultProteinG: 5,  defaultCarbsG: 2,  defaultFatG: 3,  qtyUnit: 'g',    qtyBase: 1 },
  { id: 'dn_fish_curry',       name: 'Fish Curry',                    defaultQuantity: '100g',              defaultCalories: 40,  defaultProteinG: 5,  defaultCarbsG: 2,  defaultFatG: 2,  qtyUnit: 'g',    qtyBase: 1 },
  // 2 eggs → per 1 egg: divide by 2
  { id: 'dn_egg_curry',        name: 'Egg Curry (2 eggs)',            defaultQuantity: '2 eggs',            defaultCalories: 110, defaultProteinG: 7,  defaultCarbsG: 4,  defaultFatG: 7,  qtyUnit: 'egg',  qtyBase: 1 },
  { id: 'dn_egg_bhurji',       name: 'Egg Bhurji (2 eggs)',           defaultQuantity: '2 eggs',            defaultCalories: 100, defaultProteinG: 7,  defaultCarbsG: 3,  defaultFatG: 7,  qtyUnit: 'egg',  qtyBase: 1 },
  // Paneer
  { id: 'dn_paneer_curry',     name: 'Paneer Curry',                  defaultQuantity: '1 cup',             defaultCalories: 270, defaultProteinG: 14, defaultCarbsG: 14, defaultFatG: 18, qtyUnit: 'cup',  qtyBase: 1 },
  // 100g → per 25g: divide by 4
  { id: 'dn_paneer_tikka',     name: 'Paneer Tikka (pan-style)',      defaultQuantity: '100g',              defaultCalories: 55,  defaultProteinG: 4,  defaultCarbsG: 2,  defaultFatG: 4,  qtyUnit: 'g',    qtyBase: 1 },
  { id: 'dn_paneer_bhurji',    name: 'Paneer Bhurji',                 defaultQuantity: '1 cup',             defaultCalories: 240, defaultProteinG: 14, defaultCarbsG: 8,  defaultFatG: 16, qtyUnit: 'cup',  qtyBase: 1 },
  { id: 'dn_matar_paneer',     name: 'Matar Paneer',                  defaultQuantity: '1 cup',             defaultCalories: 250, defaultProteinG: 12, defaultCarbsG: 20, defaultFatG: 14, qtyUnit: 'cup',  qtyBase: 1 },
  // Dal / Legumes
  { id: 'dn_dal_tadka',        name: 'Dal Tadka',                     defaultQuantity: '1 cup',             defaultCalories: 190, defaultProteinG: 10, defaultCarbsG: 28, defaultFatG: 5,  qtyUnit: 'cup',  qtyBase: 1 },
  { id: 'dn_dal_makhani',      name: 'Dal Makhani (light)',           defaultQuantity: '1 cup',             defaultCalories: 240, defaultProteinG: 10, defaultCarbsG: 30, defaultFatG: 9,  qtyUnit: 'cup',  qtyBase: 1 },
  { id: 'dn_moong_dal',        name: 'Moong Dal',                     defaultQuantity: '1 cup',             defaultCalories: 150, defaultProteinG: 10, defaultCarbsG: 24, defaultFatG: 1,  qtyUnit: 'cup',  qtyBase: 1 },
  { id: 'dn_sambar',           name: 'Sambar',                        defaultQuantity: '1 cup',             defaultCalories: 75,  defaultProteinG: 4,  defaultCarbsG: 12, defaultFatG: 2,  qtyUnit: 'cup',  qtyBase: 1 },
  { id: 'dn_rajma',            name: 'Rajma Curry',                   defaultQuantity: '1 cup',             defaultCalories: 220, defaultProteinG: 12, defaultCarbsG: 35, defaultFatG: 4,  qtyUnit: 'cup',  qtyBase: 1 },
  { id: 'dn_mixed_veg_curry',  name: 'Mixed Vegetable Curry',         defaultQuantity: '1 cup',             defaultCalories: 120, defaultProteinG: 4,  defaultCarbsG: 18, defaultFatG: 4,  qtyUnit: 'cup',  qtyBase: 1 },
];

// ── Group 3: Vegetable Side ───────────────────────────────────────────────────
// Cooked vegetable dish — sabzi or poriyal-style. Pick one.
const VEGETABLE_SIDE: DinnerItem[] = [
  { id: 'dn_bhindi',           name: 'Bhindi (Okra) Sabzi',           defaultQuantity: '1 serving (80g)',   defaultCalories: 80,  defaultProteinG: 2,  defaultCarbsG: 10, defaultFatG: 4,  qtyUnit: 'serving', qtyBase: 1 },
  { id: 'dn_lauki',            name: 'Bottle Gourd / Lauki Sabzi',    defaultQuantity: '1 serving (100g)', defaultCalories: 60,  defaultProteinG: 1,  defaultCarbsG: 10, defaultFatG: 2,  qtyUnit: 'serving', qtyBase: 1 },
  { id: 'dn_cabbage',          name: 'Cabbage Sabzi',                 defaultQuantity: '1 serving (80g)',   defaultCalories: 70,  defaultProteinG: 2,  defaultCarbsG: 8,  defaultFatG: 3,  qtyUnit: 'serving', qtyBase: 1 },
  { id: 'dn_palak',            name: 'Palak (Spinach) Sabzi',         defaultQuantity: '1 serving (80g)',   defaultCalories: 90,  defaultProteinG: 4,  defaultCarbsG: 8,  defaultFatG: 4,  qtyUnit: 'serving', qtyBase: 1 },
  { id: 'dn_cauliflower',      name: 'Cauliflower / Gobi Sabzi',      defaultQuantity: '1 serving (80g)',   defaultCalories: 75,  defaultProteinG: 2,  defaultCarbsG: 9,  defaultFatG: 3,  qtyUnit: 'serving', qtyBase: 1 },
  { id: 'dn_carrot_beans',     name: 'Carrot-Beans Sabzi',            defaultQuantity: '1 serving (80g)',   defaultCalories: 85,  defaultProteinG: 3,  defaultCarbsG: 12, defaultFatG: 3,  qtyUnit: 'serving', qtyBase: 1 },
  { id: 'dn_drumstick',        name: 'Drumstick (Moringa) Curry',     defaultQuantity: '1 serving (100g)', defaultCalories: 70,  defaultProteinG: 3,  defaultCarbsG: 10, defaultFatG: 2,  qtyUnit: 'serving', qtyBase: 1 },
  { id: 'dn_capsicum',         name: 'Capsicum Sabzi',                defaultQuantity: '1 serving (80g)',   defaultCalories: 70,  defaultProteinG: 2,  defaultCarbsG: 9,  defaultFatG: 3,  qtyUnit: 'serving', qtyBase: 1 },
  { id: 'dn_beans',            name: 'Beans Poriyal',                 defaultQuantity: '1 serving (80g)',   defaultCalories: 80,  defaultProteinG: 3,  defaultCarbsG: 10, defaultFatG: 3,  qtyUnit: 'serving', qtyBase: 1 },
  { id: 'dn_beetroot',         name: 'Beetroot Poriyal',              defaultQuantity: '1 serving (80g)',   defaultCalories: 75,  defaultProteinG: 2,  defaultCarbsG: 14, defaultFatG: 2,  qtyUnit: 'serving', qtyBase: 1 },
  { id: 'dn_brinjal',          name: 'Brinjal / Baingan Curry',       defaultQuantity: '1 serving (80g)',   defaultCalories: 80,  defaultProteinG: 2,  defaultCarbsG: 10, defaultFatG: 4,  qtyUnit: 'serving', qtyBase: 1 },
  { id: 'dn_ridge_gourd',      name: 'Ridge Gourd / Turai Sabzi',     defaultQuantity: '1 serving (100g)', defaultCalories: 65,  defaultProteinG: 1,  defaultCarbsG: 10, defaultFatG: 2,  qtyUnit: 'serving', qtyBase: 1 },
];

// ── Group 4: Salad / Fresh Side ───────────────────────────────────────────────
// Raw salads — important at dinner for fibre and satiety without extra carbs.
const SALAD: DinnerItem[] = [
  { id: 'dn_cucumber_sal',     name: 'Cucumber Salad',                defaultQuantity: '1 small bowl',      defaultCalories: 20,  defaultProteinG: 1,  defaultCarbsG: 4,  defaultFatG: 0,  qtyUnit: 'bowl', qtyBase: 1 },
  { id: 'dn_cucumber_tom',     name: 'Cucumber-Tomato Salad',         defaultQuantity: '1 small bowl',      defaultCalories: 30,  defaultProteinG: 1,  defaultCarbsG: 6,  defaultFatG: 0,  qtyUnit: 'bowl', qtyBase: 1 },
  { id: 'dn_onion_tomato',     name: 'Onion-Tomato Salad',            defaultQuantity: '1 small bowl',      defaultCalories: 35,  defaultProteinG: 1,  defaultCarbsG: 8,  defaultFatG: 0,  qtyUnit: 'bowl', qtyBase: 1 },
  { id: 'dn_onion_sal',        name: 'Sliced Onion with Lemon',       defaultQuantity: '1 small bowl',      defaultCalories: 20,  defaultProteinG: 0,  defaultCarbsG: 5,  defaultFatG: 0,  qtyUnit: 'bowl', qtyBase: 1 },
  { id: 'dn_carrot_sal',       name: 'Grated Carrot Salad',           defaultQuantity: '1 small bowl',      defaultCalories: 30,  defaultProteinG: 1,  defaultCarbsG: 7,  defaultFatG: 0,  qtyUnit: 'bowl', qtyBase: 1 },
  { id: 'dn_kachumber',        name: 'Kachumber Salad',               defaultQuantity: '1 small bowl',      defaultCalories: 40,  defaultProteinG: 1,  defaultCarbsG: 8,  defaultFatG: 0,  qtyUnit: 'bowl', qtyBase: 1 },
  { id: 'dn_green_sal',        name: 'Green Salad (Lettuce / Sprouts)', defaultQuantity: '1 bowl',          defaultCalories: 25,  defaultProteinG: 2,  defaultCarbsG: 5,  defaultFatG: 0,  qtyUnit: 'bowl', qtyBase: 1 },
  { id: 'dn_sprouts',          name: 'Moong Sprouts Salad',           defaultQuantity: '1 small bowl',      defaultCalories: 55,  defaultProteinG: 4,  defaultCarbsG: 8,  defaultFatG: 0,  qtyUnit: 'bowl', qtyBase: 1 },
];

// ── Group 5: Light Accompaniments ─────────────────────────────────────────────
// Finishing touches at dinner — kept lighter than lunch accompaniments.
const ACCOMPANIMENTS: DinnerItem[] = [
  { id: 'dn_curd_half',        name: 'Curd / Dahi (1/2 cup)',         defaultQuantity: '1/2 cup',           defaultCalories: 60,  defaultProteinG: 3,  defaultCarbsG: 5,  defaultFatG: 3,  qtyUnit: 'serving', qtyBase: 1 },
  { id: 'dn_raita',            name: 'Cucumber Raita',                defaultQuantity: '1/2 cup',           defaultCalories: 55,  defaultProteinG: 3,  defaultCarbsG: 6,  defaultFatG: 2,  qtyUnit: 'serving', qtyBase: 1 },
  { id: 'dn_pickle',           name: 'Pickle / Achar',                defaultQuantity: '1 tsp',             defaultCalories: 10,  defaultProteinG: 0,  defaultCarbsG: 2,  defaultFatG: 0,  qtyUnit: 'tsp',     qtyBase: 1 },
  { id: 'dn_papad',            name: 'Roasted Papad (1)',             defaultQuantity: '1 piece',           defaultCalories: 30,  defaultProteinG: 2,  defaultCarbsG: 5,  defaultFatG: 0,  qtyUnit: 'piece',   qtyBase: 1 },
  { id: 'dn_ghee',             name: 'Ghee (on roti/rice)',           defaultQuantity: '1 tsp',             defaultCalories: 45,  defaultProteinG: 0,  defaultCarbsG: 0,  defaultFatG: 5,  qtyUnit: 'tsp',     qtyBase: 1 },
  // 200ml → per 50ml: divide by 4
  { id: 'dn_buttermilk',       name: 'Buttermilk / Chaas',            defaultQuantity: '1 glass (200ml)',   defaultCalories: 10,  defaultProteinG: 1,  defaultCarbsG: 1,  defaultFatG: 0,  qtyUnit: 'ml',      qtyBase: 1 },
  { id: 'dn_lemon',            name: 'Lemon / Lime Squeeze',          defaultQuantity: '1 wedge',           defaultCalories: 4,   defaultProteinG: 0,  defaultCarbsG: 1,  defaultFatG: 0,  qtyUnit: 'serving', qtyBase: 1 },
  // 2 tbsp → per 1 tbsp: divide by 2
  { id: 'dn_coconut_chutney',  name: 'Coconut Chutney',               defaultQuantity: '2 tbsp',            defaultCalories: 30,  defaultProteinG: 1,  defaultCarbsG: 2,  defaultFatG: 3,  qtyUnit: 'tbsp',    qtyBase: 1 },
];

export const DINNER_GROUPS: DinnerGroup[] = [
  { key: 'carb',    label: 'Carb Base',            icon: '🍚', color: '#F59E0B', items: CARB_BASE       },
  { key: 'protein', label: 'Protein / Curry',       icon: '🍗', color: '#F87171', items: PROTEIN_CURRY  },
  { key: 'veg',     label: 'Vegetable Side',         icon: '🥦', color: '#4ADE80', items: VEGETABLE_SIDE },
  { key: 'salad',   label: 'Salad',                 icon: '🥗', color: '#34D399', items: SALAD          },
  { key: 'extras',  label: 'Accompaniments',         icon: '🌙', color: '#C084FC', items: ACCOMPANIMENTS },
];

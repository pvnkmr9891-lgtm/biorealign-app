// Grouped breakfast items for the 4-section breakfast picker.
// Covers mainstream South Indian and North Indian everyday breakfast
// patterns. Macros are expert estimates per standard serving — editable
// by the user before adding.

export interface BreakfastItem {
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

export interface BreakfastGroup {
  key: string;
  label: string;
  icon: string;
  color: string;
  items: BreakfastItem[];
}

// ── Group 1: Main Dish ────────────────────────────────────────────────────────
// The staple carb base of the meal — one of these is typically picked.
const MAIN_DISH: BreakfastItem[] = [
  // South Indian
  { id: 'idli_sambar',        name: 'Idli with Sambar (3 pcs)',           defaultQuantity: '1 serving', defaultCalories: 220, defaultProteinG: 8,  defaultCarbsG: 42, defaultFatG: 2,  qtyUnit: 'serving', qtyBase: 1 },
  { id: 'masala_dosa',        name: 'Masala Dosa',                        defaultQuantity: '1 piece',   defaultCalories: 310, defaultProteinG: 7,  defaultCarbsG: 48, defaultFatG: 10, qtyUnit: 'piece',   qtyBase: 1 },
  { id: 'plain_dosa',         name: 'Plain Dosa',                         defaultQuantity: '1 piece',   defaultCalories: 170, defaultProteinG: 4,  defaultCarbsG: 30, defaultFatG: 5,  qtyUnit: 'piece',   qtyBase: 1 },
  { id: 'rava_idli',          name: 'Rava Idli (3 pcs)',                  defaultQuantity: '1 serving', defaultCalories: 250, defaultProteinG: 7,  defaultCarbsG: 38, defaultFatG: 8,  qtyUnit: 'serving', qtyBase: 1 },
  { id: 'uttapam',            name: 'Vegetable Uttapam',                  defaultQuantity: '1 piece',   defaultCalories: 220, defaultProteinG: 6,  defaultCarbsG: 35, defaultFatG: 7,  qtyUnit: 'piece',   qtyBase: 1 },
  { id: 'pesarattu',          name: 'Pesarattu (Moong Dal Dosa)',         defaultQuantity: '2 pieces',  defaultCalories: 100, defaultProteinG: 5,  defaultCarbsG: 16, defaultFatG: 2,  qtyUnit: 'piece',   qtyBase: 1 },
  { id: 'veg_upma',           name: 'Vegetable Upma',                     defaultQuantity: '1 bowl',    defaultCalories: 230, defaultProteinG: 6,  defaultCarbsG: 38, defaultFatG: 7,  qtyUnit: 'bowl',    qtyBase: 1 },
  { id: 'veg_poha',           name: 'Vegetable Poha',                     defaultQuantity: '1 bowl',    defaultCalories: 220, defaultProteinG: 5,  defaultCarbsG: 40, defaultFatG: 5,  qtyUnit: 'bowl',    qtyBase: 1 },
  { id: 'pongal',             name: 'Ven Pongal',                         defaultQuantity: '1 bowl',    defaultCalories: 270, defaultProteinG: 8,  defaultCarbsG: 44, defaultFatG: 8,  qtyUnit: 'bowl',    qtyBase: 1 },
  { id: 'akki_roti',          name: 'Akki Roti (Rice Flour Roti)',        defaultQuantity: '2 pieces',  defaultCalories: 120, defaultProteinG: 2,  defaultCarbsG: 22, defaultFatG: 3,  qtyUnit: 'piece',   qtyBase: 1 },
  // North Indian
  { id: 'plain_paratha',      name: 'Plain Paratha (wheat)',              defaultQuantity: '2 pieces',  defaultCalories: 160, defaultProteinG: 4,  defaultCarbsG: 24, defaultFatG: 6,  qtyUnit: 'piece',   qtyBase: 1 },
  { id: 'aloo_paratha',       name: 'Aloo Paratha',                       defaultQuantity: '1 piece',   defaultCalories: 300, defaultProteinG: 7,  defaultCarbsG: 46, defaultFatG: 10, qtyUnit: 'piece',   qtyBase: 1 },
  { id: 'methi_thepla',       name: 'Methi Thepla',                       defaultQuantity: '2 pieces',  defaultCalories: 140, defaultProteinG: 4,  defaultCarbsG: 20, defaultFatG: 5,  qtyUnit: 'piece',   qtyBase: 1 },
  { id: 'besan_cheela',       name: 'Besan Cheela (Gram Flour Crepe)',    defaultQuantity: '2 pieces',  defaultCalories: 100, defaultProteinG: 5,  defaultCarbsG: 13, defaultFatG: 4,  qtyUnit: 'piece',   qtyBase: 1 },
  { id: 'moong_dal_chilla',   name: 'Moong Dal Chilla',                   defaultQuantity: '2 pieces',  defaultCalories: 90,  defaultProteinG: 6,  defaultCarbsG: 12, defaultFatG: 3,  qtyUnit: 'piece',   qtyBase: 1 },
  { id: 'wheat_dalia',        name: 'Wheat Dalia (Broken Wheat Porridge)',defaultQuantity: '1 bowl',    defaultCalories: 230, defaultProteinG: 7,  defaultCarbsG: 42, defaultFatG: 3,  qtyUnit: 'bowl',    qtyBase: 1 },
  { id: 'oats_porridge',      name: 'Oats Porridge (with milk)',          defaultQuantity: '1 bowl',    defaultCalories: 250, defaultProteinG: 9,  defaultCarbsG: 40, defaultFatG: 6,  qtyUnit: 'bowl',    qtyBase: 1 },
  { id: 'bread_toast',        name: 'Whole Wheat Toast',                  defaultQuantity: '2 slices',  defaultCalories: 80,  defaultProteinG: 3,  defaultCarbsG: 14, defaultFatG: 2,  qtyUnit: 'slice',   qtyBase: 1 },
  { id: 'sabudana_khichdi',   name: 'Sabudana Khichdi',                   defaultQuantity: '1 bowl',    defaultCalories: 300, defaultProteinG: 5,  defaultCarbsG: 55, defaultFatG: 8,  qtyUnit: 'bowl',    qtyBase: 1 },
  { id: 'suji_halwa',         name: 'Suji Halwa (Semolina Sweet)',        defaultQuantity: '1 small bowl', defaultCalories: 260, defaultProteinG: 4, defaultCarbsG: 44, defaultFatG: 10, qtyUnit: 'bowl',  qtyBase: 1 },
];

// ── Group 2: Sides & Chutneys ─────────────────────────────────────────────────
// Accompaniments that add flavour and a modest macro boost.
const SIDES_CHUTNEYS: BreakfastItem[] = [
  { id: 'coconut_chutney',    name: 'Coconut Chutney',                    defaultQuantity: '2 tbsp',    defaultCalories: 30,  defaultProteinG: 1, defaultCarbsG: 2,  defaultFatG: 3,  qtyUnit: 'tbsp', qtyBase: 1 },
  { id: 'tomato_chutney',     name: 'Tomato Chutney',                     defaultQuantity: '2 tbsp',    defaultCalories: 18,  defaultProteinG: 1, defaultCarbsG: 3,  defaultFatG: 1,  qtyUnit: 'tbsp', qtyBase: 1 },
  { id: 'groundnut_chutney',  name: 'Groundnut (Peanut) Chutney',        defaultQuantity: '2 tbsp',    defaultCalories: 40,  defaultProteinG: 2, defaultCarbsG: 2,  defaultFatG: 3,  qtyUnit: 'tbsp', qtyBase: 1 },
  { id: 'green_chutney',      name: 'Green Chutney (Coriander-Mint)',    defaultQuantity: '2 tbsp',    defaultCalories: 10,  defaultProteinG: 1, defaultCarbsG: 2,  defaultFatG: 0,  qtyUnit: 'tbsp', qtyBase: 1 },
  { id: 'onion_chutney',      name: 'Onion Chutney',                      defaultQuantity: '2 tbsp',    defaultCalories: 20,  defaultProteinG: 1, defaultCarbsG: 4,  defaultFatG: 1,  qtyUnit: 'tbsp', qtyBase: 1 },
  { id: 'sambar_side',        name: 'Sambar (side bowl)',                 defaultQuantity: '1 small bowl', defaultCalories: 75, defaultProteinG: 4, defaultCarbsG: 12, defaultFatG: 2, qtyUnit: 'bowl', qtyBase: 1 },
  { id: 'curd_dahi',          name: 'Curd / Dahi',                        defaultQuantity: '1 small bowl', defaultCalories: 60, defaultProteinG: 3, defaultCarbsG: 5,  defaultFatG: 3, qtyUnit: 'bowl', qtyBase: 1 },
  { id: 'pickle_achar',       name: 'Pickle (Achar)',                     defaultQuantity: '1 tsp',     defaultCalories: 10,  defaultProteinG: 0, defaultCarbsG: 2,  defaultFatG: 0,  qtyUnit: 'tsp',  qtyBase: 1 },
  { id: 'ghee',               name: 'Ghee',                               defaultQuantity: '1 tsp',     defaultCalories: 45,  defaultProteinG: 0, defaultCarbsG: 0,  defaultFatG: 5,  qtyUnit: 'tsp',  qtyBase: 1 },
  { id: 'butter',             name: 'Butter',                             defaultQuantity: '1 tsp',     defaultCalories: 35,  defaultProteinG: 0, defaultCarbsG: 0,  defaultFatG: 4,  qtyUnit: 'tsp',  qtyBase: 1 },
  { id: 'raita',              name: 'Raita (Cucumber / Onion)',          defaultQuantity: '1 small bowl', defaultCalories: 55, defaultProteinG: 3, defaultCarbsG: 6,  defaultFatG: 2, qtyUnit: 'bowl', qtyBase: 1 },
  { id: 'tamarind_chutney',   name: 'Tamarind Chutney',                   defaultQuantity: '1 tbsp',    defaultCalories: 30,  defaultProteinG: 0, defaultCarbsG: 8,  defaultFatG: 0,  qtyUnit: 'tbsp', qtyBase: 1 },
];

// ── Group 3: Nuts, Seeds & Energy Bites ──────────────────────────────────────
// High-density micronutrient additions — portion-controlled, eaten alongside.
const NUTS_SEEDS: BreakfastItem[] = [
  { id: 'soaked_almonds',     name: 'Soaked Almonds',                     defaultQuantity: '6 pieces',  defaultCalories: 14,  defaultProteinG: 1, defaultCarbsG: 1,  defaultFatG: 1,  qtyUnit: 'piece',   qtyBase: 1 },
  { id: 'soaked_walnuts',     name: 'Soaked Walnuts',                     defaultQuantity: '2 halves',  defaultCalories: 33,  defaultProteinG: 1, defaultCarbsG: 1,  defaultFatG: 3,  qtyUnit: 'half',    qtyBase: 1 },
  { id: 'sesame_ladoo',       name: 'Sesame Ladoo (Til Ladoo)',           defaultQuantity: '1 piece',   defaultCalories: 110, defaultProteinG: 3, defaultCarbsG: 12, defaultFatG: 6,  qtyUnit: 'piece',   qtyBase: 1 },
  { id: 'peanuts',            name: 'Roasted Peanuts',                    defaultQuantity: '1 handful (25g)', defaultCalories: 140, defaultProteinG: 6, defaultCarbsG: 5, defaultFatG: 11, qtyUnit: 'handful', qtyBase: 1 },
  { id: 'flaxseeds',          name: 'Flaxseeds (Alsi)',                   defaultQuantity: '1 tsp',     defaultCalories: 37,  defaultProteinG: 1, defaultCarbsG: 2,  defaultFatG: 3,  qtyUnit: 'tsp',     qtyBase: 1 },
  { id: 'chia_seeds',         name: 'Chia Seeds',                         defaultQuantity: '1 tsp',     defaultCalories: 25,  defaultProteinG: 1, defaultCarbsG: 2,  defaultFatG: 2,  qtyUnit: 'tsp',     qtyBase: 1 },
  { id: 'dates',              name: 'Dates (Khajoor)',                    defaultQuantity: '2 pieces',  defaultCalories: 28,  defaultProteinG: 0, defaultCarbsG: 8,  defaultFatG: 0,  qtyUnit: 'piece',   qtyBase: 1 },
  { id: 'dry_fruit_mix',      name: 'Dry Fruit Mix (assorted)',           defaultQuantity: '1 small handful', defaultCalories: 120, defaultProteinG: 3, defaultCarbsG: 14, defaultFatG: 7, qtyUnit: 'handful', qtyBase: 1 },
  { id: 'banana',             name: 'Banana',                             defaultQuantity: '1 medium',  defaultCalories: 90,  defaultProteinG: 1, defaultCarbsG: 23, defaultFatG: 0,  qtyUnit: 'piece',   qtyBase: 1 },
  { id: 'fruit_bowl',         name: 'Mixed Fruit Bowl',                   defaultQuantity: '1 small bowl', defaultCalories: 80, defaultProteinG: 1, defaultCarbsG: 20, defaultFatG: 0, qtyUnit: 'bowl',    qtyBase: 1 },
  { id: 'besan_ladoo',        name: 'Besan Ladoo',                        defaultQuantity: '1 piece',   defaultCalories: 130, defaultProteinG: 3, defaultCarbsG: 16, defaultFatG: 6,  qtyUnit: 'piece',   qtyBase: 1 },
  { id: 'coconut_piece',      name: 'Fresh Coconut Piece',                defaultQuantity: '2 small pieces', defaultCalories: 40, defaultProteinG: 1, defaultCarbsG: 2, defaultFatG: 4, qtyUnit: 'piece',  qtyBase: 1 },
];

// ── Group 4: Drinks ───────────────────────────────────────────────────────────
// Morning drink or accompaniment — hydration + energy.
// ml-based items normalized to per 50ml.
const DRINKS: BreakfastItem[] = [
  // 250ml → divide by 5 to get per 50ml
  { id: 'whole_milk',         name: 'Whole Milk (Full Fat)',              defaultQuantity: '1 glass (250ml)', defaultCalories: 30,  defaultProteinG: 2, defaultCarbsG: 2,  defaultFatG: 2, qtyUnit: 'ml', qtyBase: 1 },
  { id: 'toned_milk',         name: 'Toned Milk (Low Fat)',               defaultQuantity: '1 glass (250ml)', defaultCalories: 20,  defaultProteinG: 2, defaultCarbsG: 2,  defaultFatG: 1, qtyUnit: 'ml', qtyBase: 1 },
  // 150ml → divide by 3 to get per 50ml
  { id: 'masala_chai',        name: 'Masala Chai (with milk & sugar)',   defaultQuantity: '1 cup (150ml)',   defaultCalories: 23,  defaultProteinG: 1, defaultCarbsG: 3,  defaultFatG: 1, qtyUnit: 'ml', qtyBase: 1 },
  { id: 'filter_coffee',      name: 'Filter Coffee (with milk)',          defaultQuantity: '1 cup (150ml)',   defaultCalories: 18,  defaultProteinG: 1, defaultCarbsG: 3,  defaultFatG: 1, qtyUnit: 'ml', qtyBase: 1 },
  // 200ml → divide by 4 to get per 50ml
  { id: 'buttermilk_chaas',   name: 'Buttermilk / Chaas',                defaultQuantity: '1 glass (200ml)', defaultCalories: 10,  defaultProteinG: 1, defaultCarbsG: 1,  defaultFatG: 0, qtyUnit: 'ml', qtyBase: 1 },
  { id: 'turmeric_milk',      name: 'Turmeric Milk (Haldi Doodh)',       defaultQuantity: '1 glass (200ml)', defaultCalories: 30,  defaultProteinG: 2, defaultCarbsG: 3,  defaultFatG: 2, qtyUnit: 'ml', qtyBase: 1 },
  // 1 cup (no ml) → treat as serving/cup unit
  { id: 'green_tea',          name: 'Green Tea (no sugar)',               defaultQuantity: '1 cup',           defaultCalories: 2,   defaultProteinG: 0, defaultCarbsG: 0,  defaultFatG: 0, qtyUnit: 'cup', qtyBase: 1 },
  { id: 'black_coffee',       name: 'Black Coffee (no sugar)',            defaultQuantity: '1 cup',           defaultCalories: 5,   defaultProteinG: 0, defaultCarbsG: 1,  defaultFatG: 0, qtyUnit: 'cup', qtyBase: 1 },
  { id: 'protein_shake',      name: 'Protein Shake (whey/plant)',        defaultQuantity: '1 scoop in water', defaultCalories: 120, defaultProteinG: 24, defaultCarbsG: 4, defaultFatG: 2, qtyUnit: 'scoop', qtyBase: 1 },
  // 200ml → divide by 4 to get per 50ml
  { id: 'fruit_juice',        name: 'Fresh Fruit Juice (no sugar)',       defaultQuantity: '1 glass (200ml)', defaultCalories: 23,  defaultProteinG: 0, defaultCarbsG: 6,  defaultFatG: 0, qtyUnit: 'ml', qtyBase: 1 },
  { id: 'coconut_water',      name: 'Coconut Water',                      defaultQuantity: '1 glass (200ml)', defaultCalories: 11,  defaultProteinG: 1, defaultCarbsG: 2,  defaultFatG: 0, qtyUnit: 'ml', qtyBase: 1 },
  // 30ml → divide by (30/50) = multiply by (50/30) — but rule says divide by ml×50. 30ml shot: per 50ml = 20/(30/50) = 20*50/30 = 33. Simpler: 30ml shot → per 50ml = 20/0.6 = 33kcal
  { id: 'amla_juice',         name: 'Amla Juice (no sugar)',              defaultQuantity: '30ml shot',       defaultCalories: 33,  defaultProteinG: 0, defaultCarbsG: 8,  defaultFatG: 0, qtyUnit: 'ml', qtyBase: 1 },
];

export const BREAKFAST_GROUPS: BreakfastGroup[] = [
  { key: 'main',    label: 'Main Dish',              icon: '🍽️', color: '#FB923C', items: MAIN_DISH      },
  { key: 'sides',   label: 'Sides & Chutneys',       icon: '🫙',  color: '#4ADE80', items: SIDES_CHUTNEYS },
  { key: 'nuts',    label: 'Nuts, Seeds & Sweets',   icon: '🥜',  color: '#FBBF24', items: NUTS_SEEDS     },
  { key: 'drinks',  label: 'Drinks',                 icon: '🥛',  color: '#60A5FA', items: DRINKS         },
];

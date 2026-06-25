// src/constants/supplementItems.ts
// Curated supplement library — addable under any of the 5 meal-time
// sections (Morning Drink, Breakfast, Lunch, Evening Snacks, Dinner),
// same as the food items, but tracked separately under item_type
// 'supplement' since dosage isn't a calorie/macro figure.

export interface SupplementItemDefault {
  id: string;
  name: string;
  defaultQuantity: string;
}

export const SUPPLEMENT_ITEMS: SupplementItemDefault[] = [
  { id: 'whey_protein',        name: 'Whey Protein Isolate/Concentrate',                    defaultQuantity: '1 scoop' },
  { id: 'plant_protein',       name: 'Plant Protein (Pea/Rice/Soy blend)',                  defaultQuantity: '1 scoop' },
  { id: 'eaa_bcaa',            name: 'Essential Amino Acids (EAA) / BCAA',                  defaultQuantity: '1 serving' },
  { id: 'collagen_peptides',   name: 'Collagen Peptides',                                   defaultQuantity: '1 scoop' },
  { id: 'creatine_monohydrate',name: 'Creatine Monohydrate',                                defaultQuantity: '5 g' },
  { id: 'beta_alanine',        name: 'Beta-Alanine',                                        defaultQuantity: '3 g' },
  { id: 'caffeine_preworkout', name: 'Caffeine / Pre-Workout Blends',                        defaultQuantity: '1 serving' },
  { id: 'citrulline_malate',   name: 'Citrulline Malate / L-Arginine',                       defaultQuantity: '6 g' },
  { id: 'vitamin_d3',          name: 'Vitamin D3',                                          defaultQuantity: '1 capsule' },
  { id: 'magnesium',           name: 'Magnesium (Glycinate/Citrate)',                        defaultQuantity: '1 capsule' },
  { id: 'omega_3',             name: 'Omega-3 (Fish Oil / Algae-based)',                     defaultQuantity: '1 softgel' },
  { id: 'multivitamin',        name: 'Multivitamin',                                        defaultQuantity: '1 tablet' },
  { id: 'electrolytes',        name: 'Electrolyte Supplements (Sodium/Potassium/Magnesium blend)', defaultQuantity: '1 sachet' },
  { id: 'berberine',           name: 'Berberine',                                           defaultQuantity: '500 mg' },
  { id: 'chromium_picolinate', name: 'Chromium Picolinate',                                 defaultQuantity: '200 mcg' },
  { id: 'inositol',            name: 'Inositol (Myo-inositol/D-chiro-inositol)',             defaultQuantity: '2 g' },
];

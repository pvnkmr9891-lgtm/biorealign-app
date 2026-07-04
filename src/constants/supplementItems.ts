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

// ── Supplement safety interaction checks ────────────────────────────────
// Deliberately narrow: only flag interactions we can state with confidence.
// Each rule's `matches` reads the client's Detailed Assessment "health"
// stage (conditions chips + free-text medications list) to decide if the
// named supplement warrants a caution banner for that specific client.
export interface SupplementInteractionRule {
  supplementId: string;
  message: string;
  matches: (health: { conditions?: string[]; medications?: string[] } | null | undefined) => boolean;
}

function hasCondition(health: { conditions?: string[] } | null | undefined, condition: string) {
  return !!health?.conditions?.some((c) => c.toLowerCase() === condition.toLowerCase());
}

function hasMedication(health: { medications?: string[] } | null | undefined, keyword: string) {
  return !!health?.medications?.some((m) => m.toLowerCase().includes(keyword.toLowerCase()));
}

export const SUPPLEMENT_INTERACTION_RULES: SupplementInteractionRule[] = [
  {
    supplementId: 'berberine',
    message: 'Berberine can compound the blood-sugar-lowering effect of metformin/diabetes medication — confirm with this client before logging or assigning it.',
    matches: (health) => hasCondition(health, 'Diabetes') || hasMedication(health, 'metformin'),
  },
];

// Matches by supplement name (item_name as logged), not just the curated id,
// since clients can log a supplement manually with a free-typed name.
export function getSupplementInteractionWarning(
  supplementName: string,
  health: { conditions?: string[]; medications?: string[] } | null | undefined
): string | null {
  const nameLower = supplementName.toLowerCase();
  for (const rule of SUPPLEMENT_INTERACTION_RULES) {
    const item = SUPPLEMENT_ITEMS.find((s) => s.id === rule.supplementId);
    const itemNameLower = item?.name.toLowerCase() ?? rule.supplementId;
    if (nameLower.includes(rule.supplementId) || (item && nameLower.includes(itemNameLower.split(' ')[0]))) {
      if (rule.matches(health)) return rule.message;
    }
  }
  return null;
}

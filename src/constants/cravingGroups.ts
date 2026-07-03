// The Confession Booth — unplanned / indulgent items that somehow ended up
// being consumed. Organised into 5 categories covering the usual suspects.
// Macros are per-unit (qtyUnit). The quantity counter scales everything.
// roasts[] escalate as quantity increases — index = Math.min(qty-1, roasts.length-1)

export interface CravingItem {
  id: string;
  name: string;
  defaultCalories: number;   // per qtyUnit × qtyBase
  defaultProteinG: number;
  defaultCarbsG: number;
  defaultFatG: number;
  roasts: string[];          // [1 unit, 2 units, 3-4 units, 5+ units]
  qtyUnit: string;
  qtyBase: number;
}

export interface CravingGroup {
  key: string;
  label: string;
  icon: string;
  color: string;
  tagline: string;
  items: CravingItem[];
}

// ── Category 1: Fast Food & Fried ────────────────────────────────────────────
const FAST_FOOD: CravingItem[] = [
  { id: 'c_pizza',         name: 'Pizza',
    defaultCalories: 250, defaultProteinG: 11, defaultCarbsG: 28, defaultFatG: 10, qtyUnit: 'slice',   qtyBase: 1,
    roasts: ['You stopped at one. We believe you.', 'Worth every calorie you told yourself not to count.', 'Three slices. The classic mistake.', 'At this point just finish the whole box.'] },

  { id: 'c_burger',        name: 'Burger',
    defaultCalories: 450, defaultProteinG: 20, defaultCarbsG: 40, defaultFatG: 22, qtyUnit: 'burger',  qtyBase: 1,
    roasts: ['A complete meal. Nutritionally speaking, it is not.', 'Two burgers. You were hungry. We get it.', 'Three burgers? Your future self wants a word.', 'Four burgers. Please hydrate.'] },

  { id: 'c_fries',         name: 'French Fries',
    defaultCalories: 320, defaultProteinG: 4,  defaultCarbsG: 42, defaultFatG: 15, qtyUnit: 'serving', qtyBase: 1,
    roasts: ['Potatoes. Technically a vegetable.', 'You ordered a side. It became the main event.', 'Three servings of fries. The diet starts Monday.', 'At this point you are made of potatoes.'] },

  { id: 'c_fried_chicken', name: 'Fried Chicken',
    defaultCalories: 240, defaultProteinG: 15, defaultCarbsG: 10, defaultFatG: 14, qtyUnit: 'piece',   qtyBase: 1,
    roasts: ['High protein though. That\'s something.', 'Two pieces. The crunch was worth it.', 'Four pieces. Your coach is looking away.', 'Six pieces. We need to talk.'] },

  { id: 'c_nuggets',       name: 'Chicken Nuggets',
    defaultCalories: 47,  defaultProteinG: 3,  defaultCarbsG: 3,  defaultFatG: 3,  qtyUnit: 'piece',   qtyBase: 1,
    roasts: ['Zero regrets, infinite nuggets.', 'Six nuggets. A classic order.', 'Ten nuggets. Commitment.', 'Twenty nuggets. This is a lifestyle.'] },

  { id: 'c_samosa',        name: 'Samosa',
    defaultCalories: 130, defaultProteinG: 3,  defaultCarbsG: 16, defaultFatG: 7,  qtyUnit: 'piece',   qtyBase: 1,
    roasts: ['Deep-fried heritage. Respect.', 'Two samosas. The chutney helped.', 'Four samosas. The chai made you do it.', 'Six samosas. You ARE the samosa now.'] },

  { id: 'c_vada_pav',      name: 'Vada Pav',
    defaultCalories: 290, defaultProteinG: 7,  defaultCarbsG: 42, defaultFatG: 11, qtyUnit: 'piece',   qtyBase: 1,
    roasts: ['Mumbai\'s finest. No notes.', 'Two vada pavs. The green chutney said yes.', 'Three. The garlic chutney is the villain here.', 'Four vada pavs. You\'re basically carbs now.'] },

  { id: 'c_pav_bhaji',     name: 'Pav Bhaji',
    defaultCalories: 420, defaultProteinG: 9,  defaultCarbsG: 60, defaultFatG: 16, qtyUnit: 'serving', qtyBase: 1,
    roasts: ['Butter. Butter. More butter.', 'Two plates. The extra pav was inevitable.', 'Three plates. You ate the entire tawa.', 'Four plates. We\'re calling your coach.'] },

  { id: 'c_spring_roll',   name: 'Spring Roll',
    defaultCalories: 100, defaultProteinG: 3,  defaultCarbsG: 12, defaultFatG: 5,  qtyUnit: 'piece',   qtyBase: 1,
    roasts: ['You called it a snack. The scale disagrees.', 'Four rolls. Snack has evolved into a meal.', 'Six rolls. This is dinner now.', 'Eight rolls. Intervention pending.'] },

  { id: 'c_pakoda',        name: 'Pakoda / Bhajiya',
    defaultCalories: 48,  defaultProteinG: 1,  defaultCarbsG: 6,  defaultFatG: 2,  qtyUnit: 'piece',   qtyBase: 1,
    roasts: ['Rainy day essential. Science confirms it.', 'Ten pakodas. The tea kept demanding more.', 'Fifteen pakodas. You ARE the chai now.', 'Twenty pakodas. The rain is over but you keep going.'] },

  { id: 'c_momos',         name: 'Momos',
    defaultCalories: 50,  defaultProteinG: 2,  defaultCarbsG: 6,  defaultFatG: 2,  qtyUnit: 'piece',   qtyBase: 1,
    roasts: ['You said one plate. Then another.', 'A dozen momos. The schezwan chutney is not innocent.', 'Eighteen momos. The stall uncle is proud of you.', 'Two dozen momos. You live here now.'] },
];

// ── Category 2: Bakery & Desserts ─────────────────────────────────────────────
const BAKERY: CravingItem[] = [
  { id: 'c_cake_slice',    name: 'Cake',
    defaultCalories: 380, defaultProteinG: 5,  defaultCarbsG: 52, defaultFatG: 17, qtyUnit: 'slice',   qtyBase: 1,
    roasts: ['Someone\'s birthday, every week apparently.', 'Two slices. The frosting made the decision.', 'Three slices. You have no one to blame but the frosting.', 'Four slices. You ate a whole tier. Congratulations.'] },

  { id: 'c_pastry',        name: 'Pastry / Eclair',
    defaultCalories: 320, defaultProteinG: 4,  defaultCarbsG: 40, defaultFatG: 16, qtyUnit: 'piece',   qtyBase: 1,
    roasts: ['It was at eye level at the checkout. Classic trap.', 'Two pastries. The glass case is designed to do this.', 'Three pastries. You walked in for bread.', 'Four pastries. You now live at the bakery.'] },

  { id: 'c_brownie',       name: 'Brownie',
    defaultCalories: 250, defaultProteinG: 3,  defaultCarbsG: 34, defaultFatG: 12, qtyUnit: 'piece',   qtyBase: 1,
    roasts: ['Dense. Fudgy. Regrettable. Delicious.', 'Two brownies. The fudge is a menace.', 'Three brownies. Emotional support confirmed.', 'Four brownies. The chocolate intervention begins now.'] },

  { id: 'c_doughnut',      name: 'Doughnut',
    defaultCalories: 300, defaultProteinG: 4,  defaultCarbsG: 38, defaultFatG: 15, qtyUnit: 'piece',   qtyBase: 1,
    roasts: ['A hole in your diet. Literally.', 'Two doughnuts. The glaze was irresistible.', 'Three doughnuts. You opened the box. There was no going back.', 'Four doughnuts. The box is empty. You did that.'] },

  { id: 'c_croissant',     name: 'Croissant',
    defaultCalories: 270, defaultProteinG: 5,  defaultCarbsG: 30, defaultFatG: 14, qtyUnit: 'piece',   qtyBase: 1,
    roasts: ['Fancy bread. Still bread.', 'Two croissants. The butter layers are infinite.', 'Three croissants. You\'re French now apparently.', 'Four croissants. A whole boulangerie, consumed.'] },

  { id: 'c_muffin',        name: 'Muffin',
    defaultCalories: 350, defaultProteinG: 5,  defaultCarbsG: 50, defaultFatG: 14, qtyUnit: 'piece',   qtyBase: 1,
    roasts: ['It said "muffin", not "cupcake". You\'re fine.', 'Two muffins. Breakfast is flexible, you said.', 'Three muffins. Muffins are just unfrosted cupcakes and we\'re past judging.', 'Four muffins. You\'re a muffin now.'] },

  { id: 'c_cookie',        name: 'Cookie',
    defaultCalories: 110, defaultProteinG: 2,  defaultCarbsG: 15, defaultFatG: 5,  qtyUnit: 'piece',   qtyBase: 1,
    roasts: ['Just one? Impressive self-control.', 'Started with two. Now we\'re talking.', 'Five cookies. The packet opened itself, clearly.', 'The whole packet. Tea made you do it. We understand.'] },

  { id: 'c_gulab_jamun',   name: 'Gulab Jamun',
    defaultCalories: 100, defaultProteinG: 2,  defaultCarbsG: 16, defaultFatG: 4,  qtyUnit: 'piece',   qtyBase: 1,
    roasts: ['It was at the wedding. You had no choice.', 'Two gulab jamuns. The syrup deepens.', 'Four gulab jamuns. You drank the syrup bowl, didn\'t you.', 'Six gulab jamuns. You ARE the mithai counter now.'] },

  { id: 'c_jalebi',        name: 'Jalebi',
    defaultCalories: 170, defaultProteinG: 2,  defaultCarbsG: 36, defaultFatG: 3,  qtyUnit: 'serving', qtyBase: 1,
    roasts: ['Pure sugar spirals. Architecture at its sweetest.', 'Two servings. The orange glow called to you.', 'Three servings. Your bloodstream is 40% jalebi.', 'Four servings. You are now legally a mithai shop.'] },

  { id: 'c_halwa',         name: 'Halwa',
    defaultCalories: 280, defaultProteinG: 4,  defaultCarbsG: 40, defaultFatG: 12, qtyUnit: 'bowl',    qtyBase: 1,
    roasts: ['Dadi made it. Saying no was not an option.', 'Two bowls. The ghee whispered your name.', 'Three bowls. You\'re going to need a longer walk.', 'Four bowls. At this point just rename it dinner.'] },

  { id: 'c_ice_cream',     name: 'Ice Cream',
    defaultCalories: 140, defaultProteinG: 2,  defaultCarbsG: 17, defaultFatG: 7,  qtyUnit: 'scoop',   qtyBase: 1,
    roasts: ['Emotional support, in frozen form.', 'Two scoops. The sprinkles didn\'t help.', 'Four scoops. You ordered a sundae. Own it.', 'Six scoops. You are a glacier. A delicious glacier.'] },

  { id: 'c_waffle',        name: 'Waffle',
    defaultCalories: 400, defaultProteinG: 7,  defaultCarbsG: 52, defaultFatG: 18, qtyUnit: 'serving', qtyBase: 1,
    roasts: ['Instagram made you do it.', 'Two waffles. The toppings were technically extra.', 'Three waffles. The maple syrup has no mercy.', 'Four waffles. You are the waffle now.'] },
];

// ── Category 3: Chocolates & Candy ────────────────────────────────────────────
const CHOCOLATE: CravingItem[] = [
  { id: 'c_dairy_milk',    name: 'Cadbury Dairy Milk',
    defaultCalories: 210, defaultProteinG: 3,  defaultCarbsG: 25, defaultFatG: 11, qtyUnit: 'bar',     qtyBase: 1,
    roasts: ['Just one. Said everyone. Always.', 'Two bars. The purple packaging is a menace.', 'Three bars. You\'re stress-eating chocolate and we respect it.', 'Four bars. Please step away from the fridge.'] },

  { id: 'c_kitkat',        name: 'KitKat',
    defaultCalories: 210, defaultProteinG: 3,  defaultCarbsG: 28, defaultFatG: 10, qtyUnit: 'bar',     qtyBase: 1,
    roasts: ['You had a break. An expensive one.', 'Two KitKats. The break became a vacation.', 'Three KitKats. You have not had a break, you\'ve had a binge.', 'Four KitKats. Kit. Kat. Intervention.'] },

  { id: 'c_dark_choc',     name: 'Dark Chocolate',
    defaultCalories: 170, defaultProteinG: 2,  defaultCarbsG: 18, defaultFatG: 11, qtyUnit: 'serving', qtyBase: 1,
    roasts: ['Antioxidants! (they said 70%+, you heard any)', 'Two servings. The antioxidant justification collapses.', 'Three servings. This is no longer health food.', 'Four servings. The antioxidants have left the chat.'] },

  { id: 'c_snickers',      name: 'Snickers',
    defaultCalories: 250, defaultProteinG: 4,  defaultCarbsG: 33, defaultFatG: 12, qtyUnit: 'bar',     qtyBase: 1,
    roasts: ['Not yourself when hungry. Understood.', 'Two Snickers. Still not yourself, clearly.', 'Three Snickers. The hunger was a lie and you knew it.', 'Four Snickers. You need protein, not candy. But here we are.'] },

  { id: 'c_ferrero',       name: 'Ferrero Rocher',
    defaultCalories: 73,  defaultProteinG: 1,  defaultCarbsG: 7,  defaultFatG: 4,  qtyUnit: 'piece',   qtyBase: 1,
    roasts: ['Gifted to yourself, by yourself. Classy.', 'Six pieces. The gold wrapper gave you permission.', 'Nine pieces. The box is half gone. The elegance is gone.', 'The whole box. Ambassador of poor decisions.'] },

  { id: 'c_bounty',        name: 'Bounty',
    defaultCalories: 270, defaultProteinG: 2,  defaultCarbsG: 34, defaultFatG: 14, qtyUnit: 'bar',     qtyBase: 1,
    roasts: ['A taste of paradise. At 270 kcal.', 'Two Bountys. Paradise has no limits apparently.', 'Three Bountys. The coconut is not a health argument.', 'Four Bountys. You have moved to paradise permanently.'] },

  { id: 'c_gummies',       name: 'Gummy Candies',
    defaultCalories: 165, defaultProteinG: 3,  defaultCarbsG: 38, defaultFatG: 0,  qtyUnit: 'serving', qtyBase: 1,
    roasts: ['At least it\'s fat-free! (This is cope.)', 'Two servings. Fat-free is doing a lot of heavy lifting right now.', 'Three servings. The bears are winning.', 'Four servings. You ate a bear army. They are inside you now.'] },

  { id: 'c_choc_milkshake',name: 'Chocolate Milkshake',
    defaultCalories: 350, defaultProteinG: 8,  defaultCarbsG: 52, defaultFatG: 12, qtyUnit: 'glass',   qtyBase: 1,
    roasts: ['Liquid dessert. Hits different after a salad.', 'Two milkshakes. Liquid calories are still calories.', 'Three milkshakes. At this point it\'s a meal plan.', 'Four milkshakes. Your blood type is chocolate.'] },
];

// ── Category 4: Chips, Popcorn & Street Snacks ────────────────────────────────
const CHIPS_SNACKS: CravingItem[] = [
  { id: 'c_chips',         name: 'Potato Chips',
    defaultCalories: 160, defaultProteinG: 2,  defaultCarbsG: 18, defaultFatG: 9,  qtyUnit: 'pack',    qtyBase: 1,
    roasts: ['One pack. Opened at 9 PM. Gone by 9:05.', 'Two packs. The crunch demanded a sequel.', 'Three packs. You were "just having a few." Adorable.', 'Four packs. You\'ve consumed an entire potato field.'] },

  { id: 'c_popcorn',       name: 'Buttered Popcorn',
    defaultCalories: 400, defaultProteinG: 6,  defaultCarbsG: 50, defaultFatG: 20, qtyUnit: 'bucket',  qtyBase: 1,
    roasts: ['It was the movie. The movie made you do it.', 'Two buckets. The movie was 2 hours long. Maths checks out.', 'Three buckets. You\'re not watching a film, you\'re eating one.', 'Four buckets. You ARE the popcorn now.'] },

  { id: 'c_nachos',        name: 'Nachos with Cheese Dip',
    defaultCalories: 380, defaultProteinG: 6,  defaultCarbsG: 44, defaultFatG: 20, qtyUnit: 'serving', qtyBase: 1,
    roasts: ['The dip is where it went wrong. Just saying.', 'Two servings. The cheese dip is a weapon of mass consumption.', 'Three servings. The chips were just a vehicle for dip at this point.', 'Four servings. You drank the dip, didn\'t you.'] },

  { id: 'c_bhujia',        name: 'Bhujia / Namkeen',
    defaultCalories: 200, defaultProteinG: 5,  defaultCarbsG: 22, defaultFatG: 11, qtyUnit: 'handful', qtyBase: 1,
    roasts: ['Came for one handful. Left with three.', 'Four handfuls. The TV is the villain here.', 'Six handfuls. Your hands now permanently smell of masala.', 'Eight handfuls. You inhaled the entire pack. Confession accepted.'] },

  { id: 'c_pani_puri',     name: 'Pani Puri',
    defaultCalories: 33,  defaultProteinG: 1,  defaultCarbsG: 5,  defaultFatG: 1,  qtyUnit: 'piece',   qtyBase: 1,
    roasts: ['Started at 6. Tell us you had more.', 'Twelve pani puris. The bhaiya\'s respect was earned.', 'Eighteen pani puris. You\'re a legend at this stall.', 'Twenty-four pani puris. The stall bhaiya is calling you bhai now.'] },

  { id: 'c_chaat',         name: 'Bhel Puri / Chaat',
    defaultCalories: 250, defaultProteinG: 6,  defaultCarbsG: 42, defaultFatG: 7,  qtyUnit: 'plate',   qtyBase: 1,
    roasts: ['Technically has vegetables. You\'re doing great.', 'Two plates. The sev doubles as fibre, right?', 'Three plates. The tamarind chutney is not a health food.', 'Four plates. You ate a whole roadside stall. Respect.'] },

  { id: 'c_maggi',         name: 'Maggi Noodles',
    defaultCalories: 310, defaultProteinG: 7,  defaultCarbsG: 42, defaultFatG: 13, qtyUnit: 'pack',    qtyBase: 1,
    roasts: ['2-minute noodles. 200-minute guilt.', 'Two packs. The masala tastemaker doubles up, so does the sodium.', 'Three packs. You are living the 2 AM hostel life again.', 'Four packs. Your blood pressure just texted you.'] },

  { id: 'c_biscuits',      name: 'Cream Biscuits',
    defaultCalories: 50,  defaultProteinG: 1,  defaultCarbsG: 8,  defaultFatG: 2,  qtyUnit: 'piece',   qtyBase: 1,
    roasts: ['Started as tea companions. Finished alone.', 'Six biscuits. The tea needed them. All of them.', 'Ten biscuits. The packet opened itself.', 'The whole packet in one sitting. The tea is judging you.'] },
];

// ── Category 5: Drinks (Alcoholic & Soft) ─────────────────────────────────────
const DRINKS: CravingItem[] = [
  { id: 'c_cola',          name: 'Cola',
    defaultCalories: 140, defaultProteinG: 0,  defaultCarbsG: 35, defaultFatG: 0,  qtyUnit: 'can',     qtyBase: 1,
    roasts: ['Liquid sugar. At least it was cold.', 'Two cans. The refill was free. The glucose spike was not.', 'Three cans. Your pancreas would like a word.', 'Four cans. You are 60% cola right now.'] },

  { id: 'c_energy_drink',  name: 'Energy Drink',
    defaultCalories: 110, defaultProteinG: 1,  defaultCarbsG: 27, defaultFatG: 0,  qtyUnit: 'can',     qtyBase: 1,
    roasts: ['The wings didn\'t help you skip leg day.', 'Two cans. You\'re vibrating. Is that productive?', 'Three cans. The wings have become a medical emergency.', 'Four cans. Please lie down. On a salad.'] },

  { id: 'c_packaged_juice', name: 'Packaged Fruit Juice',
    defaultCalories: 110, defaultProteinG: 0,  defaultCarbsG: 26, defaultFatG: 0,  qtyUnit: 'box',     qtyBase: 1,
    roasts: ['"It\'s juice" — yes, sugar juice.', 'Two boxes. The fruit in fruit juice has left the building.', 'Three boxes. This is a soft drink with PR.', 'Four boxes. Eat the actual fruit.'] },

  { id: 'c_beer',          name: 'Beer',
    defaultCalories: 150, defaultProteinG: 1,  defaultCarbsG: 13, defaultFatG: 0,  qtyUnit: 'can',     qtyBase: 1,
    roasts: ['Just one. Sure.', 'Two beers. The social excuse is still valid.', 'Four beers. The social excuse is on life support.', 'Six beers. Social excuse has expired. This is a habit.'] },

  { id: 'c_wine',          name: 'Wine',
    defaultCalories: 125, defaultProteinG: 0,  defaultCarbsG: 4,  defaultFatG: 0,  qtyUnit: 'glass',   qtyBase: 1,
    roasts: ['Antioxidants! (Please stop using that excuse.)', 'Two glasses. The antioxidants are outnumbered.', 'Three glasses. You are now very relaxed and very logged.', 'Four glasses. Tomorrow\'s you is furious.'] },

  { id: 'c_whiskey',       name: 'Whiskey / Rum',
    defaultCalories: 70,  defaultProteinG: 0,  defaultCarbsG: 0,  defaultFatG: 0,  qtyUnit: 'peg',     qtyBase: 1,
    roasts: ['"Just one peg" — the oldest lie in the book.', 'Two pegs. Just one became just two. Predictable.', 'Four pegs. You\'re not sipping anymore. You\'re committed.', 'Six pegs. The peg has become the whole bottle\'s problem.'] },

  { id: 'c_cocktail',      name: 'Cocktail / Mixed Drink',
    defaultCalories: 220, defaultProteinG: 0,  defaultCarbsG: 24, defaultFatG: 0,  qtyUnit: 'glass',   qtyBase: 1,
    roasts: ['Pretty colours. Ugly macros.', 'Two cocktails. The umbrella is doing emotional labour.', 'Three cocktails. At this point order a jug and be honest.', 'Four cocktails. The umbrella is the only healthy thing here.'] },

  { id: 'c_vodka_soda',    name: 'Vodka Soda',
    defaultCalories: 80,  defaultProteinG: 0,  defaultCarbsG: 1,  defaultFatG: 0,  qtyUnit: 'drink',   qtyBase: 1,
    roasts: ['The "healthy option". We respect the attempt.', 'Two vodka sodas. Healthy option, doubled.', 'Four vodka sodas. Health has left the premises.', 'Six vodka sodas. The soda is no longer doing anything useful here.'] },
];

export const CRAVING_GROUPS: CravingGroup[] = [
  { key: 'fastfood',   label: 'Fast Food & Fried',           icon: '🍟', color: '#F97316', tagline: 'Crispy, greasy, zero regrets (for now)',          items: FAST_FOOD    },
  { key: 'bakery',     label: 'Bakery & Desserts',            icon: '🎂', color: '#F472B6', tagline: 'Sugar-coated bad decisions',                      items: BAKERY       },
  { key: 'chocolate',  label: 'Chocolates & Candy',           icon: '🍫', color: '#92400E', tagline: 'The 10 PM drawer. We know about it.',            items: CHOCOLATE    },
  { key: 'chips',      label: 'Chips, Popcorn & Street Food', icon: '🍿', color: '#FBBF24', tagline: 'One handful became one packet. Classic story.',   items: CHIPS_SNACKS },
  { key: 'drinks',     label: 'Soft Drinks & Alcohol',        icon: '🥤', color: '#60A5FA', tagline: 'Liquid calories are still calories. Sorry.',      items: DRINKS       },
];

export const CRAVING_SLOT_OPTIONS = [
  { key: 'morning_drink', label: 'Morning',       icon: '🌅', sub: 'An interesting start to the day' },
  { key: 'breakfast',     label: 'Breakfast',     icon: '🍳', sub: 'Bold choice to lead with this'   },
  { key: 'lunch',         label: 'Lunch',          icon: '☀️', sub: 'Replaced lunch. Efficient.'      },
  { key: 'evening_snacks',label: 'Evening Snack', icon: '🍪', sub: 'The most dangerous hour: 4–7 PM' },
  { key: 'dinner',        label: 'Dinner',         icon: '🌙', sub: 'Ended the day with a bang'       },
  { key: '__no_idea__',   label: 'No idea 🤷',     icon: '😶', sub: 'It just... happened. Logging it.'},
] as const;

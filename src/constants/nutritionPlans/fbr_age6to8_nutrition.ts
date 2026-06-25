// 18-day rotating nutrition plan — Future Body Reset, Age 6–8, Vegetarian (Lacto-Ovo), Beginner
// Strings are taken verbatim from the Excel source file.
// Rotation: week 1 = days 1–6, week 2 = days 7–12, week 3 = days 13–18, then repeats.

export interface NutritionMeal {
  /** item_order in DB: 1=Breakfast 2=Mid-Morning 3=Lunch 4=Evening Snack 5=Dinner */
  order: number;
  label: string;
  name: string;
}

export interface NutritionDay {
  day: number;
  meals: NutritionMeal[];
}

export const FBR_AGE6TO8_NUTRITION: NutritionDay[] = [
  {
    day: 1,
    meals: [
      { order: 1, label: 'Breakfast',     name: 'Idli (3 pcs) with sambar and coconut chutney + 1 glass milk' },
      { order: 2, label: 'Mid-Morning',   name: '1 banana' },
      { order: 3, label: 'Lunch',         name: 'Rice (1 cup) + moong dal (1 cup) + bottle gourd curry + curd (1/2 cup)' },
      { order: 4, label: 'Evening Snack', name: 'Roasted chana (small handful)' },
      { order: 5, label: 'Dinner',        name: 'Roti (2) + paneer bhurji + cucumber salad' },
    ],
  },
  {
    day: 2,
    meals: [
      { order: 1, label: 'Breakfast',     name: 'Vegetable poha + 1 glass milk' },
      { order: 2, label: 'Mid-Morning',   name: '1 apple' },
      { order: 3, label: 'Lunch',         name: 'Roti (2) + rajma curry (1 cup) + mixed vegetable + curd (1/2 cup)' },
      { order: 4, label: 'Evening Snack', name: 'Murmura (puffed rice) chaat, light' },
      { order: 5, label: 'Dinner',        name: 'Rice (1 cup) + dal tadka + bhindi (okra) sabzi' },
    ],
  },
  {
    day: 3,
    meals: [
      { order: 1, label: 'Breakfast',     name: 'Vegetable dosa with chutney + 1 glass milk' },
      { order: 2, label: 'Mid-Morning',   name: '1 orange' },
      { order: 3, label: 'Lunch',         name: 'Rice (1 cup) + sambar + cabbage poriyal + curd (1/2 cup)' },
      { order: 4, label: 'Evening Snack', name: '1 boiled egg' },
      { order: 5, label: 'Dinner',        name: 'Roti (2) + egg curry + carrot-beans sabzi' },
    ],
  },
  {
    day: 4,
    meals: [
      { order: 1, label: 'Breakfast',     name: 'Wheat dalia (porridge) with milk and a few nuts' },
      { order: 2, label: 'Mid-Morning',   name: '1 banana' },
      { order: 3, label: 'Lunch',         name: 'Roti (2) + chole (chickpea curry, 1 cup) + onion-tomato salad + curd (1/2 cup)' },
      { order: 4, label: 'Evening Snack', name: 'Vegetable cutlet (small, baked/pan-fried)' },
      { order: 5, label: 'Dinner',        name: 'Rice (1 cup) + paneer curry + lauki sabzi' },
    ],
  },
  {
    day: 5,
    meals: [
      { order: 1, label: 'Breakfast',     name: 'Plain paratha (1) with curd + 1 glass milk' },
      { order: 2, label: 'Mid-Morning',   name: '1 pear or guava' },
      { order: 3, label: 'Lunch',         name: 'Rice (1 cup) + dal makhani (light, 1 cup) + palak (spinach) sabzi + curd (1/2 cup)' },
      { order: 4, label: 'Evening Snack', name: 'Roasted peanuts (small handful)' },
      { order: 5, label: 'Dinner',        name: 'Roti (2) + mixed vegetable curry + dal' },
    ],
  },
  {
    day: 6,
    meals: [
      { order: 1, label: 'Breakfast',     name: 'Semiya (vermicelli) upma + 1 glass milk' },
      { order: 2, label: 'Mid-Morning',   name: '1 banana' },
      { order: 3, label: 'Lunch',         name: 'Roti (2) + lobia (black-eyed peas) curry + beetroot poriyal + curd (1/2 cup)' },
      { order: 4, label: 'Evening Snack', name: 'Vegetable soup (small bowl)' },
      { order: 5, label: 'Dinner',        name: 'Rice (1 cup) + sambar + cauliflower sabzi' },
    ],
  },
  {
    day: 7,
    meals: [
      { order: 1, label: 'Breakfast',     name: 'Vegetable uttapam with chutney + 1 glass milk' },
      { order: 2, label: 'Mid-Morning',   name: '1 apple' },
      { order: 3, label: 'Lunch',         name: 'Rice (1 cup) + dal (1 cup) + ridge gourd curry + curd (1/2 cup)' },
      { order: 4, label: 'Evening Snack', name: '1 boiled egg' },
      { order: 5, label: 'Dinner',        name: 'Roti (2) + paneer tikka (pan-style) + salad' },
    ],
  },
  {
    day: 8,
    meals: [
      { order: 1, label: 'Breakfast',     name: 'Bread toast with peanut butter + 1 glass milk' },
      { order: 2, label: 'Mid-Morning',   name: '1 orange' },
      { order: 3, label: 'Lunch',         name: 'Roti (2) + matar paneer + mixed vegetable + curd (1/2 cup)' },
      { order: 4, label: 'Evening Snack', name: 'Roasted chana (small handful)' },
      { order: 5, label: 'Dinner',        name: 'Rice (1 cup) + dal + drumstick (moringa) curry' },
    ],
  },
  {
    day: 9,
    meals: [
      { order: 1, label: 'Breakfast',     name: 'Rava idli with sambar + 1 glass milk' },
      { order: 2, label: 'Mid-Morning',   name: '1 banana' },
      { order: 3, label: 'Lunch',         name: 'Rice (1 cup) + dal + capsicum sabzi + curd (1/2 cup)' },
      { order: 4, label: 'Evening Snack', name: 'Fruit salad (small bowl)' },
      { order: 5, label: 'Dinner',        name: 'Roti (2) + egg bhurji + onion salad' },
    ],
  },
  {
    day: 10,
    meals: [
      { order: 1, label: 'Breakfast',     name: 'Vegetable paratha (1) with curd + 1 glass milk' },
      { order: 2, label: 'Mid-Morning',   name: '1 guava' },
      { order: 3, label: 'Lunch',         name: 'Roti (2) + dal makhani + bhindi sabzi + curd (1/2 cup)' },
      { order: 4, label: 'Evening Snack', name: 'Vegetable cutlet (small)' },
      { order: 5, label: 'Dinner',        name: 'Rice (1 cup) + rajma curry + cabbage sabzi' },
    ],
  },
  {
    day: 11,
    meals: [
      { order: 1, label: 'Breakfast',     name: 'Idli (3 pcs) with tomato chutney + 1 glass milk' },
      { order: 2, label: 'Mid-Morning',   name: '1 banana' },
      { order: 3, label: 'Lunch',         name: 'Rice (1 cup) + sambar + beans poriyal + curd (1/2 cup)' },
      { order: 4, label: 'Evening Snack', name: '1 boiled egg' },
      { order: 5, label: 'Dinner',        name: 'Roti (2) + paneer curry + carrot salad' },
    ],
  },
  {
    day: 12,
    meals: [
      { order: 1, label: 'Breakfast',     name: 'Vegetable dalia upma + 1 glass milk' },
      { order: 2, label: 'Mid-Morning',   name: '1 apple' },
      { order: 3, label: 'Lunch',         name: 'Roti (2) + chole + cucumber-tomato salad + curd (1/2 cup)' },
      { order: 4, label: 'Evening Snack', name: 'Roasted peanuts (small handful)' },
      { order: 5, label: 'Dinner',        name: 'Rice (1 cup) + dal tadka + lauki sabzi' },
    ],
  },
  {
    day: 13,
    meals: [
      { order: 1, label: 'Breakfast',     name: 'Vegetable dosa with sambar + 1 glass milk' },
      { order: 2, label: 'Mid-Morning',   name: '1 orange' },
      { order: 3, label: 'Lunch',         name: 'Rice (1 cup) + moong dal + cabbage poriyal + curd (1/2 cup)' },
      { order: 4, label: 'Evening Snack', name: 'Murmura chaat, light' },
      { order: 5, label: 'Dinner',        name: 'Roti (2) + mixed vegetable curry + dal' },
    ],
  },
  {
    day: 14,
    meals: [
      { order: 1, label: 'Breakfast',     name: 'Bread toast with paneer spread + 1 glass milk' },
      { order: 2, label: 'Mid-Morning',   name: '1 banana' },
      { order: 3, label: 'Lunch',         name: 'Roti (2) + lobia curry + beetroot sabzi + curd (1/2 cup)' },
      { order: 4, label: 'Evening Snack', name: '1 boiled egg' },
      { order: 5, label: 'Dinner',        name: 'Rice (1 cup) + sambar + carrot-beans sabzi' },
    ],
  },
  {
    day: 15,
    meals: [
      { order: 1, label: 'Breakfast',     name: 'Semiya upma + 1 glass milk' },
      { order: 2, label: 'Mid-Morning',   name: '1 pear' },
      { order: 3, label: 'Lunch',         name: 'Rice (1 cup) + dal + ridge gourd curry + curd (1/2 cup)' },
      { order: 4, label: 'Evening Snack', name: 'Vegetable soup (small bowl)' },
      { order: 5, label: 'Dinner',        name: 'Roti (2) + egg curry + onion-tomato salad' },
    ],
  },
  {
    day: 16,
    meals: [
      { order: 1, label: 'Breakfast',     name: 'Vegetable uttapam with chutney + 1 glass milk' },
      { order: 2, label: 'Mid-Morning',   name: '1 guava' },
      { order: 3, label: 'Lunch',         name: 'Roti (2) + rajma curry + mixed vegetable + curd (1/2 cup)' },
      { order: 4, label: 'Evening Snack', name: 'Roasted chana (small handful)' },
      { order: 5, label: 'Dinner',        name: 'Rice (1 cup) + dal + bhindi sabzi' },
    ],
  },
  {
    day: 17,
    meals: [
      { order: 1, label: 'Breakfast',     name: 'Rava idli with chutney + 1 glass milk' },
      { order: 2, label: 'Mid-Morning',   name: '1 banana' },
      { order: 3, label: 'Lunch',         name: 'Rice (1 cup) + dal makhani + palak sabzi + curd (1/2 cup)' },
      { order: 4, label: 'Evening Snack', name: 'Vegetable cutlet (small)' },
      { order: 5, label: 'Dinner',        name: 'Roti (2) + paneer bhurji + cucumber salad' },
    ],
  },
  {
    day: 18,
    meals: [
      { order: 1, label: 'Breakfast',     name: 'Plain paratha (1) with curd + 1 glass milk' },
      { order: 2, label: 'Mid-Morning',   name: '1 orange' },
      { order: 3, label: 'Lunch',         name: 'Roti (2) + chole + cabbage sabzi + curd (1/2 cup)' },
      { order: 4, label: 'Evening Snack', name: '1 boiled egg' },
      { order: 5, label: 'Dinner',        name: 'Rice (1 cup) + sambar + cauliflower sabzi' },
    ],
  },
];

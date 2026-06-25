// 18-day rotating nutrition plan — Future Body Reset, Age 6–8, Vegetarian, Hard Intensity
// Hard adds 7 meals: Pre-Activity Snack (order 3) + Post-Activity Recovery Snack (order 5)
// Strings taken verbatim from Excel source file -03-veg.xlsx

import type { NutritionDay } from './index';

export const FBR_AGE6TO8_VEG_HARD: NutritionDay[] = [
  {
    day: 1,
    meals: [
      { order: 1, label: 'Breakfast',          name: 'Idli (3-4 pcs) with sambar and chutney + 1 glass milk with soaked almonds' },
      { order: 2, label: 'Mid-Morning',        name: '1 boiled egg' },
      { order: 3, label: 'Pre-Activity',       name: 'Small banana or 2 dates' },
      { order: 4, label: 'Lunch',              name: 'Rice (1-1.5 cups) + moong dal (1 cup) + bottle gourd curry + curd (1/2 cup)' },
      { order: 5, label: 'Post-Activity',      name: 'Milk with banana' },
      { order: 6, label: 'Evening Snack',      name: 'Roasted chana (small handful)' },
      { order: 7, label: 'Dinner',             name: 'Roti (2) + paneer bhurji + cucumber salad' },
    ],
  },
  {
    day: 2,
    meals: [
      { order: 1, label: 'Breakfast',          name: 'Vegetable poha + 1 glass milk + a few almonds' },
      { order: 2, label: 'Mid-Morning',        name: '1 boiled egg' },
      { order: 3, label: 'Pre-Activity',       name: 'Dates (2-3)' },
      { order: 4, label: 'Lunch',              name: 'Roti (2) + rajma curry (1 cup) + mixed vegetable + curd (1/2 cup)' },
      { order: 5, label: 'Post-Activity',      name: 'Paneer cubes with a fruit' },
      { order: 6, label: 'Evening Snack',      name: 'Murmura chaat, light' },
      { order: 7, label: 'Dinner',             name: 'Rice (1 cup) + dal tadka + bhindi sabzi' },
    ],
  },
  {
    day: 3,
    meals: [
      { order: 1, label: 'Breakfast',          name: 'Vegetable dosa with chutney + 1 glass milk' },
      { order: 2, label: 'Mid-Morning',        name: '2 boiled eggs' },
      { order: 3, label: 'Pre-Activity',       name: 'Small banana' },
      { order: 4, label: 'Lunch',              name: 'Rice (1.5 cups) + sambar + cabbage poriyal + curd (1/2 cup)' },
      { order: 5, label: 'Post-Activity',      name: 'Milk with a banana' },
      { order: 6, label: 'Evening Snack',      name: '1 orange' },
      { order: 7, label: 'Dinner',             name: 'Roti (2) + egg curry + carrot-beans sabzi' },
    ],
  },
  {
    day: 4,
    meals: [
      { order: 1, label: 'Breakfast',          name: 'Wheat dalia with milk and walnuts' },
      { order: 2, label: 'Mid-Morning',        name: '1 boiled egg' },
      { order: 3, label: 'Pre-Activity',       name: 'Dates with a small glass of milk' },
      { order: 4, label: 'Lunch',              name: 'Roti (2) + chole (1 cup) + onion-tomato salad + curd (1/2 cup)' },
      { order: 5, label: 'Post-Activity',      name: 'Banana with peanut butter' },
      { order: 6, label: 'Evening Snack',      name: 'Vegetable cutlet (small)' },
      { order: 7, label: 'Dinner',             name: 'Rice (1 cup) + paneer curry + lauki sabzi' },
    ],
  },
  {
    day: 5,
    meals: [
      { order: 1, label: 'Breakfast',          name: 'Plain paratha (1-2) with curd + 1 glass milk with almonds' },
      { order: 2, label: 'Mid-Morning',        name: '1 boiled egg' },
      { order: 3, label: 'Pre-Activity',       name: 'Small banana or dates' },
      { order: 4, label: 'Lunch',              name: 'Rice (1.5 cups) + dal makhani (1 cup) + palak sabzi + curd (1/2 cup)' },
      { order: 5, label: 'Post-Activity',      name: 'Paneer cubes with fruit' },
      { order: 6, label: 'Evening Snack',      name: 'Roasted peanuts (small handful)' },
      { order: 7, label: 'Dinner',             name: 'Roti (2) + mixed vegetable curry + dal' },
    ],
  },
  {
    day: 6,
    meals: [
      { order: 1, label: 'Breakfast',          name: 'Semiya upma + 1 glass milk + walnuts' },
      { order: 2, label: 'Mid-Morning',        name: '1 boiled egg' },
      { order: 3, label: 'Pre-Activity',       name: 'Dates (2-3)' },
      { order: 4, label: 'Lunch',              name: 'Roti (2) + lobia curry + beetroot poriyal + curd (1/2 cup)' },
      { order: 5, label: 'Post-Activity',      name: 'Milk with banana' },
      { order: 6, label: 'Evening Snack',      name: 'Vegetable soup (small bowl)' },
      { order: 7, label: 'Dinner',             name: 'Rice (1 cup) + sambar + cauliflower sabzi' },
    ],
  },
  {
    day: 7,
    meals: [
      { order: 1, label: 'Breakfast',          name: 'Vegetable uttapam with chutney + 1 glass milk' },
      { order: 2, label: 'Mid-Morning',        name: '2 boiled eggs' },
      { order: 3, label: 'Pre-Activity',       name: 'Small banana' },
      { order: 4, label: 'Lunch',              name: 'Rice (1.5 cups) + dal (1 cup) + ridge gourd curry + curd (1/2 cup)' },
      { order: 5, label: 'Post-Activity',      name: 'Banana with almonds' },
      { order: 6, label: 'Evening Snack',      name: '1 apple' },
      { order: 7, label: 'Dinner',             name: 'Roti (2) + paneer tikka + salad' },
    ],
  },
  {
    day: 8,
    meals: [
      { order: 1, label: 'Breakfast',          name: 'Bread toast with peanut butter + 1 glass milk' },
      { order: 2, label: 'Mid-Morning',        name: '1 boiled egg' },
      { order: 3, label: 'Pre-Activity',       name: 'Dates with milk' },
      { order: 4, label: 'Lunch',              name: 'Roti (2) + matar paneer + mixed vegetable + curd (1/2 cup)' },
      { order: 5, label: 'Post-Activity',      name: 'Paneer cubes with fruit' },
      { order: 6, label: 'Evening Snack',      name: 'Roasted chana (small handful)' },
      { order: 7, label: 'Dinner',             name: 'Rice (1 cup) + dal + drumstick curry' },
    ],
  },
  {
    day: 9,
    meals: [
      { order: 1, label: 'Breakfast',          name: 'Rava idli with sambar + 1 glass milk with almonds' },
      { order: 2, label: 'Mid-Morning',        name: '1 boiled egg' },
      { order: 3, label: 'Pre-Activity',       name: 'Small banana' },
      { order: 4, label: 'Lunch',              name: 'Rice (1.5 cups) + dal (1 cup) + capsicum sabzi + curd (1/2 cup)' },
      { order: 5, label: 'Post-Activity',      name: 'Milk with banana' },
      { order: 6, label: 'Evening Snack',      name: 'Fruit salad (small bowl)' },
      { order: 7, label: 'Dinner',             name: 'Roti (2) + egg bhurji + onion salad' },
    ],
  },
  {
    day: 10,
    meals: [
      { order: 1, label: 'Breakfast',          name: 'Vegetable paratha (1-2) with curd + 1 glass milk + walnuts' },
      { order: 2, label: 'Mid-Morning',        name: '2 boiled eggs' },
      { order: 3, label: 'Pre-Activity',       name: 'Dates (2-3)' },
      { order: 4, label: 'Lunch',              name: 'Roti (2) + dal makhani + bhindi sabzi + curd (1/2 cup)' },
      { order: 5, label: 'Post-Activity',      name: 'Banana with peanut butter' },
      { order: 6, label: 'Evening Snack',      name: 'Vegetable cutlet (small)' },
      { order: 7, label: 'Dinner',             name: 'Rice (1 cup) + rajma curry + cabbage sabzi' },
    ],
  },
  {
    day: 11,
    meals: [
      { order: 1, label: 'Breakfast',          name: 'Idli (3-4 pcs) with tomato chutney + 1 glass milk' },
      { order: 2, label: 'Mid-Morning',        name: '1 boiled egg' },
      { order: 3, label: 'Pre-Activity',       name: 'Small banana' },
      { order: 4, label: 'Lunch',              name: 'Rice (1.5 cups) + sambar + beans poriyal + curd (1/2 cup)' },
      { order: 5, label: 'Post-Activity',      name: 'Paneer cubes with fruit' },
      { order: 6, label: 'Evening Snack',      name: '1 banana' },
      { order: 7, label: 'Dinner',             name: 'Roti (2) + paneer curry + carrot salad' },
    ],
  },
  {
    day: 12,
    meals: [
      { order: 1, label: 'Breakfast',          name: 'Vegetable dalia upma + 1 glass milk with almonds' },
      { order: 2, label: 'Mid-Morning',        name: '1 boiled egg' },
      { order: 3, label: 'Pre-Activity',       name: 'Dates with milk' },
      { order: 4, label: 'Lunch',              name: 'Roti (2) + chole + cucumber-tomato salad + curd (1/2 cup)' },
      { order: 5, label: 'Post-Activity',      name: 'Milk with banana' },
      { order: 6, label: 'Evening Snack',      name: 'Roasted peanuts (small handful)' },
      { order: 7, label: 'Dinner',             name: 'Rice (1 cup) + dal tadka + lauki sabzi' },
    ],
  },
  {
    day: 13,
    meals: [
      { order: 1, label: 'Breakfast',          name: 'Vegetable dosa with sambar + 1 glass milk' },
      { order: 2, label: 'Mid-Morning',        name: '2 boiled eggs' },
      { order: 3, label: 'Pre-Activity',       name: 'Small banana' },
      { order: 4, label: 'Lunch',              name: 'Rice (1.5 cups) + moong dal + cabbage poriyal + curd (1/2 cup)' },
      { order: 5, label: 'Post-Activity',      name: 'Banana with almonds' },
      { order: 6, label: 'Evening Snack',      name: 'Murmura chaat, light' },
      { order: 7, label: 'Dinner',             name: 'Roti (2) + mixed vegetable curry + dal' },
    ],
  },
  {
    day: 14,
    meals: [
      { order: 1, label: 'Breakfast',          name: 'Bread toast with paneer spread + 1 glass milk' },
      { order: 2, label: 'Mid-Morning',        name: '1 boiled egg' },
      { order: 3, label: 'Pre-Activity',       name: 'Dates (2-3)' },
      { order: 4, label: 'Lunch',              name: 'Roti (2) + lobia curry + beetroot sabzi + curd (1/2 cup)' },
      { order: 5, label: 'Post-Activity',      name: 'Paneer cubes with fruit' },
      { order: 6, label: 'Evening Snack',      name: '1 banana' },
      { order: 7, label: 'Dinner',             name: 'Rice (1 cup) + sambar + carrot-beans sabzi' },
    ],
  },
  {
    day: 15,
    meals: [
      { order: 1, label: 'Breakfast',          name: 'Semiya upma + 1 glass milk + walnuts' },
      { order: 2, label: 'Mid-Morning',        name: '1 boiled egg' },
      { order: 3, label: 'Pre-Activity',       name: 'Small banana' },
      { order: 4, label: 'Lunch',              name: 'Rice (1.5 cups) + dal (1 cup) + ridge gourd curry + curd (1/2 cup)' },
      { order: 5, label: 'Post-Activity',      name: 'Milk with banana' },
      { order: 6, label: 'Evening Snack',      name: 'Vegetable soup (small bowl)' },
      { order: 7, label: 'Dinner',             name: 'Roti (2) + egg curry + onion-tomato salad' },
    ],
  },
  {
    day: 16,
    meals: [
      { order: 1, label: 'Breakfast',          name: 'Vegetable uttapam with chutney + 1 glass milk' },
      { order: 2, label: 'Mid-Morning',        name: '2 boiled eggs' },
      { order: 3, label: 'Pre-Activity',       name: 'Dates with milk' },
      { order: 4, label: 'Lunch',              name: 'Roti (2) + rajma curry + mixed vegetable + curd (1/2 cup)' },
      { order: 5, label: 'Post-Activity',      name: 'Banana with almonds' },
      { order: 6, label: 'Evening Snack',      name: 'Roasted chana (small handful)' },
      { order: 7, label: 'Dinner',             name: 'Rice (1 cup) + dal + bhindi sabzi' },
    ],
  },
  {
    day: 17,
    meals: [
      { order: 1, label: 'Breakfast',          name: 'Rava idli with chutney + 1 glass milk with almonds' },
      { order: 2, label: 'Mid-Morning',        name: '1 boiled egg' },
      { order: 3, label: 'Pre-Activity',       name: 'Small banana' },
      { order: 4, label: 'Lunch',              name: 'Rice (1.5 cups) + dal makhani + palak sabzi + curd (1/2 cup)' },
      { order: 5, label: 'Post-Activity',      name: 'Paneer cubes with fruit' },
      { order: 6, label: 'Evening Snack',      name: 'Vegetable cutlet (small)' },
      { order: 7, label: 'Dinner',             name: 'Roti (2) + paneer bhurji + cucumber salad' },
    ],
  },
  {
    day: 18,
    meals: [
      { order: 1, label: 'Breakfast',          name: 'Plain paratha (1-2) with curd + 1 glass milk' },
      { order: 2, label: 'Mid-Morning',        name: '2 boiled eggs' },
      { order: 3, label: 'Pre-Activity',       name: 'Dates (2-3)' },
      { order: 4, label: 'Lunch',              name: 'Roti (2) + chole + cabbage sabzi + curd (1/2 cup)' },
      { order: 5, label: 'Post-Activity',      name: 'Milk with banana' },
      { order: 6, label: 'Evening Snack',      name: '1 orange' },
      { order: 7, label: 'Dinner',             name: 'Rice (1 cup) + sambar + cauliflower sabzi' },
    ],
  },
];

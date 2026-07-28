import { generateWeeklyMealPlan, swapMealInPlan, getTodayPlanDay } from '../src/services/mealPlanService.ts';
const plan = generateWeeklyMealPlan({
  calories: 2200,
  macros: { protein: 165, carbs: 220, fat: 70 },
  goal: 'muscle',
  restrictions: ['sans-lactose'],
});
const today = getTodayPlanDay(plan) || plan.days[0];
console.log('days', plan.days.length, 'kcal', plan.calories);
console.log('today meals', today.meals.map(m => m.slot + ': ' + m.name + ' (' + m.kcal + ')').join(' | '));
const swapped = swapMealInPlan(plan, today.date, today.meals[1].id);
const t2 = swapped.days.find(d => d.date === today.date)!;
console.log('after swap lunch', t2.meals[1].name);

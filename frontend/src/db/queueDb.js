import Dexie from 'dexie';

export const db = new Dexie('DietTrackerQueue');

db.version(1).stores({
  pendingMeals: '++id, foodItem, weightInGrams, mealType, consumedAt, status, createdAt',
  syncedMeals: '++id, foodItem, weightInGrams, mealType, consumedAt, nutritionData'
});
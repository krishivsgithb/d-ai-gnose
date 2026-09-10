import { db } from '../db/queueDb';

export const syncPendingMeals = async () => {
  console.log('🔍 [SyncEngine] Starting sync check...');

  const token = localStorage.getItem('token');
  if (!token) {
    console.warn('⚠️ [SyncEngine] Sync stopped: No token in localStorage.');
    return;
  }

  const pending = await db.pendingMeals.toArray();
  console.log(`🔍 [SyncEngine] Found ${pending.length} pending meal(s).`);
  
  if (pending.length === 0) return;

  for (const meal of pending) {
    try {
      console.log('🚀 [SyncEngine] Attempting sync for item:', meal.foodItem);

      const response = await fetch('http://localhost:5000/api/meals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          foodItem: meal.foodItem,
          weightInGrams: Number(meal.weightInGrams),
          mealType: meal.mealType,
          consumedAt: meal.consumedAt
        })
      });

      if (response.ok) {
        const syncedRecord = await response.json();
        console.log('✅ [SyncEngine] Successfully synced:', syncedRecord);

        // Map MongoDB _id to local id to update IndexedDB correctly
        const recordToStore = {
          ...syncedRecord,
          id: syncedRecord._id || meal.id
        };

        await db.syncedMeals.put(recordToStore);
        await db.pendingMeals.delete(meal.id);
      } else {
        const errorData = await response.json();
        console.error('❌ [SyncEngine] Server rejected item:', errorData);
      }
    } catch (err) {
      console.warn('⚠️ [SyncEngine] Network/Server offline error:', err);
    }
  }
};

export const addMealOptimistically = async (mealData) => {
  if (!db) return;
  const entry = {
    ...mealData,
    createdAt: new Date().toISOString()
  };
  await db.pendingMeals.add(entry);
  await syncPendingMeals();
};
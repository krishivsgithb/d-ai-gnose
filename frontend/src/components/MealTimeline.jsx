import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/queueDb';
import { API_BASE_URL } from '../api';

export default function MealTimeline() {
  const pendingMeals = useLiveQuery(async () => {
    try {
      return (await db?.pendingMeals?.toArray()) || [];
    } catch {
      return [];
    }
  }, []) || [];

  const syncedMeals = useLiveQuery(async () => {
    try {
      return (await db?.syncedMeals?.toArray()) || [];
    } catch {
      return [];
    }
  }, []) || [];

  const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleDeleteMeal = async (item, isPending) => {
    try {
      if (isPending) {
        await db.pendingMeals.delete(item.id);
      } else {
        const targetMongoId = item._id || item.id;
        const token = localStorage.getItem('token');

        if (targetMongoId) {
          const res = await fetch(`${API_BASE_URL}/meals/${targetMongoId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (!res.ok && res.status !== 404) {
            const errData = await res.json();
            console.error("❌ Delete request failed:", errData);
            return;
          }
        }

        // Remove from local IndexedDB synced cache
        const localMatches = await db.syncedMeals.toArray();
        const target = localMatches.find(m => m._id === targetMongoId || m.id === item.id || m.id === targetMongoId);
        
        if (target && target.id) {
          await db.syncedMeals.delete(target.id);
        }
      }
    } catch (err) {
      console.error("Failed to delete log entry:", err);
    }
  };

  return (
    <div className="bg-[#0E1A14] border border-emerald-900/50 rounded-2xl p-6 shadow-xl">
      <h2 className="text-sm font-semibold text-white mb-4">Meal History Timeline</h2>

      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
        {pendingMeals.map((meal) => (
          <div 
            key={`pending-${meal.id}`}
            className="p-3.5 bg-emerald-950/20 border border-emerald-500/30 rounded-xl flex items-center justify-between group"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-white">{meal.foodItem}</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                  ⏳ Syncing...
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {meal.mealType} ({formatTime(meal.consumedAt)}) • {meal.weightInGrams}g
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500">
                {meal.consumedAt ? new Date(meal.consumedAt).toLocaleDateString() : ''}
              </span>
              <button 
                onClick={() => handleDeleteMeal(meal, true)}
                className="text-xs text-red-400/70 hover:text-red-400 hover:bg-red-500/10 p-1.5 rounded-lg transition"
                title="Delete Entry"
              >
                ❌
              </button>
            </div>
          </div>
        ))}

        {syncedMeals.map((meal) => (
          <div 
            key={`synced-${meal._id || meal.id}`}
            className="p-3.5 bg-[#070D0A] border border-emerald-900/40 rounded-xl flex items-center justify-between hover:border-emerald-500/40 transition group"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-white">{meal.foodItem}</span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                  ✅ Synced
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {meal.mealType} ({formatTime(meal.consumedAt)}) • {meal.weightInGrams}g
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500">
                {meal.consumedAt ? new Date(meal.consumedAt).toLocaleDateString() : ''}
              </span>
              <button 
                onClick={() => handleDeleteMeal(meal, false)}
                className="text-xs text-slate-600 hover:text-red-400 hover:bg-red-500/10 p-1.5 rounded-lg transition"
                title="Delete Entry"
              >
                ❌
              </button>
            </div>
          </div>
        ))}

        {pendingMeals.length === 0 && syncedMeals.length === 0 && (
          <div className="text-center py-12 text-slate-500 text-xs">
            No meals recorded yet. Log your first meal above!
          </div>
        )}
      </div>
    </div>
  );
}
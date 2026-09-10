import React, { useState } from 'react';
import { COMMON_FOODS } from '../data/foodItems';
import { addMealOptimistically } from '../utils/syncEngine';

export default function MealForm() {
  const [foodItem, setFoodItem] = useState('');
  const [weightGrams, setWeightGrams] = useState(150);
  const [mealType, setMealType] = useState('Snacks');
  const [customTime, setCustomTime] = useState('16:00');
  const [consumedAt, setConsumedAt] = useState(new Date().toISOString().split('T')[0]);

  const maxDateToday = new Date().toISOString().split('T')[0];

  const getComputedTimestamp = () => {
    let timeString = '16:00';
    if (mealType === 'Breakfast') timeString = '08:00';
    else if (mealType === 'Lunch') timeString = '13:30';
    else if (mealType === 'Dinner') timeString = '20:00';
    else if (mealType === 'Snacks') timeString = customTime || '16:00';

    const [hours, minutes] = timeString.split(':');
    const dateObj = new Date(consumedAt);
    dateObj.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

    return dateObj.toISOString();
  };

  const handleMealSubmit = async (e) => {
    e.preventDefault();
    if (!foodItem.trim()) return;

    await addMealOptimistically({
      foodItem: foodItem.trim(),
      weightInGrams: Number(weightGrams),
      mealType,
      consumedAt: getComputedTimestamp()
    });

    setFoodItem('');
  };

  return (
    <div className="bg-[#0E1A14] border border-emerald-900/50 rounded-2xl p-6 shadow-xl">
      <h2 className="text-sm font-semibold text-emerald-400 mb-4 flex items-center gap-2">
        🍴 Log Meal Entry
      </h2>
      
      <form onSubmit={handleMealSubmit} className="space-y-4">
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Food Item</label>
          <input 
            type="text"
            list="food-suggestions"
            value={foodItem}
            onChange={(e) => setFoodItem(e.target.value)}
            placeholder="e.g. Samosa, Oats, Chicken Biryani..."
            className="w-full bg-[#070D0A] border border-emerald-900/60 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition"
            required
          />
          <datalist id="food-suggestions">
            {COMMON_FOODS.map((item, idx) => (
              <option key={idx} value={item} />
            ))}
          </datalist>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Weight (Grams)</label>
            <input 
              type="number"
              value={weightGrams}
              onChange={(e) => setWeightGrams(e.target.value)}
              className="w-full bg-[#070D0A] border border-emerald-900/60 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition"
              required
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Meal Category</label>
            <select 
              value={mealType}
              onChange={(e) => setMealType(e.target.value)}
              className="w-full bg-[#070D0A] border border-emerald-900/60 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition"
            >
              <option value="Breakfast">Breakfast (8:00 AM)</option>
              <option value="Lunch">Lunch (1:30 PM)</option>
              <option value="Dinner">Dinner (8:00 PM)</option>
              <option value="Snacks">Snacks (Custom Time)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Date Consumed</label>
            <input 
              type="date"
              max={maxDateToday}
              value={consumedAt}
              onChange={(e) => setConsumedAt(e.target.value)}
              className="w-full bg-[#070D0A] border border-emerald-900/60 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition"
              required
            />
          </div>

          {mealType === 'Snacks' ? (
            <div>
              <label className="text-xs text-amber-400 mb-1 block">Snack Time</label>
              <input 
                type="time"
                value={customTime}
                onChange={(e) => setCustomTime(e.target.value)}
                className="w-full bg-[#070D0A] border border-amber-500/60 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400 transition"
                required
              />
            </div>
          ) : (
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Fixed Time</label>
              <div className="w-full bg-[#070D0A]/50 border border-emerald-900/30 rounded-xl px-3.5 py-2.5 text-xs text-slate-400 flex items-center h-[42px]">
                {mealType === 'Breakfast' && '08:00 AM'}
                {mealType === 'Lunch' && '01:30 PM'}
                {mealType === 'Dinner' && '08:00 PM'}
              </div>
            </div>
          )}
        </div>

        <button 
          type="submit"
          className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-semibold py-2.5 rounded-xl transition shadow-lg shadow-emerald-500/20 text-sm mt-2"
        >
          Log Entry Instantly
        </button>
      </form>
    </div>
  );
}
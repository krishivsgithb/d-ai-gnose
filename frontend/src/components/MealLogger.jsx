import React, { useState } from 'react';
import API from '../api';

export default function MealLogger({ onMealLogged }) {
  const [foodItem, setFoodItem] = useState('');
  const [weightInGrams, setWeightInGrams] = useState('');
  const [mealType, setMealType] = useState('Breakfast');
  const [consumedAt, setConsumedAt] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await API.post('/parse-food', {
        foodItem,
        weightInGrams: Number(weightInGrams),
        mealType,
        consumedAt
      });

      if (response.data.success) {
        setFoodItem('');
        setWeightInGrams('');
        onMealLogged(response.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to log meal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '20px' }}>
      <h3>Log a Meal (AI Powered)</h3>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <input 
          type="text" 
          placeholder="Food item (e.g. Oatmeal, Chicken Curry)" 
          value={foodItem} 
          onChange={(e) => setFoodItem(e.target.value)} 
          required 
          style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
        />
        <input 
          type="number" 
          placeholder="Weight in grams" 
          value={weightInGrams} 
          onChange={(e) => setWeightInGrams(e.target.value)} 
          required 
          style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
        />
        <select value={mealType} onChange={(e) => setMealType(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '10px' }}>
          <option value="Breakfast">Breakfast</option>
          <option value="Lunch">Lunch</option>
          <option value="Dinner">Dinner</option>
          <option value="Snacks">Snacks</option>
        </select>
        <input 
          type="date" 
          value={consumedAt} 
          onChange={(e) => setConsumedAt(e.target.value)} 
          required 
          style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
        />
        <button type="submit" disabled={loading} style={{ padding: '10px 20px', width: '100%' }}>
          {loading ? 'Analyzing with Gemini...' : 'Log Meal'}
        </button>
      </form>
    </div>
  );
}
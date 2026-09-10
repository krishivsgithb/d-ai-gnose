const mongoose = require('mongoose');

const mealSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: false // Set to true if you want to strictly enforce auth on every meal
  },
  foodItem: { type: String, required: true },
  weightInGrams: { type: Number, required: true },
  mealType: { 
    type: String, 
    enum: ['Breakfast', 'Lunch', 'Dinner', 'Snacks'], 
    default: 'Snacks' 
  },
  consumedAt: { type: Date, required: true }, // User-entered date/time
  nutritionData: {
    calories: Number,
    protein: Number,
    carbs: Number,
    fats: Number,
    micronutrients: [String],
    glycemicImpact: String
  },
  createdAt: { type: Date, default: Date.now } // System entry timestamp
});

module.exports = mongoose.model('Meal', mealSchema);
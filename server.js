const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const { GoogleGenerativeAI } = require('@google/generative-ai');
const Meal = require('./models/Meal');
const User = require('./models/User');

const app = express();

// 1. Middleware & Parsers
app.use(cors({
  origin: true,
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// 2. Connect to Database
const mongoURI = process.env.MONGO_URI;
mongoose.connect(mongoURI)
  .then(() => console.log('✅ Connected successfully to MongoDB Atlas!'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err.message));

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_nutripulse_key_2026';

// -------------------------------------------------------------
// 3. AUTH ROUTES (Public Endpoints)
// -------------------------------------------------------------

// REGISTER ROUTE
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      name,
      email,
      password: hashedPassword
    });

    await newUser.save();

    const token = jwt.sign(
      { id: newUser._id, email: newUser.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      token,
      user: { id: newUser._id, name: newUser.name, email: newUser.email }
    });

  } catch (error) {
    res.status(500).json({ error: 'Registration failed.', details: error.message });
  }
});

// LOGIN ROUTE
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide email and password.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email }
    });

  } catch (error) {
    res.status(500).json({ error: 'Login failed.', details: error.message });
  }
});

// 4. JWT Middleware for Protected Routes
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token.' });
    }
    req.user = user;
    next();
  });
};

// -------------------------------------------------------------
// 5. GEMINI MODEL TIER FALLBACK CONFIGURATION
// -------------------------------------------------------------
const MODEL_TIERS = [
  { 
    name: 'gemini-3.6-flash', 
    apiKey: process.env.GEMINI_KEY_3_6 || process.env.GEMINI_API_KEY 
  },
  { 
    name: 'gemini-3.5-flash', 
    apiKey: process.env.GEMINI_KEY_2_5 || process.env.GEMINI_API_KEY 
  },
  { 
    name: 'gemini-3.5-flash-lite', 
    apiKey: process.env.GEMINI_KEY_1_5 || process.env.GEMINI_API_KEY 
  }
];

async function generateWithFallback(prompt) {
  let lastError = null;

  for (const tier of MODEL_TIERS) {
    try {
      if (!tier.apiKey) continue;

      const genAI = new GoogleGenerativeAI(tier.apiKey);
      const model = genAI.getGenerativeModel({ model: tier.name });

      console.log(`[AI Model Engine] Attempting prompt with model: 🚀 ${tier.name}`);
      const result = await model.generateContent(prompt);
      const text = result.response.text();

      console.log(`[AI Model Engine] Successfully generated output using: ✅ ${tier.name}`);
      return { text, usedModel: tier.name };

    } catch (error) {
      console.warn(`⚠️ [Spike Alert] Model ${tier.name} failed or rate-limited. Shifting to next tier...`);
      console.warn(`Reason: ${error.message}`);
      lastError = error;
    }
  }

  throw new Error(`All Gemini models failed to respond. Last error: ${lastError?.message}`);
}

// Helper to safely extract JSON objects from AI responses
function extractAndParseJSON(text) {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("No valid JSON object found in Gemini response.");
  }
  return JSON.parse(jsonMatch[0]);
}

// Helper to safely format and validate entry timestamps
function resolveTimestamp(consumedAt) {
  const selectedDate = consumedAt ? new Date(consumedAt) : new Date();
  
  if (isNaN(selectedDate.getTime())) {
    throw new Error('Invalid date format.');
  }

  // Allow a 5-minute buffer (300,000 ms) for minor system clock drift
  const bufferMs = 5 * 60 * 1000;
  if (selectedDate.getTime() > (Date.now() + bufferMs)) {
    throw new Error('Cannot log meals for future dates.');
  }

  return selectedDate;
}

// Helper function to query Gemini for meal nutritional data
async function fetchMealNutrition(foodItem, weightInGrams) {
  const prompt = `You are a strict dietary analysis system.
  Evaluate the following item name: "${foodItem}".

  Step 1: Determine if "${foodItem}" represents a recognizable edible food, ingredient, or dish.
  Step 2: 
  - If NOT food: Set "isValidFood" to false, leave nutrient numbers as 0.
  - If IS valid food: Set "isValidFood" to true and calculate accurate nutritional metrics for EXACTLY ${weightInGrams} grams of "${foodItem}".

  Return ONLY raw JSON matching this structure:
  {
    "isValidFood": boolean,
    "foodName": string,
    "calories": number,
    "protein": number,
    "carbs": number,
    "fats": number,
    "micronutrients": ["item1", "item2"],
    "glycemicImpact": "Low | Medium | High"
  }`;

  try {
    const aiResponse = await generateWithFallback(prompt);
    const parsed = extractAndParseJSON(aiResponse.text);
    return { ...parsed, processedByModel: aiResponse.usedModel };
  } catch (aiError) {
    console.error("AI Fallback Engine Error:", aiError.message);
    return {
      isValidFood: true,
      foodName: foodItem,
      calories: Math.round(weightInGrams * 1.5),
      protein: Math.round(weightInGrams * 0.05),
      carbs: Math.round(weightInGrams * 0.2),
      fats: Math.round(weightInGrams * 0.05),
      micronutrients: ["Estimated"],
      glycemicImpact: "Medium",
      processedByModel: "Offline Heuristic Fallback"
    };
  }
}

// -------------------------------------------------------------
// 6. PROTECTED USER API ROUTES
// -------------------------------------------------------------

// Parse Food & Save to DB
app.post('/api/parse-food', authenticateToken, async (req, res) => {
  try {
    const { foodItem, weightInGrams, mealType, consumedAt } = req.body;

    if (!foodItem || !weightInGrams) {
      return res.status(400).json({ 
        error: 'Please provide foodItem and weightInGrams.' 
      });
    }

    let selectedDate;
    try {
      selectedDate = resolveTimestamp(consumedAt);
    } catch (dateErr) {
      return res.status(400).json({ error: dateErr.message });
    }

    const parsedData = await fetchMealNutrition(foodItem, weightInGrams);

    if (!parsedData.isValidFood) {
      return res.status(400).json({ 
        error: `"${foodItem}" is not recognized as valid food.` 
      });
    }

    const newMeal = new Meal({
      userId: req.user.id,
      foodItem: parsedData.foodName || foodItem,
      weightInGrams: weightInGrams,
      mealType: mealType || 'Snacks',
      consumedAt: selectedDate,
      nutritionData: {
        calories: parsedData.calories || 0,
        protein: parsedData.protein || 0,
        carbs: parsedData.carbs || 0,
        fats: parsedData.fats || 0,
        micronutrients: parsedData.micronutrients || [],
        glycemicImpact: parsedData.glycemicImpact || 'Unknown'
      }
    });

    const savedMeal = await newMeal.save();
    
    res.json({ 
      success: true, 
      processedByModel: parsedData.processedByModel, 
      data: savedMeal 
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to process meal.', details: error.message });
  }
});

// 1. CREATE MEAL ROUTE
app.post('/api/meals', authenticateToken, async (req, res) => {
  try {
    const { foodItem, weightInGrams, mealType, consumedAt } = req.body;

    if (!foodItem || !weightInGrams) {
      return res.status(400).json({ error: 'Please provide foodItem and weightInGrams.' });
    }

    let selectedDate;
    try {
      selectedDate = resolveTimestamp(consumedAt);
    } catch (dateErr) {
      return res.status(400).json({ error: dateErr.message });
    }

    // Process meal items through Gemini AI engine
    const parsedData = await fetchMealNutrition(foodItem, weightInGrams);

    if (!parsedData.isValidFood) {
      return res.status(400).json({ 
        error: `"${foodItem}" is not recognized as valid food.` 
      });
    }

    // Instantiate and persist meal tied to authenticated user ID
    const newMeal = new Meal({
      userId: req.user.id, // 👈 Ensures deletion matches user ownership
      foodItem: parsedData.foodItem || foodItem,
      weightInGrams: Number(weightInGrams),
      mealType: mealType || 'Snack',
      consumedAt: selectedDate,
      calories: parsedData.calories || 0,
      protein: parsedData.protein || 0,
      carbs: parsedData.carbs || 0,
      fats: parsedData.fats || 0
    });

    const savedMeal = await newMeal.save();

    console.log(`\n✅ [Meal Created] ${savedMeal.foodItem} (${savedMeal.weightInGrams}g) for User: ${savedMeal.userId}`);

    res.status(201).json(savedMeal);
  } catch (error) {
    console.error(`❌ [Create Error]:`, error.message);
    res.status(500).json({ error: 'Failed to create meal entry.' });
  }
});

// Fetch Chronologically Sorted Meal History
// GET MEALS (User-scoped with legacy fallback if needed)
app.get('/api/meals', authenticateToken, async (req, res) => {
  try {
    // 🔒 Fetch ONLY meals matching the logged-in user's ID
    const meals = await Meal.find({ userId: req.user.id })
      .sort({ consumedAt: -1 });

    res.json(meals);
  } catch (error) {
    console.error(`❌ [Fetch Error]:`, error.message);
    res.status(500).json({ error: 'Failed to retrieve meal logs.' });
  }
});

// AI Symptom Analyzer
app.post('/api/analyze-symptoms', authenticateToken, async (req, res) => {
  try {
    const { symptomDescription } = req.body;

    if (!symptomDescription) {
      return res.status(400).json({ error: 'Please enter a description of your symptoms.' });
    }

    // Query meals matching current userId OR legacy meals missing userId
    const history = await Meal.find({
      $or: [
        { userId: req.user.id },
        { userId: { $exists: false } },
        { userId: null }
      ]
    }).sort({ consumedAt: -1 }).limit(30);

    // Terminal diagnostic log
    console.log(`\n🔍 [Symptom Check] Found ${history.length} meal(s) for User: ${req.user.id}`);

    if (history.length === 0) {
      return res.status(400).json({ error: 'No meal history found to analyze.' });
    }

    const prompt = `You are an AI clinical nutritionist assistant.
    The user is experiencing the following health symptom(s): "${symptomDescription}".

    Here is the user's recent dietary history (sorted newest to oldest):
    ${JSON.stringify(history, null, 2)}

    Analyze this history:
    1. Identify specific meals or ingredients (high acidity, high fat, allergens, glycemic impact, etc.) that could trigger these symptoms.
    2. Explain why those items might cause the issue.
    3. Suggest immediate dietary adjustments and a medical disclaimer.

    Provide a concise, direct, and structured response. Do not give any bolded answers. Do not write more than 100 words.`;

    let analysisText = "";
    let usedModel = "None";

    try {
      const aiResponse = await generateWithFallback(prompt);
      analysisText = aiResponse.text;
      usedModel = aiResponse.usedModel;
    } catch (aiError) {
      console.error("AI Fallback Engine Error:", aiError.message);
      analysisText = "Unable to reach AI services. Please review your recent meals for high-fat, dairy, gluten, or highly acidic foods that may be triggering your symptoms. Consult a physician if symptoms persist.";
      usedModel = "Offline Heuristic Fallback";
    }

    res.json({
      success: true,
      processedByModel: usedModel,
      symptomsReported: symptomDescription,
      analysis: analysisText
    });

  } catch (error) {
    res.status(500).json({ error: 'Symptom analysis failed.', details: error.message });
  }
});
// Delete Endpoints (User-Scoped)
// Delete Endpoint (User-Scoped with Terminal Console Logging)
// 2. DELETE MEAL ROUTE (WITH FALLBACK FOR LEGACY UNASSIGNED MEALS & TERMINAL LOGS)
app.delete('/api/meals/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // First attempt: Match by meal ID and authenticated user ID
    let deletedMeal = await Meal.findOneAndDelete({ _id: id, userId: req.user.id });

    // Fallback attempt: Handle legacy meals created before auth was enabled
    if (!deletedMeal) {
      deletedMeal = await Meal.findOneAndDelete({ _id: id, userId: { $exists: false } });
    }

    if (!deletedMeal) {
      console.warn(`⚠️ [Delete Failed] No meal found with ID: ${id} for User: ${req.user.id}`);
      return res.status(404).json({ error: 'Meal entry not found or unauthorized.' });
    }

    // 🖥️ Formatted Terminal Output
    console.log(`\n🗑️  ================ MEAL DELETED ================`);
    console.log(`📌 ID:        ${deletedMeal._id}`);
    console.log(`🍴 Food:      ${deletedMeal.foodItem}`);
    console.log(`⚖️  Weight:    ${deletedMeal.weightInGrams}g`);
    console.log(`📂 Category:  ${deletedMeal.mealType}`);
    console.log(`👤 User ID:   ${deletedMeal.userId || 'Legacy (Unassigned)'}`);
    console.log(`===============================================\n`);

    res.json({ 
      success: true, 
      message: `Successfully deleted "${deletedMeal.foodItem}" from database.`,
      deletedItem: deletedMeal
    });
  } catch (error) {
    console.error(`❌ [Delete Error]:`, error.message);
    res.status(500).json({ error: 'Failed to delete meal entry.' });
  }
});
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
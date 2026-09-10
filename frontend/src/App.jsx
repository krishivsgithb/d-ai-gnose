import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Register from './components/Register';
import Header from './components/header';
import MealForm from './components/MealForm';
import SymptomCorrelator from './components/SymptomCorrelator';
import MealTimeline from './components/MealTimeline';
import { db } from './db/queueDb';
import { syncPendingMeals } from './utils/syncEngine';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMode, setAuthMode] = useState('login');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  // Fetch only current user's meals from remote backend and cache locally
  const fetchAndCacheUserMeals = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await fetch('http://localhost:5000/api/meals', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const userMeals = await res.json();
        if (db) {
          // Clear previous user's cached meals and set logged-in user's meals
          await db.syncedMeals.clear();
          await db.syncedMeals.bulkPut(userMeals);
        }
      }
    } catch (err) {
      console.error("Failed to fetch user meals from remote server:", err);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      syncPendingMeals();
      fetchAndCacheUserMeals();
    }
  }, [isAuthenticated]);

  const handleLogout = async () => {
    localStorage.removeItem('token');
    
    // 🔒 FIX: Clear local IndexedDB cache so User B cannot see User A's cached meals
    try {
      if (db) {
        await db.syncedMeals.clear();
        await db.pendingMeals.clear();
      }
    } catch (err) {
      console.warn("Failed to clear local cache on logout:", err);
    }

    setIsAuthenticated(false);
    setAuthMode('login');
  };

  const handleClearHistory = async () => {
    try {
      if (db) {
        await db.syncedMeals.clear();
        await db.pendingMeals.clear();
      }
      const token = localStorage.getItem('token');
      await fetch('http://localhost:5000/api/meals', { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch {
      console.warn("Cleared local queue cache.");
    }
  };

  if (!isAuthenticated) {
    if (authMode === 'register') {
      return (
        <Register 
          onRegisterSuccess={() => setIsAuthenticated(true)} 
          onSwitchToLogin={() => setAuthMode('login')} 
        />
      );
    }
    return (
      <Login 
        onLoginSuccess={() => setIsAuthenticated(true)} 
        onSwitchToRegister={() => setAuthMode('register')} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#070D0A] text-slate-100 p-4 md:p-8 font-sans selection:bg-emerald-500 selection:text-black">
      <Header onClearHistory={handleClearHistory} onLogout={handleLogout} />

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-6">
          <MealForm />
          <SymptomCorrelator />
        </div>

        <div className="lg:col-span-7">
          <MealTimeline />
        </div>
      </main>
    </div>
  );
}
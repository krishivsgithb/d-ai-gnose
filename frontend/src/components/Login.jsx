import React, { useState } from 'react';
import { API_BASE_URL } from '../api';

export default function Login({ onLoginSuccess, onSwitchToRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok && data.token) {
        // 🔑 Save JWT token so syncEngine.js can authenticate requests
        localStorage.setItem('token', data.token);

        if (onLoginSuccess) onLoginSuccess();
      } else {
        setError(data.error || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      setError('Unable to reach authentication server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070D0A] flex items-center justify-center p-4 font-sans text-slate-100">
      <div className="w-full max-w-md bg-[#0E1A14] border border-emerald-900/50 rounded-2xl p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 font-bold text-lg">
            <img 
              src="/gemini.svg" 
              alt="D-AI-GNOSE Logo" 
              className="w-12 h-12 shadow-lg rounded-xl"
            />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide">D-AI-GNOSE</h1>
            <p className="text-xs text-emerald-400/80">Diagnostic Dietary Intelligence</p>
          </div>
        </div>

        <h2 className="text-base font-semibold text-white mb-4">Sign In to Your Account</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">Email Address</label>
            <input 
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full bg-[#070D0A] border border-emerald-900/60 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition"
              required
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">Password</label>
            <input 
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#070D0A] border border-emerald-900/60 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition"
              required
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-semibold py-2.5 rounded-xl transition shadow-lg shadow-emerald-500/20 text-sm mt-2"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <p className="text-xs text-center text-slate-400 mt-6">
          Don't have an account?{' '}
          <button 
            type="button"
            onClick={onSwitchToRegister} 
            className="text-emerald-400 hover:underline font-medium"
          >
            Register
          </button>
        </p>
      </div>
    </div>
  );
}
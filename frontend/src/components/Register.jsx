import React, { useState } from 'react';

export default function Register({ onRegisterSuccess, onSwitchToLogin }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      localStorage.setItem('token', data.token);
      onRegisterSuccess();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#070D0A] flex items-center justify-center p-4 text-white">
      <div className="w-full max-w-md bg-[#0E1A14] border border-emerald-900/40 rounded-2xl p-6 shadow-xl">
        <h2 className="text-2xl font-bold text-emerald-400 mb-2">Create Account</h2>
        <p className="text-xs text-slate-400 mb-6">Sign up to track your meal logs and nutrition.</p>

        {error && (
          <div className="mb-4 p-3 bg-red-950/50 border border-red-800 text-red-300 text-xs rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#070D0A] border border-emerald-900/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
              placeholder="Your Name"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#070D0A] border border-emerald-900/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#070D0A] border border-emerald-900/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm py-2.5 rounded-xl transition"
          >
            Register
          </button>
        </form>

        <p className="mt-4 text-xs text-center text-slate-400">
          Already have an account?{' '}
          <button
            onClick={onSwitchToLogin}
            className="text-emerald-400 hover:underline font-medium"
          >
            Log in
          </button>
        </p>
      </div>
    </div>
  );
}
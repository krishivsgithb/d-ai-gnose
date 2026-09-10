import React from 'react';

export default function Header({ onClearHistory, onLogout }) {
  return (
    <header className="max-w-6xl mx-auto flex items-center justify-between mb-8 pb-4 border-b border-emerald-900/40">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 font-bold text-lg">
          ⚡
        </div>
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide">D-AI-GNOSE</h1>
          <p className="text-xs text-emerald-400/80">Diagnostic Dietary Intelligence</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onClearHistory}
          className="text-xs text-slate-400 hover:text-red-400 border border-slate-800 hover:border-red-900/50 bg-[#0E1A14] px-3 py-2 rounded-xl transition"
        >
          Clear Data
        </button>

        <button
          onClick={onLogout}
          className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 border border-emerald-900/60 hover:border-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20 px-3.5 py-2 rounded-xl transition"
        >
          Log Out
        </button>
      </div>
    </header>
  );
}
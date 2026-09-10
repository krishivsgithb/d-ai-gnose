import React, { useState } from 'react';

export default function SymptomCorrelator() {
  const [symptoms, setSymptoms] = useState('');
  const [analysisResult, setAnalysisResult] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyzeSymptoms = async () => {
    if (!symptoms.trim()) return;

    // 1. Retrieve authenticated JWT token from localStorage
    const token = localStorage.getItem('token');
    if (!token) {
      setAnalysisResult("Authentication token missing. Please log in again.");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult('');

    try {
      // 2. Pass Authorization header along with request
      const res = await fetch('http://localhost:5000/api/analyze-symptoms', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // 👈 Passes JWT token to authenticateToken middleware
        },
        body: JSON.stringify({ symptomDescription: symptoms })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to analyze symptoms.');
      }

      setAnalysisResult(data.analysis || 'Analysis complete.');
    } catch (err) {
      setAnalysisResult(err.message || "Backend unreachable. Ensure Express server is active on port 5000.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="bg-[#0E1A14] border border-emerald-900/50 rounded-2xl p-6 shadow-xl">
      <h2 className="text-sm font-semibold text-amber-400 mb-3 flex items-center gap-2">
        ✨ Symptom Correlator
      </h2>
      <textarea 
        rows="3"
        value={symptoms}
        onChange={(e) => setSymptoms(e.target.value)}
        placeholder="Describe physical discomforts (e.g., heartburn, bloating)..."
        className="w-full bg-[#070D0A] border border-emerald-900/60 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-amber-400/80 transition"
      />
      <button 
        onClick={handleAnalyzeSymptoms}
        disabled={isAnalyzing}
        className="mt-3 w-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-medium py-2 rounded-xl text-sm transition disabled:opacity-50"
      >
        {isAnalyzing ? "Analyzing Symptoms..." : "Analyze Potential Culprits"}
      </button>

      {analysisResult && (
        <div className="mt-4 p-3.5 bg-[#070D0A] border border-amber-500/20 rounded-xl text-xs text-slate-300 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-line">
          {analysisResult}
        </div>
      )}
    </div>
  );
}
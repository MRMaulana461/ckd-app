// components/SimulationAssumptions.jsx
//
// Previously listed fabricated reference values (e.g. "Annual CKD
// progression rate 3.8%/yr, source: KDIGO 2022") that the backend never
// actually used anywhere in its computation — pure decoration. Replaced
// with the assumptions the system ACTUALLY uses today, fetched live from
// GET /health's methodology_notes plus the 4 scenario effect factors from
// GET /policy-scenarios, so this panel can never drift out of sync with
// what the backend is really doing.
import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Database } from 'lucide-react';
import api from '../api/client';

export default function SimulationAssumptions() {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(null);
  const [scenarios, setScenarios] = useState(null);

  useEffect(() => {
    if (!open || notes) return;
    api.health().then((h) => setNotes(h.methodology_notes)).catch(() => {});
    api.policyScenarios().then(setScenarios).catch(() => {});
  }, [open, notes]);

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-700">Simulation Assumptions</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {open && (
        <div className="border-t border-slate-100 px-5 pb-5 pt-3 flex flex-col gap-5">
          <div>
            <p className="text-xs text-slate-500 font-medium mb-2">Methodology Notes</p>
            <ul className="flex flex-col gap-1.5">
              {(notes || []).map((n, i) => (
                <li key={i} className="text-xs text-slate-600 flex items-start gap-2">
                  <span className="text-slate-300 mt-0.5">•</span>
                  <span>{n}</span>
                </li>
              ))}
            </ul>
          </div>

          {scenarios && (
            <div>
              <p className="text-xs text-slate-500 font-medium mb-2">
                Scenario Effect Factors (heuristic, applied before stage bucketing)
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    <th className="pb-2 font-medium text-left">Scenario</th>
                    <th className="pb-2 font-medium text-left">Probability shift ×</th>
                    <th className="pb-2 font-medium text-left">Diabetes cost ×</th>
                  </tr>
                </thead>
                <tbody>
                  {scenarios.map((s) => (
                    <tr key={s.id} className="border-b border-slate-50 last:border-0">
                      <td className="py-2 text-slate-700 font-medium">{s.label}</td>
                      <td className="py-2 font-mono text-slate-600">{s.probability_shift_factor}</td>
                      <td className="py-2 font-mono text-slate-600">{s.diabetes_multiplier_factor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

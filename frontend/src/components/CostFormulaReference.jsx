// components/CostFormulaReference.jsx
//
// NEW component. Shows the exact cost formula (sourced from
// Cost_Formula_CKD_Digital_Twin.pdf) live in the UI, with the stage cost
// table and comorbidity multipliers, so judges/reviewers never need to
// open the PDF to verify the math behind any number on screen.
import React, { useEffect, useState } from 'react';
import { Calculator, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge, SectionLabel, LoadingNote } from './UiPrimitives';
import api from '../api/client';

export default function CostFormulaReference() {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.costFormulaReference().then(setData).catch((e) => setError(e.message));
  }, []);

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium text-slate-700">Cost Formula Reference</span>
          <Badge color="blue">Source: Cost_Formula_CKD_Digital_Twin.pdf</Badge>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {open && (
        <div className="border-t border-slate-100 p-5 flex flex-col gap-5">
          {error && <p className="text-xs text-red-600">{error}</p>}
          {!data && !error && <LoadingNote>Loading formula reference…</LoadingNote>}

          {data && (
            <>
              <div className="bg-slate-900 rounded-lg p-4">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Main Formula</p>
                <p className="text-lg font-mono text-blue-300">{data.main_formula}</p>
              </div>

              <div>
                <p className="text-xs text-slate-500 font-medium mb-2">Comorbidity Multipliers</p>
                <div className="grid grid-cols-3 gap-3">
                  {Object.entries(data.multipliers).map(([key, val]) => (
                    <div key={key} className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs font-semibold text-slate-700 mb-1">{key}</p>
                      <p className="text-xs text-slate-500 font-mono">{val}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-500 font-medium mb-2">Stage Cost Table (USD / year)</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-slate-400 uppercase tracking-wider border-b border-slate-100">
                        <th className="py-2 text-left font-medium">CKD Stage</th>
                        <th className="py-2 text-left font-medium">Annual Cost (USD)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(data.stage_cost_table_usd).map(([stage, cost]) => (
                        <tr key={stage} className="border-b border-slate-50 last:border-0">
                          <td className="py-2 text-slate-600">{stage}</td>
                          <td className="py-2 font-medium text-slate-800">${cost.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-500 font-medium mb-2">Terms Intentionally Omitted / Not Double-Counted</p>
                <div className="flex flex-col gap-2">
                  {Object.entries(data.omitted_terms).map(([term, reason]) => (
                    <div key={term} className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                      <p className="text-xs font-semibold text-amber-800 mb-0.5">{term}</p>
                      <p className="text-xs text-amber-700">{reason}</p>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-xs text-slate-400 border-t border-slate-100 pt-3">{data.source}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

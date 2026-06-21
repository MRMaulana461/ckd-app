// components/ResponsibleAI.jsx
import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ShieldCheck, CheckCircle2, XCircle, ArrowRight, AlertCircle } from 'lucide-react';

export default function ResponsibleAI() {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-700">Responsible AI & Governance</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {open && (
        <div className="border-t border-slate-100 p-5 flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">AI Does</p>
              </div>
              {['Risk stratification', 'Scenario analysis', 'Trend estimation'].map((t) => (
                <p key={t} className="text-sm text-slate-500 py-1 border-b border-slate-50 last:border-0">• {t}</p>
              ))}
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <XCircle className="w-4 h-4 text-red-500" />
                <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">AI Does NOT</p>
              </div>
              {['Diagnose patients', 'Allocate budgets', 'Make policy decisions'].map((t) => (
                <p key={t} className="text-sm text-slate-500 py-1 border-b border-slate-50 last:border-0">• {t}</p>
              ))}
            </div>
          </div>
          <div className="bg-slate-800 rounded-lg p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Human-in-the-Loop Governance</p>
            <div className="flex items-center gap-2 flex-wrap">
              {['AI Analysis', 'Expert Review', 'Policy Discussion', 'Human Decision'].map((step, i, arr) => (
                <React.Fragment key={step}>
                  <span className={`px-3 py-1.5 rounded text-xs font-medium ${i === arr.length - 1 ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}`}>{step}</span>
                  {i < arr.length - 1 && <ArrowRight className="w-3 h-3 text-slate-600 flex-shrink-0" />}
                </React.Fragment>
              ))}
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 flex gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">
              This system should be bypassed by human domain experts during emergency public health responses or individual clinical care pathways.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

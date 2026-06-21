// components/PopulationContext.jsx
//
// Previously showed static demographics for a frontend-only "target
// population" dropdown (general / adults40 / highrisk / ...). That
// dropdown is gone — the backend now always runs the real model across
// the full population CSV (see policy_service.run_policy_simulation), so
// this panel now shows REAL totals from the active scenario's simulation
// result instead of hardcoded numbers. Matches the diagram's
// "Population data dataset" box.
import React from 'react';
import { Users } from 'lucide-react';
import { SectionLabel } from './UiPrimitives';

export default function PopulationContext({ summary }) {
  const rows = [
    { label: 'Dataset source', value: 'UCI Chronic Kidney Disease Dataset' },
    { label: 'Total patients simulated', value: summary ? summary.total_patients.toLocaleString() : '—' },
    { label: 'Predicted CKD cases', value: summary ? summary.predicted_ckd_cases.toLocaleString() : '—' },
    { label: 'Predicted not-CKD cases', value: summary ? summary.predicted_notckd_cases.toLocaleString() : '—' },
    {
      label: 'CKD prevalence (this run)',
      value: summary
        ? `${Math.round((summary.predicted_ckd_cases / summary.total_patients) * 100)}%`
        : '—',
    },
    {
      label: 'Avg. annual cost / patient',
      value: summary ? `$${summary.average_annual_cost_per_patient_usd.toLocaleString()}` : '—',
    },
  ];
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-4 h-4 text-slate-400" />
        <SectionLabel>Population Context</SectionLabel>
      </div>
      <div className="grid grid-cols-2 gap-y-3 gap-x-4">
        {rows.map((r) => (
          <div key={r.label}>
            <p className="text-xs text-slate-400">{r.label}</p>
            <p className="text-sm font-medium text-slate-700">{r.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

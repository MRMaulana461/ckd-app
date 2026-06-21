// components/AIRiskIntelligence.jsx
//
// riskDist comes from /policy-simulation's `risk_distribution` (already a
// chart-ready array: [{name, value}, ...]). stageDist (new) shows the full
// 7-stage breakdown with the probability cutoffs visible inline, so judges
// can see exactly how a probability becomes a stage without opening docs.
import React from 'react';
import { Activity, ArrowRight } from 'lucide-react';
import { Badge, SectionLabel } from './UiPrimitives';
import { RISK_COLORS, STAGE_ORDER, STAGE_COLORS } from '../utils/chartMappers';

const STAGE_THRESHOLD_LABEL = {
  'Stage 1': 'p < 0.25',
  'Stage 2': '0.25 ≤ p < 0.45',
  'Stage 3a': '0.45 ≤ p < 0.60',
  'Stage 3b': '0.60 ≤ p < 0.75',
  'Stage 4': '0.75 ≤ p < 0.85',
  'Stage 5 (Pre-Dialysis)': '0.85 ≤ p < 0.95',
  'Stage 5 + Dialysis': 'p ≥ 0.95',
};

export default function AIRiskIntelligence({ riskDist, stageDist, totalPatients }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-600" />
          <SectionLabel>AI Risk Intelligence</SectionLabel>
        </div>
        <Badge color="blue">CKD Risk Model · probability → stage proxy</Badge>
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-500 mb-5 flex-wrap">
        {['Population Data', 'CKD Risk Model', 'Stage Stratification', 'Policy Simulation'].map((step, i, arr) => (
          <React.Fragment key={step}>
            <span className={`px-2.5 py-1 rounded-full border font-medium ${i === 1 ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
              {step}
            </span>
            {i < arr.length - 1 && <ArrowRight className="w-3 h-3 text-slate-300 flex-shrink-0" />}
          </React.Fragment>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        {(riskDist || []).map((r) => {
          const key = r.name.split(' ')[0].toLowerCase();
          const color = RISK_COLORS[key] || '#94a3b8';
          return (
            <div key={r.name} className="rounded-lg border border-slate-100 p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <p className="text-xs text-slate-500 font-medium">{r.name}</p>
              </div>
              <p className="text-xl font-semibold text-slate-800">{r.value}%</p>
              <div className="mt-2 h-1 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${r.value}%`, backgroundColor: color }} />
              </div>
            </div>
          );
        })}
      </div>

      {stageDist && (
        <div className="border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-500 font-medium mb-3">
            7-Stage Breakdown (probability → stage cutoff shown per row)
          </p>
          <div className="flex flex-col gap-1.5">
            {STAGE_ORDER.map((stage) => {
              const count = stageDist.counts?.[stage] ?? 0;
              const pct = stageDist.percentages?.[stage] ?? 0;
              return (
                <div key={stage} className="flex items-center gap-3">
                  <span className="w-44 text-xs text-slate-600 flex-shrink-0">{stage}</span>
                  <span className="w-32 text-xs text-slate-400 font-mono flex-shrink-0">{STAGE_THRESHOLD_LABEL[stage]}</span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: STAGE_COLORS[stage] }} />
                  </div>
                  <span className="w-20 text-xs text-slate-600 text-right flex-shrink-0">{count} ({pct}%)</span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-slate-400 mt-3">
            Total simulated: {totalPatients?.toLocaleString() ?? '—'} patients. Stage cutoffs are a heuristic
            mapping (not from the source cost PDF) used only to bucket the model's binary CKD probability for cost simulation.
          </p>
        </div>
      )}
    </div>
  );
}

// components/PopulationFlowSimulation.jsx
import React, { useEffect, useState } from 'react';
import { Activity, ArrowDown } from 'lucide-react';
import { Badge, SectionLabel } from './UiPrimitives';
import { SCENARIOS, SCENARIO_COLORS } from '../utils/chartMappers';

const FLOW_STAGES = [
  { key: 'healthy', label: 'Healthy population', color: '#3b82f6', desc: 'Predicted notckd' },
  { key: 'undiag', label: 'Undiagnosed CKD', color: '#8b5cf6', desc: 'Stage proxy 1–2' },
  { key: 'diag', label: 'Diagnosed CKD', color: '#f59e0b', desc: 'Stage proxy 3a–3b' },
  { key: 'advanced', label: 'Advanced CKD', color: '#f97316', desc: 'Stage proxy 4 – Pre-Dialysis' },
  { key: 'dialysis', label: 'Dialysis / ESRD', color: '#ef4444', desc: 'Stage 5 + Dialysis proxy' },
];

function AnimatedBar({ value, max, color }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(max ? Math.round((value / max) * 100) : 0), 80);
    return () => clearTimeout(t);
  }, [value, max]);
  return (
    <div className="h-2 bg-slate-100 rounded-full overflow-hidden w-full">
      <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${width}%`, backgroundColor: color }} />
    </div>
  );
}

// flowsAllScenarios: backend's population_flow_all_scenarios, keyed by the
// 4 new scenario ids. Values now reflect REAL simulated patient counts
// (not a synthetic 100,000 baseline), so `maxVal` is the actual dataset size.
export default function PopulationFlowSimulation({ flowsAllScenarios, scenario, totalPatients }) {
  if (!flowsAllScenarios) return null;
  const maxVal = totalPatients || 1;
  const active = flowsAllScenarios?.[scenario];

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-indigo-600" />
          <SectionLabel>Population Flow Simulation — Digital Twin</SectionLabel>
        </div>
        <Badge color="indigo">Real model output · n={totalPatients?.toLocaleString() ?? '—'}</Badge>
      </div>
      <p className="text-xs text-slate-400 mb-5">
        Disease-state distribution from the real CKD model run on the population dataset under the active scenario.
      </p>

      <div className="grid grid-cols-1 gap-0">
        {FLOW_STAGES.map((stage, i) => {
          const val = active?.[stage.key] ?? 0;
          const pct = maxVal ? ((val / maxVal) * 100).toFixed(1) : '0.0';

          const comparisons = SCENARIOS.map((s) => ({
            id: s.id,
            label: s.label,
            val: flowsAllScenarios[s.id]?.[stage.key] ?? 0,
            color: SCENARIO_COLORS[s.id],
          }));

          return (
            <React.Fragment key={stage.key}>
              <div className="rounded-lg p-4 border border-slate-100" style={{ borderLeft: `3px solid ${stage.color}` }}>
                <div className="flex items-start gap-4">
                  <div className="w-48 flex-shrink-0">
                    <p className="text-sm font-semibold text-slate-800">{stage.label}</p>
                    <p className="text-xs text-slate-400">{stage.desc}</p>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-500">
                        Active: <strong className="text-slate-800">{val.toLocaleString()}</strong> ({pct}%)
                      </span>
                    </div>
                    <AnimatedBar value={val} max={maxVal} color={stage.color} />
                    <div className="mt-2 grid grid-cols-4 gap-1">
                      {comparisons.map((c) => (
                        <div key={c.id} className="flex flex-col gap-0.5">
                          <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${maxVal ? Math.round((c.val / maxVal) * 100) : 0}%`, backgroundColor: c.color }}
                            />
                          </div>
                          <p className="text-xs text-slate-400" style={{ fontSize: '9px' }}>
                            {c.label}: {c.val.toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              {i < FLOW_STAGES.length - 1 && (
                <div className="flex justify-start pl-8 py-0.5">
                  <ArrowDown className="w-4 h-4 text-slate-300" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

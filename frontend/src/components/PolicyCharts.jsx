// components/PolicyCharts.jsx
//
// Previously had a multi-year "Dialysis Burden Projection" line chart
// driven by a synthetic horizon/time-series formula with no real basis.
// The backend no longer produces a time series (the model doesn't predict
// disease progression over time), so that chart is replaced with a direct
// bar-chart comparison of total population cost across the 4 real
// scenarios — an honest visualization of what the backend actually
// computes. The scenario comparison table below is updated to the new
// field names from policy_service.run_policy_simulation's
// `all_scenarios_summary`.
import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { Badge, SectionLabel } from './UiPrimitives';
import { SCENARIOS, SCENARIO_COLORS, SCENARIO_TABLE_ROWS } from '../utils/chartMappers';

export function ScenarioCostComparisonChart({ allScenariosSummary }) {
  if (!allScenariosSummary) return null;

  const chartData = SCENARIOS.map((s) => ({
    id: s.id,
    label: s.label,
    cost: allScenariosSummary[s.id]?.total_population_cost ?? 0,
  }));

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <SectionLabel>Total Population Cost by Scenario</SectionLabel>
          <p className="text-xs text-slate-400 -mt-2">
            Annual CKD Cost = C_stage + C_diabetes + C_HTN + C_CVD, summed across all simulated patients
          </p>
        </div>
        <Badge color="slate">Real model + cost formula output</Badge>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 4, right: 20, left: 10, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v) => `$${(v / 1e6).toFixed(1)}M`} />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
              formatter={(v) => [`$${v.toLocaleString()}`, 'Total cost']}
            />
            <Bar dataKey="cost" radius={[4, 4, 0, 0]}>
              {chartData.map((entry) => (
                <Cell key={entry.id} fill={SCENARIO_COLORS[entry.id]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function ScenarioComparisonTable({ allScenariosSummary, activeScenario }) {
  if (!allScenariosSummary) return null;
  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
        <SectionLabel>Scenario Comparison</SectionLabel>
        <Badge color="slate">Full population CSV run, per scenario</Badge>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-slate-200 text-xs text-slate-400 uppercase tracking-wider">
              <th className="p-4 font-medium">Metric</th>
              {SCENARIOS.map((s) => (
                <th key={s.id} className={`p-4 font-medium ${activeScenario === s.id ? 'bg-blue-50 text-blue-700' : ''}`}>
                  {s.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SCENARIO_TABLE_ROWS.map((row, ri) => (
              <tr key={ri} className="border-b border-slate-100 last:border-0">
                <td className="p-4 font-medium text-slate-600">{row.label}</td>
                {SCENARIOS.map((s) => {
                  const r = allScenariosSummary[s.id];
                  const cell = r ? row.fmt(r[row.key]) : '—';
                  return (
                    <td key={s.id} className={`p-4 ${activeScenario === s.id ? 'bg-blue-50 text-blue-800 font-medium' : 'text-slate-600'}`}>
                      {cell}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

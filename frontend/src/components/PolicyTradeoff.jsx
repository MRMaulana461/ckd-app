// components/PolicyTradeoff.jsx
//
// Previously a 5-axis radar chart with 2 invented constant axes
// (Short-term Affordability, Equity & Access) and hardcoded pros/cons text
// per scenario. Both were disconnected from any real computation.
//
// Replaced with a grouped bar chart of 3 metrics that ARE computed from
// real simulation output (policy_service.get_tradeoff_metrics):
//   dialysis_reduction, early_detection, cost_efficiency
// each normalized 0-100 against the worst-performing scenario for that
// metric. No invented numbers, no fabricated pros/cons.
import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { BarChart2 } from 'lucide-react';
import { Badge, SectionLabel } from './UiPrimitives';
import { SCENARIOS, SCENARIO_COLORS } from '../utils/chartMappers';

const METRIC_LABELS = {
  dialysis_reduction: 'Dialysis-Stage Reduction',
  early_detection: 'Relative CKD Detection',
  cost_efficiency: 'Cost Efficiency',
};

export default function PolicyTradeoff({ tradeoffMetricsAllScenarios }) {
  if (!tradeoffMetricsAllScenarios) return null;

  const chartData = Object.keys(METRIC_LABELS).map((metricKey) => {
    const row = { metric: METRIC_LABELS[metricKey] };
    SCENARIOS.forEach((s) => {
      row[s.id] = tradeoffMetricsAllScenarios[s.id]?.[metricKey] ?? 0;
    });
    return row;
  });

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-slate-500" />
          <SectionLabel>Policy Trade-Off Analysis</SectionLabel>
        </div>
        <Badge color="slate">Normalized against worst-observed scenario, 0–100</Badge>
      </div>
      <p className="text-xs text-slate-400 mb-5">
        Each bar is computed directly from this run's simulation output (dialysis-stage case counts, predicted
        CKD case counts, total population cost) — not a fixed or assumed score.
      </p>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="metric" tick={{ fontSize: 11, fill: '#64748b' }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
            <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            {SCENARIOS.map((s) => (
              <Bar key={s.id} dataKey={s.id} name={s.label} fill={SCENARIO_COLORS[s.id]} radius={[3, 3, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

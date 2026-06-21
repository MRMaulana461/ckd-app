// utils/chartMappers.js
//
// Maps backend response shapes -> recharts-ready props. The backend is the
// source of truth for scenario IDs/labels (GET /policy-scenarios), but we
// keep this static fallback + color map here so charts have a stable color
// per scenario even before that endpoint resolves.

export const SCENARIOS = [
  { id: 'current_policy', label: 'Current Policy', desc: 'Existing screening and management levels' },
  { id: 'enhanced_screening', label: 'Enhanced Screening', desc: 'Expanded screening drives earlier detection' },
  { id: 'screening_diabetes_mgmt', label: 'Screening + Diabetes Mgmt', desc: 'Screening combined with active diabetes management' },
  { id: 'do_nothing', label: 'Do Nothing', desc: 'No investment in screening or management' },
];

export const SCENARIO_COLORS = {
  current_policy: '#3b82f6',
  enhanced_screening: '#14b8a6',
  screening_diabetes_mgmt: '#8b5cf6',
  do_nothing: '#ef4444',
};

export const RISK_COLORS = { low: '#3b82f6', medium: '#f59e0b', high: '#ef4444' };

// Order the 7 PDF-sourced stages should render in, light -> severe.
export const STAGE_ORDER = [
  'Stage 1', 'Stage 2', 'Stage 3a', 'Stage 3b', 'Stage 4',
  'Stage 5 (Pre-Dialysis)', 'Stage 5 + Dialysis',
];

export const STAGE_COLORS = {
  'Stage 1': '#3b82f6',
  'Stage 2': '#60a5fa',
  'Stage 3a': '#f59e0b',
  'Stage 3b': '#f97316',
  'Stage 4': '#fb923c',
  'Stage 5 (Pre-Dialysis)': '#ef4444',
  'Stage 5 + Dialysis': '#b91c1c',
};

// Table rows for the scenario comparison table — now driven off
// /policy-simulation's `all_scenarios_summary` shape.
export const SCENARIO_TABLE_ROWS = [
  { label: 'Predicted CKD cases', key: 'total_predicted_ckd', fmt: (v) => v.toLocaleString() },
  { label: 'Predicted not-CKD', key: 'total_predicted_notckd', fmt: (v) => v.toLocaleString() },
  { label: 'Avg. CKD probability', key: 'average_ckd_probability_percent', fmt: (v) => `${v}%` },
  { label: 'Total population cost', key: 'total_population_cost', fmt: (v) => `$${v.toLocaleString()}` },
  { label: 'Avg. annual cost / patient', key: 'average_annual_cost_per_patient', fmt: (v) => `$${v.toLocaleString()}` },
];

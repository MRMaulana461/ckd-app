// utils/formatters.js
//
// Light formatting helpers only. All actual computation (risk, cost,
// policy heuristics) lives in the Flask backend now — these functions
// just format already-computed numbers for display.

export function formatNumber(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return n.toLocaleString();
}

export function formatCurrencyM(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return `$${n}M`;
}

export function formatCurrency(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function formatPercent(n, decimals = 1) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return `${n.toFixed(decimals)}%`;
}

export function riskBadgeColor(riskCategory) {
  switch (riskCategory) {
    case 'Low':
      return 'blue';
    case 'Medium':
      return 'amber';
    case 'High':
      return 'red';
    default:
      return 'slate';
  }
}

export function yesNoLabel(value) {
  if (typeof value === 'string') return value.toLowerCase() === 'yes' ? 'Yes' : 'No';
  return value ? 'Yes' : 'No';
}

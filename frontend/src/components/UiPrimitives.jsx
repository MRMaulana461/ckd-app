// components/UiPrimitives.jsx
//
// Small shared presentational pieces, unchanged from the old App.jsx,
// just pulled out so every section component can import them instead of
// redefining them inline.
import React from 'react';

export function SliderField({ label, value, min, max, step, onChange, format }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center">
        <label className="text-sm text-slate-500">{label}</label>
        <span className="text-sm font-medium text-slate-800">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-blue-600 bg-slate-200"
      />
    </div>
  );
}

export function KpiCard({ label, value, delta, deltaGood, ciLow, ciHigh, confidence }) {
  return (
    <div className="bg-slate-50 rounded-lg p-4 flex flex-col gap-1">
      <p className="text-xs text-slate-500 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-semibold text-slate-800">{value}</p>
      {ciLow && ciHigh && (
        <p className="text-xs text-slate-400">
          Range: {ciLow.toLocaleString()}–{ciHigh.toLocaleString()}
        </p>
      )}
      {confidence && (
        <span className="self-start text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">
          Confidence: {confidence}
        </span>
      )}
      {delta && <p className={`text-xs ${deltaGood ? 'text-green-700' : 'text-red-600'}`}>{delta}</p>}
    </div>
  );
}

export function SectionLabel({ children }) {
  return <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">{children}</p>;
}

export function Badge({ children, color = 'slate' }) {
  const colors = {
    slate: 'bg-slate-100 text-slate-600',
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
    indigo: 'bg-indigo-50 text-indigo-700',
  };
  return <span className={`text-xs font-medium px-2 py-0.5 rounded ${colors[color]}`}>{children}</span>;
}

export function Divider({ label }) {
  return (
    <div className="flex items-center gap-3 my-1">
      <div className="flex-1 h-px bg-slate-100" />
      {label && <span className="text-xs text-slate-400 font-medium">{label}</span>}
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  );
}

export function InlineError({ message }) {
  if (!message) return null;
  return (
    <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-xs text-red-700">
      {message}
    </div>
  );
}

export function LoadingNote({ children = 'Loading…' }) {
  return <p className="text-xs text-slate-400 italic">{children}</p>;
}

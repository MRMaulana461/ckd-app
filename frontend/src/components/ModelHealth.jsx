// components/ModelHealth.jsx
import React from 'react';
import { RefreshCw } from 'lucide-react';
import { Badge, SectionLabel } from './UiPrimitives';

// In a future iteration this can be backed by a real /model-health
// endpoint (drift detection, retrain logs). For now it stays static
// reference info; it is NOT part of the simulation logic that was moved
// to the backend, so it's safe to keep here without violating Sec. 20.
const MODEL_HEALTH = [
  { label: 'Last retrained', value: 'March 2024' },
  { label: 'Data drift status', value: 'Stable' },
  { label: 'Data quality score', value: '94 / 100' },
  { label: 'Population shift alert', value: 'None detected' },
];

export default function ModelHealth({ backendStatus }) {
  const operational = backendStatus?.model_artifacts_loaded !== false;
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-slate-400" />
          <SectionLabel>Model Health</SectionLabel>
        </div>
        <Badge color={operational ? 'green' : 'red'}>
          {operational ? 'Operational' : 'Artifacts not loaded'}
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {MODEL_HEALTH.map((m) => (
          <div key={m.label} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">
            <p className="text-xs text-slate-500">{m.label}</p>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <p className="text-xs font-medium text-slate-700">{m.value}</p>
            </div>
          </div>
        ))}
      </div>
      {!operational && (
        <p className="text-xs text-red-600 mt-3">
          Backend model artifacts failed to load — prediction endpoints are unavailable until this is fixed.
        </p>
      )}
    </div>
  );
}

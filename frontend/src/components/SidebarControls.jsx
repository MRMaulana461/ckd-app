// components/SidebarControls.jsx
//
// Removed: horizon / screening coverage / budget allocation sliders and
// the "target population" dropdown. Those parameterized the old synthetic
// formula (computeResults etc.) which no longer exists — the backend now
// always runs the real model across the full population CSV, so there is
// nothing left for those sliders to control. Scenario selection remains,
// now driven by the 4 scenarios matching the pipeline diagram.
import React from 'react';
import { HeartPulse } from 'lucide-react';
import { Divider } from './UiPrimitives';
import { SCENARIOS } from '../utils/chartMappers';

export default function SidebarControls({
  scenario, setScenario,
  onRun, running,
  activeTab, setActiveTab,
}) {
  return (
    <aside className="w-72 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col p-6 gap-5 overflow-y-auto">
      <div>
        <div className="flex items-center gap-2 mb-0.5">
          <HeartPulse className="w-4 h-4 text-blue-600" />
          <h1 className="text-base font-semibold text-slate-800">CKD Policy Simulator</h1>
        </div>
        <p className="text-xs text-slate-400 ml-6">Digital Twin · v4.0</p>
      </div>

      <Divider label="View" />
      <div className="flex flex-col gap-1.5">
        {[
          { id: 'dashboard', label: 'Policy Dashboard' },
          { id: 'patient', label: 'Single Patient Predictor' },
          //{ id: 'scenario', label: 'Patient Intervention Simulator' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'dashboard' && (
        <>
          <Divider label="Policy Scenario" />
          <div className="flex flex-col gap-2">
            {SCENARIOS.map((s) => (
              <button
                key={s.id}
                onClick={() => setScenario(s.id)}
                className={`text-left p-3 rounded-lg border text-sm transition-all ${
                  scenario === s.id
                    ? 'border-blue-500 bg-blue-50 text-blue-800'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span className="font-medium block">{s.label}</span>
                <span className="text-xs opacity-70">{s.desc}</span>
              </button>
            ))}
          </div>

          <button
            onClick={onRun}
            disabled={running}
            className={`mt-auto py-2.5 rounded-lg text-sm font-medium text-white transition-colors ${
              running ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {running ? 'Running model on full dataset…' : 'Run simulation →'}
          </button>

          <p className="text-xs text-slate-400 text-center -mt-2">
            Runs the real model across the full population CSV for this scenario.
          </p>
        </>
      )}
    </aside>
  );
}

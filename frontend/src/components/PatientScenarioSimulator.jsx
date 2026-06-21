// components/PatientScenarioSimulator.jsx
//
// Layer C (Sec. 16): patient intervention simulation. Reuses the same
// patient-form shape as SinglePatientPredictor but lets the user pick
// interventions, then calls POST /simulate-scenario and shows baseline
// vs post-intervention.
import React, { useState } from 'react';
import { Sliders, ArrowRight, AlertCircle } from 'lucide-react';
import { Badge, SectionLabel, InlineError, LoadingNote } from './UiPrimitives';
import { usePatientScenario } from '../hooks/usePatientScenario';
import { formatCurrency, formatPercent, riskBadgeColor } from '../utils/formatters';
import api from '../api/client';

const DEFAULT_PATIENT = {
  Age: 58,
  Blood_Pressure: 150,
  Specific_Gravity: 1.02,
  Albumin: 3,
  Sugar: 2,
  Blood_Urea: 90,
  Sodium: 134,
  Potassium: 5.0,
  Packed_Cell_Volume: 32,
  White_Blood_Cell_Count: 9800,
  Red_Blood_Cell_Count: 3.8,
  Hypertension: 'yes',
  Diabetes_Mellitus: 'yes',
  Appetite: 'poor',
  Pedal_Edema: 'yes',
  Coronary_Artery_Disease: 'yes',
};

const INTERVENTIONS = [
  { id: 'control_hypertension', label: 'Control hypertension', desc: 'Sets Hypertension to "no"' },
  { id: 'control_diabetes', label: 'Control diabetes', desc: 'Sets Diabetes Mellitus to "no"' },
  { id: 'improve_edema', label: 'Improve edema', desc: 'Sets Pedal Edema to "no"' },
  { id: 'improve_blood_pressure_10pct', label: 'Improve blood pressure 10%', desc: 'Reduces BP by 10%' },
  { id: 'improve_blood_urea_10pct', label: 'Improve blood urea 10%', desc: 'Reduces blood urea by 10%' },
];

function NumberField({ label, value, onChange, step = 1 }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-slate-500">{label}</label>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border border-slate-200 rounded-md p-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

function ComparisonCard({ title, prediction }) {
  return (
    <div className="bg-slate-50 rounded-lg p-4 flex flex-col gap-2">
      <p className="text-xs text-slate-500 uppercase tracking-wider">{title}</p>
      <div className="flex items-center gap-2">
        <Badge color={prediction.predicted_label === 'ckd' ? 'red' : 'green'}>
          {prediction.predicted_label === 'ckd' ? 'CKD' : 'Not CKD'}
        </Badge>
        <Badge color={riskBadgeColor(prediction.risk_category)}>{prediction.risk_category}</Badge>
      </div>
      <p className="text-2xl font-semibold text-slate-800">{formatPercent(prediction.ckd_probability_percent)}</p>
      <p className="text-xs text-slate-500">Annual cost: <span className="font-medium text-slate-700">{formatCurrency(prediction.cost_breakdown.total_annual_cost)}</span></p>
      <p className="text-xs text-slate-400">{prediction.simulated_stage}</p>
      <p className="text-xs font-mono text-slate-400 bg-white/60 rounded px-1.5 py-1">{prediction.cost_breakdown.formula}</p>
    </div>
  );
}

export default function PatientScenarioSimulator() {
  const [patient, setPatient] = useState(DEFAULT_PATIENT);
  const [selectedInterventions, setSelectedInterventions] = useState(['control_hypertension', 'control_diabetes']);
  const { result, loading, error, simulate } = usePatientScenario();
  const [llmText, setLlmText] = useState(null);
  const [llmLoading, setLlmLoading] = useState(false);
  const [llmSource, setLlmSource] = useState(null);

  function handleChange(key, value) {
    setPatient((p) => ({ ...p, [key]: value }));
  }

  function toggleIntervention(id) {
    setSelectedInterventions((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleRun(e) {
    e.preventDefault();
    setLlmText(null);
    if (selectedInterventions.length === 0) return;
    await simulate(patient, selectedInterventions);
  }

  async function fetchLlmSummary() {
    if (!result) return;
    setLlmLoading(true);
    try {
      const data = await api.llmPatientSummary({ interventionResult: result });
      setLlmText(data.text);
      setLlmSource(data.source);
    } catch (e) {
      setLlmText(`Could not generate narrative: ${e.message}`);
      setLlmSource('error');
    } finally {
      setLlmLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-white rounded-lg border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-1">
          <Sliders className="w-4 h-4 text-blue-600" />
          <SectionLabel>Patient Intervention Simulator</SectionLabel>
        </div>
        <p className="text-xs text-slate-400 mb-5">
          Compare a patient's baseline risk against a "what-if" scenario after applying one or more interventions.
        </p>

        <form onSubmit={handleRun} className="flex flex-col gap-5">
          <div className="grid grid-cols-4 gap-4">
            <NumberField label="Age" value={patient.Age} onChange={(v) => handleChange('Age', v)} />
            <NumberField label="Blood Pressure" value={patient.Blood_Pressure} onChange={(v) => handleChange('Blood_Pressure', v)} />
            <NumberField label="Blood Urea" value={patient.Blood_Urea} onChange={(v) => handleChange('Blood_Urea', v)} />
            <NumberField label="Albumin" value={patient.Albumin} onChange={(v) => handleChange('Albumin', v)} />
          </div>

          <div>
            <p className="text-xs text-slate-500 font-medium mb-2">Interventions to apply</p>
            <div className="grid grid-cols-2 gap-2">
              {INTERVENTIONS.map((iv) => (
                <label
                  key={iv.id}
                  className={`flex items-start gap-2 p-3 rounded-lg border text-sm cursor-pointer transition-all ${
                    selectedInterventions.includes(iv.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedInterventions.includes(iv.id)}
                    onChange={() => toggleIntervention(iv.id)}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="font-medium block text-slate-700">{iv.label}</span>
                    <span className="text-xs text-slate-400">{iv.desc}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || selectedInterventions.length === 0}
            className={`self-start px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-colors ${
              loading || selectedInterventions.length === 0 ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? 'Simulating…' : 'Run intervention simulation →'}
          </button>

          {error && <InlineError message={error} />}
        </form>
      </div>

      {result && (
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <SectionLabel>Before vs After</SectionLabel>
            <Badge color={result.delta_risk.changed ? 'green' : 'slate'}>
              {result.delta_risk.changed ? `Risk shifted: ${result.delta_risk.from} → ${result.delta_risk.to}` : 'Risk bucket unchanged'}
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-4 items-center mb-5">
            <ComparisonCard title="Baseline" prediction={result.baseline_prediction} />
            <div className="flex justify-center">
              <ArrowRight className="w-6 h-6 text-slate-300" />
            </div>
            <ComparisonCard title="Post-Intervention" prediction={result.post_intervention_prediction} />
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500">Change in CKD probability</p>
              <p className={`text-lg font-semibold ${result.delta_probability <= 0 ? 'text-green-700' : 'text-red-600'}`}>
                {result.delta_probability_percent > 0 ? '+' : ''}{result.delta_probability_percent} pts
              </p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500">Change in annual cost</p>
              <p className={`text-lg font-semibold ${result.delta_cost <= 0 ? 'text-green-700' : 'text-red-600'}`}>
                {result.delta_cost > 0 ? '+' : ''}{formatCurrency(result.delta_cost)}
              </p>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 mt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500 font-medium">LLM Explanation (optional)</p>
              <button
                onClick={fetchLlmSummary}
                disabled={llmLoading}
                className="text-xs px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors disabled:opacity-50"
              >
                {llmLoading ? 'Generating…' : llmText ? 'Regenerate' : 'Generate explanation'}
              </button>
            </div>
            {llmLoading && <LoadingNote>Calling LLM advisory service…</LoadingNote>}
            {llmText && (
              <div>
                <p className="text-sm text-slate-600 leading-relaxed">{llmText}</p>
                {llmSource === 'stub' && (
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Stub mode — no HF_API_KEY configured.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

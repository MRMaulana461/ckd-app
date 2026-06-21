// components/SinglePatientPredictor.jsx
//
// Layer B (Sec. 11-13): manual single-patient prediction. Sends the form
// to POST /predict via usePatientPrediction, shows CKD/notCKD, probability,
// risk bucket, simulated stage, cost breakdown, and an optional LLM summary.
import React, { useState } from 'react';
import { Stethoscope, AlertCircle } from 'lucide-react';
import { Badge, SectionLabel, InlineError, LoadingNote } from './UiPrimitives';
import { usePatientPrediction } from '../hooks/usePatientPrediction';
import { formatCurrency, formatPercent, riskBadgeColor } from '../utils/formatters';
import api from '../api/client';

const DEFAULT_PATIENT = {
  Age: 58,
  Blood_Pressure: 90,
  Specific_Gravity: 1.02,
  Albumin: 2,
  Sugar: 1,
  Blood_Urea: 68,
  Sodium: 136,
  Potassium: 4.8,
  Packed_Cell_Volume: 35,
  White_Blood_Cell_Count: 9200,
  Red_Blood_Cell_Count: 4.1,
  Hypertension: 'yes',
  Diabetes_Mellitus: 'yes',
  Appetite: 'poor',
  Pedal_Edema: 'yes',
  Coronary_Artery_Disease: 'yes',
};

const NUMERIC_FIELDS = [
  { key: 'Age', label: 'Age (years)', step: 1 },
  { key: 'Blood_Pressure', label: 'Blood Pressure (mm Hg)', step: 1 },
  { key: 'Specific_Gravity', label: 'Specific Gravity', step: 0.001 },
  { key: 'Albumin', label: 'Albumin', step: 1 },
  { key: 'Sugar', label: 'Sugar', step: 1 },
  { key: 'Blood_Urea', label: 'Blood Urea (mg/dL)', step: 1 },
  { key: 'Sodium', label: 'Sodium (mEq/L)', step: 1 },
  { key: 'Potassium', label: 'Potassium (mEq/L)', step: 0.1 },
  { key: 'Packed_Cell_Volume', label: 'Packed Cell Volume (%)', step: 1 },
  { key: 'White_Blood_Cell_Count', label: 'White Blood Cell Count (/cu mm)', step: 100 },
  { key: 'Red_Blood_Cell_Count', label: 'Red Blood Cell Count (millions/cmm)', step: 0.1 },
];

const YES_NO_FIELDS = [
  { key: 'Hypertension', label: 'Hypertension' },
  { key: 'Diabetes_Mellitus', label: 'Diabetes Mellitus' },
  { key: 'Pedal_Edema', label: 'Pedal Edema' },
  { key: 'Coronary_Artery_Disease', label: 'Coronary Artery Disease' },
];

function NumberInput({ field, value, onChange }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-slate-500">{field.label}</label>
      <input
        type="number"
        step={field.step}
        value={value}
        onChange={(e) => onChange(field.key, e.target.value)}
        className="border border-slate-200 rounded-md p-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

function YesNoSelect({ field, value, onChange }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-slate-500">{field.label}</label>
      <select
        value={value}
        onChange={(e) => onChange(field.key, e.target.value)}
        className="border border-slate-200 rounded-md p-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="no">No</option>
        <option value="yes">Yes</option>
      </select>
    </div>
  );
}

export default function SinglePatientPredictor() {
  const [patient, setPatient] = useState(DEFAULT_PATIENT);
  const { result, loading, error, errorField, predict } = usePatientPrediction();
  const [llmText, setLlmText] = useState(null);
  const [llmLoading, setLlmLoading] = useState(false);
  const [llmSource, setLlmSource] = useState(null);

  function handleChange(key, value) {
    setPatient((p) => ({ ...p, [key]: value }));
  }

  function handleAppetiteChange(value) {
    setPatient((p) => ({ ...p, Appetite: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLlmText(null);
    await predict(patient);
  }

  async function fetchLlmSummary() {
    if (!result) return;
    setLlmLoading(true);
    try {
      const data = await api.llmPatientSummary({ predictionResult: result });
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
          <Stethoscope className="w-4 h-4 text-blue-600" />
          <SectionLabel>Single Patient Predictor</SectionLabel>
        </div>
        <p className="text-xs text-slate-400 mb-5">
          Enter one patient's clinical parameters to estimate CKD risk and an annual cost proxy.
          This is a modeled estimate, not medical advice.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="grid grid-cols-3 gap-4">
            {NUMERIC_FIELDS.map((f) => (
              <NumberInput key={f.key} field={f} value={patient[f.key]} onChange={handleChange} />
            ))}
          </div>

          <div className="grid grid-cols-4 gap-4">
            {YES_NO_FIELDS.map((f) => (
              <YesNoSelect key={f.key} field={f} value={patient[f.key]} onChange={handleChange} />
            ))}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-500">Appetite</label>
              <select
                value={patient.Appetite}
                onChange={(e) => handleAppetiteChange(e.target.value)}
                className="border border-slate-200 rounded-md p-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="good">Good</option>
                <option value="poor">Poor</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`self-start px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-colors ${
              loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? 'Predicting…' : 'Predict CKD risk →'}
          </button>

          {error && (
            <InlineError
              message={errorField ? `${error} (field: ${errorField})` : error}
            />
          )}
        </form>
      </div>

      {result && (
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <SectionLabel>Prediction Result</SectionLabel>
            <Badge color={result.predicted_label === 'ckd' ? 'red' : 'green'}>
              {result.predicted_label === 'ckd' ? 'CKD predicted' : 'Not CKD'}
            </Badge>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-5">
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">CKD Probability</p>
              <p className="text-2xl font-semibold text-slate-800">{formatPercent(result.ckd_probability_percent)}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Risk Category</p>
              <Badge color={riskBadgeColor(result.risk_category)}>{result.risk_category}</Badge>
            </div>
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Simulated Stage</p>
              <p className="text-sm font-medium text-slate-800">{result.simulated_stage}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Est. Annual Cost</p>
              <p className="text-2xl font-semibold text-slate-800">{formatCurrency(result.cost_breakdown.total_annual_cost)}</p>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs text-slate-500 font-medium mb-2">Cost Breakdown</p>
            <div className="grid grid-cols-4 gap-3 mb-3">
              <div className="text-xs text-slate-600">C_stage: <span className="font-medium">{formatCurrency(result.cost_breakdown.c_stage)}</span></div>
              <div className="text-xs text-slate-600">C_diabetes: <span className="font-medium">{formatCurrency(result.cost_breakdown.c_diabetes)}</span></div>
              <div className="text-xs text-slate-600">C_HTN: <span className="font-medium">{formatCurrency(result.cost_breakdown.c_htn)}</span></div>
              <div className="text-xs text-slate-600">C_CVD: <span className="font-medium">{formatCurrency(result.cost_breakdown.c_cvd)}</span></div>
            </div>
            <p className="text-xs font-mono text-slate-400 bg-slate-50 rounded px-2 py-1.5 inline-block">
              {result.cost_breakdown.formula}
            </p>
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

// components/AIRecommendation.jsx
import React, { useState } from 'react';
import { ShieldCheck, Info, Lightbulb } from 'lucide-react';
import { Badge, SectionLabel, LoadingNote } from './UiPrimitives';
import api from '../api/client';

// recommendation + explainability now come from the backend
// (/policy-simulation -> recommendation, explainability). explainability
// items are {factor, value, direction} where `value` is a display string
// (e.g. "16.7%" or "×0.8") computed directly from this run's simulation —
// not a normalized "impact score" like the old version. The LLM narrative
// is optional and fetched on demand via /llm/recommendation.
export default function AIRecommendation({ recommendation, explainability, policySimResult }) {
  const [llmText, setLlmText] = useState(null);
  const [llmLoading, setLlmLoading] = useState(false);
  const [llmSource, setLlmSource] = useState(null);

  if (!recommendation) return null;

  const confidence = [
    { label: 'Input data quality', level: 'High', color: 'text-green-700' },
    { label: 'Model reliability', level: 'High', color: 'text-green-700' },
    { label: 'Scenario-effect assumptions', level: 'Heuristic', color: 'text-amber-600' },
    { label: 'Overall confidence', level: 'Medium', color: 'text-blue-700' },
  ];

  async function fetchNarrative() {
    setLlmLoading(true);
    try {
      const data = await api.llmRecommendation(policySimResult);
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
    <div className="grid grid-cols-3 gap-5">
      <div className="col-span-2 bg-blue-950 rounded-lg p-5 text-white flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-300" />
            <span className="text-xs font-semibold text-blue-300 uppercase tracking-wider">AI Policy Recommendation</span>
          </div>
          <Badge color="amber">Advisory only · requires expert review</Badge>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-blue-400 mb-1">Recommended</p>
            <p className="text-lg font-semibold">{recommendation.scenario}</p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-blue-400 mb-1">Rationale</p>
            <p className="text-sm text-blue-100 leading-relaxed">{recommendation.reason}</p>
          </div>
        </div>

        <div className="border-t border-blue-900 pt-4">
          <div className="flex items-center gap-1.5 mb-3">
            <Lightbulb className="w-3.5 h-3.5 text-blue-300" />
            <p className="text-xs font-semibold text-blue-300 uppercase tracking-wider">Why did the AI recommend this?</p>
          </div>
          <div className="flex flex-col gap-2">
            {(explainability || []).map((f, i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <p className="text-xs text-blue-200 flex-1">
                  <span className="text-blue-400 mr-1">{f.direction === '+' ? '↑' : '↓'}</span>
                  {f.factor}
                </p>
                <p className="text-xs font-mono text-blue-300 flex-shrink-0">{f.value}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-blue-500 mt-3 flex items-center gap-1">
            <Info className="w-3 h-3" />
            Factors are computed directly from this run's simulation output vs. "Do Nothing", not normalized weights.
          </p>
        </div>

        <div className="border-t border-blue-900 pt-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-blue-300 uppercase tracking-wider">LLM Narrative Summary (optional)</p>
            <button
              onClick={fetchNarrative}
              disabled={llmLoading}
              className="text-xs px-2.5 py-1 rounded bg-blue-800 hover:bg-blue-700 text-blue-100 transition-colors disabled:opacity-50"
            >
              {llmLoading ? 'Generating…' : llmText ? 'Regenerate' : 'Generate summary'}
            </button>
          </div>
          {llmLoading && <LoadingNote>Calling LLM advisory service…</LoadingNote>}
          {llmText && (
            <div>
              <p className="text-sm text-blue-100 leading-relaxed">{llmText}</p>
              {llmSource === 'stub' && (
                <p className="text-xs text-blue-500 mt-1">
                  (Stub mode — no HF_API_KEY configured on the backend; figures above are real, this text is templated.)
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-slate-400" />
          <SectionLabel>Decision Confidence</SectionLabel>
        </div>
        <div className="flex flex-col gap-2.5">
          {confidence.map((c, i) => (
            <div key={i} className={`flex items-center justify-between ${i === confidence.length - 1 ? 'border-t border-slate-100 pt-2.5 mt-1' : ''}`}>
              <p className="text-xs text-slate-500">{c.label}</p>
              <span className={`text-xs font-semibold ${c.color}`}>{c.level}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400 leading-relaxed border-t border-slate-100 pt-3">
          Confidence reflects data quality, assumption sensitivity, and model stability. It does not guarantee future outcomes.
        </p>
      </div>
    </div>
  );
}

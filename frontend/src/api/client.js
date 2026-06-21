// api/client.js
//
// Single place for all Flask backend calls. Every function returns the
// `data` payload on success and throws an Error (with .field if available)
// on failure, so calling hooks/components can use plain try/catch.

// SESUDAH
const API_BASE_URL = 'https://zesty-spirit-production.up.railway.app';

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch (networkErr) {
    throw new Error(
      `Could not reach the backend at ${API_BASE_URL}${path}. Is Flask running?`
    );
  }

  let body;
  try {
    body = await res.json();
  } catch {
    throw new Error(`Backend returned a non-JSON response (status ${res.status}).`);
  }

  if (!body.success) {
    const err = new Error(body?.error?.message || 'Request failed.');
    err.field = body?.error?.field;
    err.details = body?.error?.details;
    err.status = res.status;
    throw err;
  }

  return body.data;
}

export const api = {
  health: () => request('/health'),

  predictPatient: (patient) =>
    request('/predict', { method: 'POST', body: JSON.stringify(patient) }),

  simulateScenario: (patient, interventions) =>
    request('/simulate-scenario', {
      method: 'POST',
      body: JSON.stringify({ patient, interventions }),
    }),

  simulateDataset: (maxRows = null) =>
    request('/simulate-dataset', {
      method: 'POST',
      body: JSON.stringify(maxRows ? { max_rows: maxRows } : {}),
    }),

  policySimulation: ({ scenario, maxRows = null }) =>
    request('/policy-simulation', {
      method: 'POST',
      body: JSON.stringify(maxRows ? { scenario, max_rows: maxRows } : { scenario }),
    }),

  policyScenarios: () => request('/policy-scenarios'),

  costFormulaReference: () => request('/cost-formula-reference'),

  llmRecommendation: (policySimulationResult) =>
    request('/llm/recommendation', {
      method: 'POST',
      body: JSON.stringify(policySimulationResult),
    }),

  llmPatientSummary: ({ predictionResult, interventionResult }) =>
    request('/llm/patient-summary', {
      method: 'POST',
      body: JSON.stringify({
        prediction_result: predictionResult,
        intervention_result: interventionResult,
      }),
    }),
};

export default api;

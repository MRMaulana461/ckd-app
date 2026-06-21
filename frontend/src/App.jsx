// App.jsx
//
// v4 adaptation notes — aligned to the pipeline diagram (Population data
// dataset -> CKD Risk Model -> Population Digital Twin -> Policy Scenario
// Simulator -> Impact Forecast Engine -> Cost of Inaction Calculator ->
// AI Policy Insights):
//
// REMOVED:
//   - The 4 old scenarios (Invest now / Delay 2yr / Delay 5yr / Do nothing)
//     and their synthetic formula (policy_service's old compute_scenario_result
//     etc). Replaced with the diagram's real 4 scenarios: Current Policy /
//     Enhanced Screening / Screening + Diabetes Management / Do Nothing —
//     each now runs the REAL trained model across the population CSV with a
//     scenario-specific probability-shift / diabetes-multiplier factor (see
//     backend Config.POLICY_SCENARIOS), not an invented formula.
//   - The horizon / coverage / budget sliders and population dropdown —
//     nothing in the new backend uses them anymore.
//   - The 5-axis radar chart with 2 fabricated constant axes, and the
//     hardcoded pros/cons text per scenario.
//   - The multi-year time-series projection chart (no real time-series
//     model exists).
//
// ADDED:
//   - Cost Formula Reference panel — shows the exact PDF-sourced cost
//     formula live in the UI (GET /cost-formula-reference).
//   - Cost of Inaction Calculator panel — the diagram's explicit box,
//     computed as TotalCost(Do Nothing) - TotalCost(active scenario).
//   - 7-stage breakdown with visible probability cutoffs in
//     AIRiskIntelligence, so the probability->stage->cost chain is fully
//     visible without leaving the dashboard.
//
// All cost figures and scenario effects ultimately come from
// backend/services/cost_service.py and policy_service.py — nothing here is
// computed in the frontend.

import React, { useState, useEffect } from 'react';

import SidebarControls from './components/SidebarControls';
import PopulationContext from './components/PopulationContext';
import ModelHealth from './components/ModelHealth';
import AIRiskIntelligence from './components/AIRiskIntelligence';
import PopulationFlowSimulation from './components/PopulationFlowSimulation';
import { ScenarioCostComparisonChart, ScenarioComparisonTable } from './components/PolicyCharts';
import PolicyTradeoff from './components/PolicyTradeoff';
import CostOfInaction from './components/CostOfInaction';
import AIRecommendation from './components/AIRecommendation';
import CostFormulaReference from './components/CostFormulaReference';
import SimulationAssumptions from './components/SimulationAssumptions';
import ResponsibleAI from './components/ResponsibleAI';
import SinglePatientPredictor from './components/SinglePatientPredictor';
//import PatientScenarioSimulator from './components/PatientScenarioSimulator';
import { InlineError } from './components/UiPrimitives';
import { usePolicySimulation } from './hooks/usePolicySimulation';
import api from './api/client';

export default function CKDSimulator() {
  const [scenario, setScenario] = useState('current_policy');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [backendHealth, setBackendHealth] = useState(null);

  const { data, loading, error, run } = usePolicySimulation();

  useEffect(() => {
    api.health().then(setBackendHealth).catch(() => setBackendHealth(null));
  }, []);

  useEffect(() => {
    handleRun();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleRun() {
    run({ scenario });
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      <SidebarControls
        scenario={scenario} setScenario={setScenario}
        onRun={handleRun} running={loading}
        activeTab={activeTab} setActiveTab={setActiveTab}
      />

      <main className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
        {activeTab === 'patient' && <SinglePatientPredictor />}
        {activeTab === 'scenario' && <PatientScenarioSimulator />}

        {activeTab === 'dashboard' && (
          <>
            {error && <InlineError message={`Policy simulation failed: ${error}`} />}

            <div className="grid grid-cols-2 gap-5">
              <PopulationContext summary={data?.summary} />
              <ModelHealth backendStatus={backendHealth} />
            </div>

            <AIRiskIntelligence
              riskDist={data?.risk_distribution}
              stageDist={data?.stage_distribution}
              totalPatients={data?.summary?.total_patients}
            />

            <PopulationFlowSimulation
              flowsAllScenarios={data?.population_flow_all_scenarios}
              scenario={scenario}
              totalPatients={data?.summary?.total_patients}
            />

            <CostOfInaction costOfInaction={data?.cost_of_inaction} scenarioLabel={data?.scenario_label} />

            <ScenarioCostComparisonChart allScenariosSummary={data?.all_scenarios_summary} />

            <ScenarioComparisonTable allScenariosSummary={data?.all_scenarios_summary} activeScenario={scenario} />

            <PolicyTradeoff tradeoffMetricsAllScenarios={data?.tradeoff_metrics_all_scenarios} />

            <AIRecommendation
              recommendation={data?.recommendation}
              explainability={data?.explainability}
              policySimResult={data}
            />

            <CostFormulaReference />

            <SimulationAssumptions />
            <ResponsibleAI />

            <p className="text-xs text-slate-400 text-center pb-2">
              Results are scenario-based estimates produced under explicit assumptions and should not be interpreted as deterministic forecasts.
              Final decisions require political, ethical, and human consensus. · CKD Digital Twin v4.0
            </p>
          </>
        )}
      </main>
    </div>
  );
}

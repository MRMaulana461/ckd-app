"""
Policy simulation service — Layer A, population/policy side.

REWRITTEN to match the pipeline diagram's "Policy Scenario Simulator" box
exactly: Current Policy / Enhanced Screening / Screening + Diabetes
Management / Do Nothing (replacing the old now/delay2/delay5/nothing
heuristic-only set).

Unlike the previous version, this no longer uses a synthetic formula
disconnected from the model. Each scenario now runs the REAL trained model
+ REAL PDF cost formula across the population CSV
(simulation_service.simulate_dataset), with the scenario's
probability_shift_factor / diabetes_multiplier_factor applied before stage
bucketing and cost calculation (see Config.POLICY_SCENARIOS and
prediction_pipeline.predict_patients for exactly how those knobs work).

This also implements the diagram's separate "Cost of Inaction Calculator"
box: the USD difference between the "Do Nothing" scenario and whichever
scenario is currently active.
"""
from config import Config
from services import simulation_service


def run_one_scenario(artifacts, scenario_id, max_rows=None):
    """Runs the full population simulation for a single policy scenario.
    Returns simulation_service.simulate_dataset's output, tagged with the
    scenario id/label/description/applied factors for transparency."""
    if scenario_id not in Config.POLICY_SCENARIOS:
        raise ValueError(f"Unknown policy scenario: {scenario_id}")

    scenario_def = Config.POLICY_SCENARIOS[scenario_id]

    sim_result = simulation_service.simulate_dataset(
        artifacts,
        max_rows=max_rows,
        probability_shift_factor=scenario_def["probability_shift_factor"],
        diabetes_multiplier_factor=scenario_def["diabetes_multiplier_factor"],
    )

    sim_result["scenario_id"] = scenario_id
    sim_result["scenario_label"] = scenario_def["label"]
    sim_result["scenario_description"] = scenario_def["description"]
    sim_result["applied_factors"] = {
        "probability_shift_factor": scenario_def["probability_shift_factor"],
        "diabetes_multiplier_factor": scenario_def["diabetes_multiplier_factor"],
    }
    return sim_result


def run_all_scenarios(artifacts, max_rows=None):
    """Runs every defined policy scenario once and returns a dict keyed by
    scenario_id. Used so the dashboard can show a side-by-side comparison
    table/chart across all 4 scenarios in one response."""
    return {
        scenario_id: run_one_scenario(artifacts, scenario_id, max_rows=max_rows)
        for scenario_id in Config.POLICY_SCENARIOS
    }


def compute_cost_of_inaction(all_scenarios_result, active_scenario_id):
    """
    Cost of Inaction Calculator (explicit box in the pipeline diagram).

    Formula:
        Cost of Inaction = TotalCost(do_nothing) - TotalCost(active_scenario)

    A POSITIVE value means choosing the active scenario over "Do Nothing"
    SAVES that many USD/year across the simulated population (i.e. that
    much cost is avoided by acting). A NEGATIVE value would mean the
    active scenario is actually more expensive than doing nothing.

    This is a direct population-level cost comparison built on top of the
    PDF cost formula (cost_service.compute_cost) — it does not introduce
    any new cost terms of its own.
    """
    do_nothing_cost = all_scenarios_result["do_nothing"]["summary"]["total_population_cost"]
    active_cost = all_scenarios_result[active_scenario_id]["summary"]["total_population_cost"]

    cost_of_inaction = round(do_nothing_cost - active_cost, 2)

    return {
        "formula": "Cost of Inaction = TotalCost(Do Nothing) − TotalCost(Active Scenario)",
        "do_nothing_total_cost": do_nothing_cost,
        "active_scenario_total_cost": active_cost,
        "active_scenario_id": active_scenario_id,
        "cost_of_inaction_usd": cost_of_inaction,
        "interpretation": (
            "savings_by_acting" if cost_of_inaction >= 0 else "active_scenario_more_expensive"
        ),
    }


def get_population_flow(scenario_result):
    """
    Maps a scenario's stage_distribution counts onto the diagram's 5
    population-flow states (Healthy, Undiagnosed CKD, Diagnosed CKD,
    Advanced CKD, Dialysis) for the "Population Digital Twin" panel.

    Mapping (heuristic grouping of the 7 PDF stages into the diagram's 5
    states — NOT from the PDF, just a relabeling for this panel):
        healthy   = notckd
        undiag    = Stage 1, Stage 2          (early, often undiagnosed)
        diag      = Stage 3a, Stage 3b         (diagnosed, managed)
        advanced  = Stage 4, Stage 5 (Pre-Dialysis)
        dialysis  = Stage 5 + Dialysis
    """
    counts = scenario_result["stage_distribution"]["counts"]
    return {
        "healthy": counts.get(Config.NO_CKD_STAGE_LABEL, 0),
        "undiag": counts.get("Stage 1", 0) + counts.get("Stage 2", 0),
        "diag": counts.get("Stage 3a", 0) + counts.get("Stage 3b", 0),
        "advanced": counts.get("Stage 4", 0) + counts.get("Stage 5 (Pre-Dialysis)", 0),
        "dialysis": counts.get("Stage 5 + Dialysis", 0),
    }


def get_tradeoff_metrics(all_scenarios_result):
    """
    Derives 0-100 trade-off scores for the Policy Trade-Off panel directly
    from real simulation outputs (not invented constants like the old
    version). Each metric is normalized against the worst-performing
    scenario for that metric, so 100 = best observed, 0 = worst observed.
    """
    scenarios = list(all_scenarios_result.keys())

    dialysis_counts = {
        s: all_scenarios_result[s]["stage_distribution"]["counts"].get("Stage 5 + Dialysis", 0)
        for s in scenarios
    }
    detection_counts = {
        s: all_scenarios_result[s]["summary"]["total_predicted_ckd"]
        for s in scenarios
    }
    costs = {
        s: all_scenarios_result[s]["summary"]["total_population_cost"]
        for s in scenarios
    }

    def normalize_lower_better(values, scenario_id):
        worst = max(values.values()) or 1
        best_possible = 0
        v = values[scenario_id]
        return round(100 * (worst - v) / max(worst - best_possible, 1), 1)

    def normalize_higher_better(values, scenario_id):
        best = max(values.values()) or 1
        v = values[scenario_id]
        return round(100 * v / best, 1) if best else 0.0

    metrics = {}
    for s in scenarios:
        metrics[s] = {
            "dialysis_reduction": normalize_lower_better(dialysis_counts, s),
            "early_detection": normalize_higher_better(detection_counts, s),
            "cost_efficiency": normalize_lower_better(costs, s),
        }

    return metrics


def get_recommendation(all_scenarios_result, cost_of_inaction_by_scenario):
    """
    Recommends the scenario with the lowest total population cost among
    the three actionable scenarios (excludes 'do_nothing' itself, since
    recommending "do nothing" as the active policy choice is not useful
    output for a decision-maker).
    """
    actionable = [s for s in all_scenarios_result if s != "do_nothing"]
    best = min(
        actionable,
        key=lambda s: all_scenarios_result[s]["summary"]["total_population_cost"],
    )

    best_label = Config.POLICY_SCENARIOS[best]["label"]
    savings = cost_of_inaction_by_scenario[best]["cost_of_inaction_usd"]
    ckd_count = all_scenarios_result[best]["summary"]["total_predicted_ckd"]

    return {
        "scenario_id": best,
        "scenario": best_label,
        "reason": (
            f"Lowest projected total population cost among actionable scenarios "
            f"(${savings:,.0f}/yr saved vs. Do Nothing across the simulated population), "
            f"with {ckd_count} predicted CKD cases under this scenario."
        ),
        "confidence": "Medium",
    }


def get_explainability(all_scenarios_result, active_scenario_id):
    """Lists the concrete numeric factors that distinguish the active
    scenario's outcome from 'Do Nothing', computed directly from the
    actual simulation results (not invented weights)."""
    active = all_scenarios_result[active_scenario_id]
    baseline = all_scenarios_result["do_nothing"]

    active_dialysis = active["stage_distribution"]["counts"].get("Stage 5 + Dialysis", 0)
    baseline_dialysis = baseline["stage_distribution"]["counts"].get("Stage 5 + Dialysis", 0)
    dialysis_change_pct = (
        round((1 - active_dialysis / baseline_dialysis) * 100, 1) if baseline_dialysis else 0.0
    )

    active_avg_cost = active["summary"]["average_annual_cost_per_patient"]
    baseline_avg_cost = baseline["summary"]["average_annual_cost_per_patient"]
    cost_change_pct = (
        round((1 - active_avg_cost / baseline_avg_cost) * 100, 1) if baseline_avg_cost else 0.0
    )

    factors = [
        {
            "factor": "Dialysis-stage case reduction vs. Do Nothing",
            "value": f"{dialysis_change_pct}%",
            "direction": "+" if dialysis_change_pct >= 0 else "-",
        },
        {
            "factor": "Average per-patient cost reduction vs. Do Nothing",
            "value": f"{cost_change_pct}%",
            "direction": "+" if cost_change_pct >= 0 else "-",
        },
        {
            "factor": "Probability shift factor applied",
            "value": f"×{Config.POLICY_SCENARIOS[active_scenario_id]['probability_shift_factor']}",
            "direction": "+" if Config.POLICY_SCENARIOS[active_scenario_id]["probability_shift_factor"] < 1 else "-",
        },
        {
            "factor": "Diabetes-cost multiplier factor applied",
            "value": f"×{Config.POLICY_SCENARIOS[active_scenario_id]['diabetes_multiplier_factor']}",
            "direction": "+" if Config.POLICY_SCENARIOS[active_scenario_id]["diabetes_multiplier_factor"] < 1 else "-",
        },
    ]
    return factors


def run_policy_simulation(artifacts, scenario, max_rows=None):
    """
    Main entry point for POST /policy-simulation.

    Returns every scenario's full simulation result plus a top-level
    summary for the requested `scenario`, the population flow mapping,
    trade-off metrics, the Cost of Inaction calculation, explainability,
    and a recommendation — everything the dashboard needs in one response.
    """
    all_scenarios_result = run_all_scenarios(artifacts, max_rows=max_rows)

    cost_of_inaction_by_scenario = {
        s: compute_cost_of_inaction(all_scenarios_result, s)
        for s in Config.POLICY_SCENARIOS
    }

    population_flow_all_scenarios = {
        s: get_population_flow(all_scenarios_result[s]) for s in Config.POLICY_SCENARIOS
    }

    tradeoff_metrics_all = get_tradeoff_metrics(all_scenarios_result)
    recommendation = get_recommendation(all_scenarios_result, cost_of_inaction_by_scenario)
    explainability = get_explainability(all_scenarios_result, scenario)

    active = all_scenarios_result[scenario]

    return {
        "scenario": scenario,
        "scenario_label": Config.POLICY_SCENARIOS[scenario]["label"],
        "available_scenarios": [
            {"id": sid, "label": sdef["label"], "description": sdef["description"]}
            for sid, sdef in Config.POLICY_SCENARIOS.items()
        ],
        "summary": {
            "total_patients": active["summary"]["total_patients"],
            "predicted_ckd_cases": active["summary"]["total_predicted_ckd"],
            "predicted_notckd_cases": active["summary"]["total_predicted_notckd"],
            "dialysis_cases": active["stage_distribution"]["counts"].get("Stage 5 + Dialysis", 0),
            "total_population_cost_usd": active["summary"]["total_population_cost"],
            "average_annual_cost_per_patient_usd": active["summary"]["average_annual_cost_per_patient"],
        },
        "all_scenarios_summary": {
            s: all_scenarios_result[s]["summary"] for s in Config.POLICY_SCENARIOS
        },
        "stage_distribution": active["stage_distribution"],
        "risk_distribution": active["risk_distribution"]["chart_data"],
        "population_flow": population_flow_all_scenarios[scenario],
        "population_flow_all_scenarios": population_flow_all_scenarios,
        "tradeoff_metrics": tradeoff_metrics_all[scenario],
        "tradeoff_metrics_all_scenarios": tradeoff_metrics_all,
        "cost_of_inaction": cost_of_inaction_by_scenario[scenario],
        "cost_of_inaction_all_scenarios": cost_of_inaction_by_scenario,
        "explainability": explainability,
        "recommendation": recommendation,
    }

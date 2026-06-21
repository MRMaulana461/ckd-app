"""
Prediction pipeline: orchestrates preprocessing -> model -> stage -> cost for
one or many patients. This is the single place where those layers are wired
together, so /predict, /simulate-scenario, /simulate-dataset, and the policy
dashboard all go through the exact same logic and can't drift out of sync.
"""
from services import preprocessing_service, model_service, risk_service, cost_service


def predict_patients(patient_dicts, artifacts, probability_shift_factor=1.0, diabetes_multiplier_factor=1.0):
    """
    patient_dicts: list[dict] of *cleaned* patient payloads.

    probability_shift_factor: multiplies each patient's raw model
        probability before stage bucketing. Used by policy scenarios
        (Config.POLICY_SCENARIOS) to simulate earlier detection (<1.0) or
        worse outcomes (>1.0). 1.0 = no change (model's raw probability).
        This is a heuristic policy-effect knob, NOT part of the cost PDF.

    diabetes_multiplier_factor: scales the diabetes cost multiplier (see
        cost_service.compute_cost). Used by scenarios like
        "Screening + Diabetes Management". 1.0 = PDF's exact 0.15x.

    Returns: list[dict], one per patient, each containing:
        predicted_label, ckd_probability, ckd_probability_percent,
        adjusted_probability, risk_category, simulated_stage, cost_breakdown
    Raises PreprocessingError / ModelInferenceError on failure (let routes
    catch and translate to error_response).
    """
    X_df, raw_df = preprocessing_service.build_feature_matrix(patient_dicts, artifacts)
    model_outputs = model_service.predict(X_df, artifacts)

    results = []
    for i, model_out in enumerate(model_outputs):
        raw_patient = raw_df.iloc[i].to_dict()
        raw_probability = model_out["ckd_probability"]

        # Apply the policy-scenario probability shift, then clamp to [0, 1]
        # so an aggressive shift factor can't push probability out of range.
        adjusted_probability = max(0.0, min(1.0, raw_probability * probability_shift_factor))

        stage = risk_service.categorize_stage(adjusted_probability)
        risk_category = risk_service.categorize_risk(adjusted_probability)

        cost = cost_service.compute_cost(
            model_out["predicted_label"],
            stage,
            raw_patient,
            diabetes_multiplier_factor=diabetes_multiplier_factor,
        )

        results.append({
            "predicted_label": model_out["predicted_label"],
            "ckd_probability": round(raw_probability, 4),
            "ckd_probability_percent": round(raw_probability * 100, 2),
            "adjusted_probability": round(adjusted_probability, 4),
            "adjusted_probability_percent": round(adjusted_probability * 100, 2),
            "risk_category": risk_category,
            "simulated_stage": cost["simulated_stage"],
            "cost_breakdown": {
                "c_stage": cost["c_stage"],
                "c_diabetes": cost["c_diabetes"],
                "c_htn": cost["c_htn"],
                "c_cvd": cost["c_cvd"],
                "total_annual_cost": cost["total_annual_cost"],
                "formula": cost["formula"],
                # legacy aliases (older frontend code paths)
                "base_stage_cost": cost["base_stage_cost"],
                "diabetes_cost": cost["diabetes_cost"],
                "hypertension_cost": cost["hypertension_cost"],
                "cvd_cost": cost["cvd_cost"],
            },
        })

    return results


def predict_single_patient(patient_dict, artifacts, probability_shift_factor=1.0, diabetes_multiplier_factor=1.0):
    return predict_patients(
        [patient_dict], artifacts,
        probability_shift_factor=probability_shift_factor,
        diabetes_multiplier_factor=diabetes_multiplier_factor,
    )[0]

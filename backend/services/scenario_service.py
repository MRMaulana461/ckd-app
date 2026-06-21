"""
Patient intervention scenario service (Sec. 16).

Takes a baseline patient + a list of intervention codes, applies the
interventions to a copy of the patient's fields, reruns the full prediction
pipeline, and returns a before/after comparison.

This operates entirely on the cleaned patient dict shape (Config.PATIENT_INPUT_FIELDS).
"""
from services.prediction_pipeline import predict_single_patient


def _apply_intervention(patient, intervention):
    """Returns a new patient dict with the intervention applied.
    Numeric improvements clamp at sensible floors so we never produce
    physiologically nonsensical negative values.
    """
    p = dict(patient)

    if intervention == "control_hypertension":
        p["Hypertension"] = "no"

    elif intervention == "control_diabetes":
        p["Diabetes_Mellitus"] = "no"

    elif intervention == "improve_edema":
        p["Pedal_Edema"] = "no"

    elif intervention == "improve_blood_pressure_10pct":
        bp = float(p.get("Blood_Pressure", 0))
        p["Blood_Pressure"] = max(0.0, round(bp * 0.9, 2))

    elif intervention == "improve_blood_urea_10pct":
        urea = float(p.get("Blood_Urea", 0))
        p["Blood_Urea"] = max(0.0, round(urea * 0.9, 2))

    # Unknown interventions are validated away upstream
    # (utils.validators.validate_intervention_list), so no else-branch needed.

    return p


def apply_interventions(patient, interventions):
    """Sequentially applies each intervention in order. Returns the final
    modified patient dict."""
    modified = dict(patient)
    for intervention in interventions:
        modified = _apply_intervention(modified, intervention)
    return modified


def simulate_patient_scenario(patient, interventions, artifacts):
    """
    patient: cleaned patient dict (validated)
    interventions: list[str], already validated against SUPPORTED_INTERVENTIONS

    Returns:
        {
          "baseline_prediction": {...},
          "post_intervention_prediction": {...},
          "delta_probability": float,
          "delta_cost": float,
          "delta_risk": {"from": "High", "to": "Medium", "changed": true},
          "modified_patient_features": {...},
          "interventions_applied": [...]
        }
    """
    baseline = predict_single_patient(patient, artifacts)
    modified_patient = apply_interventions(patient, interventions)
    post = predict_single_patient(modified_patient, artifacts)

    delta_probability = round(
        post["ckd_probability"] - baseline["ckd_probability"], 4
    )
    delta_cost = round(
        post["cost_breakdown"]["total_annual_cost"]
        - baseline["cost_breakdown"]["total_annual_cost"],
        2,
    )

    delta_risk = {
        "from": baseline["risk_category"],
        "to": post["risk_category"],
        "changed": baseline["risk_category"] != post["risk_category"],
    }

    return {
        "baseline_prediction": baseline,
        "post_intervention_prediction": post,
        "delta_probability": delta_probability,
        "delta_probability_percent": round(delta_probability * 100, 2),
        "delta_cost": delta_cost,
        "delta_risk": delta_risk,
        "modified_patient_features": modified_patient,
        "interventions_applied": interventions,
    }

"""
Cost engine — implements the formula from "Cost_Formula_CKD_Digital_Twin.pdf":

    Annual CKD Cost = C_stage + C_hospital + C_dialysis + C_cvd + C_diabetes + C_HTN

Where, per the PDF:
    C_stage     = base cost for the patient's CKD stage (USD table, PDF p.1)
    C_diabetes  = 0.15 * C_stage   (if patient has diabetes)
    C_HTN       = 0.10 * C_stage   (if patient has hypertension)
    C_CVD       = 0.30 * C_stage   (if patient has coronary artery disease)

Deliberate deviations from the PDF (see config.METHODOLOGY_NOTES):
    - C_hospital is OMITTED. The PDF references it in the headline formula
      but provides no value or sub-formula for it, so it is not approximated.
    - C_dialysis is NOT added as a separate term. The PDF's own stage table
      already prices "Stage 5 + Dialysis" ($90,000) above
      "Stage 5 (Pre-Dialysis)" ($50,000) — that $40,000 gap IS C_dialysis
      for that stage. Adding a second dialysis term would double-count it.

Every function here also returns a small "formula" string describing
exactly what was computed, so the frontend can render the live formula
next to the live numbers (judges should never need to open the PDF to
verify the math).
"""
from config import Config


def _is_yes(raw_patient, field):
    val = raw_patient.get(field, "no")
    if isinstance(val, str):
        return val.strip().lower() == "yes"
    return bool(val)


def get_stage_cost(stage_label):
    """Looks up C_stage from the PDF's stage cost table."""
    if stage_label == Config.NO_CKD_STAGE_LABEL:
        return float(Config.NO_CKD_COST_USD)
    return float(Config.STAGE_COST_USD.get(stage_label, 0))


def compute_cost(predicted_label, simulated_stage, raw_patient, diabetes_multiplier_factor=1.0):
    """
    predicted_label: 'ckd' | 'notckd'
    simulated_stage: one of the 7 stage labels, or Config.NO_CKD_STAGE_LABEL
    raw_patient: cleaned patient dict (for comorbidity flags)
    diabetes_multiplier_factor: scales the 0.15x diabetes multiplier — used
        by policy scenarios like "Screening + Diabetes Management" to model
        reduced diabetes-attributable cost. 1.0 = PDF's exact multiplier.

    Returns a dict with each cost component AND the formula string used,
    so the frontend can show both the number and the math beside it.
    """
    label = str(predicted_label).strip().lower()

    if label == "notckd":
        c_stage = 0.0
        stage_for_display = Config.NO_CKD_STAGE_LABEL
    else:
        c_stage = get_stage_cost(simulated_stage)
        stage_for_display = simulated_stage

    c_diabetes = 0.0
    c_htn = 0.0
    c_cvd = 0.0
    has_diabetes = False
    has_htn = False
    has_cvd = False

    if c_stage > 0:
        diabetes_rate = Config.COMORBIDITY_MULTIPLIERS["Diabetes_Mellitus"] * diabetes_multiplier_factor
        if _is_yes(raw_patient, "Diabetes_Mellitus"):
            has_diabetes = True
            c_diabetes = diabetes_rate * c_stage
        if _is_yes(raw_patient, "Hypertension"):
            has_htn = True
            c_htn = Config.COMORBIDITY_MULTIPLIERS["Hypertension"] * c_stage
        if _is_yes(raw_patient, "Coronary_Artery_Disease"):
            has_cvd = True
            c_cvd = Config.COMORBIDITY_MULTIPLIERS["Coronary_Artery_Disease"] * c_stage

    # C_hospital intentionally omitted (see module docstring).
    c_hospital = 0.0
    total_annual_cost = c_stage + c_hospital + c_diabetes + c_htn + c_cvd

    formula_terms = ["C_stage"]
    if has_diabetes:
        formula_terms.append("C_diabetes (0.15 × C_stage)" if diabetes_multiplier_factor == 1.0
                              else f"C_diabetes ({diabetes_multiplier_factor:.2f}×0.15 × C_stage)")
    if has_htn:
        formula_terms.append("C_HTN (0.10 × C_stage)")
    if has_cvd:
        formula_terms.append("C_CVD (0.30 × C_stage)")

    formula_string = "Annual Cost = " + " + ".join(formula_terms) if c_stage > 0 else "Annual Cost = $0 (notckd)"

    return {
        "c_stage": round(c_stage, 2),
        "c_hospital": round(c_hospital, 2),
        "c_diabetes": round(c_diabetes, 2),
        "c_htn": round(c_htn, 2),
        "c_cvd": round(c_cvd, 2),
        "total_annual_cost": round(total_annual_cost, 2),
        "simulated_stage": stage_for_display,
        "formula": formula_string,
        # legacy aliases kept so existing frontend code reading
        # cost_breakdown.base_stage_cost / diabetes_cost / hypertension_cost /
        # cvd_cost keeps working without a breaking rename.
        "base_stage_cost": round(c_stage, 2),
        "diabetes_cost": round(c_diabetes, 2),
        "hypertension_cost": round(c_htn, 2),
        "cvd_cost": round(c_cvd, 2),
    }


# Human-readable formula reference, exposed via /health and usable directly
# by the frontend "Cost Formula Reference" panel without hardcoding the
# string twice.
COST_FORMULA_REFERENCE = {
    "main_formula": "Annual CKD Cost = C_stage + C_diabetes + C_HTN + C_CVD",
    "omitted_terms": {
        "C_hospital": "Omitted — source PDF references this term but provides no value or sub-formula for it.",
        "C_dialysis": "Not added separately — already reflected inside the 'Stage 5 + Dialysis' stage cost ($90,000) vs 'Stage 5 (Pre-Dialysis)' ($50,000).",
    },
    "multipliers": {
        "C_diabetes": "0.15 × C_stage (if Diabetes_Mellitus = yes)",
        "C_HTN": "0.10 × C_stage (if Hypertension = yes)",
        "C_CVD": "0.30 × C_stage (if Coronary_Artery_Disease = yes)",
    },
    "stage_cost_table_usd": dict(Config.STAGE_COST_USD),
    "source": "Cost_Formula_CKD_Digital_Twin.pdf (stage table cites DOI 10.1007/s12325-023-02608-9; multipliers cite https://doi.org/10.1186/s12913-024-11258-8)",
}

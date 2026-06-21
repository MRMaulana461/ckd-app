"""
Central configuration for the CKD backend.
All tunable thresholds / paths live here so nothing is hardcoded
inside route handlers or services.
"""
import os
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ARTIFACTS_DIR = os.path.join(BASE_DIR, "artifacts")


class Config:
    # --- Flask ---
    FLASK_ENV = os.getenv("FLASK_ENV", "development")
    DEBUG = FLASK_ENV == "development"

    # --- Artifact paths ---
    MODEL_PATH = os.path.join(ARTIFACTS_DIR, "model.pkl")
    SCALER_PATH = os.path.join(ARTIFACTS_DIR, "scaler.pkl")
    LABEL_ENCODERS_PATH = os.path.join(ARTIFACTS_DIR, "label_encoders.pkl")
    TARGET_ENCODER_PATH = os.path.join(ARTIFACTS_DIR, "target_encoder.pkl")
    FEATURE_COLUMNS_PATH = os.path.join(ARTIFACTS_DIR, "feature_columns.pkl")
    NUMERIC_COLS_PATH = os.path.join(ARTIFACTS_DIR, "numeric_cols.pkl")
    TRAINING_DATASET_PATH = os.path.join(ARTIFACTS_DIR, "training_dataset.csv")

    # --- Stage stratification thresholds (derived from CKD probability) ---
    # Source: "Cost_Formula_CKD_Digital_Twin.pdf". The PDF's stage cost table
    # has 8 entries (Stage 1 .. Transplant); since the underlying model only
    # outputs a binary ckd/notckd probability, we map that single probability
    # onto 7 CKD-positive proxy stages using these cutoffs. The cutoffs
    # themselves are NOT from the PDF (the PDF has no probability->stage
    # mapping) — they are a heuristic chosen to spread probability mass
    # roughly evenly across the stage table. See METHODOLOGY_NOTES.
    STAGE_PROBABILITY_THRESHOLDS = [
        (0.25, "Stage 1"),
        (0.45, "Stage 2"),
        (0.60, "Stage 3a"),
        (0.75, "Stage 3b"),
        (0.85, "Stage 4"),
        (0.95, "Stage 5 (Pre-Dialysis)"),
        (1.01, "Stage 5 + Dialysis"),  # 1.01 so p == 1.0 is included
    ]

    # Coarse Low/Medium/High bucket, derived from the same proxy stage,
    # kept only for the existing UI badge / chart-color logic.
    RISK_BUCKET_BY_STAGE = {
        "Stage 1": "Low",
        "Stage 2": "Low",
        "Stage 3a": "Medium",
        "Stage 3b": "Medium",
        "Stage 4": "Medium",
        "Stage 5 (Pre-Dialysis)": "High",
        "Stage 5 + Dialysis": "High",
    }

    # --- Cost engine: annual cost per stage, in USD ---
    # Source: PDF Section "CKD Stage Cost Table (Annual Cost per Patient)",
    # citing DOI 10.1007/s12325-023-02608-9. "Kidney Transplant (Year 1)" is
    # included in the table for completeness but is not currently reachable
    # from a probability bucket (the model has no transplant signal) — kept
    # here so the constant lives in one place if a future model adds it.
    STAGE_COST_USD = {
        "Stage 1": 3000,
        "Stage 2": 5000,
        "Stage 3a": 12000,
        "Stage 3b": 20000,
        "Stage 4": 35000,
        "Stage 5 (Pre-Dialysis)": 50000,
        "Stage 5 + Dialysis": 90000,
        "Kidney Transplant (Year 1)": 120000,
    }

    NO_CKD_STAGE_LABEL = "No CKD / Preventive"
    NO_CKD_COST_USD = 0

    # --- Comorbidity cost multipliers (fraction of C_stage) ---
    # Source: PDF "Cost Multipliers for Risk Factors" (NHANES-based).
    COMORBIDITY_MULTIPLIERS = {
        "Diabetes_Mellitus": 0.15,   # C_diabetes = 0.15 * C_stage
        "Hypertension": 0.10,       # C_HTN      = 0.10 * C_stage
        "Coronary_Artery_Disease": 0.30,  # C_CVD = 0.30 * C_stage
    }

    # NOTE on C_hospital: the PDF's headline formula
    #   Annual CKD Cost = C_stage + C_hospital + C_dialysis + C_cvd + C_diabetes
    # references C_hospital as a separate term, but the PDF gives no formula
    # or table for it. Per explicit decision, C_hospital is OMITTED rather
    # than approximated with an invented heuristic.
    #
    # NOTE on C_dialysis: the PDF's stage table already has a dedicated
    # "Stage 5 + Dialysis" = $90,000 row that is higher than plain
    # "Stage 5 (Pre-Dialysis)" = $50,000. We treat that $40,000 difference as
    # C_dialysis being already baked into C_stage for that bucket, rather
    # than adding a second separate dialysis term (which would double-count).

    # --- Categorical values accepted by the model / API ---
    # "yes"/"no" style fields
    YES_NO_FIELDS = [
        "Hypertension",
        "Diabetes_Mellitus",
        "Coronary_Artery_Disease",
        "Pedal_Edema",
        "Anemia",
    ]
    YES_NO_VALUES = {"yes", "no"}

    APPETITE_VALUES = {"good", "poor"}

    # full categorical set seen during original preprocessing (kept for reference /
    # forward-compatibility; not all of these are necessarily in feature_columns.pkl)
    CATEGORICAL_COLS = [
        "Red_Blood_Cells", "Pus_Cell", "Pus_Cell_Clumps", "Bacteria",
        "Hypertension", "Diabetes_Mellitus", "Coronary_Artery_Disease",
        "Appetite", "Pedal_Edema", "Anemia",
    ]

    # Required fields for the manual single-patient form (Sec. 12).
    # Coronary_Artery_Disease is included because the API/UI must accept it
    # even though it may not be a model feature (used by cost engine only).
    PATIENT_INPUT_FIELDS = [
        "Age", "Blood_Pressure", "Specific_Gravity", "Albumin", "Sugar",
        "Blood_Urea", "Sodium", "Potassium", "Packed_Cell_Volume",
        "White_Blood_Cell_Count", "Red_Blood_Cell_Count",
        "Hypertension", "Diabetes_Mellitus", "Appetite", "Pedal_Edema",
        "Coronary_Artery_Disease",
    ]

    CSV_TO_INTERNAL_FIELD_MAP = {
        "Age": "Age",
        "Blood Pressure": "Blood_Pressure",
        "Specific Gravity": "Specific_Gravity",
        "Albumin": "Albumin",
        "Sugar": "Sugar",
        "Blood Urea": "Blood_Urea",
        "Sodium": "Sodium",
        "Potassium": "Potassium",
        "Packed Cell Volume": "Packed_Cell_Volume",
        "White Blood Cell Count": "White_Blood_Cell_Count",
        "Red Blood Cell Count": "Red_Blood_Cell_Count",
        "Hypertension": "Hypertension",
        "Diabetes Mellitus": "Diabetes_Mellitus",
        "Appetite": "Appetite",
        "Pedal Edema": "Pedal_Edema",
        "Coronary Artery Disease": "Coronary_Artery_Disease",
    }

    NUMERIC_INPUT_FIELDS = [
        "Age", "Blood_Pressure", "Specific_Gravity", "Albumin", "Sugar",
        "Blood_Urea", "Sodium", "Potassium", "Packed_Cell_Volume",
        "White_Blood_Cell_Count", "Red_Blood_Cell_Count",
    ]

    CATEGORICAL_INPUT_FIELDS = [
        "Hypertension", "Diabetes_Mellitus", "Appetite", "Pedal_Edema",
        "Coronary_Artery_Disease",
    ]

    # --- Patient intervention definitions (Sec. 16) ---
    SUPPORTED_INTERVENTIONS = [
        "control_hypertension",
        "control_diabetes",
        "improve_edema",
        "improve_blood_pressure_10pct",
        "improve_blood_urea_10pct",
    ]

    # --- Population / policy scenarios ---
    # Replaces the old now/delay2/delay5/nothing set to match the pipeline
    # diagram's "Policy Scenario Simulator" box exactly:
    #   Current Policy, Enhanced Screening, Screening + Diabetes Management,
    #   Do Nothing
    #
    # Each scenario is defined by two heuristic effect knobs (NOT from the
    # PDF — the PDF only supplies the cost table, not a policy-effect model):
    #   probability_shift_factor:
    #       multiplies each patient's model CKD probability before stage
    #       bucketing. <1.0 = earlier detection / less progression (probability
    #       mass shifts toward lower stages). >1.0 = worse outcomes (shifts
    #       toward higher stages). This is the mechanism by which a screening
    #       policy "moves" patients to cheaper stages in the simulation.
    #   diabetes_multiplier_factor:
    #       multiplies the standard 0.15 diabetes cost multiplier. <1.0
    #       represents the modeled effect of active diabetes management
    #       reducing diabetes-attributable cost.
    POLICY_SCENARIOS = {
        "current_policy": {
            "label": "Current Policy",
            "description": "Existing screening and management levels; no change applied.",
            "probability_shift_factor": 1.00,
            "diabetes_multiplier_factor": 1.00,
        },
        "enhanced_screening": {
            "label": "Enhanced Screening",
            "description": "Expanded screening coverage drives earlier detection, shifting patients toward lower CKD stages.",
            "probability_shift_factor": 0.80,
            "diabetes_multiplier_factor": 1.00,
        },
        "screening_diabetes_mgmt": {
            "label": "Screening + Diabetes Management",
            "description": "Combines enhanced screening with active diabetes management, reducing both stage progression and diabetes-attributable cost.",
            "probability_shift_factor": 0.80,
            "diabetes_multiplier_factor": 0.50,
        },
        "do_nothing": {
            "label": "Do Nothing",
            "description": "No screening or management investment; outcomes modeled as modestly worse than current policy.",
            "probability_shift_factor": 1.15,
            "diabetes_multiplier_factor": 1.00,
        },
    }
    DEFAULT_POLICY_SCENARIO = "current_policy"

    # --- Hugging Face LLM config (Sec. 17/18) ---
    HF_API_KEY = os.getenv("HF_API_KEY", "").strip()
    HF_MODEL_ID = os.getenv("HF_MODEL_ID", "mistralai/Mistral-7B-Instruct-v0.3")
    HF_API_URL_TEMPLATE = "https://router.huggingface.co/v1/chat/completions"
    HF_TIMEOUT_SECONDS = 60

    # --- Population simulation ---
    # Cap how many full row-level results we echo back in the API response
    # (the dashboard only needs aggregates + a preview, not 10k rows of JSON).
    DATASET_PREVIEW_ROWS = 25


# Methodology notes — surfaced via /health and included in README.
# Kept here as a single source of truth so frontend "Responsible AI" /
# "Simulation Assumptions" panels and backend docs can reference one string.
METHODOLOGY_NOTES = [
    "The CKD model is a binary CKD classifier (ckd / notckd), not a stage classifier.",
    "The 7-stage proxy (Stage 1 .. Stage 5+Dialysis) is derived from probability cutoffs that are NOT from the source cost PDF; only the per-stage USD cost table and comorbidity multipliers (diabetes 0.15x, hypertension 0.10x, CVD 0.30x) are sourced from it.",
    "'simulated_stage' is a cost-simulation proxy only and does not represent a diagnosed CKD stage.",
    "C_hospital from the source cost formula is intentionally omitted (no defined value in the source); it is not approximated.",
    "C_dialysis is not added as a separate term — it is already reflected in the 'Stage 5 + Dialysis' stage cost ($90,000) versus 'Stage 5 (Pre-Dialysis)' ($50,000).",
    "Cost outputs are estimated simulation outputs, not actual medical bills.",
    "Patient 'investment' / cost burden figures are modeled estimates, not medical advice.",
    "LLM outputs are narrative explanations only and do not replace model predictions.",
    "Policy scenario effects (probability shift, diabetes management factor) are heuristic assumptions, not causal proof, and are not derived from the source cost PDF.",
]

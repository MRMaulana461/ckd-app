"""
CKD Digital Twin — Flask backend entrypoint.

Endpoints:
  GET  /health
  POST /predict
  POST /simulate-dataset
  POST /simulate-scenario
  POST /policy-simulation
  GET  /policy-scenarios
  GET  /cost-formula-reference
  POST /llm/recommendation
  POST /llm/patient-summary

Run:
  pip install -r requirements.txt
  python app.py
"""
import logging

from flask import Flask, request
from flask_cors import CORS

from config import Config, METHODOLOGY_NOTES
from utils.artifact_loader import artifacts
from utils.response_helpers import success_response, error_response
from utils.validators import (
    validate_patient_payload,
    validate_intervention_list,
    validate_policy_payload,
    ValidationError,
)
from services.preprocessing_service import PreprocessingError
from services.model_service import ModelInferenceError
from services.prediction_pipeline import predict_single_patient
from services.scenario_service import simulate_patient_scenario
from services import simulation_service
from services import policy_service, llm_service, cost_service

from config import Config

print("HF_API_KEY loaded?", bool(Config.HF_API_KEY))
print("HF_MODEL_ID =", Config.HF_MODEL_ID)
print("HF_API_KEY preview =", Config.HF_API_KEY[:10] if Config.HF_API_KEY else "EMPTY")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # dev-friendly; tighten origins for production

# Load model artifacts once at startup. If this fails, the app still starts
# (so /health and /policy-simulation keep working) but /predict-family
# endpoints will return a clear 503 instead of crashing.
artifacts.load(Config)


# ─── Health ──────────────────────────────────────────────────────────────

@app.route("/health", methods=["GET"])
def health():
    return success_response({
        "status": "ok",
        "model_artifacts_loaded": artifacts.loaded,
        "artifact_load_errors": artifacts.load_errors,
        "dataset_available": artifacts.dataset_exists(Config),
        "llm_configured": bool(Config.HF_API_KEY),
        "llm_model_id": Config.HF_MODEL_ID,
        "methodology_notes": METHODOLOGY_NOTES,
    })


def _require_artifacts():
    """Returns an error_response tuple if artifacts aren't loaded, else None."""
    if not artifacts.loaded:
        return error_response(
            "Model artifacts are not fully loaded on the server. "
            "Check backend/artifacts/ and server logs.",
            status_code=503,
            details=artifacts.load_errors,
        )
    return None


# ─── Layer B: single patient prediction ─────────────────────────────────

@app.route("/predict", methods=["POST"])
def predict():
    blocked = _require_artifacts()
    if blocked:
        return blocked

    payload = request.get_json(silent=True)
    if payload is None:
        return error_response("Request body must be valid JSON.")

    try:
        cleaned = validate_patient_payload(payload)
        result = predict_single_patient(cleaned, artifacts)
    except ValidationError as e:
        return error_response(e.message, field=e.field)
    except PreprocessingError as e:
        return error_response(e.message, field=getattr(e, "field", None))
    except ModelInferenceError as e:
        return error_response(str(e), status_code=500)

    return success_response(result)


# ─── Layer C: patient intervention scenario ─────────────────────────────

@app.route("/simulate-scenario", methods=["POST"])
def simulate_scenario():
    blocked = _require_artifacts()
    if blocked:
        return blocked

    payload = request.get_json(silent=True)
    if payload is None:
        return error_response("Request body must be valid JSON.")

    patient_raw = payload.get("patient")
    interventions_raw = payload.get("interventions")

    if patient_raw is None:
        return error_response("Missing 'patient' object in request body.", field="patient")

    try:
        cleaned_patient = validate_patient_payload(patient_raw)
        interventions = validate_intervention_list(interventions_raw)
        result = simulate_patient_scenario(cleaned_patient, interventions, artifacts)
    except ValidationError as e:
        return error_response(e.message, field=e.field)
    except PreprocessingError as e:
        return error_response(e.message, field=getattr(e, "field", None))
    except ModelInferenceError as e:
        return error_response(str(e), status_code=500)

    return success_response(result)


# ─── Layer A: population dataset simulation ─────────────────────────────

@app.route("/simulate-dataset", methods=["POST"])
def simulate_dataset_route():
    blocked = _require_artifacts()
    if blocked:
        return blocked

    if not artifacts.dataset_exists(Config):
        return error_response(
            f"Training dataset CSV not found at {Config.TRAINING_DATASET_PATH}.",
            status_code=404,
        )

    payload = request.get_json(silent=True) or {}
    max_rows = payload.get("max_rows")
    try:
        max_rows = int(max_rows) if max_rows is not None else None
    except (TypeError, ValueError):
        return error_response("max_rows must be an integer if provided.", field="max_rows")

    try:
        result = simulation_service.simulate_dataset(artifacts, max_rows=max_rows)
    except simulation_service.DatasetSimulationError as e:
        return error_response(str(e), status_code=500)

    return success_response(result)


# ─── Layer A: policy / population scenario simulation ───────────────────

@app.route("/policy-simulation", methods=["POST"])
def policy_simulation():
    blocked = _require_artifacts()
    if blocked:
        return blocked

    if not artifacts.dataset_exists(Config):
        return error_response(
            f"Training dataset CSV not found at {Config.TRAINING_DATASET_PATH}. "
            "Policy simulation requires the population CSV to run the model "
            "across all 4 scenarios.",
            status_code=404,
        )

    payload = request.get_json(silent=True) or {}

    try:
        cleaned = validate_policy_payload(payload)
    except ValidationError as e:
        return error_response(e.message, field=e.field)

    try:
        result = policy_service.run_policy_simulation(
            artifacts,
            scenario=cleaned["scenario"],
            max_rows=cleaned["max_rows"],
        )
    except simulation_service.DatasetSimulationError as e:
        return error_response(str(e), status_code=500)
    except PreprocessingError as e:
        return error_response(e.message, field=getattr(e, "field", None))
    except ModelInferenceError as e:
        return error_response(str(e), status_code=500)

    return success_response(result)


# ─── Cost formula reference (for the frontend's "show the formula" panel) ─

@app.route("/cost-formula-reference", methods=["GET"])
def cost_formula_reference():
    return success_response(cost_service.COST_FORMULA_REFERENCE)


# ─── Policy scenario definitions (so frontend never hardcodes labels) ────

@app.route("/policy-scenarios", methods=["GET"])
def policy_scenarios():
    return success_response([
        {
            "id": sid,
            "label": sdef["label"],
            "description": sdef["description"],
            "probability_shift_factor": sdef["probability_shift_factor"],
            "diabetes_multiplier_factor": sdef["diabetes_multiplier_factor"],
        }
        for sid, sdef in Config.POLICY_SCENARIOS.items()
    ])


# ─── LLM advisory layer ──────────────────────────────────────────────────

@app.route("/llm/recommendation", methods=["POST"])
def llm_recommendation():
    payload = request.get_json(silent=True)
    if not payload or "summary" not in payload:
        return error_response(
            "Request body must include the structured policy-simulation output "
            "(e.g. the full response from /policy-simulation) under a recognizable shape.",
        )

    narrative = llm_service.generate_policy_recommendation_narrative(payload)
    return success_response(narrative)


@app.route("/llm/patient-summary", methods=["POST"])
def llm_patient_summary():
    payload = request.get_json(silent=True)
    if not payload:
        return error_response("Request body must be valid JSON.")

    prediction_result = payload.get("prediction_result")
    intervention_result = payload.get("intervention_result")

    if not prediction_result and not intervention_result:
        return error_response(
            "Provide either 'prediction_result' (from /predict) or "
            "'intervention_result' (from /simulate-scenario) in the request body.",
        )

    # If only intervention_result is given, it already contains baseline +
    # post prediction internally, so prediction_result can be omitted.
    narrative = llm_service.generate_patient_summary_narrative(
        prediction_result or intervention_result.get("post_intervention_prediction"),
        intervention_result,
    )
    return success_response(narrative)


# ─── Error handlers ───────────────────────────────────────────────────────

@app.errorhandler(404)
def not_found(e):
    return error_response("Endpoint not found.", status_code=404)


@app.errorhandler(405)
def method_not_allowed(e):
    return error_response("Method not allowed for this endpoint.", status_code=405)


@app.errorhandler(500)
def internal_error(e):
    logger.exception("Unhandled server error")
    return error_response("Internal server error.", status_code=500)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=Config.DEBUG)

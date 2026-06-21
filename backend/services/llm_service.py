"""
Hugging Face LLM advisory layer (Sec. 17/18) — narrative explanations only.

This version is LIVE-CAPABLE:
- If HF_API_KEY is present, it will attempt a real Hugging Face Inference API call.
- If HF_API_KEY is missing OR the HF call fails, it gracefully falls back to a
  structured templated summary so the dashboard still works.

Important:
- The LLM NEVER receives raw patient data beyond structured outputs already
  computed by the backend (predicted_label, probability, risk bucket, cost,
  scenario deltas, policy metrics).
"""
import logging
import requests

from config import Config

logger = logging.getLogger(__name__)

NO_KEY_MESSAGE = (
    "LLM advisory output is currently unavailable because no Hugging Face API key "
    "is configured on the backend. Showing structured model results only — figures "
    "above are unaffected."
)

HF_FAILURE_MESSAGE = (
    "LLM advisory output is currently unavailable because Hugging Face inference "
    "could not be completed right now. Showing structured model results only — "
    "figures above are unaffected."
)


def _hf_configured():
    return bool(Config.HF_API_KEY)


def _build_headers():
    return {
        "Authorization": f"Bearer {Config.HF_API_KEY}",
        "Content-Type": "application/json",
    }


def _call_hf_api(prompt):
    """
    Calls Hugging Face's router-based chat completions endpoint
    (the classic api-inference.huggingface.co endpoint is deprecated/unreachable).
    """
    url = Config.HF_API_URL_TEMPLATE  # no model_id in path anymore
    payload = {
        "model": Config.HF_MODEL_ID,
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "max_tokens": 220,
        "temperature": 0.4,
    }

    logger.info("HF inference URL: %s", url)
    logger.info("HF model: %s", Config.HF_MODEL_ID)

    resp = requests.post(
        url,
        headers=_build_headers(),
        json=payload,
        timeout=Config.HF_TIMEOUT_SECONDS,
    )

    logger.info("HF status: %s", resp.status_code)
    logger.info("HF response preview: %s", resp.text[:1000])

    resp.raise_for_status()
    result = resp.json()

    # OpenAI-style chat completion response shape
    try:
        return result["choices"][0]["message"]["content"].strip()
    except (KeyError, IndexError, TypeError) as e:
        raise ValueError(f"Unexpected Hugging Face response shape: {result}") from e


def _generate(prompt, fallback_text):
    """
    Single entry point used by both public functions below.

    Returns a dict:
        {
            "text": str,
            "source": "huggingface" | "stub",
            "available": bool,
            "reason": "ok" | "missing_api_key" | "hf_request_failed"
        }

    Never raises — failures degrade to a structured fallback.
    """
    if not _hf_configured():
        logger.warning("HF_API_KEY missing; returning stub narrative.")
        return {
            "text": fallback_text,
            "source": "stub",
            "available": False,
            "reason": "missing_api_key",
            "message": NO_KEY_MESSAGE,
        }

    try:
        text = _call_hf_api(prompt)
        return {
            "text": text,
            "source": "huggingface",
            "available": True,
            "reason": "ok",
            "message": None,
        }
    except Exception as e:  # noqa: BLE001
        logger.exception("HF API call failed; falling back to stub narrative.")
        return {
            "text": fallback_text,
            "source": "stub",
            "available": False,
            "reason": "hf_request_failed",
            "message": f"{HF_FAILURE_MESSAGE} Error: {str(e)}",
        }


def generate_policy_recommendation_narrative(policy_output):
    """
    policy_output: structured dict returned by policy_service.run_policy_simulation
    """
    rec = policy_output.get("recommendation", {})
    summary = policy_output.get("summary", {})
    cost_of_inaction = policy_output.get("cost_of_inaction", {})

    cost_value = summary.get("total_population_cost_usd")
    cost_str = f"${cost_value:,.0f}/yr" if isinstance(cost_value, (int, float)) else "N/A"

    fallback = (
        f"Recommended scenario: {rec.get('scenario', 'N/A')}. "
        f"{rec.get('reason', '')} "
        f"Active scenario summary — predicted CKD cases: {summary.get('predicted_ckd_cases', 'N/A')}, "
        f"dialysis-stage cases: {summary.get('dialysis_cases', 'N/A')}, "
        f"total population cost: {cost_str}."
    )

    if isinstance(cost_of_inaction.get("cost_of_inaction_usd"), (int, float)):
        fallback += (
            f" Cost of inaction vs. Do Nothing: "
            f"${cost_of_inaction['cost_of_inaction_usd']:,.0f}/yr."
        )

    prompt = (
        "You are a policy advisory assistant for a CKD digital twin dashboard. "
        "Given the structured policy simulation output below, write a concise 3-4 sentence "
        "executive summary for a health ministry decision-maker. "
        "Do not invent numbers. Use only the provided values. "
        "Focus on recommended scenario, CKD burden, dialysis burden, and cost implications. "
        "Output ONLY the summary text itself — no preamble, no introduction like "
        "'Here is a summary' or 'Sure, here's...', no markdown, no quotation marks.\n\n"
        f"Policy summary: {summary}\n"
        f"Cost of inaction: {cost_of_inaction}\n"
        f"Recommendation: {rec}\n"
    )

    return _generate(prompt, fallback)


def generate_patient_summary_narrative(prediction_result, intervention_result=None):
    """
    prediction_result: dict from prediction pipeline
    intervention_result: optional dict from scenario_service.simulate_patient_scenario
    """
    if intervention_result:
        fallback = (
            f"Baseline risk: {intervention_result['baseline_prediction']['risk_category']} "
            f"({intervention_result['baseline_prediction']['ckd_probability_percent']}% probability). "
            f"After interventions ({', '.join(intervention_result['interventions_applied'])}), "
            f"risk is {intervention_result['post_intervention_prediction']['risk_category']} "
            f"({intervention_result['post_intervention_prediction']['ckd_probability_percent']}% probability), "
            f"a change of {intervention_result['delta_probability_percent']} percentage points and "
            f"an estimated annual cost change of {intervention_result['delta_cost']}."
        )

        prompt = (
            "You are a clinical decision-support narrator (not a diagnostician). "
            "Summarize the before/after CKD intervention result below in 2-3 plain-language sentences. "
            "Do not give treatment advice. Explain only the model outputs and cost impact.\n\n"
            f"Intervention result: {intervention_result}\n"
        )
    else:
        fallback = (
            f"Predicted status: {prediction_result['predicted_label']}. "
            f"Risk category: {prediction_result['risk_category']} "
            f"({prediction_result['ckd_probability_percent']}% CKD probability). "
            f"Estimated annual cost: {prediction_result['cost_breakdown']['total_annual_cost']}."
        )

        prompt = (
            "You are a clinical decision-support narrator (not a diagnostician). "
            "Summarize the CKD risk prediction result below in 2-3 plain-language sentences. "
            "Do not give medical advice. Explain only the predicted risk, cost, and what the numbers mean.\n\n"
            f"Prediction result: {prediction_result}\n"
        )

    return _generate(prompt, fallback)
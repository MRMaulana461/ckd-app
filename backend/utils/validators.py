"""
Validation helpers for incoming JSON payloads (Sec. 28).

Each validate_* function returns (is_valid, error_message, error_field).
Routes are responsible for turning that into an error_response().
"""
from config import Config


class ValidationError(Exception):
    def __init__(self, message, field=None):
        super().__init__(message)
        self.message = message
        self.field = field


def validate_patient_payload(payload):
    """
    Validates a single manual-patient JSON payload (Sec. 12/28).
    Raises ValidationError on the first problem found.
    Returns a cleaned dict (same keys, normalized casing for categoricals)
    on success.
    """
    if not isinstance(payload, dict):
        raise ValidationError("Patient payload must be a JSON object.")

    cleaned = {}

    # Required fields present
    missing = [f for f in Config.PATIENT_INPUT_FIELDS if f not in payload or payload[f] in (None, "")]
    if missing:
        raise ValidationError(
            f"Missing required field(s): {', '.join(missing)}",
            field=missing[0],
        )

    # Numeric fields
    for field in Config.NUMERIC_INPUT_FIELDS:
        raw = payload[field]
        try:
            cleaned[field] = float(raw)
        except (TypeError, ValueError):
            raise ValidationError(
                f"Field '{field}' must be numeric, got: {raw!r}",
                field=field,
            )

    # Categorical fields
    for field in Config.CATEGORICAL_INPUT_FIELDS:
        raw = payload[field]
        if not isinstance(raw, str):
            raise ValidationError(f"Field '{field}' must be a string.", field=field)
        norm = raw.strip().lower()

        if field == "Appetite":
            if norm not in Config.APPETITE_VALUES:
                raise ValidationError(
                    f"Invalid value for Appetite: '{raw}'. Expected one of {sorted(Config.APPETITE_VALUES)}.",
                    field=field,
                )
        else:
            if norm not in Config.YES_NO_VALUES:
                raise ValidationError(
                    f"Invalid categorical value for {field}: '{raw}'. Expected 'yes' or 'no'.",
                    field=field,
                )
        cleaned[field] = norm

    return cleaned


def validate_intervention_list(interventions):
    if not isinstance(interventions, list) or len(interventions) == 0:
        raise ValidationError(
            "interventions must be a non-empty list.", field="interventions"
        )
    unknown = [i for i in interventions if i not in Config.SUPPORTED_INTERVENTIONS]
    if unknown:
        raise ValidationError(
            f"Unknown intervention(s): {', '.join(unknown)}. "
            f"Supported: {', '.join(Config.SUPPORTED_INTERVENTIONS)}",
            field="interventions",
        )
    return interventions


def validate_policy_payload(payload):
    """
    Validates the request body for POST /policy-simulation.

    NOTE: horizon/coverage/budget/population sliders from the old
    synthetic-formula dashboard are no longer used by the backend — the
    new policy simulation runs the real model + real cost formula directly
    on the population CSV for each of the 4 defined scenarios
    (Config.POLICY_SCENARIOS), so there is nothing for those sliders to
    parameterize anymore. Only `scenario` (and optional `max_rows`, mainly
    for local testing on a subset) are accepted now.
    """
    if not isinstance(payload, dict):
        raise ValidationError("Policy simulation payload must be a JSON object.")

    cleaned = {}
    cleaned["scenario"] = payload.get("scenario", Config.DEFAULT_POLICY_SCENARIO)

    if cleaned["scenario"] not in Config.POLICY_SCENARIOS:
        raise ValidationError(
            f"scenario must be one of: {', '.join(Config.POLICY_SCENARIOS.keys())}.",
            field="scenario",
        )

    max_rows = payload.get("max_rows")
    if max_rows is not None:
        try:
            cleaned["max_rows"] = int(max_rows)
        except (TypeError, ValueError):
            raise ValidationError("max_rows must be an integer if provided.", field="max_rows")
    else:
        cleaned["max_rows"] = None

    return cleaned

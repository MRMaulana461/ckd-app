"""
Population simulation service (Sec. 14) — Layer A.

Runs the prediction pipeline across an entire CSV dataset and aggregates
the results into the metrics the dashboard needs (totals, risk
distribution, average cost, etc).
"""
import pandas as pd
import logging

from config import Config
from utils.validators import validate_patient_payload, ValidationError
from services.prediction_pipeline import predict_patients

logger = logging.getLogger(__name__)


class DatasetSimulationError(Exception):
    pass


def load_dataset(path=None):
    path = path or Config.TRAINING_DATASET_PATH
    try:
        df = pd.read_csv(path)
    except FileNotFoundError:
        raise DatasetSimulationError(f"Training dataset CSV not found at {path}")
    except Exception as e:  # noqa: BLE001
        raise DatasetSimulationError(f"Failed to read CSV dataset: {e}")
    return df


def _row_to_patient_dict(row):
    d = {}
    for csv_col, internal_field in Config.CSV_TO_INTERNAL_FIELD_MAP.items():
        if csv_col in row.index:
            d[internal_field] = row[csv_col]
    return d


def simulate_dataset(artifacts, csv_path=None, max_rows=None, probability_shift_factor=1.0, diabetes_multiplier_factor=1.0):
    """
    Runs the full pipeline over every row in the CSV dataset.

    probability_shift_factor / diabetes_multiplier_factor: passed straight
    through to prediction_pipeline.predict_patients, letting callers (e.g.
    policy_service running one of the 4 policy scenarios) reuse this exact
    same function instead of duplicating dataset-loading logic.

    Returns:
        {
          "summary": {
             "total_patients": int,
             "total_predicted_ckd": int,
             "total_predicted_notckd": int,
             "average_ckd_probability": float,
             "total_population_cost": float,
             "average_annual_cost_per_patient": float,
          },
          "risk_distribution": {...},   # from risk_service.risk_distribution
          "stage_distribution": {...},  # from risk_service.stage_distribution
          "preview": [ {row-level result}, ... ]   # first N rows only
        }
    """
    df = load_dataset(csv_path)

    if max_rows:
        df = df.head(max_rows)

    patient_dicts = []
    skipped_rows = []

    for idx, row in df.iterrows():
        raw_dict = _row_to_patient_dict(row)
        try:
            cleaned = validate_patient_payload(raw_dict)
            patient_dicts.append(cleaned)
        except ValidationError as e:
            skipped_rows.append({"row_index": int(idx), "reason": e.message})

    if not patient_dicts:
        raise DatasetSimulationError(
            "No valid rows found in dataset after validation. "
            f"Skipped {len(skipped_rows)} row(s)."
        )

    results = predict_patients(
        patient_dicts, artifacts,
        probability_shift_factor=probability_shift_factor,
        diabetes_multiplier_factor=diabetes_multiplier_factor,
    )

    total = len(results)
    ckd_count = sum(1 for r in results if r["predicted_label"] == "ckd")
    notckd_count = total - ckd_count
    avg_probability = round(
        sum(r["adjusted_probability"] for r in results) / total, 4
    )
    total_cost = round(
        sum(r["cost_breakdown"]["total_annual_cost"] for r in results), 2
    )
    avg_cost = round(total_cost / total, 2) if total else 0.0

    from services import risk_service
    risk_dist = risk_service.risk_distribution([r["risk_category"] for r in results])
    stage_dist = risk_service.stage_distribution([r["simulated_stage"] for r in results])

    summary = {
        "total_patients": total,
        "total_predicted_ckd": ckd_count,
        "total_predicted_notckd": notckd_count,
        "average_ckd_probability": avg_probability,
        "average_ckd_probability_percent": round(avg_probability * 100, 2),
        "total_population_cost": total_cost,
        "average_annual_cost_per_patient": avg_cost,
        "rows_skipped_invalid": len(skipped_rows),
    }

    preview = results[: Config.DATASET_PREVIEW_ROWS]

    return {
        "summary": summary,
        "risk_distribution": risk_dist,
        "stage_distribution": stage_dist,
        "preview": preview,
        "skipped_rows_sample": skipped_rows[:10],
    }

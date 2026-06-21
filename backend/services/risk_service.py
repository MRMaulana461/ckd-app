"""
Risk / stage stratification service.

Maps a CKD probability to one of 7 proxy stages (Stage 1 .. Stage 5 +
Dialysis) using Config.STAGE_PROBABILITY_THRESHOLDS, then derives a coarse
Low/Medium/High bucket from that stage for the existing UI badges/colors.

IMPORTANT (see config.METHODOLOGY_NOTES): the probability cutoffs are a
heuristic, NOT from the source cost PDF. Only the per-stage USD cost table
itself (used in cost_service.py) is sourced from the PDF.
"""
from config import Config


def categorize_stage(ckd_probability):
    """ckd_probability: float in [0, 1]. Returns one of the 7 stage labels
    in Config.STAGE_PROBABILITY_THRESHOLDS, e.g. 'Stage 3a'."""
    for upper_bound, stage_label in Config.STAGE_PROBABILITY_THRESHOLDS:
        if ckd_probability < upper_bound:
            return stage_label
    # Fallback (shouldn't be reached since the last threshold is 1.01)
    return Config.STAGE_PROBABILITY_THRESHOLDS[-1][1]


def categorize_risk(ckd_probability):
    """Coarse Low/Medium/High bucket, derived from the stage. Kept as the
    primary public function name so callers (prediction_pipeline, etc.)
    don't need to change."""
    stage = categorize_stage(ckd_probability)
    return Config.RISK_BUCKET_BY_STAGE.get(stage, "Medium")


def risk_distribution(risk_categories):
    """
    risk_categories: list[str] of 'Low'/'Medium'/'High' values.
    Returns counts + percentages, plus a chart-ready list matching the
    shape the frontend already expects:
        [{"name": "Low Risk", "value": 61}, ...]
    """
    total = len(risk_categories)
    counts = {"Low": 0, "Medium": 0, "High": 0}
    for r in risk_categories:
        if r in counts:
            counts[r] += 1

    if total == 0:
        percentages = {"Low": 0, "Medium": 0, "High": 0}
    else:
        percentages = {
            k: round((v / total) * 100, 1) for k, v in counts.items()
        }

    chart_data = [
        {"name": "Low Risk", "value": percentages["Low"]},
        {"name": "Medium Risk", "value": percentages["Medium"]},
        {"name": "High Risk", "value": percentages["High"]},
    ]

    return {
        "counts": counts,
        "percentages": percentages,
        "chart_data": chart_data,
        "total": total,
    }


def stage_distribution(stage_labels):
    """
    stage_labels: list[str] of the 7 stage labels (+ optionally
    Config.NO_CKD_STAGE_LABEL for notckd patients).
    Returns counts + percentages per stage — used by the population
    simulation summary so the dashboard can show the full stage breakdown,
    not just the coarse Low/Medium/High bucket.
    """
    total = len(stage_labels)
    all_stages = [Config.NO_CKD_STAGE_LABEL] + [
        s for _, s in Config.STAGE_PROBABILITY_THRESHOLDS
    ]
    counts = {s: 0 for s in all_stages}
    for s in stage_labels:
        if s in counts:
            counts[s] += 1

    percentages = {
        s: round((c / total) * 100, 1) if total else 0 for s, c in counts.items()
    }

    return {"counts": counts, "percentages": percentages, "total": total}

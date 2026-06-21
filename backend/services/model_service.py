"""
Model inference service.

Wraps the saved XGBoost model + target encoder. Does NOT know about cost or
risk bucketing — that's risk_service / cost_service. This module's only job
is: given a model-ready feature matrix, return predicted labels and CKD
probabilities.
"""
import numpy as np


class ModelInferenceError(Exception):
    pass


def predict(X_df, artifacts):
    """
    X_df: model-ready feature DataFrame (output of preprocessing_service.build_feature_matrix)

    Returns: list of dicts, one per row:
        {
          "predicted_label": "ckd" | "notckd",
          "ckd_probability": float (0-1),
        }
    """
    model = artifacts.model
    target_encoder = artifacts.target_encoder

    try:
        proba_matrix = model.predict_proba(X_df)
    except Exception as e:  # noqa: BLE001
        raise ModelInferenceError(f"Model inference failed: {e}")

    # Identify which column of predict_proba corresponds to the "ckd" class.
    # target_encoder.classes_ gives us the label->index mapping used at
    # training time (sklearn LabelEncoder convention: alphabetical order
    # unless overridden). We look up "ckd" explicitly rather than assuming
    # index 1, to stay correct regardless of class ordering.
    classes = list(target_encoder.classes_)
    classes_lower = [str(c).lower() for c in classes]

    if "ckd" in classes_lower:
        ckd_idx = classes_lower.index("ckd")
    else:
        # Fallback: assume binary classifier where index 1 is the positive
        # ("ckd") class, consistent with the spec's predict_proba[:, 1] usage.
        ckd_idx = 1 if proba_matrix.shape[1] > 1 else 0

    ckd_probabilities = proba_matrix[:, ckd_idx]

    predicted_indices = np.argmax(proba_matrix, axis=1)
    predicted_labels_raw = [classes[i] for i in predicted_indices]
    predicted_labels = [str(lbl).lower() for lbl in predicted_labels_raw]

    results = []
    for label, proba in zip(predicted_labels, ckd_probabilities):
        results.append({
            "predicted_label": label,
            "ckd_probability": float(proba),
        })
    return results

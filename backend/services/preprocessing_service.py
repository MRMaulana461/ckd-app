"""
Preprocessing service (Sec. 27).

Responsibilities:
- Convert a single patient dict (or a DataFrame row) into a model-ready
  feature row using the SAVED label_encoders / scaler — never refit.
- Align columns exactly to feature_columns.pkl.
- Scale only numeric_cols.pkl.
- Keep Coronary_Artery_Disease (and any other non-model field) out of the
  inference matrix, but never drop it from the raw payload — the cost
  engine and scenario logic need it downstream.
"""
import pandas as pd
import numpy as np
import logging

logger = logging.getLogger(__name__)


class PreprocessingError(Exception):
    def __init__(self, message, field=None):
        super().__init__(message)
        self.message = message
        self.field = field


def _encode_categorical(df, col, label_encoders):
    """Encode a single categorical column using a saved LabelEncoder.
    Raises PreprocessingError if a value wasn't seen during training.
    """
    encoder = label_encoders.get(col)
    if encoder is None:
        # No saved encoder for this column — leave as-is (shouldn't normally
        # happen for columns inside feature_columns.pkl).
        return df

    known_classes = set(encoder.classes_)
    unknown_mask = ~df[col].isin(known_classes)
    if unknown_mask.any():
        bad_values = df.loc[unknown_mask, col].unique().tolist()
        raise PreprocessingError(
            f"Unrecognized value(s) for '{col}': {bad_values}. "
            f"Expected one of: {sorted(known_classes)}",
            field=col,
        )

    df[col] = encoder.transform(df[col])
    return df


def build_feature_matrix(patient_dicts, artifacts):
    """
    patient_dicts: list[dict] of *cleaned* patient payloads (already
    validated/normalized by utils.validators.validate_patient_payload).

    Returns: (X_df, raw_df)
      X_df  -> DataFrame aligned to feature_columns.pkl, numeric_cols scaled,
               ready to pass into model.predict_proba
      raw_df -> DataFrame of the original cleaned inputs (all fields,
                including non-model fields like Coronary_Artery_Disease),
                same row order as X_df, for use by the cost engine.
    """
    if not patient_dicts:
        raise PreprocessingError("No patient rows provided for preprocessing.")

    raw_df = pd.DataFrame(patient_dicts)

    feature_columns = list(artifacts.feature_columns)
    numeric_cols = list(artifacts.numeric_cols)
    label_encoders = artifacts.label_encoders

    # Work on a copy restricted to what the model actually needs, plus
    # whatever categorical columns require encoding.
    work_df = raw_df.copy()

    # Only encode categorical columns that are actually in feature_columns
    # AND have a saved encoder. This naturally excludes cost-only fields
    # like Coronary_Artery_Disease if it isn't a model feature.
    categorical_in_model = [
        c for c in feature_columns
        if c not in numeric_cols and c in work_df.columns
    ]

    for col in categorical_in_model:
        work_df = _encode_categorical(work_df, col, label_encoders)

    # Ensure every required model feature exists; if a feature is missing
    # entirely from the payload (shouldn't happen post-validation, but be
    # defensive), raise a clear error rather than silently filling zeros.
    missing_for_model = [c for c in feature_columns if c not in work_df.columns]
    if missing_for_model:
        raise PreprocessingError(
            f"Payload is missing model feature(s): {missing_for_model}",
            field=missing_for_model[0],
        )

    X_df = work_df[feature_columns].copy()

    # Scale numeric columns using the saved scaler. The scaler was fit on
    # numeric_cols in a specific order — we must feed it the same column set
    # in the same order it expects.
    numeric_in_X = [c for c in numeric_cols if c in X_df.columns]
    if numeric_in_X:
        try:
            X_df[numeric_in_X] = artifacts.scaler.transform(X_df[numeric_in_X])
        except Exception as e:  # noqa: BLE001
            raise PreprocessingError(f"Scaling failed: {e}")

    # Final numeric sanity check — anything non-numeric left over means a
    # categorical column wasn't encoded (encoder mismatch with feature set).
    non_numeric = X_df.select_dtypes(exclude=[np.number]).columns.tolist()
    if non_numeric:
        raise PreprocessingError(
            f"Internal preprocessing error: columns left unencoded: {non_numeric}"
        )

    return X_df, raw_df


def dataframe_rows_to_patient_dicts(df):
    """Convert a population CSV DataFrame's rows into a list of dicts whose
    keys match Config.PATIENT_INPUT_FIELDS as closely as the CSV allows.
    Assumes the CSV already uses the same column names as the manual form;
    if your real CSV uses different column names, adjust the mapping here
    in one place.
    """
    return df.to_dict(orient="records")

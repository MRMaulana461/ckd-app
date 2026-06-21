"""
Loads saved model artifacts (model.pkl, scaler.pkl, encoders, etc.) once at
startup and exposes them as a single object. Designed to fail loudly but not
crash the whole app — routes can check `artifacts.loaded` and return a
graceful 503 instead of throwing on every request.
"""
import os
import pickle
import logging

logger = logging.getLogger(__name__)


class ArtifactBundle:
    def __init__(self):
        self.model = None
        self.scaler = None
        self.label_encoders = None
        self.target_encoder = None
        self.feature_columns = None
        self.numeric_cols = None
        self.loaded = False
        self.load_errors = []

    def _load_one(self, path, name):
        try:
            with open(path, "rb") as f:
                obj = pickle.load(f)
            return obj
        except FileNotFoundError:
            msg = f"Missing artifact file: {name} (expected at {path})"
            logger.warning(msg)
            self.load_errors.append(msg)
            return None
        except Exception as e:  # noqa: BLE001 - we want to capture any unpickle error
            msg = f"Failed to load artifact {name}: {e}"
            logger.error(msg)
            self.load_errors.append(msg)
            return None

    def load(self, config):
        self.model = self._load_one(config.MODEL_PATH, "model.pkl")
        self.scaler = self._load_one(config.SCALER_PATH, "scaler.pkl")
        self.label_encoders = self._load_one(config.LABEL_ENCODERS_PATH, "label_encoders.pkl")
        self.target_encoder = self._load_one(config.TARGET_ENCODER_PATH, "target_encoder.pkl")
        self.feature_columns = self._load_one(config.FEATURE_COLUMNS_PATH, "feature_columns.pkl")
        self.numeric_cols = self._load_one(config.NUMERIC_COLS_PATH, "numeric_cols.pkl")

        self.loaded = all([
            self.model is not None,
            self.scaler is not None,
            self.label_encoders is not None,
            self.target_encoder is not None,
            self.feature_columns is not None,
            self.numeric_cols is not None,
        ])

        if self.loaded:
            logger.info("All model artifacts loaded successfully.")
        else:
            logger.warning(
                "Some artifacts failed to load. Inference endpoints will "
                "return a graceful error until this is fixed. Errors: %s",
                self.load_errors,
            )

        return self

    def dataset_exists(self, config):
        return os.path.exists(config.TRAINING_DATASET_PATH)


# Singleton instance, populated by app.py at startup via artifacts.load(Config)
artifacts = ArtifactBundle()

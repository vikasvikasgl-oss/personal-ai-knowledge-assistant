"""
Document Classifier Service
Uses trained TF-IDF + Logistic Regression pipeline to classify documents into:
- Study Material
- Resume/Career
- Research Paper
- Project
- Assignment
- Personal Notes
"""

import os
import json
import logging
import joblib

logger = logging.getLogger(__name__)

MODEL_PATH = os.path.join("data", "models", "document_classifier.joblib")
METRICS_PATH = os.path.join("data", "models", "classification_metrics.json")

DEFAULT_CATEGORY = "Study Material"

_classifier_pipeline = None

def get_classifier():
    """
    Loads or returns cached document classification pipeline.
    If the model artifact is missing, automatically trains it on the synthetic dataset.
    """
    global _classifier_pipeline
    if _classifier_pipeline is not None:
        return _classifier_pipeline

    if os.path.exists(MODEL_PATH):
        try:
            _classifier_pipeline = joblib.load(MODEL_PATH)
            logger.info(f"Loaded document classifier model from {MODEL_PATH}")
            return _classifier_pipeline
        except Exception as e:
            logger.error(f"Failed to load classifier model from {MODEL_PATH}: {e}")

    # Fallback: train model on demand
    try:
        from train import train_and_evaluate
        logger.info("Classifier artifact not found or failed to load. Training model...")
        pipeline, _ = train_and_evaluate(save_model=True)
        _classifier_pipeline = pipeline
        return _classifier_pipeline
    except Exception as e:
        logger.error(f"Failed to train classifier on demand: {e}")
        return None

def classify_document(text: str) -> dict:
    """
    Classifies input text into one of the 6 target categories.
    Returns:
    {
        "category": "Project",
        "confidence": 0.88,
        "probabilities": { ... }
    }
    """
    cleaned = (text or "").strip()
    if not cleaned or len(cleaned) < 15:
        return {
            "category": DEFAULT_CATEGORY,
            "confidence": 0.50,
            "probabilities": {DEFAULT_CATEGORY: 0.50}
        }

    pipeline = get_classifier()
    if pipeline is None:
        return {
            "category": DEFAULT_CATEGORY,
            "confidence": 0.50,
            "probabilities": {DEFAULT_CATEGORY: 0.50}
        }

    try:
        # Truncate text to first ~8000 characters to focus on document title, abstract, headers & intro
        sample_text = cleaned[:8000]
        probs = pipeline.predict_proba([sample_text])[0]
        classes = pipeline.classes_

        class_probs = {cls: round(float(prob), 4) for cls, prob in zip(classes, probs)}
        best_category = str(classes[probs.argmax()])
        best_confidence = round(float(probs.max()), 4)

        return {
            "category": best_category,
            "confidence": best_confidence,
            "probabilities": class_probs
        }
    except Exception as e:
        logger.error(f"Error during document classification: {e}")
        return {
            "category": DEFAULT_CATEGORY,
            "confidence": 0.50,
            "probabilities": {DEFAULT_CATEGORY: 0.50}
        }

def get_classification_metrics() -> dict:
    """Reads and returns saved evaluation metrics from JSON file."""
    if os.path.exists(METRICS_PATH):
        try:
            with open(METRICS_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to read classification metrics: {e}")

    # Fallback to mirror in app/ml
    app_ml_metrics = os.path.join("app", "ml", "evaluation_results.json")
    if os.path.exists(app_ml_metrics):
        try:
            with open(app_ml_metrics, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to read mirror metrics: {e}")

    return {
        "status": "not_available",
        "message": "Evaluation metrics file not found. Run train.py to generate."
    }

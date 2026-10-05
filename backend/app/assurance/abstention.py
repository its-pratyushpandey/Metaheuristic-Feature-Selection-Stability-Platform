import numpy as np
from typing import Dict, Any, List, Optional

def evaluate_prediction_uncertainty_and_abstention(
    probabilities_or_preds: np.ndarray,
    task_type: str,
    confidence_threshold: float = 0.65,
    entropy_threshold: float = 0.85
) -> Dict[str, Any]:
    """
    Quantifies prediction uncertainty and enforces selective classification / regression abstention.
    If uncertainty exceeds safe envelope thresholds, predictions are marked for abstention or routed to fallback/degraded mode.
    """
    n_samples = len(probabilities_or_preds)
    if n_samples == 0:
        return {"abstention_rate": 0.0, "abstained_count": 0, "status": "NO_DATA"}
        
    if task_type == "classification":
        probs = probabilities_or_preds
        if probs.ndim == 1:
            # Convert 1D binary probs to 2D
            probs = np.column_stack([1.0 - probs, probs])
            
        # Maximum class confidence
        max_conf = np.max(probs, axis=1)
        # Shannon entropy
        eps = 1e-9
        entropy = -np.sum(probs * np.log2(probs + eps), axis=1)
        
        # Abstain if confidence is low OR entropy is high
        abstained_mask = (max_conf < confidence_threshold) | (entropy > entropy_threshold)
        abstained_count = int(np.sum(abstained_mask))
        abstention_rate = float(np.round(abstained_count / n_samples, 4))
        
        return {
            "task_type": "classification",
            "total_predictions": n_samples,
            "accepted_count": n_samples - abstained_count,
            "abstained_count": abstained_count,
            "abstention_rate": abstention_rate,
            "abstention_percentage": float(np.round(abstention_rate * 100, 2)),
            "average_confidence": float(np.round(np.mean(max_conf), 4)),
            "average_entropy": float(np.round(np.mean(entropy), 4)),
            "is_degraded_mode_triggered": abstention_rate > 0.20,
            "guardrail_status": "DEGRADED_MODE_TRIGGERED" if abstention_rate > 0.20 else "NORMAL_SERVING",
            "remediation": "Trigger human review / conservative fallback model for abstained samples." if abstention_rate > 0.20 else "Operating securely within validated operational envelope."
        }
    else: # Regression
        preds = probabilities_or_preds
        # Spread / deviation from training range
        mean_p = np.mean(preds)
        std_p = np.std(preds) if len(preds) > 1 else 1.0
        z_scores = np.abs((preds - mean_p) / max(1e-5, std_p))
        
        abstained_mask = z_scores > 2.5
        abstained_count = int(np.sum(abstained_mask))
        abstention_rate = float(np.round(abstained_count / n_samples, 4))
        
        return {
            "task_type": "regression",
            "total_predictions": n_samples,
            "accepted_count": n_samples - abstained_count,
            "abstained_count": abstained_count,
            "abstention_rate": abstention_rate,
            "abstention_percentage": float(np.round(abstention_rate * 100, 2)),
            "is_degraded_mode_triggered": abstention_rate > 0.15,
            "guardrail_status": "DEGRADED_MODE_TRIGGERED" if abstention_rate > 0.15 else "NORMAL_SERVING",
            "remediation": "Apply conservative median regression fallback for extreme variance predictions." if abstention_rate > 0.15 else "Normal operation."
        }

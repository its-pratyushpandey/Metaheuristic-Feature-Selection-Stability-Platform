import numpy as np
from typing import Dict, Any, List, Tuple

def compute_expected_calibration_error(
    y_true: np.ndarray,
    y_probs: np.ndarray,
    n_bins: int = 10
) -> Dict[str, Any]:
    """
    Compute Expected Calibration Error (ECE), Maximum Calibration Error (MCE),
    Brier Score, and reliability diagram binning.
    Supports binary and multi-class probabilities.
    """
    if len(y_true) == 0 or len(y_probs) == 0:
        return {"ece": 0.0, "mce": 0.0, "brier_score": 0.0, "bins": []}
        
    # For binary classification where y_probs is 2D with 2 columns
    if y_probs.ndim == 2:
        if y_probs.shape[1] == 2:
            confidences = np.max(y_probs, axis=1)
            predictions = np.argmax(y_probs, axis=1)
        else:
            confidences = np.max(y_probs, axis=1)
            predictions = np.argmax(y_probs, axis=1)
    else:
        # 1D probability array for positive class
        confidences = np.where(y_probs >= 0.5, y_probs, 1.0 - y_probs)
        predictions = (y_probs >= 0.5).astype(int)
        
    accuracies = (predictions == y_true).astype(float)
    
    bin_boundaries = np.linspace(0, 1, n_bins + 1)
    bin_lowers = bin_boundaries[:-1]
    bin_uppers = bin_boundaries[1:]
    
    ece = 0.0
    mce = 0.0
    bin_records = []
    
    for i, (b_low, b_high) in enumerate(zip(bin_lowers, bin_uppers)):
        in_bin = (confidences > b_low) & (confidences <= b_high)
        prop_in_bin = float(np.mean(in_bin))
        
        if prop_in_bin > 0:
            acc_in_bin = float(np.mean(accuracies[in_bin]))
            conf_in_bin = float(np.mean(confidences[in_bin]))
            gap = abs(acc_in_bin - conf_in_bin)
            ece += gap * prop_in_bin
            mce = max(mce, gap)
            
            bin_records.append({
                "bin_index": i + 1,
                "bin_range": f"{b_low:.1f}-{b_high:.1f}",
                "confidence_avg": float(np.round(conf_in_bin, 4)),
                "accuracy_avg": float(np.round(acc_in_bin, 4)),
                "sample_count": int(np.sum(in_bin)),
                "calibration_gap": float(np.round(gap, 4))
            })
        else:
            bin_records.append({
                "bin_index": i + 1,
                "bin_range": f"{b_low:.1f}-{b_high:.1f}",
                "confidence_avg": float(np.round(0.5 * (b_low + b_high), 4)),
                "accuracy_avg": 0.0,
                "sample_count": 0,
                "calibration_gap": 0.0
            })
            
    # Brier score calculation
    if y_probs.ndim == 2 and y_probs.shape[1] == 2:
        prob_pos = y_probs[:, 1]
        brier = float(np.mean((prob_pos - y_true)**2))
    elif y_probs.ndim == 1:
        brier = float(np.mean((y_probs - y_true)**2))
    else:
        # Multiclass Brier score
        one_hot = np.zeros_like(y_probs)
        for idx, y in enumerate(y_true.astype(int)):
            if 0 <= y < y_probs.shape[1]:
                one_hot[idx, y] = 1.0
        brier = float(np.mean(np.sum((y_probs - one_hot)**2, axis=1)))
        
    ece = float(np.round(ece, 4))
    mce = float(np.round(mce, 4))
    brier = float(np.round(brier, 4))
    
    passes_calibration = ece <= 0.05
    
    return {
        "ece": ece,
        "mce": mce,
        "brier_score": brier,
        "passes_target_sla": passes_calibration,
        "target_sla": 0.05,
        "status": "CALIBRATED_PASS" if passes_calibration else "POOR_CALIBRATION_WARNING",
        "reliability_bins": bin_records
    }

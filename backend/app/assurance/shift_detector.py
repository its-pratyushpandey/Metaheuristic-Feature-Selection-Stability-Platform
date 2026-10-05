import numpy as np
from typing import Dict, Any, List, Tuple
from scipy.stats import ks_2samp, wasserstein_distance

def calculate_psi(expected: np.ndarray, actual: np.ndarray, num_bins: int = 10) -> float:
    """Calculate Population Stability Index (PSI) between baseline and incoming distributions."""
    if len(expected) == 0 or len(actual) == 0:
        return 0.0
        
    # Create bin edges from expected
    percentiles = np.linspace(0, 100, num_bins + 1)
    bin_edges = np.percentile(expected, percentiles)
    bin_edges[0] -= 1e-5
    bin_edges[-1] += 1e-5
    
    # Handle duplicate bin edges
    bin_edges = np.unique(bin_edges)
    if len(bin_edges) < 3:
        return 0.0
        
    exp_counts, _ = np.histogram(expected, bins=bin_edges)
    act_counts, _ = np.histogram(actual, bins=bin_edges)
    
    exp_pct = np.maximum(exp_counts / len(expected), 1e-4)
    act_pct = np.maximum(act_counts / len(actual), 1e-4)
    
    psi_value = np.sum((act_pct - exp_pct) * np.log(act_pct / exp_pct))
    return float(np.round(psi_value, 4))

def detect_covariate_shift(
    X_baseline: np.ndarray,
    X_target: np.ndarray,
    feature_names: List[str],
    psi_warning_threshold: float = 0.1,
    psi_critical_threshold: float = 0.25
) -> Dict[str, Any]:
    """
    Detect covariate feature drift between baseline development data and deployment/challenge data.
    Uses Kolmogorov-Smirnov test, PSI, and Wasserstein distance.
    """
    feature_shift_reports = []
    drifted_features = []
    critical_features = []
    
    for j, feat_name in enumerate(feature_names):
        col_base = X_baseline[:, j]
        col_targ = X_target[:, j]
        
        # KS test
        ks_stat, ks_pval = ks_2samp(col_base, col_targ)
        # PSI
        psi = calculate_psi(col_base, col_targ)
        # Wasserstein distance
        w_dist = float(wasserstein_distance(col_base, col_targ))
        
        is_shifted = psi >= psi_warning_threshold or ks_pval < 0.05
        is_critical = psi >= psi_critical_threshold or (ks_pval < 0.001 and w_dist > 0.5)
        
        if is_critical:
            critical_features.append(feat_name)
            drift_status = "CRITICAL_SHIFT"
        elif is_shifted:
            drifted_features.append(feat_name)
            drift_status = "MODERATE_SHIFT"
        else:
            drift_status = "STABLE"
            
        feature_shift_reports.append({
            "feature_name": feat_name,
            "ks_statistic": float(np.round(ks_stat, 4)),
            "ks_pvalue": float(np.round(ks_pval, 4)),
            "psi_score": psi,
            "wasserstein_distance": float(np.round(w_dist, 4)),
            "drift_status": drift_status
        })
        
    total_feats = len(feature_names)
    drift_pct = (len(drifted_features) + len(critical_features)) / max(1, total_feats)
    
    if len(critical_features) > 0 or drift_pct >= 0.4:
        overall_shift_verdict = "CRITICAL_DRIFT_DETECTED"
        requires_abstention = True
    elif len(drifted_features) > 0 or drift_pct >= 0.15:
        overall_shift_verdict = "MODERATE_DRIFT_DETECTED"
        requires_abstention = False
    else:
        overall_shift_verdict = "NO_SIGNIFICANT_DRIFT"
        requires_abstention = False
        
    return {
        "overall_shift_verdict": overall_shift_verdict,
        "requires_abstention": requires_abstention,
        "drifted_features_count": len(drifted_features) + len(critical_features),
        "critical_features_count": len(critical_features),
        "total_features": total_feats,
        "drift_percentage": float(np.round(drift_pct * 100, 2)),
        "feature_details": feature_shift_reports
    }

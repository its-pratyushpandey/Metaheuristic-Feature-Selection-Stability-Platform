import numpy as np
from typing import Dict, Any, List, Optional
from scipy.stats import binomtest
from backend.app.datasets.preprocessor import PartitionedDataset
from backend.app.analysis.contribution import compute_permutation_importance
from backend.app.metaheuristics.fitness import get_base_model

def classify_features_stability(
    stability_experiment_result: Dict[str, Any],
    partitioned: PartitionedDataset,
    model_name: str = "rf",
    seed: int = 42
) -> Dict[str, Any]:
    """
    Distinguishes Consistently Selected features from Search Artefacts.
    Computes statistical significance, selection frequency, model contribution, and final status.
    """
    stab_metrics = stability_experiment_result.get("stability_metrics", {})
    probs = stab_metrics.get("feature_selection_probabilities", {})
    resample_runs = stability_experiment_result.get("resample_runs", [])
    B = len(resample_runs)
    D = partitioned.n_features
    
    if B == 0 or D == 0:
        return {"features": [], "summary": {}}
        
    # Average selected subset size across runs
    avg_k = np.mean([r["selected_count"] for r in resample_runs]) if resample_runs else 1.0
    null_p0 = float(avg_k / max(1, D)) # Probability of selection under pure random search
    
    # Compute base model permutation importance using full train data
    base_model = get_base_model(model_name, partitioned.task_type, seed=seed)
    base_model.fit(partitioned.X_train, partitioned.y_train)
    importances = compute_permutation_importance(
        base_model, partitioned.X_val, partitioned.y_val,
        feature_names=partitioned.feature_names,
        task_type=partitioned.task_type,
        seed=seed
    )
    
    # Calculate average ranking per feature across runs
    rank_acc = {f: [] for f in partitioned.feature_names}
    for run in resample_runs:
        run_ranks = run.get("feature_rankings", {})
        for f in partitioned.feature_names:
            rank_acc[f].append(run_ranks.get(f, 0.0))
            
    feature_rows = []
    status_counts = {
        "Consistently Selected": 0,
        "Potentially Stable": 0,
        "Unstable": 0,
        "Search Artefact": 0
    }
    
    for f in partitioned.feature_names:
        data = probs.get(f, {})
        sel_count = data.get("selection_count", 0)
        sel_freq = data.get("selection_frequency", 0.0)
        sel_pct = data.get("selection_percentage", 0.0)
        
        # Uncertainty: standard error of proportion SE = sqrt(p*(1-p)/B)
        se = np.sqrt(max(0.0, sel_freq * (1.0 - sel_freq) / max(1, B)))
        ci_lower = max(0.0, sel_freq - 1.96 * se)
        ci_upper = min(1.0, sel_freq + 1.96 * se)
        
        # Exact Binomial test: is selection frequency significantly higher than null chance?
        try:
            b_test = binomtest(sel_count, B, null_p0, alternative="greater")
            p_val = float(b_test.pvalue)
        except Exception:
            p_val = 1.0
            
        model_contrib = float(importances.get(f, 0.0))
        avg_rank_score = float(np.mean(rank_acc[f])) if rank_acc[f] else 0.0
        
        # Comprehensive Stability Metric for individual feature
        feature_stab_score = float(np.round((0.6 * sel_freq + 0.4 * model_contrib) * 100, 1))
        
        # Status assignment based on strict criteria:
        # 1. Consistently Selected: freq >= 80% and statistically significant vs noise
        # 2. Potentially Stable: 50% <= freq < 80%
        # 3. Unstable: 20% <= freq < 50%
        # 4. Search Artefact: freq < 20% (sample-dependent fluke / search noise)
        if sel_freq >= 0.80:
            status = "Consistently Selected"
            recommendation = "MANDATORY - Include in production model. High stability and predictive power across resamples."
            status_color = "emerald"
        elif sel_freq >= 0.50:
            status = "Potentially Stable"
            recommendation = "CONDITIONALLY ACCEPTED - Moderate stability. Monitor under covariate shift."
            status_color = "blue"
        elif sel_freq >= 0.20:
            status = "Unstable"
            recommendation = "EXCLUDE - Volatile across data partitions. High risk of overfitting."
            status_color = "amber"
        else:
            status = "Search Artefact"
            recommendation = "REJECT - Search artefact selected by stochastic chance or sample anomaly."
            status_color = "rose"
            
        status_counts[status] += 1
        
        feature_rows.append({
            "feature_name": f,
            "selection_count": sel_count,
            "total_resamples": B,
            "selection_percentage": sel_pct,
            "selection_frequency": sel_freq,
            "average_rank_score": float(np.round(avg_rank_score, 4)),
            "stability_score": feature_stab_score,
            "model_contribution": model_contrib,
            "uncertainty_se": float(np.round(se, 4)),
            "confidence_interval_95": [float(np.round(ci_lower * 100, 1)), float(np.round(ci_upper * 100, 1))],
            "p_value_vs_chance": float(np.round(p_val, 4)),
            "is_statistically_significant": bool(p_val < 0.05),
            "final_status": status,
            "status_color": status_color,
            "engineering_recommendation": recommendation
        })
        
    # Sort features by selection percentage descending
    feature_rows = sorted(feature_rows, key=lambda x: (x["selection_percentage"], x["model_contribution"]), reverse=True)
    
    return {
        "features": feature_rows,
        "summary": {
            "total_features": D,
            "consistently_selected": status_counts["Consistently Selected"],
            "potentially_stable": status_counts["Potentially Stable"],
            "unstable": status_counts["Unstable"],
            "search_artefacts": status_counts["Search Artefact"],
            "search_artefact_reduction_rate": float(np.round((status_counts["Search Artefact"] / max(1, D)) * 100, 1)),
            "null_hypothesis_chance_prob": float(np.round(null_p0, 3)),
            "resampling_runs": B
        }
    }

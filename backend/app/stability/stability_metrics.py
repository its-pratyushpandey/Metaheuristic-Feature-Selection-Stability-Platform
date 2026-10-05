import numpy as np
from typing import List, Dict, Any, Tuple
from scipy.stats import spearmanr

def calculate_jaccard_similarity(set_a: set, set_b: set) -> float:
    """Calculate Jaccard index between two feature subsets."""
    union = len(set_a.union(set_b))
    if union == 0:
        return 1.0
    return float(len(set_a.intersection(set_b)) / union)

def calculate_kuncheva_index(set_a: set, set_b: set, total_features: int) -> float:
    """
    Calculate Kuncheva's Consistency Index corrected for chance.
    Range: [-1, 1], where 1 is identical, 0 is chance, -1 is complete opposition.
    """
    k_a = len(set_a)
    k_b = len(set_b)
    r = len(set_a.intersection(set_b))
    D = total_features
    
    if k_a == 0 or k_b == 0 or k_a == D or k_b == D:
        return 1.0 if k_a == k_b else 0.0
        
    denom = D * min(k_a, k_b) - (k_a * k_b)
    if denom == 0:
        return 1.0 if k_a == k_b else 0.0
        
    num = (r * D) - (k_a * k_b)
    return float(max(-1.0, min(1.0, num / denom)))

def calculate_lustgarten_index(set_a: set, set_b: set, total_features: int) -> float:
    """Calculate Lustgarten's stability index."""
    r = len(set_a.intersection(set_b))
    k_a = len(set_a)
    k_b = len(set_b)
    D = total_features
    
    denom = min(k_a, k_b) - max(0, k_a + k_b - D)
    if denom <= 0:
        return 1.0 if k_a == k_b else 0.0
    num = r - max(0, k_a + k_b - D)
    return float(max(0.0, min(1.0, num / denom)))

def calculate_nogueira_stability(selection_matrix: np.ndarray) -> float:
    """
    Calculate Nogueira's stability measure (2018):
    Unbiased, bounded [0, 1] estimator for feature selection stability.
    selection_matrix: shape (B, D) binary matrix where B is resamples, D is features.
    """
    B, D = selection_matrix.shape
    if B < 2:
        return 1.0
    # Mean selection probability per feature
    p_hat = np.mean(selection_matrix, axis=0) # shape (D,)
    s_sq = (B / (B - 1)) * p_hat * (1 - p_hat) # sample variances
    
    # Average subset size
    k_bar = np.mean(np.sum(selection_matrix, axis=1))
    if k_bar == 0 or k_bar == D:
        return 1.0
        
    expected_sum_s_sq = (k_bar / D) * (1 - k_bar / D) * D
    if expected_sum_s_sq == 0:
        return 1.0
        
    stability = 1.0 - (np.sum(s_sq) / expected_sum_s_sq)
    return float(max(0.0, min(1.0, stability)))

def bootstrap_confidence_interval(values: List[float], n_bootstraps: int = 500, ci: float = 0.95, seed: int = 42) -> Tuple[float, float]:
    """Compute non-parametric bootstrap confidence interval."""
    if len(values) == 0:
        return 0.0, 0.0
    if len(values) == 1:
        return float(values[0]), float(values[0])
        
    arr = np.array(values)
    rng = np.random.default_rng(seed)
    boot_means = []
    n = len(arr)
    for _ in range(n_bootstraps):
        sample = rng.choice(arr, size=n, replace=True)
        boot_means.append(np.mean(sample))
        
    alpha = (1.0 - ci) / 2.0
    low = float(np.percentile(boot_means, alpha * 100))
    high = float(np.percentile(boot_means, (1.0 - alpha) * 100))
    return float(np.round(low, 4)), float(np.round(high, 4))

def compute_all_stability_metrics(
    runs_selected_indices: List[List[int]],
    total_features: int,
    feature_names: List[str],
    ranking_scores_list: Optional[List[Dict[str, float]]] = None
) -> Dict[str, Any]:
    """
    Comprehensive stability analytics suite.
    Calculates Jaccard, Kuncheva, Nogueira, pairwise matrix, CIs, and selection frequencies.
    """
    B = len(runs_selected_indices)
    D = total_features
    
    if B == 0:
        return {}
        
    # Build binary matrix (B, D)
    binary_mat = np.zeros((B, D), dtype=int)
    for b, sel in enumerate(runs_selected_indices):
        binary_mat[b, sel] = 1
        
    # Selection frequencies & probabilities
    selection_counts = np.sum(binary_mat, axis=0)
    selection_frequencies = selection_counts / B
    
    feature_selection_probs = {
        feature_names[i]: {
            "feature_index": i,
            "feature_name": feature_names[i],
            "selection_count": int(selection_counts[i]),
            "selection_frequency": float(np.round(selection_frequencies[i], 4)),
            "selection_percentage": float(np.round(selection_frequencies[i] * 100, 2)),
            "is_consistently_selected": bool(selection_frequencies[i] >= 0.80),
            "is_search_artefact": bool(selection_frequencies[i] < 0.20)
        }
        for i in range(D)
    }
    
    # Pairwise comparison calculations
    pairwise_jaccard = []
    pairwise_kuncheva = []
    pairwise_lustgarten = []
    pairwise_matrix_jaccard = np.ones((B, B))
    
    subset_sets = [set(idx_list) for idx_list in runs_selected_indices]
    
    for i in range(B):
        for j in range(i + 1, B):
            jac = calculate_jaccard_similarity(subset_sets[i], subset_sets[j])
            kun = calculate_kuncheva_index(subset_sets[i], subset_sets[j], D)
            lus = calculate_lustgarten_index(subset_sets[i], subset_sets[j], D)
            
            pairwise_jaccard.append(jac)
            pairwise_kuncheva.append(kun)
            pairwise_lustgarten.append(lus)
            
            pairwise_matrix_jaccard[i, j] = jac
            pairwise_matrix_jaccard[j, i] = jac
            
    avg_jaccard = float(np.mean(pairwise_jaccard)) if pairwise_jaccard else 1.0
    worst_jaccard = float(np.min(pairwise_jaccard)) if pairwise_jaccard else 1.0
    std_jaccard = float(np.std(pairwise_jaccard)) if pairwise_jaccard else 0.0
    
    avg_kuncheva = float(np.mean(pairwise_kuncheva)) if pairwise_kuncheva else 1.0
    nogueira_score = calculate_nogueira_stability(binary_mat)
    
    # 95% Bootstrap Confidence Interval on Stability
    ci_low, ci_high = bootstrap_confidence_interval(pairwise_jaccard if pairwise_jaccard else [1.0])
    
    # Ranking consistency across runs (Spearman correlation between pairs of rankings)
    spearman_corrs = []
    if ranking_scores_list and len(ranking_scores_list) == B:
        for i in range(B):
            v_i = [ranking_scores_list[i].get(f, 0.0) for f in feature_names]
            for j in range(i + 1, B):
                v_j = [ranking_scores_list[j].get(f, 0.0) for f in feature_names]
                corr, _ = spearmanr(v_i, v_j)
                if not np.isnan(corr):
                    spearman_corrs.append(corr)
    ranking_consistency = float(np.mean(spearman_corrs)) if spearman_corrs else avg_jaccard
    
    # Consistently selected features count & list
    consistent_features = [f for f, p in feature_selection_probs.items() if p["is_consistently_selected"]]
    search_artefact_features = [f for f, p in feature_selection_probs.items() if p["is_search_artefact"]]
    
    # Normalized Stability Score on 0-100 scale (KPI-1 format)
    # Blend of Nogueira (50%), Jaccard (30%), and Kuncheva (20%)
    kuncheva_norm = max(0.0, avg_kuncheva)
    composite_stability_0_100 = float(np.round((0.5 * nogueira_score + 0.3 * avg_jaccard + 0.2 * kuncheva_norm) * 100, 2))
    
    return {
        "stability_score_100": composite_stability_0_100,
        "nogueira_stability": float(np.round(nogueira_score, 4)),
        "average_jaccard": float(np.round(avg_jaccard, 4)),
        "worst_case_jaccard": float(np.round(worst_jaccard, 4)),
        "std_jaccard": float(np.round(std_jaccard, 4)),
        "average_kuncheva": float(np.round(avg_kuncheva, 4)),
        "ranking_consistency": float(np.round(ranking_consistency, 4)),
        "confidence_interval_95": {
            "lower": ci_low,
            "upper": ci_high
        },
        "resampling_runs_count": B,
        "total_features": D,
        "consistently_selected_count": len(consistent_features),
        "consistently_selected_features": consistent_features,
        "search_artefacts_count": len(search_artefact_features),
        "search_artefact_features": search_artefact_features,
        "feature_selection_probabilities": feature_selection_probs,
        "pairwise_matrix_jaccard": pairwise_matrix_jaccard.tolist()
    }

import numpy as np
from typing import Dict, Any, List
from sklearn.metrics import accuracy_score, r2_score
from backend.app.datasets.preprocessor import PartitionedDataset
from backend.app.metaheuristics.fitness import get_base_model

def compute_permutation_importance(
    model,
    X_val: np.ndarray,
    y_val: np.ndarray,
    feature_names: List[str],
    task_type: str,
    n_repeats: int = 5,
    seed: int = 42
) -> Dict[str, float]:
    """
    Compute permutation feature importance on validation set.
    Measures how much validation metric drops when each feature is randomly permuted.
    """
    rng = np.random.default_rng(seed)
    base_preds = model.predict(X_val)
    if task_type == "classification":
        base_score = float(accuracy_score(y_val, base_preds))
    else:
        base_score = float(r2_score(y_val, base_preds))
        
    importances = {}
    for j, feat_name in enumerate(feature_names):
        drops = []
        for _ in range(n_repeats):
            X_perm = X_val.copy()
            X_perm[:, j] = rng.permutation(X_perm[:, j])
            perm_preds = model.predict(X_perm)
            if task_type == "classification":
                perm_score = float(accuracy_score(y_val, perm_preds))
            else:
                perm_score = float(r2_score(y_val, perm_preds))
            drops.append(max(0.0, base_score - perm_score))
        importances[feat_name] = float(np.round(np.mean(drops), 4))
        
    # Normalize
    max_imp = max(importances.values()) if max(importances.values()) > 0 else 1.0
    normalized = {k: float(np.round(v / max_imp, 4)) for k, v in importances.items()}
    return normalized

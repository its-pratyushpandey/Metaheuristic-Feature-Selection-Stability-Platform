import numpy as np
from typing import Dict, Any, Tuple
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor, GradientBoostingClassifier, GradientBoostingRegressor
from sklearn.linear_model import LogisticRegression, Ridge
from sklearn.svm import SVC, SVR
from sklearn.neighbors import KNeighborsClassifier, KNeighborsRegressor
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor
from sklearn.metrics import accuracy_score, f1_score, r2_score, mean_squared_error

def get_base_model(model_name: str, task_type: str, seed: int = 42):
    """Instantiate standard scikit-learn estimator with reproducible seed."""
    if task_type == "classification":
        if model_name == "rf":
            return RandomForestClassifier(n_estimators=40, max_depth=8, random_state=seed, n_jobs=1)
        elif model_name == "logistic":
            return LogisticRegression(max_iter=300, random_state=seed)
        elif model_name == "gb":
            return GradientBoostingClassifier(n_estimators=30, max_depth=4, random_state=seed)
        elif model_name == "svm":
            return SVC(kernel="rbf", probability=True, random_state=seed)
        elif model_name == "knn":
            return KNeighborsClassifier(n_neighbors=5)
        elif model_name == "dt":
            return DecisionTreeClassifier(max_depth=6, random_state=seed)
        else:
            return RandomForestClassifier(n_estimators=40, max_depth=8, random_state=seed, n_jobs=1)
    else:  # regression
        if model_name == "rf":
            return RandomForestRegressor(n_estimators=40, max_depth=8, random_state=seed, n_jobs=1)
        elif model_name in ["logistic", "ridge"]:
            return Ridge(random_state=seed)
        elif model_name == "gb":
            return GradientBoostingRegressor(n_estimators=30, max_depth=4, random_state=seed)
        elif model_name == "svm":
            return SVR(kernel="rbf")
        elif model_name == "knn":
            return KNeighborsRegressor(n_neighbors=5)
        elif model_name == "dt":
            return DecisionTreeRegressor(max_depth=6, random_state=seed)
        else:
            return RandomForestRegressor(n_estimators=40, max_depth=8, random_state=seed, n_jobs=1)

def evaluate_subset_fitness(
    subset_mask: np.ndarray,
    X_train: np.ndarray,
    y_train: np.ndarray,
    X_val: np.ndarray,
    y_val: np.ndarray,
    task_type: str,
    model_name: str = "rf",
    alpha: float = 0.85,
    max_features: int = None,
    seed: int = 42
) -> Tuple[float, float, Dict[str, Any]]:
    """
    Evaluate chromosome/particle subset mask.
    Returns:
        fitness: Combined objective score in [0, 1]
        metric_score: Raw validation performance score
        metrics_dict: Detailed metrics
    """
    n_total = len(subset_mask)
    n_selected = int(np.sum(subset_mask))
    
    # Boundary guard: at least 1 feature must be selected
    if n_selected == 0:
        return 0.0, 0.0, {"metric": 0.0, "penalty": 1.0, "error": "No features selected"}
        
    if max_features is not None and n_selected > max_features:
        # Heavily penalize exceeding max_features constraint
        excess = n_selected - max_features
        penalty = 0.5 * (excess / n_total)
    else:
        penalty = 0.0
        
    selected_indices = np.where(subset_mask)[0]
    X_tr_sub = X_train[:, selected_indices]
    X_va_sub = X_val[:, selected_indices]
    
    try:
        clf = get_base_model(model_name, task_type, seed=seed)
        clf.fit(X_tr_sub, y_train)
        preds = clf.predict(X_va_sub)
        
        if task_type == "classification":
            acc = accuracy_score(y_val, preds)
            try:
                f1 = f1_score(y_val, preds, average="macro", zero_division=0)
            except Exception:
                f1 = acc
            primary_metric = float(0.5 * acc + 0.5 * f1)
            raw_metric = float(acc)
        else:
            r2 = r2_score(y_val, preds)
            # Clip R2 to [0, 1] range for fitness formulation
            primary_metric = float(max(0.0, min(1.0, r2)))
            raw_metric = float(r2)
            
        # Parsimony ratio (1 - k/D): higher when fewer features are used
        parsimony = float(1.0 - (n_selected / n_total))
        
        # Multi-objective fitness
        fitness = float(alpha * primary_metric + (1.0 - alpha) * parsimony - penalty)
        fitness = float(max(0.0, min(1.0, fitness)))
        
        return fitness, raw_metric, {
            "primary_metric": primary_metric,
            "raw_metric": raw_metric,
            "parsimony": parsimony,
            "selected_count": n_selected,
            "model": model_name
        }
    except Exception as e:
        return 0.0, 0.0, {"error": str(e)}

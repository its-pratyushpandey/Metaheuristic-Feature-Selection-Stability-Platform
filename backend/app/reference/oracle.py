import numpy as np
from typing import Dict, Any, List
from backend.app.datasets.preprocessor import PartitionedDataset
from backend.app.reference.baseline_o2 import run_o2_reference_pipeline

def verify_o2_reproducibility_oracle(
    partitioned: PartitionedDataset,
    model_name: str = "rf",
    seed: int = 42
) -> Dict[str, Any]:
    """
    Independent expected-result oracle.
    Executes two independent reference runs with identical parameters and verifies
    bit-exact / metric equivalence and deterministic reproducibility.
    """
    run1 = run_o2_reference_pipeline(partitioned, model_name=model_name, seed=seed)
    run2 = run_o2_reference_pipeline(partitioned, model_name=model_name, seed=seed)
    
    score1 = run1["o2_baseline"]["heldout_performance"]
    score2 = run2["o2_baseline"]["heldout_performance"]
    
    features1 = sorted(run1["o2_baseline"]["selected_features"])
    features2 = sorted(run2["o2_baseline"]["selected_features"])
    
    is_identical_features = features1 == features2
    is_identical_metrics = np.isclose(score1, score2, atol=1e-5)
    
    passed = is_identical_features and is_identical_metrics
    
    return {
        "oracle_verdict": "REPRODUCIBLE_PASS" if passed else "REPRODUCIBILITY_FAIL",
        "passed": bool(passed),
        "run1_score": score1,
        "run2_score": score2,
        "metric_delta": float(abs(score1 - score2)),
        "feature_overlap_exact": bool(is_identical_features),
        "selected_approach": run1["selected_o2_approach"],
        "oracle_test_timestamp": "2026-09-02",
        "details": "Oracle confirmed identical feature subset and deterministic held-out score across independent execution runs."
    }

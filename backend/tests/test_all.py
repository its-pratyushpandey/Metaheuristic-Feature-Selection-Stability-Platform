import pytest
import numpy as np
from backend.app.datasets.loader import (
    load_archive_ionosphere,
    load_archive_sonar,
    load_archive_waveform,
    load_archive_wine,
    load_archive_zoo,
    load_friedman_regression,
    load_diabetes_regression
)
from backend.app.datasets.preprocessor import preprocess_and_partition
from backend.app.metaheuristics.base import MetaheuristicConfig
from backend.app.metaheuristics import get_metaheuristic_selector
from backend.app.reference.baseline_o2 import run_o2_reference_pipeline
from backend.app.reference.oracle import verify_o2_reproducibility_oracle
from backend.app.stability.stability_metrics import (
    calculate_jaccard_similarity,
    calculate_kuncheva_index,
    calculate_nogueira_stability
)
from backend.app.stability.stability_engine import run_resampling_stability_experiment
from backend.app.analysis.feature_classifier import classify_features_stability
from backend.app.validation.negative_tests import run_all_negative_tests
from backend.app.validation.kpi_engine import calculate_kpis
from backend.app.validation.acceptance_rules import evaluate_acceptance_conditions

def test_archive_dataset_loaders():
    # Test all 5 UCI archive datasets
    df_iono, _, task1, _ = load_archive_ionosphere()
    assert len(df_iono) == 351
    assert task1 == "classification"

    df_sonar, _, task2, _ = load_archive_sonar()
    assert len(df_sonar) == 208
    assert task2 == "classification"

    df_wave, _, task3, _ = load_archive_waveform()
    assert len(df_wave) == 5000
    assert task3 == "classification"

    df_wine, _, task4, _ = load_archive_wine()
    assert len(df_wine) == 178
    assert task4 == "classification"

    df_zoo, _, task5, _ = load_archive_zoo()
    assert len(df_zoo) == 101
    assert task5 == "classification"

    # Test regression benchmarks
    df_fried, _, task6, _ = load_friedman_regression(n_samples=100)
    assert len(df_fried) == 100
    assert task6 == "regression"

def test_leakage_free_partitioning():
    df, target_col, task_type, _ = load_archive_wine()
    partitioned, meta = preprocess_and_partition(df, target_col, task_type, test_size=0.2, val_size=0.2, seed=42)
    assert partitioned.n_features == 13
    assert len(partitioned.X_heldout) > 0
    assert len(partitioned.X_train) > 0
    assert len(partitioned.X_val) > 0
    # Ensure no NaN
    assert not np.isnan(partitioned.X_train).any()

def test_metaheuristic_algorithms():
    df, target_col, task_type, _ = load_archive_wine()
    partitioned, _ = preprocess_and_partition(df, target_col, task_type, seed=42)
    
    for algo in ["ga", "pso", "sa", "de"]:
        cfg = MetaheuristicConfig(algorithm=algo, population_size=10, n_iterations=5, model_name="rf", seed=42)
        selector = get_metaheuristic_selector(cfg)
        res = selector.optimize(
            partitioned.X_train, partitioned.y_train, partitioned.X_val, partitioned.y_val,
            feature_names=partitioned.feature_names, task_type=partitioned.task_type
        )
        assert res.selected_count > 0
        assert len(res.history) == 5
        assert res.best_fitness >= 0.0

def test_o2_reference_and_oracle():
    df, target_col, task_type, _ = load_archive_wine()
    partitioned, _ = preprocess_and_partition(df, target_col, task_type, seed=42)
    
    o2_res = run_o2_reference_pipeline(partitioned, model_name="rf", seed=42)
    assert o2_res["status"] == "COMPLETED"
    assert len(o2_res["compared_approaches"]) == 3
    assert o2_res["reference_stability"]["stability_score_100"] >= 0.0
    assert o2_res["o2_baseline"]["calibration"] is not None
    
    oracle_res = verify_o2_reproducibility_oracle(partitioned, model_name="rf", seed=42)
    assert oracle_res["passed"] is True

def test_stability_and_feature_classification():
    df, target_col, task_type, _ = load_archive_wine()
    partitioned, _ = preprocess_and_partition(df, target_col, task_type, seed=42)
    
    cfg = MetaheuristicConfig(algorithm="ga", population_size=10, n_iterations=5, model_name="rf", seed=42)
    o3_res = run_resampling_stability_experiment(partitioned, cfg, n_resamples=5)
    
    stab = o3_res["stability_metrics"]
    assert stab["stability_score_100"] > 0
    assert len(o3_res["resample_runs"]) == 5
    
    classified = classify_features_stability(o3_res, partitioned, model_name="rf", seed=42)
    assert len(classified["features"]) == 13
    assert all(row["final_status"] in ["Consistently Selected", "Potentially Stable", "Unstable", "Search Artefact"] for row in classified["features"])

def test_negative_tests_and_decision_gate():
    df, target_col, task_type, _ = load_archive_wine()
    partitioned, _ = preprocess_and_partition(df, target_col, task_type, seed=42)
    cfg = MetaheuristicConfig(algorithm="ga", population_size=10, n_iterations=5, model_name="rf", seed=42)
    o2_res = run_o2_reference_pipeline(partitioned, model_name="rf", seed=42)
    o3_res = run_resampling_stability_experiment(partitioned, cfg, n_resamples=5)
    
    candidate_eval = o3_res["candidate_evaluation"]
    neg_res = run_all_negative_tests(partitioned, cfg, candidate_eval)
    assert len(neg_res["tests"]) == 5
    
    kpi_res = calculate_kpis(o2_res["o2_baseline"], o3_res, candidate_eval, task_type)
    assert len(kpi_res["kpis"]) == 6
    
    decision = evaluate_acceptance_conditions(o2_res["o2_baseline"], candidate_eval, o3_res, neg_res, kpi_res)
    assert decision["final_decision"] in ["PASS / ACCEPT", "REVISE", "HOLD / STOP"]

def test_kpis_fail_closed_without_evidence():
    empty_kpis = calculate_kpis(
        o2_baseline={},
        o3_stability_result={"stability_metrics": {}},
        candidate_eval={},
        task_type="classification",
    )
    statuses = {item["kpi_id"]: item["status"] for item in empty_kpis["kpis"]}
    assert statuses["KPI-1"] == "FAIL"
    assert statuses["KPI-5"] == "FAIL"
    assert statuses["KPI-6"] == "FAIL"

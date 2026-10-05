import time
import numpy as np
from typing import Dict, Any, List, Optional, Callable
from backend.app.datasets.preprocessor import PartitionedDataset
from backend.app.metaheuristics.base import MetaheuristicConfig
from backend.app.metaheuristics import get_metaheuristic_selector
from backend.app.stability.resampling import ResamplingProtocol
from backend.app.stability.stability_metrics import compute_all_stability_metrics
from backend.app.reference.baseline_o2 import evaluate_approach

def run_resampling_stability_experiment(
    partitioned: PartitionedDataset,
    metaheuristic_config: MetaheuristicConfig,
    n_resamples: int = 15,
    resampling_protocol: str = "bootstrap",
    subsample_ratio: float = 0.85,
    progress_callback: Optional[Callable[[int, int, str, Dict[str, Any]], None]] = None
) -> Dict[str, Any]:
    """
    O3 Differentiating Contribution Pipeline.
    Runs metaheuristic feature selection repeatedly across B resampled datasets.
    Stores selected subset, ranking, fitness, and validation performance per resample.
    Computes rigorous stability metrics across all runs.
    """
    start_total_time = time.time()
    
    # 1. Generate resampled sets from X_train
    resamples = ResamplingProtocol.generate_resamples(
        partitioned.X_train,
        partitioned.y_train,
        task_type=partitioned.task_type,
        n_resamples=n_resamples,
        protocol=resampling_protocol,
        subsample_ratio=subsample_ratio,
        seed=metaheuristic_config.seed
    )
    
    resample_runs_data = []
    selected_indices_list = []
    ranking_scores_list = []
    
    for b_idx, (X_tr_res, y_tr_res, X_va_res, y_va_res, r_seed) in enumerate(resamples):
        run_start = time.time()
        
        # Configure metaheuristic for this resample run
        run_cfg = metaheuristic_config.model_copy()
        run_cfg.seed = r_seed
        
        selector = get_metaheuristic_selector(run_cfg)
        result = selector.optimize(
            X_tr_res, y_tr_res, X_va_res, y_va_res,
            feature_names=partitioned.feature_names,
            task_type=partitioned.task_type
        )
        
        selected_indices_list.append(result.selected_indices)
        ranking_scores_list.append(result.feature_ranking_scores)
        
        # Evaluate model performance of this resample's selected subset on dev validation & held-out
        eval_metrics = evaluate_approach(
            name=f"Resample Run #{b_idx+1}",
            selected_mask=np.array(result.selected_mask),
            partitioned=partitioned,
            model_name=metaheuristic_config.model_name,
            seed=r_seed
        )
        
        run_record = {
            "resample_index": b_idx + 1,
            "seed": r_seed,
            "selected_features": result.selected_feature_names,
            "selected_indices": result.selected_indices,
            "selected_count": result.selected_count,
            "best_fitness": result.best_fitness,
            "validation_performance": eval_metrics["validation_performance"],
            "heldout_performance": eval_metrics["heldout_performance"],
            "heldout_score_100": eval_metrics["performance_score_100"],
            "execution_time_seconds": float(np.round(time.time() - run_start, 3)),
            "feature_rankings": result.feature_ranking_scores
        }
        resample_runs_data.append(run_record)
        
        if progress_callback:
            progress_callback(
                b_idx + 1,
                n_resamples,
                f"Completed resample {b_idx + 1}/{n_resamples} (selected {result.selected_count} features)",
                run_record
            )
            
    # 2. Compute Stability Analytics
    stability_analytics = compute_all_stability_metrics(
        runs_selected_indices=selected_indices_list,
        total_features=partitioned.n_features,
        feature_names=partitioned.feature_names,
        ranking_scores_list=ranking_scores_list
    )
    
    # 3. Derive Final Consensus Feature Subset (Features selected in >= 50% or consistently >= 80% of resamples)
    freqs = stability_analytics["feature_selection_probabilities"]
    consensus_features = [f for f, data in freqs.items() if data["selection_frequency"] >= 0.50]
    if len(consensus_features) == 0:
        # Fallback to top features by frequency
        sorted_by_freq = sorted(freqs.items(), key=lambda x: x[1]["selection_frequency"], reverse=True)
        consensus_features = [sorted_by_freq[0][0]]
        
    consensus_mask = np.zeros(partitioned.n_features, dtype=bool)
    for i, fname in enumerate(partitioned.feature_names):
        if fname in consensus_features:
            consensus_mask[i] = True
            
    # Final Candidate Evaluation using the Resampling Stability Consensus Subset
    candidate_evaluation = evaluate_approach(
        name="O3 Stability Consensus Candidate",
        selected_mask=consensus_mask,
        partitioned=partitioned,
        model_name=metaheuristic_config.model_name,
        seed=metaheuristic_config.seed
    )
    
    total_duration = float(time.time() - start_total_time)
    
    return {
        "status": "COMPLETED",
        "n_resamples": n_resamples,
        "resampling_protocol": resampling_protocol,
        "metaheuristic_config": metaheuristic_config.model_dump(),
        "resample_runs": resample_runs_data,
        "stability_metrics": stability_analytics,
        "consensus_features": consensus_features,
        "candidate_evaluation": candidate_evaluation,
        "total_duration_seconds": float(np.round(total_duration, 3))
    }

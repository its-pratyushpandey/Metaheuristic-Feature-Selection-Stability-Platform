import time
import numpy as np
from typing import Dict, Any, List, Optional, Tuple, Callable
from backend.app.metaheuristics.base import BaseMetaheuristic, MetaheuristicConfig, MetaheuristicResult, IterationMetric
from backend.app.metaheuristics.fitness import evaluate_subset_fitness

class SimulatedAnnealingFeatureSelector(BaseMetaheuristic):
    def optimize(
        self,
        X_train: np.ndarray,
        y_train: np.ndarray,
        X_val: np.ndarray,
        y_val: np.ndarray,
        feature_names: List[str],
        task_type: str,
        progress_callback: Optional[Callable[[int, int, float, Dict[str, Any]], None]] = None
    ) -> MetaheuristicResult:
        start_time = time.time()
        n_features = len(feature_names)
        n_iters = self.config.n_iterations * max(1, self.config.population_size // 5)
        
        self.log(f"Starting Simulated Annealing: {n_iters} temperature steps, {n_features} features.")
        
        # Initial solution
        current_state = self.rng.random(n_features) < 0.5
        if not np.any(current_state):
            current_state[self.rng.integers(0, n_features)] = True
            
        current_fitness, current_metric, _ = evaluate_subset_fitness(
            current_state, X_train, y_train, X_val, y_val,
            task_type=task_type,
            model_name=self.config.model_name,
            alpha=self.config.alpha,
            max_features=self.config.max_features,
            seed=self.config.seed
        )
        
        best_state = current_state.copy()
        best_fitness = current_fitness
        best_metric = current_metric
        
        temperature = self.config.initial_temp
        cooling = self.config.cooling_rate
        
        feature_selection_accum = np.zeros(n_features)
        history: List[IterationMetric] = []
        
        display_steps = self.config.n_iterations
        steps_per_epoch = max(1, n_iters // display_steps)
        
        for epoch in range(1, display_steps + 1):
            epoch_start = time.time()
            epoch_fitnesses = []
            
            for _ in range(steps_per_epoch):
                # Neighbor generation: flip k random bits
                neighbor = current_state.copy()
                flip_bits = self.rng.choice(n_features, min(self.config.sa_perturb_bits, n_features), replace=False)
                neighbor[flip_bits] = ~neighbor[flip_bits]
                if not np.any(neighbor):
                    neighbor[self.rng.integers(0, n_features)] = True
                    
                cand_fit, cand_met, _ = evaluate_subset_fitness(
                    neighbor, X_train, y_train, X_val, y_val,
                    task_type=task_type,
                    model_name=self.config.model_name,
                    alpha=self.config.alpha,
                    max_features=self.config.max_features,
                    seed=self.config.seed + epoch
                )
                
                delta = cand_fit - current_fitness
                # Metropolis Acceptance criterion
                if delta > 0 or (temperature > 1e-6 and self.rng.random() < np.exp(delta / max(1e-5, temperature))):
                    current_state = neighbor.copy()
                    current_fitness = cand_fit
                    current_metric = cand_met
                    
                if current_fitness > best_fitness:
                    best_fitness = current_fitness
                    best_metric = current_metric
                    best_state = current_state.copy()
                    
                temperature = max(1e-4, temperature * cooling)
                epoch_fitnesses.append(current_fitness)
                feature_selection_accum += current_state * current_fitness
                
            selected_count = int(np.sum(best_state))
            avg_fit = float(np.mean(epoch_fitnesses)) if epoch_fitnesses else best_fitness
            
            iter_metric = IterationMetric(
                iteration=epoch,
                best_fitness=float(np.round(best_fitness, 4)),
                avg_fitness=float(np.round(avg_fit, 4)),
                selected_count=selected_count,
                diversity=float(np.round(temperature / self.config.initial_temp, 4)),
                time_elapsed_ms=float(np.round((time.time() - epoch_start) * 1000, 2))
            )
            history.append(iter_metric)
            
            if progress_callback:
                progress_callback(epoch, display_steps, best_fitness, {
                    "avg_fitness": avg_fit,
                    "selected_count": selected_count,
                    "temperature": temperature
                })
                
        execution_time = float(time.time() - start_time)
        selected_indices = np.where(best_state)[0].tolist()
        selected_names = [feature_names[i] for i in selected_indices]
        
        max_accum = np.max(feature_selection_accum) if np.max(feature_selection_accum) > 0 else 1.0
        ranking_scores = {
            feature_names[i]: float(np.round(feature_selection_accum[i] / max_accum, 4))
            for i in range(n_features)
        }
        
        return MetaheuristicResult(
            algorithm="Simulated Annealing (SA)",
            selected_mask=best_state.tolist(),
            selected_indices=selected_indices,
            selected_feature_names=selected_names,
            selected_count=len(selected_indices),
            total_features=n_features,
            best_fitness=float(np.round(best_fitness, 4)),
            best_metric_score=float(np.round(best_metric, 4)),
            history=history,
            feature_ranking_scores=ranking_scores,
            execution_time_seconds=float(np.round(execution_time, 3)),
            config=self.config.model_dump(),
            seed=self.config.seed,
            logs=self.logs
        )

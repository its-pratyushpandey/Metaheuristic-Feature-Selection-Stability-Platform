import time
import numpy as np
from typing import Dict, Any, List, Optional, Tuple, Callable
from backend.app.metaheuristics.base import BaseMetaheuristic, MetaheuristicConfig, MetaheuristicResult, IterationMetric
from backend.app.metaheuristics.fitness import evaluate_subset_fitness

class DifferentialEvolutionFeatureSelector(BaseMetaheuristic):
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
        pop_size = self.config.population_size
        n_iters = self.config.n_iterations
        
        self.log(f"Starting Binary Differential Evolution: {pop_size} vectors, {n_iters} generations.")
        
        # Continuous population in [0, 1]^D, mapped to boolean subset via threshold 0.5
        pop_cont = self.rng.uniform(0.0, 1.0, (pop_size, n_features))
        fitness_scores = np.zeros(pop_size)
        metric_scores = np.zeros(pop_size)
        
        feature_selection_accum = np.zeros(n_features)
        history: List[IterationMetric] = []
        
        best_fitness = -1.0
        best_metric = 0.0
        best_mask = np.zeros(n_features, dtype=bool)
        
        # Initial evaluation
        for i in range(pop_size):
            mask = pop_cont[i] >= 0.5
            if not np.any(mask):
                mask[self.rng.integers(0, n_features)] = True
            fit, met, _ = evaluate_subset_fitness(
                mask, X_train, y_train, X_val, y_val,
                task_type=task_type,
                model_name=self.config.model_name,
                alpha=self.config.alpha,
                max_features=self.config.max_features,
                seed=self.config.seed
            )
            fitness_scores[i] = fit
            metric_scores[i] = met
            if fit > best_fitness:
                best_fitness = fit
                best_metric = met
                best_mask = mask.copy()
                
        F = 0.6   # Differential weight
        CR = 0.7  # Crossover probability
        
        for generation in range(1, n_iters + 1):
            iter_start = time.time()
            
            for i in range(pop_size):
                # Mutation: DE/rand/1
                idxs = [idx for idx in range(pop_size) if idx != i]
                r1, r2, r3 = self.rng.choice(idxs, 3, replace=False)
                
                # Mutant vector
                mutant = pop_cont[r1] + F * (pop_cont[r2] - pop_cont[r3])
                mutant = np.clip(mutant, 0.0, 1.0)
                
                # Binomial Crossover
                trial = pop_cont[i].copy()
                j_rand = self.rng.integers(0, n_features)
                for j in range(n_features):
                    if self.rng.random() < CR or j == j_rand:
                        trial[j] = mutant[j]
                        
                trial_mask = trial >= 0.5
                if not np.any(trial_mask):
                    trial_mask[self.rng.integers(0, n_features)] = True
                    
                trial_fit, trial_met, _ = evaluate_subset_fitness(
                    trial_mask, X_train, y_train, X_val, y_val,
                    task_type=task_type,
                    model_name=self.config.model_name,
                    alpha=self.config.alpha,
                    max_features=self.config.max_features,
                    seed=self.config.seed + generation
                )
                
                # Selection
                if trial_fit >= fitness_scores[i]:
                    pop_cont[i] = trial
                    fitness_scores[i] = trial_fit
                    metric_scores[i] = trial_met
                    
                if trial_fit > best_fitness:
                    best_fitness = trial_fit
                    best_metric = trial_met
                    best_mask = trial_mask.copy()
                    
            for i in range(pop_size):
                feature_selection_accum += (pop_cont[i] >= 0.5) * fitness_scores[i]
                
            diversity = float(np.mean(np.std(pop_cont, axis=0)))
            selected_count = int(np.sum(best_mask))
            avg_fit = float(np.mean(fitness_scores))
            
            iter_metric = IterationMetric(
                iteration=generation,
                best_fitness=float(np.round(best_fitness, 4)),
                avg_fitness=float(np.round(avg_fit, 4)),
                selected_count=selected_count,
                diversity=float(np.round(diversity, 4)),
                time_elapsed_ms=float(np.round((time.time() - iter_start) * 1000, 2))
            )
            history.append(iter_metric)
            
            if progress_callback:
                progress_callback(generation, n_iters, best_fitness, {
                    "avg_fitness": avg_fit,
                    "selected_count": selected_count,
                    "diversity": diversity
                })
                
        execution_time = float(time.time() - start_time)
        selected_indices = np.where(best_mask)[0].tolist()
        selected_names = [feature_names[i] for i in selected_indices]
        
        max_accum = np.max(feature_selection_accum) if np.max(feature_selection_accum) > 0 else 1.0
        ranking_scores = {
            feature_names[i]: float(np.round(feature_selection_accum[i] / max_accum, 4))
            for i in range(n_features)
        }
        
        return MetaheuristicResult(
            algorithm="Differential Evolution (DE)",
            selected_mask=best_mask.tolist(),
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

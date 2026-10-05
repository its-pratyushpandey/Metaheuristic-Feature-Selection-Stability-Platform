import time
import numpy as np
from typing import Dict, Any, List, Optional, Tuple, Callable
from backend.app.metaheuristics.base import BaseMetaheuristic, MetaheuristicConfig, MetaheuristicResult, IterationMetric
from backend.app.metaheuristics.fitness import evaluate_subset_fitness

class GeneticAlgorithmFeatureSelector(BaseMetaheuristic):
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
        
        self.log(f"Starting Genetic Algorithm: {pop_size} chromosomes, {n_iters} generations, {n_features} total features.")
        
        # 1. Initialize population with diverse subset sizes
        pop = np.zeros((pop_size, n_features), dtype=bool)
        for i in range(pop_size):
            p = self.rng.uniform(0.2, 0.7)
            pop[i] = self.rng.random(n_features) < p
            if not np.any(pop[i]):
                pop[i, self.rng.integers(0, n_features)] = True
                
        fitness_scores = np.zeros(pop_size)
        metric_scores = np.zeros(pop_size)
        
        # Feature selection frequency tracker across generations for feature ranking
        feature_selection_accum = np.zeros(n_features)
        history: List[IterationMetric] = []
        
        best_overall_fitness = -1.0
        best_overall_metric = 0.0
        best_overall_mask = np.zeros(n_features, dtype=bool)
        
        for generation in range(1, n_iters + 1):
            iter_start = time.time()
            
            # Evaluate current population
            for i in range(pop_size):
                fit, met, _ = evaluate_subset_fitness(
                    pop[i], X_train, y_train, X_val, y_val,
                    task_type=task_type,
                    model_name=self.config.model_name,
                    alpha=self.config.alpha,
                    max_features=self.config.max_features,
                    seed=self.config.seed + generation
                )
                fitness_scores[i] = fit
                metric_scores[i] = met
                if fit > best_overall_fitness:
                    best_overall_fitness = fit
                    best_overall_metric = met
                    best_overall_mask = pop[i].copy()
                    
            # Accumulate feature votes weighted by fitness
            for i in range(pop_size):
                feature_selection_accum += pop[i] * fitness_scores[i]
                
            # Diversity calculation: average pairwise Hamming distance
            diversity = float(np.mean(np.std(pop.astype(float), axis=0)))
            
            best_gen_fitness = float(np.max(fitness_scores))
            avg_gen_fitness = float(np.mean(fitness_scores))
            best_gen_idx = int(np.argmax(fitness_scores))
            selected_count = int(np.sum(pop[best_gen_idx]))
            
            iter_metric = IterationMetric(
                iteration=generation,
                best_fitness=float(np.round(best_gen_fitness, 4)),
                avg_fitness=float(np.round(avg_gen_fitness, 4)),
                selected_count=selected_count,
                diversity=float(np.round(diversity, 4)),
                time_elapsed_ms=float(np.round((time.time() - iter_start) * 1000, 2))
            )
            history.append(iter_metric)
            
            if progress_callback:
                progress_callback(generation, n_iters, best_gen_fitness, {
                    "avg_fitness": avg_gen_fitness,
                    "selected_count": selected_count,
                    "diversity": diversity
                })
                
            # Selection & Reproduction
            if generation < n_iters:
                new_pop = np.zeros_like(pop)
                # Elitism: preserve top elite chromosomes
                elite_indices = np.argsort(fitness_scores)[-self.config.elitism_count:]
                for idx_e, elite_idx in enumerate(elite_indices):
                    new_pop[idx_e] = pop[elite_idx].copy()
                    
                # Fill remaining slots
                for i in range(self.config.elitism_count, pop_size):
                    # Tournament selection
                    t_size = 3
                    t1_idx = self.rng.choice(pop_size, t_size, replace=False)
                    parent1 = pop[t1_idx[np.argmax(fitness_scores[t1_idx])]]
                    
                    t2_idx = self.rng.choice(pop_size, t_size, replace=False)
                    parent2 = pop[t2_idx[np.argmax(fitness_scores[t2_idx])]]
                    
                    # Crossover
                    child = parent1.copy()
                    if self.rng.random() < self.config.crossover_rate:
                        # Two-point crossover
                        pt1, pt2 = sorted(self.rng.choice(n_features, 2, replace=False))
                        child[pt1:pt2] = parent2[pt1:pt2]
                        
                    # Mutation: bit-flip
                    for f in range(n_features):
                        if self.rng.random() < self.config.mutation_rate:
                            child[f] = not child[f]
                            
                    # Guard empty subset
                    if not np.any(child):
                        child[self.rng.integers(0, n_features)] = True
                        
                    new_pop[i] = child
                    
                pop = new_pop
                
        execution_time = float(time.time() - start_time)
        selected_indices = np.where(best_overall_mask)[0].tolist()
        selected_names = [feature_names[i] for i in selected_indices]
        
        # Normalize feature ranking scores to [0, 1]
        max_accum = np.max(feature_selection_accum) if np.max(feature_selection_accum) > 0 else 1.0
        ranking_scores = {
            feature_names[i]: float(np.round(feature_selection_accum[i] / max_accum, 4))
            for i in range(n_features)
        }
        
        self.log(f"GA Complete in {execution_time:.2f}s. Selected {len(selected_indices)}/{n_features} features with fitness {best_overall_fitness:.4f}.")
        
        return MetaheuristicResult(
            algorithm="Genetic Algorithm (GA)",
            selected_mask=best_overall_mask.tolist(),
            selected_indices=selected_indices,
            selected_feature_names=selected_names,
            selected_count=len(selected_indices),
            total_features=n_features,
            best_fitness=float(np.round(best_overall_fitness, 4)),
            best_metric_score=float(np.round(best_overall_metric, 4)),
            history=history,
            feature_ranking_scores=ranking_scores,
            execution_time_seconds=float(np.round(execution_time, 3)),
            config=self.config.model_dump(),
            seed=self.config.seed,
            logs=self.logs
        )

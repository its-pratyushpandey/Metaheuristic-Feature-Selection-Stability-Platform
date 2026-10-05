import time
import numpy as np
from typing import Dict, Any, List, Optional, Tuple, Callable
from backend.app.metaheuristics.base import BaseMetaheuristic, MetaheuristicConfig, MetaheuristicResult, IterationMetric
from backend.app.metaheuristics.fitness import evaluate_subset_fitness

class ParticleSwarmFeatureSelector(BaseMetaheuristic):
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
        swarm_size = self.config.population_size
        n_iters = self.config.n_iterations
        
        self.log(f"Starting Binary PSO: {swarm_size} particles, {n_iters} iterations, {n_features} features.")
        
        # 1. Initialize positions & velocities
        # Positions in {0, 1}
        positions = np.zeros((swarm_size, n_features), dtype=bool)
        velocities = self.rng.uniform(-self.config.v_max, self.config.v_max, (swarm_size, n_features))
        
        for i in range(swarm_size):
            p = self.rng.uniform(0.2, 0.7)
            positions[i] = self.rng.random(n_features) < p
            if not np.any(positions[i]):
                positions[i, self.rng.integers(0, n_features)] = True
                
        pbest_positions = positions.copy()
        pbest_fitness = np.zeros(swarm_size)
        pbest_metrics = np.zeros(swarm_size)
        
        gbest_position = positions[0].copy()
        gbest_fitness = -1.0
        gbest_metric = 0.0
        
        feature_selection_accum = np.zeros(n_features)
        history: List[IterationMetric] = []
        
        w = self.config.inertia_weight
        c1 = self.config.c1
        c2 = self.config.c2
        
        for iteration in range(1, n_iters + 1):
            iter_start = time.time()
            current_fitness = np.zeros(swarm_size)
            
            for i in range(swarm_size):
                fit, met, _ = evaluate_subset_fitness(
                    positions[i], X_train, y_train, X_val, y_val,
                    task_type=task_type,
                    model_name=self.config.model_name,
                    alpha=self.config.alpha,
                    max_features=self.config.max_features,
                    seed=self.config.seed + iteration
                )
                current_fitness[i] = fit
                
                # Update Personal Best
                if fit > pbest_fitness[i]:
                    pbest_fitness[i] = fit
                    pbest_metrics[i] = met
                    pbest_positions[i] = positions[i].copy()
                    
                # Update Global Best
                if fit > gbest_fitness:
                    gbest_fitness = fit
                    gbest_metric = met
                    gbest_position = positions[i].copy()
                    
            for i in range(swarm_size):
                feature_selection_accum += positions[i] * current_fitness[i]
                
            diversity = float(np.mean(np.std(positions.astype(float), axis=0)))
            best_iter_fit = float(np.max(current_fitness))
            avg_iter_fit = float(np.mean(current_fitness))
            selected_count = int(np.sum(gbest_position))
            
            iter_metric = IterationMetric(
                iteration=iteration,
                best_fitness=float(np.round(gbest_fitness, 4)),
                avg_fitness=float(np.round(avg_iter_fit, 4)),
                selected_count=selected_count,
                diversity=float(np.round(diversity, 4)),
                time_elapsed_ms=float(np.round((time.time() - iter_start) * 1000, 2))
            )
            history.append(iter_metric)
            
            if progress_callback:
                progress_callback(iteration, n_iters, gbest_fitness, {
                    "avg_fitness": avg_iter_fit,
                    "selected_count": selected_count,
                    "diversity": diversity
                })
                
            # Update Swarm Velocities and Positions
            if iteration < n_iters:
                r1 = self.rng.random((swarm_size, n_features))
                r2 = self.rng.random((swarm_size, n_features))
                
                # Velocity equation
                velocities = (
                    w * velocities
                    + c1 * r1 * (pbest_positions.astype(float) - positions.astype(float))
                    + c2 * r2 * (gbest_position.astype(float) - positions.astype(float))
                )
                velocities = np.clip(velocities, -self.config.v_max, self.config.v_max)
                
                # Sigmoid transfer function for binary PSO
                sigmoid_v = 1.0 / (1.0 + np.exp(-velocities))
                rand_draw = self.rng.random((swarm_size, n_features))
                new_positions = rand_draw < sigmoid_v
                
                # Ensure no empty chromosome
                for i in range(swarm_size):
                    if not np.any(new_positions[i]):
                        new_positions[i, self.rng.integers(0, n_features)] = True
                positions = new_positions
                
        execution_time = float(time.time() - start_time)
        selected_indices = np.where(gbest_position)[0].tolist()
        selected_names = [feature_names[i] for i in selected_indices]
        
        max_accum = np.max(feature_selection_accum) if np.max(feature_selection_accum) > 0 else 1.0
        ranking_scores = {
            feature_names[i]: float(np.round(feature_selection_accum[i] / max_accum, 4))
            for i in range(n_features)
        }
        
        self.log(f"BPSO Complete in {execution_time:.2f}s. Selected {len(selected_indices)}/{n_features} features with fitness {gbest_fitness:.4f}.")
        
        return MetaheuristicResult(
            algorithm="Particle Swarm Optimization (PSO)",
            selected_mask=gbest_position.tolist(),
            selected_indices=selected_indices,
            selected_feature_names=selected_names,
            selected_count=len(selected_indices),
            total_features=n_features,
            best_fitness=float(np.round(gbest_fitness, 4)),
            best_metric_score=float(np.round(gbest_metric, 4)),
            history=history,
            feature_ranking_scores=ranking_scores,
            execution_time_seconds=float(np.round(execution_time, 3)),
            config=self.config.model_dump(),
            seed=self.config.seed,
            logs=self.logs
        )

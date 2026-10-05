from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional, Tuple, Callable
import numpy as np
from pydantic import BaseModel, Field

class MetaheuristicConfig(BaseModel):
    algorithm: str = "ga"  # "ga", "pso", "sa", "de"
    population_size: int = 30
    n_iterations: int = 30
    model_name: str = "rf"  # "rf", "logistic", "ridge", "gb", "svm", "knn", "dt"
    alpha: float = 0.85     # Weight on performance vs feature parsimony
    max_features: Optional[int] = None
    seed: int = 42
    
    # GA specific
    crossover_rate: float = 0.8
    mutation_rate: float = 0.05
    elitism_count: int = 2
    selection_method: str = "tournament"  # "tournament", "roulette"
    
    # PSO specific
    inertia_weight: float = 0.729
    c1: float = 1.49445     # cognitive weight
    c2: float = 1.49445     # social weight
    v_max: float = 4.0
    
    # SA specific
    initial_temp: float = 100.0
    cooling_rate: float = 0.92
    sa_perturb_bits: int = 2

class IterationMetric(BaseModel):
    iteration: int
    best_fitness: float
    avg_fitness: float
    selected_count: int
    diversity: float
    time_elapsed_ms: float

class MetaheuristicResult(BaseModel):
    algorithm: str
    selected_mask: List[bool]
    selected_indices: List[int]
    selected_feature_names: List[str]
    selected_count: int
    total_features: int
    best_fitness: float
    best_metric_score: float
    history: List[IterationMetric]
    feature_ranking_scores: Dict[str, float]
    execution_time_seconds: float
    config: Dict[str, Any]
    seed: int
    logs: List[str]

class BaseMetaheuristic(ABC):
    def __init__(self, config: MetaheuristicConfig):
        self.config = config
        self.rng = np.random.default_rng(config.seed)
        self.logs: List[str] = []

    def log(self, message: str):
        self.logs.append(message)

    @abstractmethod
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
        """Run feature selection optimization loop."""
        pass

from typing import Dict, Type
from backend.app.metaheuristics.base import BaseMetaheuristic, MetaheuristicConfig, MetaheuristicResult
from backend.app.metaheuristics.genetic_algorithm import GeneticAlgorithmFeatureSelector
from backend.app.metaheuristics.particle_swarm import ParticleSwarmFeatureSelector
from backend.app.metaheuristics.simulated_annealing import SimulatedAnnealingFeatureSelector
from backend.app.metaheuristics.differential_evolution import DifferentialEvolutionFeatureSelector

METAHEURISTIC_REGISTRY: Dict[str, Type[BaseMetaheuristic]] = {
    "ga": GeneticAlgorithmFeatureSelector,
    "pso": ParticleSwarmFeatureSelector,
    "sa": SimulatedAnnealingFeatureSelector,
    "de": DifferentialEvolutionFeatureSelector,
}

def get_metaheuristic_selector(config: MetaheuristicConfig) -> BaseMetaheuristic:
    algo_key = config.algorithm.lower()
    if algo_key not in METAHEURISTIC_REGISTRY:
        raise ValueError(f"Unknown metaheuristic algorithm: '{config.algorithm}'. Available: {list(METAHEURISTIC_REGISTRY.keys())}")
    return METAHEURISTIC_REGISTRY[algo_key](config)

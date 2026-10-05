import os
import sys
import time
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from backend.app.core.orchestrator import orchestrator

def seed_benchmarks():
    print("Running initial baseline benchmarks for out-of-the-box experience...")
    
    # 1. Ionosphere with GA
    print("Seeding Ionosphere (GA)...")
    job1_id = orchestrator.start_experiment_async("ionosphere", {
        "algorithm": "ga",
        "population_size": 15,
        "n_iterations": 10,
        "model_name": "rf",
        "n_resamples": 6,
        "alpha": 0.85,
        "seed": 42
    })
    
    while True:
        st = orchestrator.get_job_status(job1_id)
        if st and st["status"] in ["COMPLETED", "FAILED"]:
            print(f"Ionosphere run finished with status: {st['status']}")
            break
        time.sleep(0.5)

    # 2. Friedman-1 Regression with PSO
    print("Seeding Friedman-1 Non-Linear Regression (PSO)...")
    job2_id = orchestrator.start_experiment_async("friedman_regression", {
        "algorithm": "pso",
        "population_size": 15,
        "n_iterations": 10,
        "model_name": "rf",
        "n_resamples": 6,
        "alpha": 0.85,
        "seed": 42
    })
    while True:
        st = orchestrator.get_job_status(job2_id)
        if st and st["status"] in ["COMPLETED", "FAILED"]:
            print(f"Friedman regression run finished with status: {st['status']}")
            break
        time.sleep(0.5)

    # 3. Sonar Mines vs Rocks with SA
    print("Seeding Sonar Mines vs Rocks (SA)...")
    job3_id = orchestrator.start_experiment_async("sonar", {
        "algorithm": "sa",
        "population_size": 15,
        "n_iterations": 10,
        "model_name": "rf",
        "n_resamples": 6,
        "alpha": 0.85,
        "seed": 42
    })
    while True:
        st = orchestrator.get_job_status(job3_id)
        if st and st["status"] in ["COMPLETED", "FAILED"]:
            print(f"Sonar run finished with status: {st['status']}")
            break
        time.sleep(0.5)

    print("Seeding completed successfully!")

if __name__ == "__main__":
    seed_benchmarks()

import time
import json
import uuid
import threading
import numpy as np
from typing import Dict, Any, List, Optional
from pathlib import Path
from backend.app.core.config import EXPERIMENTS_DIR, DATASETS_DIR
from backend.app.datasets.registry import registry
from backend.app.datasets.preprocessor import preprocess_and_partition
from backend.app.metaheuristics.base import MetaheuristicConfig
from backend.app.reference.baseline_o2 import run_o2_reference_pipeline
from backend.app.stability.stability_engine import run_resampling_stability_experiment
from backend.app.analysis.feature_classifier import classify_features_stability
from backend.app.validation.negative_tests import run_all_negative_tests
from backend.app.validation.kpi_engine import calculate_kpis
from backend.app.validation.acceptance_rules import evaluate_acceptance_conditions
from backend.app.provenance.manifest import generate_evidence_manifest, generate_reproducibility_python_script

class ExperimentJob:
    def __init__(self, job_id: str, dataset_id: str, config: Dict[str, Any]):
        self.job_id = job_id
        self.dataset_id = dataset_id
        self.config = config
        self.status = "PENDING"  # PENDING, RUNNING, COMPLETED, FAILED, CANCELLED
        self.progress_pct = 0.0
        self.current_stage = "Initializing"
        self.stage_detail = "Queued for execution"
        self.result: Optional[Dict[str, Any]] = None
        self.error: Optional[str] = None
        self.start_time: Optional[float] = None
        self.end_time: Optional[float] = None
        self.cancel_requested = False

class Orchestrator:
    def __init__(self):
        self.jobs: Dict[str, ExperimentJob] = {}
        self.lock = threading.Lock()
        self._load_saved_experiments()

    def _load_saved_experiments(self):
        for f in EXPERIMENTS_DIR.glob("*.json"):
            try:
                with open(f, "r") as fp:
                    data = json.load(fp)
                    job_id = data.get("experiment_id")
                    if job_id:
                        job = ExperimentJob(job_id, data.get("dataset_id", "ionosphere"), data.get("config", {}))
                        job.status = "COMPLETED"
                        job.progress_pct = 100.0
                        job.result = data
                        self.jobs[job_id] = job
            except Exception:
                pass

    def start_experiment_async(self, dataset_id: str, config: Dict[str, Any]) -> str:
        job_id = f"exp_{int(time.time())}_{uuid.uuid4().hex[:6]}"
        job = ExperimentJob(job_id, dataset_id, config)
        with self.lock:
            self.jobs[job_id] = job

        thread = threading.Thread(target=self._run_job_worker, args=(job,), daemon=True)
        thread.start()
        return job_id

    def cancel_job(self, job_id: str) -> bool:
        with self.lock:
            job = self.jobs.get(job_id)
            if job and job.status in ["PENDING", "RUNNING"]:
                job.cancel_requested = True
                job.status = "CANCELLED"
                job.stage_detail = "Execution cancelled by operator."
                return True
        return False

    def get_job_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        job = self.jobs.get(job_id)
        if not job:
            return None
        return {
            "job_id": job.job_id,
            "dataset_id": job.dataset_id,
            "status": job.status,
            "progress_pct": job.progress_pct,
            "current_stage": job.current_stage,
            "stage_detail": job.stage_detail,
            "has_result": job.result is not None,
            "error": job.error,
            "elapsed_seconds": float(np.round(time.time() - job.start_time, 1)) if job.start_time and not job.end_time else (float(np.round(job.end_time - job.start_time, 1)) if job.start_time and job.end_time else 0.0)
        }

    def get_job_result(self, job_id: str) -> Optional[Dict[str, Any]]:
        job = self.jobs.get(job_id)
        if not job or not job.result:
            return None
        return job.result

    def list_experiments(self) -> List[Dict[str, Any]]:
        results = []
        for job_id, job in self.jobs.items():
            if job.result:
                r = job.result
                results.append({
                    "experiment_id": job_id,
                    "dataset_id": job.dataset_id,
                    "dataset_name": r.get("dataset_meta", {}).get("name", job.dataset_id),
                    "algorithm": r.get("metaheuristic_config", {}).get("algorithm", "ga").upper(),
                    "model": r.get("metaheuristic_config", {}).get("model_name", "rf"),
                    "seed": r.get("metaheuristic_config", {}).get("seed", 42),
                    "created_at": r.get("created_at", time.strftime("%Y-%m-%d %H:%M:%S")),
                    "stability_score": r.get("stability_result", {}).get("stability_metrics", {}).get("stability_score_100", 0),
                    "heldout_performance": r.get("candidate_evaluation", {}).get("heldout_performance", 0),
                    "selected_features_count": r.get("candidate_evaluation", {}).get("selected_count", 0),
                    "final_decision": r.get("validation_decision", {}).get("final_decision", "N/A"),
                    "status": job.status
                })
        return list(reversed(results))

    def _run_job_worker(self, job: ExperimentJob):
        job.status = "RUNNING"
        job.start_time = time.time()
        job.progress_pct = 5.0
        job.current_stage = "Dataset Ingestion"
        job.stage_detail = f"Loading dataset '{job.dataset_id}'..."

        try:
            # 1. Ingest dataset
            df = registry.get_dataset(job.dataset_id)
            ds_meta = registry.get_metadata(job.dataset_id)
            if df is None:
                raise ValueError(f"Dataset '{job.dataset_id}' not found in registry.")

            cfg_dict = job.config
            seed = cfg_dict.get("seed", 42)
            model_name = cfg_dict.get("model_name", "rf")
            algorithm = cfg_dict.get("algorithm", "ga")
            pop_size = cfg_dict.get("population_size", 25)
            n_iters = cfg_dict.get("n_iterations", 20)
            n_resamples = cfg_dict.get("n_resamples", 12)
            alpha = cfg_dict.get("alpha", 0.85)

            # Preprocess & Partition
            job.progress_pct = 15.0
            job.current_stage = "Data Partitioning & Leakage Prevention"
            job.stage_detail = "Isolating independent held-out acceptance partition..."
            partitioned, part_meta = preprocess_and_partition(
                df, ds_meta["target_col"], ds_meta["task_type"], seed=seed
            )

            if job.cancel_requested:
                return

            # 2. O2 Reference Baseline
            job.progress_pct = 25.0
            job.current_stage = "O2 Reference Execution"
            job.stage_detail = "Benchmarking Full Features vs Filter-based SelectKBest vs MI..."
            o2_res = run_o2_reference_pipeline(partitioned, model_name=model_name, seed=seed)

            if job.cancel_requested:
                return

            # 3. O3 Resampling Stability Engine
            job.progress_pct = 40.0
            job.current_stage = "O3 Resampling Stability Search"
            job.stage_detail = f"Running {algorithm.upper()} across {n_resamples} resampled data splits..."

            meta_cfg = MetaheuristicConfig(
                algorithm=algorithm,
                population_size=pop_size,
                n_iterations=n_iters,
                model_name=model_name,
                alpha=alpha,
                seed=seed
            )

            def progress_cb(cur, total, msg, rec):
                job.progress_pct = float(np.round(40.0 + (cur / total) * 35.0, 1))
                job.stage_detail = f"Resample {cur}/{total}: {msg}"

            o3_res = run_resampling_stability_experiment(
                partitioned,
                meta_cfg,
                n_resamples=n_resamples,
                progress_callback=progress_cb
            )

            if job.cancel_requested:
                return

            # 4. Feature Classification (Stable vs Artefacts)
            job.progress_pct = 80.0
            job.current_stage = "Feature Stability Classification"
            job.stage_detail = "Classifying Consistently Selected features vs Search Artefacts..."
            classified = classify_features_stability(o3_res, partitioned, model_name=model_name, seed=seed)

            # 5. Mandatory Negative Tests
            job.progress_pct = 88.0
            job.current_stage = "Negative Test Center"
            job.stage_detail = "Executing NT-1 through NT-5 challenge suite..."
            candidate_eval = o3_res["candidate_evaluation"]
            negative_tests = run_all_negative_tests(partitioned, meta_cfg, candidate_eval)

            # 6. KPIs & Validation Decision Gate
            job.progress_pct = 95.0
            job.current_stage = "Acceptance Decision Gate"
            job.stage_detail = "Evaluating AC-1..AC-4 and computing 6-KPI dashboard..."
            kpis = calculate_kpis(o2_res["o2_baseline"], o3_res, candidate_eval, ds_meta["task_type"])
            verdict = evaluate_acceptance_conditions(o2_res["o2_baseline"], candidate_eval, o3_res, negative_tests, kpis)

            # 7. Evidence Manifest & Reproducibility Package
            manifest = generate_evidence_manifest(
                job.job_id, ds_meta, part_meta, meta_cfg.model_dump(),
                o2_res["o2_baseline"], o3_res, classified,
                negative_tests, kpis, verdict
            )
            repro_script = generate_reproducibility_python_script(manifest)

            experiment_result = {
                "experiment_id": job.job_id,
                "created_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                "dataset_id": job.dataset_id,
                "dataset_meta": ds_meta,
                "partition_meta": part_meta,
                "metaheuristic_config": meta_cfg.model_dump(),
                "o2_reference": o2_res,
                "stability_result": o3_res,
                "classified_features": classified,
                "candidate_evaluation": candidate_eval,
                "negative_tests": negative_tests,
                "kpis": kpis,
                "validation_decision": verdict,
                "evidence_manifest": manifest,
                "reproducibility_script": repro_script,
                "total_execution_seconds": float(np.round(time.time() - job.start_time, 2))
            }

            # Save to disk
            exp_file = EXPERIMENTS_DIR / f"{job.job_id}.json"
            with open(exp_file, "w") as fp:
                json.dump(experiment_result, fp, indent=2)

            job.result = experiment_result
            job.status = "COMPLETED"
            job.progress_pct = 100.0
            job.current_stage = "Completed"
            job.stage_detail = f"Execution verified successfully. Verdict: {verdict['final_decision']}"
            job.end_time = time.time()

        except Exception as e:
            job.status = "FAILED"
            job.error = str(e)
            job.stage_detail = f"Error: {str(e)}"
            job.end_time = time.time()

orchestrator = Orchestrator()

import io
import time
import pandas as pd
import numpy as np
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional, Literal
from backend.app.datasets.registry import registry
from backend.app.datasets.quality import analyze_dataset_quality
from backend.app.datasets.preprocessor import preprocess_and_partition
from backend.app.metaheuristics.base import MetaheuristicConfig
from backend.app.metaheuristics import get_metaheuristic_selector
from backend.app.reference.baseline_o2 import run_o2_reference_pipeline, evaluate_approach
from backend.app.reference.oracle import verify_o2_reproducibility_oracle
from backend.app.stability.stability_engine import run_resampling_stability_experiment
from backend.app.analysis.feature_classifier import classify_features_stability
from backend.app.validation.negative_tests import (
    run_all_negative_tests,
    run_nt1_sample_sensitivity_test,
    run_nt2_noise_injection_test,
    run_nt3_overfitting_generalization_gap_test,
    run_nt4_resource_budget_latency_test,
    run_nt5_drift_detection_test
)
from backend.app.validation.kpi_engine import calculate_kpis
from backend.app.validation.acceptance_rules import evaluate_acceptance_conditions
from backend.app.assurance.shift_detector import detect_covariate_shift
from backend.app.assurance.calibration import compute_expected_calibration_error
from backend.app.assurance.abstention import evaluate_prediction_uncertainty_and_abstention
from backend.app.assurance.recovery import recovery_manager
from backend.app.provenance.manifest import generate_evidence_manifest, generate_reproducibility_python_script
from backend.app.core.orchestrator import orchestrator
import psutil

api_router = APIRouter()

# ----------------- DATASETS -----------------
@api_router.get("/datasets")
def list_datasets():
    return registry.list_datasets()

@api_router.get("/datasets/{dataset_id}")
def get_dataset_info(dataset_id: str):
    meta = registry.get_metadata(dataset_id)
    if not meta:
        raise HTTPException(status_code=404, detail="Dataset not found")
    df = registry.get_dataset(dataset_id)
    return {
        "metadata": meta,
        "preview": df.head(10).to_dict(orient="records") if df is not None else []
    }

@api_router.get("/datasets/{dataset_id}/quality")
def get_dataset_quality(dataset_id: str):
    df = registry.get_dataset(dataset_id)
    meta = registry.get_metadata(dataset_id)
    if df is None or meta is None:
        raise HTTPException(status_code=404, detail="Dataset not found")
    quality = analyze_dataset_quality(df, meta["target_col"], meta["task_type"])
    return quality

@api_router.post("/datasets/upload")
async def upload_dataset(
    file: UploadFile = File(...),
    name: str = Form(...),
    target_col: str = Form(...),
    task_type: str = Form(...)
):
    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))
        if df.empty or len(df.columns) < 2:
            raise HTTPException(status_code=400, detail="CSV must contain at least one feature column and one target column.")
        if target_col not in df.columns:
            raise HTTPException(status_code=400, detail=f"Target column '{target_col}' not found in CSV.")
        ds_id = registry.register_custom_dataset(name, df, target_col, task_type)
        return {"dataset_id": ds_id, "name": name, "rows": len(df), "columns": len(df.columns)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ----------------- REFERENCE O2 -----------------
class ReferenceRequest(BaseModel):
    dataset_id: str = "ionosphere"
    model_name: str = "rf"
    seed: int = Field(default=42, ge=0)

@api_router.post("/reference/run")
def run_reference(req: ReferenceRequest):
    df = registry.get_dataset(req.dataset_id)
    meta = registry.get_metadata(req.dataset_id)
    if df is None:
        raise HTTPException(status_code=404, detail="Dataset not found")
    part, _ = preprocess_and_partition(df, meta["target_col"], meta["task_type"], seed=req.seed)
    res = run_o2_reference_pipeline(part, model_name=req.model_name, seed=req.seed)
    return res

@api_router.post("/reference/oracle")
def run_oracle(req: ReferenceRequest):
    df = registry.get_dataset(req.dataset_id)
    meta = registry.get_metadata(req.dataset_id)
    if df is None:
        raise HTTPException(status_code=404, detail="Dataset not found")
    part, _ = preprocess_and_partition(df, meta["target_col"], meta["task_type"], seed=req.seed)
    res = verify_o2_reproducibility_oracle(part, model_name=req.model_name, seed=req.seed)
    return res

# ----------------- METAHEURISTICS SINGLE RUN -----------------
class SingleRunRequest(BaseModel):
    dataset_id: str = "ionosphere"
    config: MetaheuristicConfig

@api_router.post("/metaheuristics/single-run")
def run_single_metaheuristic(req: SingleRunRequest):
    try:
        df = registry.get_dataset(req.dataset_id)
        meta = registry.get_metadata(req.dataset_id)
        if df is None:
            raise HTTPException(status_code=404, detail="Dataset not found")
        part, _ = preprocess_and_partition(df, meta["target_col"], meta["task_type"], seed=req.config.seed)
        selector = get_metaheuristic_selector(req.config)
        res = selector.optimize(
            part.X_train, part.y_train, part.X_val, part.y_val,
            feature_names=part.feature_names, task_type=part.task_type
        )
        return res
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_msg = f"Metaheuristic optimization failed: {str(e)}\n{traceback.format_exc()}"
        print(error_msg)
        raise HTTPException(status_code=500, detail=str(e))

# ----------------- EXPERIMENT ORCHESTRATOR & JOBS -----------------
class StartExperimentRequest(BaseModel):
    dataset_id: str = "ionosphere"
    algorithm: Literal["ga", "pso", "sa", "de"] = "ga"
    population_size: int = Field(default=25, ge=2, le=500)
    n_iterations: int = Field(default=20, ge=1, le=1000)
    model_name: str = "rf"
    n_resamples: int = Field(default=12, ge=2, le=500)
    alpha: float = Field(default=0.85, ge=0.0, le=1.0)
    seed: int = Field(default=42, ge=0)

@api_router.post("/experiments/start")
def start_experiment(req: StartExperimentRequest):
    job_id = orchestrator.start_experiment_async(req.dataset_id, req.model_dump())
    return {"job_id": job_id, "status": "QUEUED"}

@api_router.get("/experiments/status/{job_id}")
def get_experiment_status(job_id: str):
    st = orchestrator.get_job_status(job_id)
    if not st:
        raise HTTPException(status_code=404, detail="Job not found")
    return st

@api_router.post("/experiments/cancel/{job_id}")
def cancel_experiment(job_id: str):
    ok = orchestrator.cancel_job(job_id)
    return {"cancelled": ok}

@api_router.get("/experiments/{experiment_id}")
def get_experiment_details(experiment_id: str):
    res = orchestrator.get_job_result(experiment_id)
    if not res:
        raise HTTPException(status_code=404, detail="Experiment not found")
    return res

@api_router.get("/experiments")
def list_all_experiments():
    return orchestrator.list_experiments()

# ----------------- ASSURANCE & RECOVERY -----------------
class ShiftRequest(BaseModel):
    dataset_id: str = "ionosphere"
    shift_magnitude: float = Field(default=2.0, ge=0.0)
    seed: int = Field(default=42, ge=0)

@api_router.post("/assurance/shift")
def evaluate_shift(req: ShiftRequest):
    df = registry.get_dataset(req.dataset_id)
    meta = registry.get_metadata(req.dataset_id)
    if df is None:
        raise HTTPException(status_code=404, detail="Dataset not found")
    part, _ = preprocess_and_partition(df, meta["target_col"], meta["task_type"], seed=req.seed)
    
    # Introduce synthetic shift to test detector
    rng = np.random.default_rng(req.seed)
    X_target = part.X_heldout.copy()
    if req.shift_magnitude > 0:
        shift_cols = min(3, part.n_features)
        for c in range(shift_cols):
            X_target[:, c] += rng.normal(req.shift_magnitude, 0.5, len(X_target))
            
    res = detect_covariate_shift(part.X_train, X_target, part.feature_names)
    return res

@api_router.post("/assurance/calibration")
def evaluate_calibration(req: ReferenceRequest):
    """Measure held-out calibration for a freshly fitted reference model."""
    df = registry.get_dataset(req.dataset_id)
    meta = registry.get_metadata(req.dataset_id)
    if df is None or meta is None:
        raise HTTPException(status_code=404, detail="Dataset not found")

    part, _ = preprocess_and_partition(df, meta["target_col"], meta["task_type"], seed=req.seed)
    evaluation = evaluate_approach(
        name="Calibration Reference",
        selected_mask=np.ones(part.n_features, dtype=bool),
        partitioned=part,
        model_name=req.model_name,
        seed=req.seed,
    )
    return {
        "dataset_id": req.dataset_id,
        "model_name": req.model_name,
        "task_type": meta["task_type"],
        "heldout_instances": len(part.y_heldout),
        "calibration": evaluation.get("calibration"),
    }

class AbstentionRequest(BaseModel):
    task_type: Literal["classification", "regression"] = "classification"
    confidence_threshold: float = Field(default=0.65, ge=0.0, le=1.0)
    entropy_threshold: float = Field(default=0.85, ge=0.0, le=1.0)
    simulated_low_confidence: bool = False

@api_router.post("/assurance/abstention")
def test_abstention(req: AbstentionRequest):
    rng = np.random.default_rng(42)
    n = 100
    if req.task_type == "classification":
        if req.simulated_low_confidence:
            # High entropy / uncertain probabilities
            p1 = rng.uniform(0.45, 0.55, n)
            p0 = 1.0 - p1
            probs = np.column_stack([p0, p1])
        else:
            p1 = rng.uniform(0.70, 0.99, n)
            p0 = 1.0 - p1
            probs = np.column_stack([p0, p1])
        return evaluate_prediction_uncertainty_and_abstention(probs, "classification", req.confidence_threshold, req.entropy_threshold)
    else:
        preds = rng.normal(10, 2, n)
        if req.simulated_low_confidence:
            preds[:15] += 25.0 # extreme outliers
        return evaluate_prediction_uncertainty_and_abstention(preds, "regression")

@api_router.post("/assurance/recovery/rollback")
def trigger_rollback(reason: str = Query("Manual Operator Rollback"), test_id: str = Query("MANUAL-1")):
    rec = recovery_manager.trigger_recovery_protocol("OPERATOR_MANUAL_TRIGGER", test_id, reason, "REVISE")
    return rec

@api_router.get("/assurance/recovery/logs")
def get_recovery_logs():
    return recovery_manager.list_recovery_logs()

# ----------------- EVIDENCE MANIFEST & REPRO SCRIPT -----------------
@api_router.get("/evidence/{experiment_id}/manifest")
def get_manifest(experiment_id: str):
    res = orchestrator.get_job_result(experiment_id)
    if not res:
        raise HTTPException(status_code=404, detail="Experiment not found")
    return res.get("evidence_manifest", {})

@api_router.get("/evidence/{experiment_id}/script")
def get_script(experiment_id: str):
    res = orchestrator.get_job_result(experiment_id)
    if not res:
        raise HTTPException(status_code=404, detail="Experiment not found")
    return {"script": res.get("reproducibility_script", "")}

# ----------------- SYSTEM & ROADMAP -----------------
@api_router.get("/system/health")
def get_system_health():
    mem = psutil.virtual_memory()
    cpu_pct = psutil.cpu_percent(interval=0.1)
    active_jobs = sum(1 for j in orchestrator.jobs.values() if j.status in ["PENDING", "RUNNING"])
    return {
        "status": "HEALTHY",
        "cpu_usage_pct": cpu_pct,
        "memory_used_mb": float(np.round(mem.used / (1024 * 1024), 1)),
        "memory_total_mb": float(np.round(mem.total / (1024 * 1024), 1)),
        "memory_pct": mem.percent,
        "active_background_jobs": active_jobs,
        "registered_datasets": len(registry.list_datasets()),
        "completed_experiments": len(orchestrator.list_experiments()),
        "engine_version": "2.0.0",
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
    }

@api_router.get("/system/roadmap")
def get_project_roadmap():
    return {
        "semester_vii_capstone_1": {
            "title": "Semester VII / Capstone Project I",
            "milestones": [
                {
                    "id": "O1",
                    "name": "Validate Problem & Freeze Engineering Contract",
                    "status": "COMPLETED",
                    "progress_pct": 100,
                    "deliverables": [
                        "Formalized feature selection stability contract",
                        "Reproducible data partitioning & leakage prevention protocol",
                        "Dataset schema & quality audit suite (missing, duplicates, dtypes)"
                    ],
                    "evidence_ref": "AC-1, AC-3 Preprocessing Specifications"
                },
                {
                    "id": "O2",
                    "name": "Build Reproducible Reference & Vertical Slice",
                    "status": "COMPLETED",
                    "progress_pct": 100,
                    "deliverables": [
                        "Full Features vs Filter-based SelectKBest vs MI benchmark",
                        "One-command reproducibility oracle test",
                        "Latency p95 and peak memory profiling harness"
                    ],
                    "evidence_ref": "O2 Reference Pipeline & Expected Oracle"
                }
            ]
        },
        "semester_viii_capstone_2": {
            "title": "Semester VIII / Capstone Project II",
            "milestones": [
                {
                    "id": "O3",
                    "name": "Engineer and Prove Differentiating Contribution",
                    "status": "COMPLETED",
                    "progress_pct": 100,
                    "deliverables": [
                        "Cross-resampling metaheuristic stability engine (GA, PSO, SA, DE)",
                        "Kuncheva index, Nogueira measure, Jaccard pairwise matrix, 95% bootstrap CIs",
                        "Distinguish Consistently Selected features from Search Artefacts"
                    ],
                    "evidence_ref": "O3 Resampling Stability & Feature Classifier"
                },
                {
                    "id": "O4",
                    "name": "Integrate Complete Operable System",
                    "status": "COMPLETED",
                    "progress_pct": 100,
                    "deliverables": [
                        "End-to-end Training/Serving Loop with measured-feedback loop",
                        "FastAPI asynchronous worker orchestrator & Next.js dashboard",
                        "Shift detector, ECE reliability calibration, uncertainty abstention"
                    ],
                    "evidence_ref": "Interactive Architecture Page & Assurance Module"
                },
                {
                    "id": "O5",
                    "name": "Complete Independent Acceptance and Impact Validation",
                    "status": "COMPLETED",
                    "progress_pct": 100,
                    "deliverables": [
                        "Executable Negative Test Center (NT-1 through NT-5)",
                        "6-KPI dashboard with condition-wise metrics against O2",
                        "Decision engine: PASS/ACCEPT, REVISE, HOLD/STOP gate",
                        "JSON-LD evidence manifest & automated recovery manager"
                    ],
                    "evidence_ref": "Validation Architecture & Decision Engine"
                }
            ]
        }
    }

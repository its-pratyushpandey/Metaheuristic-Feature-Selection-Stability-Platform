import os
from pathlib import Path
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
BACKEND_DIR = BASE_DIR / "backend"
DATA_DIR = BASE_DIR / "data"
ARCHIVE_DIR = BASE_DIR / "archive"

DATASETS_DIR = DATA_DIR / "datasets"
EXPERIMENTS_DIR = DATA_DIR / "experiments"
MANIFESTS_DIR = DATA_DIR / "manifests"
EVIDENCE_DIR = DATA_DIR / "evidence"

for directory in [DATA_DIR, DATASETS_DIR, EXPERIMENTS_DIR, MANIFESTS_DIR, EVIDENCE_DIR]:
    directory.mkdir(parents=True, exist_ok=True)

class Settings(BaseModel):
    APP_NAME: str = "Metaheuristic Feature Selection Stability Across Data Resampling"
    API_V1_STR: str = "/api/v1"
    VERSION: str = "2.0.0"
    DEFAULT_SEED: int = 42
    MAX_WORKERS: int = 4
    
    # Resource Budget / SLA
    DEFAULT_LATENCY_P95_MS_THRESHOLD: float = 15.0
    DEFAULT_MEMORY_PEAK_MB_LIMIT: float = 512.0
    DEFAULT_STABILITY_TARGET_SCORE: float = 80.0
    DEFAULT_PERFORMANCE_TARGET_SCORE: float = 80.0
    DEFAULT_CALIBRATION_ECE_MAX: float = 0.05
    
settings = Settings()

import os
import json
import time
import pandas as pd
from pathlib import Path
from typing import Dict, Any, List, Optional
from backend.app.core.config import DATASETS_DIR
from backend.app.datasets.loader import DATASET_LOADERS, get_available_datasets_meta
from backend.app.datasets.quality import analyze_dataset_quality
from backend.app.datasets.preprocessor import preprocess_and_partition, PartitionedDataset

class DatasetRegistry:
    def __init__(self):
        self.cached_dfs: Dict[str, pd.DataFrame] = {}
        self.cached_meta: Dict[str, Dict[str, Any]] = {}
        self._init_benchmark_cache()

    def _init_benchmark_cache(self):
        catalog = get_available_datasets_meta()
        for item in catalog:
            ds_id = item["id"]
            if ds_id in DATASET_LOADERS:
                try:
                    df, target_col, task_type, meta = DATASET_LOADERS[ds_id]()
                    self.cached_dfs[ds_id] = df
                    self.cached_meta[ds_id] = {
                        "id": ds_id,
                        "name": meta.get("name", ds_id),
                        "task_type": task_type,
                        "target_col": target_col,
                        "source": meta.get("source", "UCI Benchmark"),
                        "description": meta.get("description", ""),
                        "license": "CC-BY 4.0 / Public Benchmark",
                        "owner": "UCI ML Repository",
                        "access_date": "2026-09-02",
                        "version": "1.0.0",
                        "is_archive": item.get("is_archive", False),
                        "classes": meta.get("classes", None),
                        "known_signal_features": meta.get("known_signal_features", None),
                        "known_noise_features": meta.get("known_noise_features", None)
                    }
                except Exception as e:
                    pass

    def list_datasets(self) -> List[Dict[str, Any]]:
        results = []
        for ds_id, meta in self.cached_meta.items():
            df = self.cached_dfs[ds_id]
            results.append({
                **meta,
                "rows": int(len(df)),
                "columns": int(len(df.columns)),
                "feature_count": int(len(df.columns) - 1),
                "features": [c for c in df.columns if c != meta["target_col"]]
            })
        return results

    def get_dataset(self, ds_id: str) -> Optional[pd.DataFrame]:
        return self.cached_dfs.get(ds_id)

    def get_metadata(self, ds_id: str) -> Optional[Dict[str, Any]]:
        return self.cached_meta.get(ds_id)

    def register_custom_dataset(
        self,
        name: str,
        df: pd.DataFrame,
        target_col: str,
        task_type: str,
        source: str = "User Uploaded CSV",
        description: str = "Custom user uploaded dataset"
    ) -> str:
        ds_id = f"custom_{int(time.time())}_{name.lower().replace(' ', '_')}"
        csv_path = DATASETS_DIR / f"{ds_id}.csv"
        df.to_csv(csv_path, index=False)
        
        self.cached_dfs[ds_id] = df
        self.cached_meta[ds_id] = {
            "id": ds_id,
            "name": name,
            "task_type": task_type,
            "target_col": target_col,
            "source": source,
            "description": description,
            "license": "User Defined",
            "owner": "Current Operator",
            "access_date": time.strftime("%Y-%m-%d"),
            "version": "1.0.0",
            "is_archive": False,
            "file_path": str(csv_path)
        }
        return ds_id

registry = DatasetRegistry()

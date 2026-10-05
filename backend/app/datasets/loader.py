import os
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Tuple, Dict, Any, List
from sklearn.datasets import load_diabetes, make_friedman1, make_classification, make_regression
from backend.app.core.config import ARCHIVE_DIR, DATASETS_DIR

def load_archive_ionosphere() -> Tuple[pd.DataFrame, str, str, Dict[str, Any]]:
    path = ARCHIVE_DIR / "ionosphere" / "ionosphere.data"
    col_names = [f"radar_pulse_{i+1}" for i in range(34)] + ["target"]
    df = pd.read_csv(path, header=None, names=col_names)
    df["target"] = (df["target"] == "g").astype(int)
    meta = {
        "name": "Ionosphere Radar Returns",
        "task_type": "classification",
        "description": "Johns Hopkins University radar classification of ionosphere electron signals (Good vs Bad).",
        "source": "UCI ML Repository / Johns Hopkins APL",
        "target_col": "target",
        "classes": ["Bad (0)", "Good (1)"]
    }
    return df, "target", "classification", meta

def load_archive_sonar() -> Tuple[pd.DataFrame, str, str, Dict[str, Any]]:
    path = ARCHIVE_DIR / "sonar" / "sonar.all-data"
    col_names = [f"freq_band_{i+1:02d}" for i in range(60)] + ["target"]
    df = pd.read_csv(path, header=None, names=col_names)
    df["target"] = (df["target"] == "M").astype(int)
    meta = {
        "name": "Sonar Mines vs Rocks",
        "task_type": "classification",
        "description": "Sonar signal returns bounced off metal cylinders (Mines) vs roughly cylindrical Rocks.",
        "source": "UCI ML Repository / Gorman & Sejnowski",
        "target_col": "target",
        "classes": ["Rock (0)", "Mine (1)"]
    }
    return df, "target", "classification", meta

def load_archive_waveform() -> Tuple[pd.DataFrame, str, str, Dict[str, Any]]:
    path = ARCHIVE_DIR / "wavefrom" / "waveform_v1.data"
    col_names = [f"wave_dim_{i+1:02d}" for i in range(21)] + ["target"]
    df = pd.read_csv(path, header=None, names=col_names)
    df["target"] = df["target"].astype(int)
    meta = {
        "name": "Waveform 21-Dimension Generator",
        "task_type": "classification",
        "description": "Three-class continuous waveform generator with 21 noisy signal attributes.",
        "source": "UCI ML Repository / Breiman et al.",
        "target_col": "target",
        "classes": ["Waveform 0", "Waveform 1", "Waveform 2"]
    }
    return df, "target", "classification", meta

def load_archive_wine() -> Tuple[pd.DataFrame, str, str, Dict[str, Any]]:
    path = ARCHIVE_DIR / "wine" / "wine.data"
    cols = [
        "target", "alcohol", "malic_acid", "ash", "alcalinity_ash",
        "magnesium", "total_phenols", "flavanoids", "nonflavanoid_phenols",
        "proanthocyanins", "color_intensity", "hue", "od280_od315_diluted", "proline"
    ]
    df = pd.read_csv(path, header=None, names=cols)
    # 0-index the classes (1,2,3 -> 0,1,2)
    df["target"] = df["target"].astype(int) - 1
    # Move target to end
    feature_cols = [c for c in cols if c != "target"]
    df = df[feature_cols + ["target"]]
    meta = {
        "name": "Wine Recognition",
        "task_type": "classification",
        "description": "Chemical analysis of wines grown in the same region in Italy but derived from 3 different cultivars.",
        "source": "UCI ML Repository / Forina et al.",
        "target_col": "target",
        "classes": ["Cultivar 1", "Cultivar 2", "Cultivar 3"]
    }
    return df, "target", "classification", meta

def load_archive_zoo() -> Tuple[pd.DataFrame, str, str, Dict[str, Any]]:
    path = ARCHIVE_DIR / "zoo" / "zoo.data"
    cols = [
        "animal_name", "hair", "feathers", "eggs", "milk", "airborne",
        "aquatic", "predator", "toothed", "backbone", "breathes", "venomous",
        "fins", "legs", "tail", "domestic", "catsize", "target"
    ]
    df = pd.read_csv(path, header=None, names=cols)
    df = df.drop(columns=["animal_name"])
    df["target"] = df["target"].astype(int) - 1
    meta = {
        "name": "Zoo Animal Classification",
        "task_type": "classification",
        "description": "16 morphological & ecological attributes of 101 animals across 7 taxonomic classes.",
        "source": "UCI ML Repository / Forsyth",
        "target_col": "target",
        "classes": ["Mammal", "Bird", "Reptile", "Fish", "Amphibian", "Bug", "Invertebrate"]
    }
    return df, "target", "classification", meta

def load_diabetes_regression() -> Tuple[pd.DataFrame, str, str, Dict[str, Any]]:
    data = load_diabetes(as_frame=True)
    df = data.frame.copy()
    meta = {
        "name": "Diabetes Disease Progression",
        "task_type": "regression",
        "description": "10 baseline variables (age, sex, BMI, blood pressure, 6 blood serum measurements) predicting 1-year disease progression.",
        "source": "Efron et al. / Scikit-Learn",
        "target_col": "target"
    }
    return df, "target", "regression", meta

def load_friedman_regression(n_samples: int = 500, seed: int = 42) -> Tuple[pd.DataFrame, str, str, Dict[str, Any]]:
    X, y = make_friedman1(n_samples=n_samples, n_features=12, noise=1.0, random_state=seed)
    cols = [
        "signal_1_x1", "signal_2_x2", "signal_3_x3", "signal_4_x4", "signal_5_x5",
        "noise_6", "noise_7", "noise_8", "noise_9", "noise_10", "noise_11", "noise_12"
    ]
    df = pd.DataFrame(X, columns=cols)
    df["target"] = y
    meta = {
        "name": "Friedman-1 Non-Linear Regression Benchmark",
        "task_type": "regression",
        "description": "Gold-standard metaheuristic stability benchmark with 5 known true non-linear signal features and 7 noise features.",
        "source": "Jerome H. Friedman / Benchmark Suite",
        "target_col": "target",
        "known_signal_features": ["signal_1_x1", "signal_2_x2", "signal_3_x3", "signal_4_x4", "signal_5_x5"],
        "known_noise_features": ["noise_6", "noise_7", "noise_8", "noise_9", "noise_10", "noise_11", "noise_12"]
    }
    return df, "target", "regression", meta

def load_synthetic_classification_challenge(n_samples: int = 400, seed: int = 42) -> Tuple[pd.DataFrame, str, str, Dict[str, Any]]:
    X, y = make_classification(
        n_samples=n_samples, n_features=20, n_informative=6, n_redundant=4,
        n_repeated=0, n_classes=2, weights=[0.6, 0.4], flip_y=0.03, random_state=seed
    )
    cols = [f"feat_{i+1:02d}_{'info' if i < 6 else ('redundant' if i < 10 else 'noise')}" for i in range(20)]
    df = pd.DataFrame(X, columns=cols)
    df["target"] = y
    meta = {
        "name": "Controlled Feature Selection Challenge",
        "task_type": "classification",
        "description": "Controlled 20-feature dataset with 6 true informative, 4 redundant, and 10 noise features for exact stability verification.",
        "source": "Synthetic Benchmark Generator",
        "target_col": "target",
        "classes": ["Class 0", "Class 1"],
        "known_signal_features": [cols[i] for i in range(6)],
        "known_noise_features": [cols[i] for i in range(10, 20)]
    }
    return df, "target", "classification", meta

def load_california_housing_sample() -> Tuple[pd.DataFrame, str, str, Dict[str, Any]]:
    np.random.seed(42)
    n = 600
    med_inc = np.random.gamma(3.5, 1.0, n)
    house_age = np.random.uniform(5, 52, n)
    avg_rooms = 3.0 + 0.8 * med_inc + np.random.normal(0, 0.5, n)
    avg_bedrooms = 1.0 + 0.1 * avg_rooms + np.random.normal(0, 0.2, n)
    population = np.random.exponential(1400, n) + 200
    avg_occupancy = np.random.uniform(2.0, 4.5, n)
    latitude = np.random.uniform(32.5, 42.0, n)
    longitude = np.random.uniform(-124.3, -114.3, n)
    noise_idx_1 = np.random.normal(0, 1, n)
    noise_idx_2 = np.random.uniform(-5, 5, n)
    
    # Target value influenced by income, rooms, age, location
    target = 0.8 * med_inc + 0.05 * house_age + 0.2 * avg_rooms - 0.1 * avg_occupancy - 0.05 * (latitude - 37)**2 + np.random.normal(0, 0.3, n)
    target = np.clip(target, 0.5, 5.0)
    
    df = pd.DataFrame({
        "med_income": med_inc,
        "house_age": house_age,
        "avg_rooms": avg_rooms,
        "avg_bedrooms": avg_bedrooms,
        "population": population,
        "avg_occupancy": avg_occupancy,
        "latitude": latitude,
        "longitude": longitude,
        "noise_urban_index": noise_idx_1,
        "noise_lot_skew": noise_idx_2,
        "target": target
    })
    meta = {
        "name": "Housing Valuation Regression",
        "task_type": "regression",
        "description": "Geographical and structural attributes predicting median home values with 2 injected noise indicators.",
        "source": "Standard Real-Estate Benchmark",
        "target_col": "target"
    }
    return df, "target", "regression", meta

DATASET_LOADERS = {
    "ionosphere": load_archive_ionosphere,
    "sonar": load_archive_sonar,
    "waveform": load_archive_waveform,
    "wine": load_archive_wine,
    "zoo": load_archive_zoo,
    "friedman_regression": load_friedman_regression,
    "diabetes": load_diabetes_regression,
    "synthetic_challenge": load_synthetic_classification_challenge,
    "housing_regression": load_california_housing_sample,
}

def get_available_datasets_meta() -> List[Dict[str, Any]]:
    catalog = []
    for key, loader_fn in DATASET_LOADERS.items():
        try:
            df, target_col, task_type, meta = loader_fn()
            catalog.append({
                "id": key,
                "name": meta.get("name", key),
                "task_type": task_type,
                "description": meta.get("description", ""),
                "source": meta.get("source", "Benchmark"),
                "rows": int(len(df)),
                "features_count": int(len(df.columns) - 1),
                "target_col": target_col,
                "classes": meta.get("classes", None),
                "is_archive": key in ["ionosphere", "sonar", "waveform", "wine", "zoo"]
            })
        except Exception as e:
            continue
    return catalog

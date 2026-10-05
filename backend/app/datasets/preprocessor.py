import numpy as np
import pandas as pd
from typing import Tuple, Dict, Any, List, Optional
from sklearn.model_selection import train_test_split, StratifiedShuffleSplit, ShuffleSplit
from sklearn.preprocessing import StandardScaler, MinMaxScaler, LabelEncoder
from sklearn.impute import SimpleImputer

class PartitionedDataset:
    def __init__(
        self,
        X_train: np.ndarray,
        y_train: np.ndarray,
        X_val: np.ndarray,
        y_val: np.ndarray,
        X_heldout: np.ndarray,
        y_heldout: np.ndarray,
        feature_names: List[str],
        task_type: str,
        conditions: Optional[Dict[str, Dict[str, np.ndarray]]] = None
    ):
        self.X_train = X_train
        self.y_train = y_train
        self.X_val = X_val
        self.y_val = y_val
        self.X_heldout = X_heldout
        self.y_heldout = y_heldout
        self.feature_names = feature_names
        self.task_type = task_type
        self.conditions = conditions or {}

    @property
    def n_features(self) -> int:
        return len(self.feature_names)

    @property
    def train_shape(self) -> Tuple[int, int]:
        return self.X_train.shape

    @property
    def heldout_shape(self) -> Tuple[int, int]:
        return self.X_heldout.shape


def preprocess_and_partition(
    df: pd.DataFrame,
    target_col: str,
    task_type: str,
    test_size: float = 0.20,
    val_size: float = 0.20,
    scaler_type: str = "standard",
    seed: int = 42
) -> Tuple[PartitionedDataset, Dict[str, Any]]:
    """
    Leakage-resistant data partitioner and preprocessor.
    1. Independent Held-Out set is isolated FIRST before any fitting.
    2. Imputer & Scaler are fitted strictly on X_train.
    3. Transforms are applied onto X_val and X_heldout.
    4. Subgroup conditions (high/low variance, class subgroups) are generated for condition-wise evaluation.
    """
    df_clean = df.copy()
    feature_cols = [c for c in df_clean.columns if c != target_col]
    
    # Handle non-numeric feature columns
    for col in feature_cols:
        if not np.issubdtype(df_clean[col].dtype, np.number):
            le = LabelEncoder()
            df_clean[col] = le.fit_transform(df_clean[col].astype(str))
            
    # Handle target
    if task_type == "classification" and not np.issubdtype(df_clean[target_col].dtype, np.integer):
        le_target = LabelEncoder()
        df_clean[target_col] = le_target.fit_transform(df_clean[target_col].astype(str))
        
    X_raw = df_clean[feature_cols].values
    y_raw = df_clean[target_col].values
    
    # 1. Split out Independent Acceptance Data (Held-out)
    stratify_heldout = y_raw if task_type == "classification" and len(np.unique(y_raw)) > 1 and np.min(np.bincount(y_raw.astype(int))) >= 2 else None
    X_dev, X_heldout_raw, y_dev, y_heldout = train_test_split(
        X_raw, y_raw, test_size=test_size, random_state=seed, stratify=stratify_heldout
    )
    
    # 2. Split Development Data into Train and Validation
    adj_val_size = val_size / (1.0 - test_size)
    adj_val_size = min(max(adj_val_size, 0.1), 0.5)
    stratify_val = y_dev if task_type == "classification" and len(np.unique(y_dev)) > 1 and np.min(np.bincount(y_dev.astype(int))) >= 2 else None
    X_train_raw, X_val_raw, y_train, y_val = train_test_split(
        X_dev, y_dev, test_size=adj_val_size, random_state=seed, stratify=stratify_val
    )
    
    # 3. Fit Preprocessing strictly on X_train_raw
    imputer = SimpleImputer(strategy="median")
    X_train_imp = imputer.fit_transform(X_train_raw)
    X_val_imp = imputer.transform(X_val_raw)
    X_heldout_imp = imputer.transform(X_heldout_raw)
    
    if scaler_type == "minmax":
        scaler = MinMaxScaler()
    else:
        scaler = StandardScaler()
        
    X_train = scaler.fit_transform(X_train_imp)
    X_val = scaler.transform(X_val_imp)
    X_heldout = scaler.transform(X_heldout_imp)
    
    # 4. Generate Condition Subgroups for AC-3 & Condition-wise KPI reporting
    conditions = {}
    # Condition 1: High Feature Norm Subgroup vs Low Feature Norm
    heldout_norms = np.linalg.norm(X_heldout, axis=1)
    norm_median = np.median(heldout_norms)
    idx_high_norm = np.where(heldout_norms >= norm_median)[0]
    idx_low_norm = np.where(heldout_norms < norm_median)[0]
    
    if len(idx_high_norm) >= 3 and len(idx_low_norm) >= 3:
        conditions["Condition_High_Variance_Subgroup"] = {
            "X": X_heldout[idx_high_norm],
            "y": y_heldout[idx_high_norm],
            "description": "Held-out instances with high feature Euclidean magnitude (subgroup stress)"
        }
        conditions["Condition_Low_Variance_Subgroup"] = {
            "X": X_heldout[idx_low_norm],
            "y": y_heldout[idx_low_norm],
            "description": "Held-out instances with low feature Euclidean magnitude"
        }
        
    if task_type == "classification":
        for cls_val in np.unique(y_heldout):
            cls_idx = np.where(y_heldout == cls_val)[0]
            if len(cls_idx) >= 3:
                conditions[f"Class_{int(cls_val)}_Subgroup"] = {
                    "X": X_heldout[cls_idx],
                    "y": y_heldout[cls_idx],
                    "description": f"Held-out stratum for class {int(cls_val)}"
                }
                
    meta = {
        "total_instances": len(df_clean),
        "train_instances": len(X_train),
        "val_instances": len(X_val),
        "heldout_instances": len(X_heldout),
        "feature_count": len(feature_cols),
        "feature_names": feature_cols,
        "scaler": scaler_type,
        "seed": seed,
        "split_proportions": {
            "train": float(np.round(len(X_train)/len(df_clean), 3)),
            "validation": float(np.round(len(X_val)/len(df_clean), 3)),
            "held_out_acceptance": float(np.round(len(X_heldout)/len(df_clean), 3))
        },
        "conditions_count": len(conditions)
    }
    
    partitioned = PartitionedDataset(
        X_train=X_train,
        y_train=y_train,
        X_val=X_val,
        y_val=y_val,
        X_heldout=X_heldout,
        y_heldout=y_heldout,
        feature_names=feature_cols,
        task_type=task_type,
        conditions=conditions
    )
    return partitioned, meta

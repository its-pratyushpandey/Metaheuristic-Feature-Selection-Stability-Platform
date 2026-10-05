import pandas as pd
import numpy as np
from typing import Dict, Any, List

def analyze_dataset_quality(df: pd.DataFrame, target_col: str, task_type: str) -> Dict[str, Any]:
    """Perform deep schema and quality validation on dataset."""
    total_rows = int(len(df))
    total_cols = int(len(df.columns))
    feature_cols = [c for c in df.columns if c != target_col]
    
    # Missing & Duplicates
    missing_by_col = df.isnull().sum().to_dict()
    total_missing = int(sum(missing_by_col.values()))
    missing_pct = float((total_missing / (total_rows * total_cols)) * 100) if total_rows * total_cols > 0 else 0.0
    duplicate_rows = int(df.duplicated().sum())
    duplicate_pct = float((duplicate_rows / total_rows) * 100) if total_rows > 0 else 0.0
    
    # Dtypes categorization
    num_cols = df[feature_cols].select_dtypes(include=[np.number]).columns.tolist()
    cat_cols = df[feature_cols].select_dtypes(exclude=[np.number]).columns.tolist()
    
    # Feature statistics
    feature_stats = []
    for col in feature_cols:
        series = df[col]
        is_num = col in num_cols
        if is_num:
            stats = {
                "name": col,
                "dtype": str(series.dtype),
                "is_numerical": True,
                "missing_count": int(series.isnull().sum()),
                "unique_values": int(series.nunique()),
                "mean": float(np.round(series.mean(), 4)) if len(series) > 0 else 0.0,
                "std": float(np.round(series.std(), 4)) if len(series) > 1 else 0.0,
                "min": float(np.round(series.min(), 4)) if len(series) > 0 else 0.0,
                "q25": float(np.round(series.quantile(0.25), 4)) if len(series) > 0 else 0.0,
                "median": float(np.round(series.median(), 4)) if len(series) > 0 else 0.0,
                "q75": float(np.round(series.quantile(0.75), 4)) if len(series) > 0 else 0.0,
                "max": float(np.round(series.max(), 4)) if len(series) > 0 else 0.0,
                "zeros_count": int((series == 0).sum())
            }
        else:
            stats = {
                "name": col,
                "dtype": str(series.dtype),
                "is_numerical": False,
                "missing_count": int(series.isnull().sum()),
                "unique_values": int(series.nunique()),
                "top_value": str(series.mode().iloc[0]) if len(series.mode()) > 0 else "N/A",
                "top_freq": int(series.value_counts().iloc[0]) if len(series.value_counts()) > 0 else 0
            }
        feature_stats.append(stats)
        
    # Target distribution
    target_series = df[target_col]
    target_stats = {
        "target_col": target_col,
        "task_type": task_type,
        "missing_count": int(target_series.isnull().sum())
    }
    
    if task_type == "classification":
        class_counts = target_series.value_counts().to_dict()
        class_dist = [{"class": str(k), "count": int(v), "percentage": float(np.round((v/total_rows)*100, 2))} for k, v in class_counts.items()]
        # Imbalance ratio
        min_class_cnt = min(class_counts.values()) if class_counts else 1
        max_class_cnt = max(class_counts.values()) if class_counts else 1
        imbalance_ratio = float(np.round(max_class_cnt / max(1, min_class_cnt), 2))
        target_stats["distribution"] = class_dist
        target_stats["num_classes"] = len(class_counts)
        target_stats["imbalance_ratio"] = imbalance_ratio
        target_stats["is_imbalanced"] = imbalance_ratio > 3.0
    else:
        target_stats["mean"] = float(np.round(target_series.mean(), 4))
        target_stats["std"] = float(np.round(target_series.std(), 4))
        target_stats["min"] = float(np.round(target_series.min(), 4))
        target_stats["median"] = float(np.round(target_series.median(), 4))
        target_stats["max"] = float(np.round(target_series.max(), 4))
        target_stats["skew"] = float(np.round(target_series.skew(), 4)) if len(target_series) > 2 else 0.0

    # Overall Data Quality Audit
    issues = []
    if total_missing > 0:
        issues.append(f"{total_missing} missing values detected ({missing_pct:.2f}%). Imputation required.")
    if duplicate_rows > 0:
        issues.append(f"{duplicate_rows} duplicate rows detected ({duplicate_pct:.2f}%).")
    if task_type == "classification" and target_stats.get("is_imbalanced"):
        issues.append(f"Class imbalance detected (ratio {target_stats['imbalance_ratio']}:1). Stratification recommended.")
    if len(feature_cols) < 2:
        issues.append("Dataset must have at least 2 feature columns.")
        
    quality_grade = "EXCELLENT"
    if len(issues) > 2 or missing_pct > 15.0:
        quality_grade = "NEEDS_REVIEW"
    elif len(issues) > 0:
        quality_grade = "ACCEPTABLE"
        
    return {
        "total_rows": total_rows,
        "total_columns": total_cols,
        "feature_count": len(feature_cols),
        "numerical_features_count": len(num_cols),
        "categorical_features_count": len(cat_cols),
        "numerical_features": num_cols,
        "categorical_features": cat_cols,
        "missing_total": total_missing,
        "missing_percentage": missing_pct,
        "duplicate_rows": duplicate_rows,
        "duplicate_percentage": duplicate_pct,
        "feature_stats": feature_stats,
        "target_stats": target_stats,
        "quality_grade": quality_grade,
        "validation_issues": issues,
        "is_ready_for_pipeline": len(feature_cols) >= 2 and total_rows >= 10
    }

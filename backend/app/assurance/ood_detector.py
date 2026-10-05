import numpy as np
from typing import Dict, Any, List
from sklearn.ensemble import IsolationForest

class OutOfDistributionDetector:
    def __init__(self, contamination: float = 0.05, seed: int = 42):
        self.detector = IsolationForest(contamination=contamination, random_state=seed)
        self.mean_vector = None
        self.cov_inv = None
        self.is_fitted = False

    def fit(self, X_train: np.ndarray):
        """Fit Isolation Forest and Mahalanobis centroid on training data."""
        self.detector.fit(X_train)
        self.mean_vector = np.mean(X_train, axis=0)
        
        # Regularized covariance matrix inversion
        cov = np.cov(X_train, rowvar=False)
        if cov.ndim == 0:
            cov = np.array([[float(cov)]])
        cov_reg = cov + np.eye(cov.shape[0]) * 1e-4
        try:
            self.cov_inv = np.linalg.pinv(cov_reg)
        except Exception:
            self.cov_inv = np.eye(cov.shape[0])
            
        self.is_fitted = True

    def evaluate_ood(self, X_query: np.ndarray) -> Dict[str, Any]:
        """Detect out-of-distribution anomaly rate and Mahalanobis distances."""
        if not self.is_fitted:
            return {"error": "Detector not fitted"}
            
        # Isolation Forest prediction (-1 for outlier, 1 for inlier)
        if_preds = self.detector.predict(X_query)
        anomaly_count = int(np.sum(if_preds == -1))
        anomaly_rate = float(np.round(anomaly_count / max(1, len(X_query)), 4))
        
        # Mahalanobis distance per point
        diff = X_query - self.mean_vector
        mahal_dists = np.sqrt(np.sum(np.dot(diff, self.cov_inv) * diff, axis=1))
        
        avg_mahal = float(np.round(np.mean(mahal_dists), 3))
        max_mahal = float(np.round(np.max(mahal_dists), 3))
        
        is_ood_alert = anomaly_rate > 0.15 or max_mahal > 20.0
        
        return {
            "is_ood_alert": is_ood_alert,
            "anomaly_rate": anomaly_rate,
            "anomaly_percentage": float(np.round(anomaly_rate * 100, 2)),
            "anomaly_count": anomaly_count,
            "total_queries": len(X_query),
            "mean_mahalanobis_distance": avg_mahal,
            "max_mahalanobis_distance": max_mahal,
            "status": "OOD_ALERT_ACTIVE" if is_ood_alert else "IN_DISTRIBUTION_CONFIRMED"
        }

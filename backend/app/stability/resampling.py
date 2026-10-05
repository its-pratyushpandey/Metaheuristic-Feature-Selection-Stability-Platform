import numpy as np
from typing import List, Tuple, Generator
from sklearn.model_selection import KFold, StratifiedKFold, ShuffleSplit, StratifiedShuffleSplit

class ResamplingProtocol:
    """Generates resampled development subsets for stability analysis."""
    
    @staticmethod
    def generate_resamples(
        X_train: np.ndarray,
        y_train: np.ndarray,
        task_type: str,
        n_resamples: int = 15,
        protocol: str = "bootstrap",
        subsample_ratio: float = 0.85,
        seed: int = 42
    ) -> List[Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, int]]:
        """
        Returns a list of (X_tr_res, y_tr_res, X_val_res, y_val_res, resample_seed)
        """
        rng = np.random.default_rng(seed)
        n_samples = len(X_train)
        resamples = []
        
        if protocol == "bootstrap":
            for b in range(n_resamples):
                r_seed = seed + b * 101 + 7
                b_rng = np.random.default_rng(r_seed)
                # Sample with replacement
                indices = b_rng.integers(0, n_samples, n_samples)
                oob_mask = np.ones(n_samples, dtype=bool)
                oob_mask[indices] = False
                oob_indices = np.where(oob_mask)[0]
                
                # If OOB is empty or too small, fall back to stratified split
                if len(oob_indices) < max(3, int(0.1 * n_samples)):
                    perm = b_rng.permutation(n_samples)
                    split_idx = int(0.8 * n_samples)
                    tr_idx, val_idx = perm[:split_idx], perm[split_idx:]
                else:
                    tr_idx, val_idx = indices, oob_indices
                    
                resamples.append((
                    X_train[tr_idx], y_train[tr_idx],
                    X_train[val_idx], y_train[val_idx],
                    r_seed
                ))
                
        elif protocol == "subsampling" or protocol == "subbagging":
            sample_size = max(5, int(n_samples * subsample_ratio))
            for b in range(n_resamples):
                r_seed = seed + b * 101 + 7
                b_rng = np.random.default_rng(r_seed)
                perm = b_rng.permutation(n_samples)
                tr_idx = perm[:sample_size]
                val_idx = perm[sample_size:]
                if len(val_idx) == 0:
                    val_idx = perm[:max(3, int(0.2 * n_samples))]
                resamples.append((
                    X_train[tr_idx], y_train[tr_idx],
                    X_train[val_idx], y_train[val_idx],
                    r_seed
                ))
                
        elif protocol == "kfold":
            n_splits = min(max(3, n_resamples), n_samples)
            if task_type == "classification" and len(np.unique(y_train)) > 1 and np.min(np.bincount(y_train.astype(int))) >= n_splits:
                kf = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=seed)
            else:
                kf = KFold(n_splits=n_splits, shuffle=True, random_state=seed)
                
            for b, (tr_idx, val_idx) in enumerate(kf.split(X_train, y_train if task_type == "classification" else None)):
                if b >= n_resamples:
                    break
                r_seed = seed + b * 101 + 7
                resamples.append((
                    X_train[tr_idx], y_train[tr_idx],
                    X_train[val_idx], y_train[val_idx],
                    r_seed
                ))
        else: # monte_carlo
            splitter = StratifiedShuffleSplit(n_splits=n_resamples, test_size=1.0-subsample_ratio, random_state=seed) if (task_type == "classification" and np.min(np.bincount(y_train.astype(int))) >= 2) else ShuffleSplit(n_splits=n_resamples, test_size=1.0-subsample_ratio, random_state=seed)
            for b, (tr_idx, val_idx) in enumerate(splitter.split(X_train, y_train if task_type == "classification" else None)):
                r_seed = seed + b * 101 + 7
                resamples.append((
                    X_train[tr_idx], y_train[tr_idx],
                    X_train[val_idx], y_train[val_idx],
                    r_seed
                ))
                
        return resamples

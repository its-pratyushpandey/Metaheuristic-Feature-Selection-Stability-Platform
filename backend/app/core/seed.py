import random
import numpy as np
import os

def set_global_seed(seed: int = 42):
    """Ensure determinism across Python random and NumPy generators."""
    random.seed(seed)
    np.random.seed(seed)
    os.environ['PYTHONHASHSEED'] = str(seed)

def get_rng(seed: int = 42) -> np.random.Generator:
    """Return a NumPy standard random Generator for reproducible stream generation."""
    return np.random.default_rng(seed)

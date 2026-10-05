import {
  DatasetMeta,
  DatasetQualityReport,
  O2ReferenceResult,
  MetaheuristicResult,
  MetaheuristicConfig,
  ExperimentStatus,
  ExperimentFullResult,
  SystemHealth
} from "./types";

const API_BASE = "/api/v1";

export async function fetchDatasets(): Promise<DatasetMeta[]> {
  const res = await fetch(`${API_BASE}/datasets`);
  if (!res.ok) throw new Error("Failed to fetch datasets");
  return res.json();
}

export async function fetchDatasetQuality(datasetId: string): Promise<DatasetQualityReport> {
  const res = await fetch(`${API_BASE}/datasets/${datasetId}/quality`);
  if (!res.ok) throw new Error(`Failed to fetch quality report for ${datasetId}`);
  return res.json();
}

export async function uploadDataset(formData: FormData): Promise<any> {
  const res = await fetch(`${API_BASE}/datasets/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to upload dataset");
  }
  return res.json();
}

export async function runO2Reference(datasetId: string, modelName = "rf", seed = 42): Promise<O2ReferenceResult> {
  const res = await fetch(`${API_BASE}/reference/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dataset_id: datasetId, model_name: modelName, seed }),
  });
  if (!res.ok) throw new Error("Failed to run O2 reference pipeline");
  return res.json();
}

export async function runO2Oracle(datasetId: string, modelName = "rf", seed = 42): Promise<any> {
  const res = await fetch(`${API_BASE}/reference/oracle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dataset_id: datasetId, model_name: modelName, seed }),
  });
  if (!res.ok) throw new Error("Failed to run O2 reproducibility oracle");
  return res.json();
}

export async function runSingleMetaheuristic(datasetId: string, config: MetaheuristicConfig): Promise<MetaheuristicResult> {
  const res = await fetch(`${API_BASE}/metaheuristics/single-run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dataset_id: datasetId, config }),
  });
  if (!res.ok) throw new Error("Failed to run metaheuristic optimization");
  return res.json();
}

export async function startExperimentJob(payload: {
  dataset_id: string;
  algorithm: string;
  population_size: number;
  n_iterations: number;
  model_name: string;
  n_resamples: number;
  alpha: number;
  seed: number;
}): Promise<{ job_id: string; status: string }> {
  const res = await fetch(`${API_BASE}/experiments/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to start experiment job");
  return res.json();
}

export async function fetchExperimentStatus(jobId: string): Promise<ExperimentStatus> {
  const res = await fetch(`${API_BASE}/experiments/status/${jobId}`);
  if (!res.ok) throw new Error("Failed to fetch experiment status");
  return res.json();
}

export async function cancelExperimentJob(jobId: string): Promise<{ cancelled: boolean }> {
  const res = await fetch(`${API_BASE}/experiments/cancel/${jobId}`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to cancel experiment job");
  return res.json();
}

export async function fetchExperimentResult(experimentId: string): Promise<ExperimentFullResult> {
  const res = await fetch(`${API_BASE}/experiments/${experimentId}`);
  if (!res.ok) throw new Error("Failed to fetch experiment result");
  return res.json();
}

export async function listExperiments(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/experiments`);
  if (!res.ok) throw new Error("Failed to list experiments");
  return res.json();
}

export async function fetchSystemHealth(): Promise<SystemHealth> {
  const res = await fetch(`${API_BASE}/system/health`);
  if (!res.ok) throw new Error("Failed to fetch system health");
  return res.json();
}

export async function fetchProjectRoadmap(): Promise<any> {
  const res = await fetch(`${API_BASE}/system/roadmap`);
  if (!res.ok) throw new Error("Failed to fetch roadmap");
  return res.json();
}

export async function fetchShiftAssurance(datasetId: string, shiftMagnitude = 2.0): Promise<any> {
  const res = await fetch(`${API_BASE}/assurance/shift`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dataset_id: datasetId, shift_magnitude: shiftMagnitude }),
  });
  if (!res.ok) throw new Error("Failed to run shift assurance");
  return res.json();
}

export async function fetchCalibration(datasetId: string, modelName = "rf", seed = 42): Promise<any> {
  const res = await fetch(`${API_BASE}/assurance/calibration`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dataset_id: datasetId, model_name: modelName, seed }),
  });
  if (!res.ok) throw new Error("Failed to measure calibration");
  return res.json();
}

export async function fetchAbstentionTest(taskType = "classification", simulatedLowConf = false): Promise<any> {
  const res = await fetch(`${API_BASE}/assurance/abstention`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ task_type: taskType, simulated_low_confidence: simulatedLowConf }),
  });
  if (!res.ok) throw new Error("Failed to test abstention");
  return res.json();
}

export async function triggerRollbackRecovery(reason = "Manual Trigger"): Promise<any> {
  const res = await fetch(`${API_BASE}/assurance/recovery/rollback?reason=${encodeURIComponent(reason)}`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to trigger recovery");
  return res.json();
}

export async function fetchRecoveryLogs(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/assurance/recovery/logs`);
  if (!res.ok) throw new Error("Failed to fetch recovery logs");
  return res.json();
}

export interface DatasetMeta {
  id: string;
  name: string;
  task_type: "classification" | "regression";
  description: string;
  source: string;
  license?: string;
  owner?: string;
  access_date?: string;
  version?: string;
  rows: number;
  columns?: number;
  feature_count: number;
  target_col: string;
  classes?: string[] | null;
  is_archive: boolean;
  features?: string[];
  known_signal_features?: string[];
  known_noise_features?: string[];
}

export interface FeatureQualityStat {
  name: string;
  dtype: string;
  is_numerical: boolean;
  missing_count: number;
  unique_values: number;
  mean?: number;
  std?: number;
  min?: number;
  q25?: number;
  median?: number;
  q75?: number;
  max?: number;
  zeros_count?: number;
  top_value?: string;
  top_freq?: number;
}

export interface DatasetQualityReport {
  total_rows: number;
  total_columns: number;
  feature_count: number;
  numerical_features_count: number;
  categorical_features_count: number;
  numerical_features: string[];
  categorical_features: string[];
  missing_total: number;
  missing_percentage: number;
  duplicate_rows: number;
  duplicate_percentage: number;
  feature_stats: FeatureQualityStat[];
  target_stats: Record<string, any>;
  quality_grade: string;
  validation_issues: string[];
  is_ready_for_pipeline: boolean;
}

export interface MetaheuristicConfig {
  algorithm: "ga" | "pso" | "sa" | "de";
  population_size: number;
  n_iterations: number;
  model_name: "rf" | "logistic" | "ridge" | "gb" | "svm" | "knn" | "dt";
  alpha: number;
  max_features?: number | null;
  seed: number;
  crossover_rate?: number;
  mutation_rate?: number;
  elitism_count?: number;
  selection_method?: string;
  inertia_weight?: number;
  c1?: number;
  c2?: number;
  initial_temp?: number;
  cooling_rate?: number;
}

export interface IterationMetric {
  iteration: number;
  best_fitness: number;
  avg_fitness: number;
  selected_count: number;
  diversity: number;
  time_elapsed_ms: number;
}

export interface MetaheuristicResult {
  algorithm: string;
  selected_mask: boolean[];
  selected_indices: number[];
  selected_feature_names: string[];
  selected_count: number;
  total_features: number;
  best_fitness: number;
  best_metric_score: number;
  history: IterationMetric[];
  feature_ranking_scores: Record<string, number>;
  execution_time_seconds: number;
  config: MetaheuristicConfig;
  seed: number;
  logs: string[];
}

export interface LatencyMetrics {
  p50_ms: number;
  p95_ms: number;
  mean_ms: number;
  std_ms: number;
}

export interface ApproachEvaluation {
  approach_name: string;
  selected_features: string[];
  selected_indices: number[];
  selected_count: number;
  total_features: number;
  sparsity_ratio: number;
  model_type: string;
  primary_metric_name: string;
  train_performance: number;
  validation_performance: number;
  heldout_performance: number;
  performance_score_100: number;
  error_metric_name: string;
  heldout_error: number;
  execution_time_seconds: number;
  latency_metrics: LatencyMetrics;
  peak_memory_mb: number;
  condition_wise_performance: Record<string, { score: number; sample_count: number; description: string }>;
  worst_condition_score: number;
}

export interface O2ReferenceResult {
  status: string;
  selected_o2_approach: string;
  o2_baseline: ApproachEvaluation;
  compared_approaches: ApproachEvaluation[];
  trade_off_analysis: string;
  dataset_task: string;
  total_features: number;
  seed: number;
  reproducibility_hash: string;
}

export interface FeatureStabilityRow {
  feature_name: string;
  selection_count: number;
  total_resamples: number;
  selection_percentage: number;
  selection_frequency: number;
  average_rank_score: number;
  stability_score: number;
  model_contribution: number;
  uncertainty_se: number;
  confidence_interval_95: [number, number];
  p_value_vs_chance: number;
  is_statistically_significant: boolean;
  final_status: "Consistently Selected" | "Potentially Stable" | "Unstable" | "Search Artefact";
  status_color: string;
  engineering_recommendation: string;
}

export interface FeatureClassificationResult {
  features: FeatureStabilityRow[];
  summary: {
    total_features: number;
    consistently_selected: number;
    potentially_stable: number;
    unstable: number;
    search_artefacts: number;
    search_artefact_reduction_rate: number;
    null_hypothesis_chance_prob: number;
    resampling_runs: number;
  };
}

export interface StabilityAnalytics {
  stability_score_100: number;
  nogueira_stability: number;
  average_jaccard: number;
  worst_case_jaccard: number;
  std_jaccard: number;
  average_kuncheva: number;
  ranking_consistency: number;
  confidence_interval_95: { lower: number; upper: number };
  resampling_runs_count: number;
  total_features: number;
  consistently_selected_count: number;
  consistently_selected_features: string[];
  search_artefacts_count: number;
  search_artefact_features: string[];
  feature_selection_probabilities: Record<string, any>;
  pairwise_matrix_jaccard: number[][];
}

export interface NegativeTestItem {
  test_id: "NT-1" | "NT-2" | "NT-3" | "NT-4" | "NT-5";
  name: string;
  trigger: string;
  expected_behaviour: string;
  observed_behaviour: string;
  status: "PASS" | "FAIL";
  metric_value?: number;
  metric_name?: string;
  recovery_action: string;
  residual_risk: string;
  timestamp: string;
  duration_ms: number;
  details?: any;
}

export interface KPIItem {
  kpi_id: string;
  name: string;
  target_description: string;
  target_value: number;
  o2_baseline: number;
  candidate_value: number;
  delta: number;
  status: "PASS" | "FAIL";
  confidence_interval?: { lower: number; upper: number };
  unit: string;
  condition_wise?: Record<string, any>;
  retention_percentage?: number;
  latency_ratio_pct?: number;
}

export interface AcceptanceConditionItem {
  ac_id: "AC-1" | "AC-2" | "AC-3" | "AC-4";
  name: string;
  requirement: string;
  status: "PASS" | "FAIL";
  evidence: string;
  details: string;
}

export interface ValidationDecision {
  final_decision: "PASS / ACCEPT" | "REVISE" | "HOLD / STOP";
  decision_badge: "success" | "warning" | "destructive";
  rationale: string;
  acceptance_conditions: AcceptanceConditionItem[];
  all_ac_passed: boolean;
  all_negative_tests_passed: boolean;
  kpi_compliance_rate: number;
  validation_timestamp: string;
  guardrail_status: string;
}

export interface ExperimentFullResult {
  experiment_id: string;
  created_at: string;
  dataset_id: string;
  dataset_meta: DatasetMeta;
  partition_meta: Record<string, any>;
  metaheuristic_config: MetaheuristicConfig;
  o2_reference: O2ReferenceResult;
  stability_result: {
    status: string;
    n_resamples: number;
    resampling_protocol: string;
    resample_runs: any[];
    stability_metrics: StabilityAnalytics;
    consensus_features: string[];
    candidate_evaluation: ApproachEvaluation;
    total_duration_seconds: number;
  };
  classified_features: FeatureClassificationResult;
  candidate_evaluation: ApproachEvaluation;
  negative_tests: {
    overall_status: string;
    passed_count: number;
    total_tests: number;
    tests: NegativeTestItem[];
  };
  kpis: {
    kpis: KPIItem[];
    summary: {
      total_kpis: number;
      passed_kpis: number;
      all_kpis_met: boolean;
      compliance_rate: number;
    };
  };
  validation_decision: ValidationDecision;
  evidence_manifest: Record<string, any>;
  reproducibility_script: string;
  total_execution_seconds: number;
}

export interface ExperimentStatus {
  job_id: string;
  dataset_id: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
  progress_pct: number;
  current_stage: string;
  stage_detail: string;
  has_result: boolean;
  error?: string;
  elapsed_seconds: number;
}

export interface SystemHealth {
  status: string;
  cpu_usage_pct: number;
  memory_used_mb: number;
  memory_total_mb: number;
  memory_pct: number;
  active_background_jobs: number;
  registered_datasets: number;
  completed_experiments: number;
  engine_version: string;
  timestamp: string;
}

"use client";

import React, { useEffect, useState } from "react";
import { fetchDatasets, runSingleMetaheuristic } from "@/lib/api";
import { DatasetMeta, MetaheuristicConfig, MetaheuristicResult } from "@/lib/types";
import {
  Sparkles,
  Play,
  RotateCw,
  Sliders,
  TrendingUp,
  Cpu,
  CheckCircle2,
  ListOrdered,
  Terminal,
  Layers
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid
} from "recharts";

export default function FeatureSelectionPage() {
  const [datasets, setDatasets] = useState<DatasetMeta[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<string>("ionosphere");
  
  // Metaheuristic config
  const [config, setConfig] = useState<MetaheuristicConfig>({
    algorithm: "ga",
    population_size: 30,
    n_iterations: 25,
    model_name: "rf",
    alpha: 0.85,
    seed: 42,
    max_features: null,
    crossover_rate: 0.8,
    mutation_rate: 0.05,
    elitism_count: 2,
    selection_method: "tournament",
    inertia_weight: 0.729,
    c1: 1.494,
    c2: 1.494,
    initial_temp: 100.0,
    cooling_rate: 0.92
  });

  const [result, setResult] = useState<MetaheuristicResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDatasets().then((ds) => {
      setDatasets(ds);
      if (ds.length > 0) {
        handleRunSearch(ds[0].id, config);
      }
    }).catch(err => {
      console.error("Error fetching datasets:", err);
      setError("Failed to load datasets: " + err.message);
    });
  }, []);

  const handleRunSearch = async (dsId = selectedDataset, cfg = config) => {
    try {
      setLoading(true);
      setError(null);
      console.log("Starting metaheuristic search with config:", cfg);
      const res = await runSingleMetaheuristic(dsId, cfg);
      console.log("Metaheuristic result received:", res);
      setResult(res);
    } catch (e: any) {
      const errorMsg = e.message || "Unknown error occurred";
      console.error("Metaheuristic error:", e);
      setError(errorMsg);
      alert("Error running metaheuristic: " + errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const rankingChartData = result
    ? Object.entries(result.feature_ranking_scores)
        .map(([name, score]) => ({
          name,
          score: parseFloat((score * 100).toFixed(1)),
          selected: result.selected_feature_names.includes(name),
        }))
        .sort((a, b) => b.score - a.score)
    : [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-sky-600" />
          Metaheuristic Feature Selection Engine
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Execute evolutionary and swarm optimization algorithms (GA, PSO, SA, DE) with multi-objective fitness formulation.
        </p>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <span className="text-red-600 font-bold text-xl">⚠️</span>
          <div className="flex-1">
            <div className="text-sm font-semibold text-red-900">Error</div>
            <div className="text-xs text-red-800 mt-1">{error}</div>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-800 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Algorithm Hyperparameter Configurator */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center gap-2 font-bold text-xs text-slate-800 uppercase tracking-wider">
            <Sliders className="w-4 h-4 text-sky-600" />
            <span>Search Parameters</span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-600 font-medium mb-1">Dataset</label>
              <select
                value={selectedDataset}
                onChange={(e) => {
                  setSelectedDataset(e.target.value);
                  handleRunSearch(e.target.value, config);
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-none focus:border-sky-500"
              >
                {datasets.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.task_type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">Metaheuristic Algorithm</label>
              <select
                value={config.algorithm}
                onChange={(e) => setConfig({ ...config, algorithm: e.target.value as any })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-none focus:border-sky-500 font-medium"
              >
                <option value="ga">Genetic Algorithm (Binary GA)</option>
                <option value="pso">Particle Swarm Optimization (Binary PSO)</option>
                <option value="sa">Simulated Annealing (Binary SA)</option>
                <option value="de">Differential Evolution (Binary DE)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">Fitness Base Estimator</label>
              <select
                value={config.model_name}
                onChange={(e) => setConfig({ ...config, model_name: e.target.value as any })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 focus:outline-none focus:border-sky-500"
              >
                <option value="rf">Random Forest (RF)</option>
                <option value="logistic">Logistic Regression / Ridge</option>
                <option value="gb">Gradient Boosting</option>
                <option value="svm">Support Vector Machine</option>
                <option value="knn">K-Nearest Neighbors</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Population / Swarm</label>
                <input
                  type="number"
                  min={10}
                  max={100}
                  value={config.population_size}
                  onChange={(e) => setConfig({ ...config, population_size: parseInt(e.target.value) || 20 })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">Iterations / Gen</label>
                <input
                  type="number"
                  min={5}
                  max={100}
                  value={config.n_iterations}
                  onChange={(e) => setConfig({ ...config, n_iterations: parseInt(e.target.value) || 20 })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <label className="text-slate-600 font-medium">Alpha Trade-Off (&alpha; Performance vs Parsimony)</label>
                <span className="font-mono font-bold text-sky-700">{config.alpha.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={0.99}
                step={0.05}
                value={config.alpha}
                onChange={(e) => setConfig({ ...config, alpha: parseFloat(e.target.value) })}
                className="w-full accent-sky-600"
              />
              <div className="text-[10px] text-slate-400 flex justify-between">
                <span>More Parsimony (Fewer Features)</span>
                <span>Max Accuracy</span>
              </div>
            </div>

            {config.algorithm === "ga" && (
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Crossover Rate</label>
                  <input
                    type="number"
                    step={0.05}
                    value={config.crossover_rate}
                    onChange={(e) => setConfig({ ...config, crossover_rate: parseFloat(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-1.5"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Mutation Rate</label>
                  <input
                    type="number"
                    step={0.01}
                    value={config.mutation_rate}
                    onChange={(e) => setConfig({ ...config, mutation_rate: parseFloat(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-1.5"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-slate-600 font-medium mb-1">Deterministic Seed</label>
              <input
                type="number"
                value={config.seed}
                onChange={(e) => setConfig({ ...config, seed: parseInt(e.target.value) || 42 })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono"
              />
            </div>

            <button
              onClick={() => handleRunSearch()}
              disabled={loading}
              className="w-full bg-sky-600 hover:bg-sky-500 text-white font-semibold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 shadow-xs transition-colors disabled:opacity-50 mt-2"
            >
              {loading ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Optimizing Subsets...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Run Metaheuristic Search</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right 2 Columns: Convergence History & Feature Ranking */}
        <div className="lg:col-span-2 space-y-6">
          {result ? (
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <div className="text-xs text-slate-500 font-medium">Best Fitness Score</div>
                  <div className="text-xl font-bold text-sky-700 mt-1">{result.best_fitness.toFixed(4)}</div>
                  <div className="text-[10px] text-slate-400">Multi-objective metric</div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <div className="text-xs text-slate-500 font-medium">Validation Metric</div>
                  <div className="text-xl font-bold text-slate-900 mt-1">{(result.best_metric_score * 100).toFixed(1)}%</div>
                  <div className="text-[10px] text-slate-400">Raw objective score</div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <div className="text-xs text-slate-500 font-medium">Selected Features</div>
                  <div className="text-xl font-bold text-emerald-600 mt-1">
                    {result.selected_count} / {result.total_features}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {(((result.total_features - result.selected_count) / result.total_features) * 100).toFixed(0)}% pruned
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <div className="text-xs text-slate-500 font-medium">Execution Runtime</div>
                  <div className="text-xl font-bold text-slate-900 mt-1">{result.execution_time_seconds.toFixed(2)}s</div>
                  <div className="text-[10px] text-slate-400 font-mono">Seed: {result.seed}</div>
                </div>
              </div>

              {/* Convergence History Chart */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-sky-600" />
                    Convergence & Fitness History Across Iterations
                  </h3>
                  <span className="text-xs font-semibold text-slate-500">
                    {result.history.length} Generations Recorded
                  </span>
                </div>
                <div className="h-60 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={result.history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="iteration" tick={{ fontSize: 11 }} label={{ value: "Generation / Iteration", position: "insideBottom", offset: -5, fontSize: 10 }} />
                      <YAxis domain={[0.4, 1.0]} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: "11px" }} />
                      <Line type="monotone" dataKey="best_fitness" name="Best Fitness" stroke="#0284c7" strokeWidth={2.5} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="avg_fitness" name="Average Fitness" stroke="#94a3b8" strokeDasharray="4 4" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Selected Feature Mask & Ranking */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ListOrdered className="w-4 h-4 text-sky-600" />
                  Feature Ranking & Selected Mask
                </h3>

                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-700">Selected Features Subset:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {result.selected_feature_names.map((name) => (
                      <span
                        key={name}
                        className="px-2.5 py-1 rounded bg-sky-50 text-sky-800 border border-sky-200 text-xs font-mono font-semibold"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="h-48 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={rankingChartData.slice(0, 15)}>
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-30} textAnchor="end" height={50} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                      <Tooltip />
                      <Bar dataKey="score" name="Relative Selection Importance" fill="#0284c7" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Execution Step Logs */}
              <div className="bg-slate-900 rounded-xl p-4 text-white font-mono text-xs space-y-1.5 shadow-sm">
                <div className="flex items-center gap-2 text-slate-400 border-b border-slate-800 pb-2 mb-2 text-[11px] font-sans font-bold uppercase">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Execution Audit Logs</span>
                </div>
                {result.logs.map((log, idx) => (
                  <div key={idx} className="text-slate-300">
                    <span className="text-sky-400">&gt;</span> {log}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
              Select configuration and click Run Search.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

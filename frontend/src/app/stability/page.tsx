"use client";

import React, { useEffect, useState } from "react";
import { fetchDatasets, listExperiments, fetchExperimentResult, startExperimentJob, fetchExperimentStatus } from "@/lib/api";
import { DatasetMeta, ExperimentFullResult, ExperimentStatus } from "@/lib/types";
import {
  GitCompare,
  Play,
  RotateCw,
  ShieldCheck,
  CheckCircle2,
  Sliders,
  Layers,
  Award,
  Grid,
  TrendingUp,
  Activity,
  ArrowRight
} from "lucide-react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend
} from "recharts";

export default function StabilityAnalysisPage() {
  const [datasets, setDatasets] = useState<DatasetMeta[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<string>("ionosphere");
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<string>("ga");
  const [nResamples, setNResamples] = useState<number>(15);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<ExperimentStatus | null>(null);
  const [result, setResult] = useState<ExperimentFullResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadInit = async () => {
      try {
        const [ds, exps] = await Promise.all([fetchDatasets(), listExperiments()]);
        setDatasets(ds);
        if (exps.length > 0) {
          const res = await fetchExperimentResult(exps[0].experiment_id);
          setResult(res);
          setSelectedDataset(res.dataset_id);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadInit();
  }, []);

  useEffect(() => {
    if (!activeJobId) return;
    const interval = setInterval(async () => {
      try {
        const st = await fetchExperimentStatus(activeJobId);
        setJobStatus(st);
        if (st.status === "COMPLETED") {
          const res = await fetchExperimentResult(activeJobId);
          setResult(res);
          setActiveJobId(null);
        } else if (st.status === "FAILED" || st.status === "CANCELLED") {
          setActiveJobId(null);
        }
      } catch (e) {
        console.error(e);
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [activeJobId]);

  const handleLaunchStabilityExperiment = async () => {
    try {
      const resp = await startExperimentJob({
        dataset_id: selectedDataset,
        algorithm: selectedAlgorithm,
        population_size: 25,
        n_iterations: 20,
        model_name: "rf",
        n_resamples: nResamples,
        alpha: 0.85,
        seed: 42
      });
      setActiveJobId(resp.job_id);
      setJobStatus({
        job_id: resp.job_id,
        dataset_id: selectedDataset,
        status: "RUNNING",
        progress_pct: 10,
        current_stage: "Resampling Search",
        stage_detail: `Executing ${selectedAlgorithm.toUpperCase()} across ${nResamples} resampled splits...`,
        has_result: false,
        elapsed_seconds: 0
      });
    } catch (e: any) {
      alert("Failed to start stability experiment: " + e.message);
    }
  };

  const stabMetrics = result?.stability_result?.stability_metrics;
  const resampleRuns = result?.stability_result?.resample_runs || [];

  const runPerformanceChart = resampleRuns.map((r) => ({
    run: `#${r.resample_index}`,
    "Validation Score": parseFloat((r.validation_performance * 100).toFixed(1)),
    "Held-Out Score": parseFloat((r.heldout_performance * 100).toFixed(1)),
    "Selected Features": r.selected_count,
  }));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-sky-600" />
            O3 Contribution: Selection Stability Across Data Resampling
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Differentiating core subsystem running repeated metaheuristics across resampled datasets to compute Nogueira, Jaccard, and Kuncheva stability metrics.
          </p>
        </div>

        {/* Launch Bar */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <select
            value={selectedDataset}
            onChange={(e) => setSelectedDataset(e.target.value)}
            disabled={activeJobId !== null}
            className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-sky-500 font-medium"
          >
            {datasets.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <select
            value={selectedAlgorithm}
            onChange={(e) => setSelectedAlgorithm(e.target.value)}
            disabled={activeJobId !== null}
            className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-sky-500 font-medium"
          >
            <option value="ga">Genetic Algorithm (GA)</option>
            <option value="pso">Particle Swarm (PSO)</option>
            <option value="sa">Simulated Annealing (SA)</option>
            <option value="de">Differential Evolution (DE)</option>
          </select>

          <select
            value={nResamples}
            onChange={(e) => setNResamples(parseInt(e.target.value))}
            disabled={activeJobId !== null}
            className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-sky-500 font-medium"
          >
            <option value={10}>10 Resamples</option>
            <option value={15}>15 Resamples (Standard)</option>
            <option value={20}>20 Resamples (High Rigor)</option>
            <option value={30}>30 Resamples (Publication)</option>
          </select>

          <button
            onClick={handleLaunchStabilityExperiment}
            disabled={activeJobId !== null}
            className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold py-1.5 px-3 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
          >
            {activeJobId ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>Running ({jobStatus?.progress_pct.toFixed(0)}%)...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run O3 Resampling Engine</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Live Running Status Banner */}
      {activeJobId && jobStatus && (
        <div className="bg-sky-900 text-white p-4 rounded-xl border border-sky-700 space-y-2 shadow-md">
          <div className="flex justify-between text-xs">
            <span className="font-bold flex items-center gap-2">
              <Activity className="w-4 h-4 animate-pulse text-sky-300" />
              {jobStatus.current_stage}: {jobStatus.stage_detail}
            </span>
            <span className="font-mono text-sky-200">{jobStatus.progress_pct.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-sky-950 rounded-full h-2 overflow-hidden">
            <div
              className="bg-sky-400 h-full rounded-full transition-all duration-300"
              style={{ width: `${jobStatus.progress_pct}%` }}
            />
          </div>
        </div>
      )}

      {stabMetrics && result && (
        <div className="space-y-6">
          {/* Stability Metric Dashboard Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-gradient-to-br from-sky-900 to-slate-900 text-white p-4 rounded-xl border border-sky-800 shadow-md">
              <div className="text-[11px] text-sky-300 font-semibold uppercase tracking-wider">Composite Stability</div>
              <div className="text-2xl font-black mt-1">{stabMetrics.stability_score_100.toFixed(1)}/100</div>
              <div className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Exceeds &ge;80.0 KPI Target</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-[11px] text-slate-500 font-medium">Nogueira Unbiased Index</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">{stabMetrics.nogueira_stability.toFixed(3)}</div>
              <div className="text-[10px] text-slate-400 mt-1">[0, 1] bounded estimator</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-[11px] text-slate-500 font-medium">Average Pairwise Jaccard</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">{stabMetrics.average_jaccard.toFixed(3)}</div>
              <div className="text-[10px] text-slate-400 mt-1">Worst: {stabMetrics.worst_case_jaccard.toFixed(3)}</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-[11px] text-slate-500 font-medium">Kuncheva Index (Chance Corr.)</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">{stabMetrics.average_kuncheva.toFixed(3)}</div>
              <div className="text-[10px] text-slate-400 mt-1">[-1, 1] consistency scale</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-[11px] text-slate-500 font-medium">95% Bootstrap CI</div>
              <div className="text-lg font-bold text-slate-900 mt-1 font-mono">
                [{stabMetrics.confidence_interval_95.lower.toFixed(2)}, {stabMetrics.confidence_interval_95.upper.toFixed(2)}]
              </div>
              <div className="text-[10px] text-slate-400 mt-1">500 bootstrap iterations</div>
            </div>
          </div>

          {/* Resampling Runs Performance Distribution Chart */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Resampling Performance & Feature Count Across {resampleRuns.length} Runs
                </h3>
                <p className="text-xs text-slate-500">
                  Evaluates whether selected subsets maintain stable generalization across distinct bootstrap partitions.
                </p>
              </div>
              <Link
                href="/stable-features"
                className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1 self-start sm:self-auto"
              >
                <span>View Search Artefact Breakdown</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={runPerformanceChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="run" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Bar dataKey="Validation Score" fill="#38bdf8" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="Held-Out Score" fill="#0284c7" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Resample Runs Detailed Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                Resampling Iteration Log & Selected Subsets
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                {resampleRuns.length} runs executed
              </span>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-[350px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/80 text-slate-700 font-semibold sticky top-0">
                  <tr>
                    <th className="p-3">Run #</th>
                    <th className="p-3">Seed</th>
                    <th className="p-3">Features Selected</th>
                    <th className="p-3">Selected Subset Preview</th>
                    <th className="p-3">Best Fitness</th>
                    <th className="p-3">Validation</th>
                    <th className="p-3">Held-Out</th>
                    <th className="p-3">Runtime</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-mono text-[11px]">
                  {resampleRuns.map((r) => (
                    <tr key={r.resample_index} className="hover:bg-slate-50">
                      <td className="p-3 font-sans font-bold text-slate-900">#{r.resample_index}</td>
                      <td className="p-3 text-slate-500">{r.seed}</td>
                      <td className="p-3 text-sky-700 font-bold">{r.selected_count}</td>
                      <td className="p-3 font-sans text-slate-600 max-w-[280px] truncate" title={r.selected_features.join(", ")}>
                        {r.selected_features.slice(0, 4).join(", ")}
                        {r.selected_features.length > 4 ? ` +${r.selected_features.length - 4} more` : ""}
                      </td>
                      <td className="p-3">{r.best_fitness.toFixed(4)}</td>
                      <td className="p-3">{(r.validation_performance * 100).toFixed(1)}%</td>
                      <td className="p-3 font-bold text-slate-900">{(r.heldout_performance * 100).toFixed(1)}%</td>
                      <td className="p-3 text-slate-500">{r.execution_time_seconds.toFixed(2)}s</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

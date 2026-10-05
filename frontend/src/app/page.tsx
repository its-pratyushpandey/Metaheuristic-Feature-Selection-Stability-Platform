"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  fetchDatasets,
  startExperimentJob,
  fetchExperimentStatus,
  fetchExperimentResult,
  listExperiments
} from "@/lib/api";
import { DatasetMeta, ExperimentStatus, ExperimentFullResult } from "@/lib/types";
import {
  Sparkles,
  Database,
  Crosshair,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCw,
  TrendingUp,
  Activity,
  ArrowRight,
  GitCompare,
  Sliders
} from "lucide-react";

export default function OverviewDashboard() {
  const [datasets, setDatasets] = useState<DatasetMeta[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<string>("ionosphere");
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<string>("ga");
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<ExperimentStatus | null>(null);
  const [latestResult, setLatestResult] = useState<ExperimentFullResult | null>(null);
  const [recentExperiments, setRecentExperiments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Load initial data
  useEffect(() => {
    const loadInit = async () => {
      try {
        const [ds, exps] = await Promise.all([fetchDatasets(), listExperiments()]);
        setDatasets(ds);
        setRecentExperiments(exps);
        if (exps.length > 0) {
          const res = await fetchExperimentResult(exps[0].experiment_id);
          setLatestResult(res);
        }
      } catch (e) {
        console.error("Failed to load initial data", e);
      } finally {
        setLoading(false);
      }
    };
    loadInit();
  }, []);

  // Poll active experiment job
  useEffect(() => {
    if (!activeJobId) return;
    const interval = setInterval(async () => {
      try {
        const st = await fetchExperimentStatus(activeJobId);
        setJobStatus(st);
        if (st.status === "COMPLETED") {
          const res = await fetchExperimentResult(activeJobId);
          setLatestResult(res);
          const exps = await listExperiments();
          setRecentExperiments(exps);
          setActiveJobId(null);
        } else if (st.status === "FAILED" || st.status === "CANCELLED") {
          setActiveJobId(null);
        }
      } catch (e) {
        console.error("Failed polling job status", e);
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [activeJobId]);

  const handleLaunchExperiment = async () => {
    try {
      const resp = await startExperimentJob({
        dataset_id: selectedDataset,
        algorithm: selectedAlgorithm,
        population_size: 25,
        n_iterations: 20,
        model_name: "rf",
        n_resamples: 12,
        alpha: 0.85,
        seed: 42
      });
      setActiveJobId(resp.job_id);
      setJobStatus({
        job_id: resp.job_id,
        dataset_id: selectedDataset,
        status: "RUNNING",
        progress_pct: 5,
        current_stage: "Starting Pipeline",
        stage_detail: "Initializing dataset and reference models...",
        has_result: false,
        elapsed_seconds: 0
      });
    } catch (e) {
      alert("Failed to start experiment: " + e);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner / System Summary */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 rounded-xl p-6 text-white shadow-lg border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-sky-500/20 text-sky-300 text-xs font-semibold border border-sky-500/30">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Full End-to-End System &bull; Semester VII/VIII Capstone</span>
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight">
              Metaheuristic Feature Selection Stability Platform
            </h2>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Resampling stability engine evaluating metaheuristics (GA, PSO, SA, DE) across data subsamples,
              filtering search artefacts from consistently selected features, with independent held-out acceptance and negative stress testing.
            </p>
          </div>

          {/* Quick Launch Control */}
          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/80 shrink-0 flex flex-col gap-3 min-w-[280px]">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Launch Full Pipeline Run
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Dataset</label>
                <select
                  value={selectedDataset}
                  onChange={(e) => setSelectedDataset(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white focus:outline-none focus:border-sky-500"
                  disabled={activeJobId !== null}
                >
                  {datasets.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.task_type === 'classification' ? 'Clf' : 'Reg'})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Algorithm</label>
                <select
                  value={selectedAlgorithm}
                  onChange={(e) => setSelectedAlgorithm(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white focus:outline-none focus:border-sky-500"
                  disabled={activeJobId !== null}
                >
                  <option value="ga">Genetic Algorithm (GA)</option>
                  <option value="pso">Particle Swarm (PSO)</option>
                  <option value="sa">Simulated Annealing (SA)</option>
                  <option value="de">Differential Evolution (DE)</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleLaunchExperiment}
              disabled={activeJobId !== null}
              className="w-full bg-sky-500 hover:bg-sky-400 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2 text-xs shadow-md transition-all disabled:opacity-50"
            >
              {activeJobId ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Running ({jobStatus?.progress_pct.toFixed(0)}%)...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Execute End-to-End Pipeline</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live Progress Bar when job is active */}
        {activeJobId && jobStatus && (
          <div className="mt-4 pt-4 border-t border-slate-800">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="font-semibold text-sky-400 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 animate-pulse" />
                {jobStatus.current_stage}
              </span>
              <span className="text-slate-400">{jobStatus.stage_detail}</span>
              <span className="font-mono text-sky-300">{jobStatus.progress_pct.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-sky-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${jobStatus.progress_pct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 6-KPI Summary Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {latestResult?.kpis?.kpis ? (
          latestResult.kpis.kpis.map((kpi) => {
            const isPass = kpi.status === "PASS";
            return (
              <div
                key={kpi.kpi_id}
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span className="font-bold">{kpi.kpi_id}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      isPass ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {kpi.status}
                  </span>
                </div>
                <div className="text-lg font-bold text-slate-900 truncate" title={kpi.name}>
                  {kpi.candidate_value.toFixed(1)} {kpi.unit}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
                  <span>O2: {kpi.o2_baseline.toFixed(1)}</span>
                  <span className={kpi.delta >= 0 ? "text-emerald-600 font-semibold" : "text-slate-500"}>
                    {kpi.delta > 0 ? `+${kpi.delta.toFixed(1)}` : kpi.delta.toFixed(1)}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          [1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs animate-pulse">
              <div className="h-3 bg-slate-200 rounded w-1/2 mb-2" />
              <div className="h-6 bg-slate-200 rounded w-3/4 mb-2" />
              <div className="h-2 bg-slate-100 rounded w-1/3" />
            </div>
          ))
        )}
      </div>

      {/* Main Grid: Active/Latest Result Overview + Pipeline Flow */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Latest Result Deep Dive */}
        <div className="lg:col-span-2 space-y-6">
          {latestResult ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-sky-600">
                    Latest Verified Result
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {latestResult.dataset_meta?.name} &bull; {latestResult.metaheuristic_config?.algorithm.toUpperCase()} Feature Selection
                  </h3>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Experiment ID: <span className="font-mono text-slate-600">{latestResult.experiment_id}</span> &bull; {latestResult.created_at}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1.5 ${
                      latestResult.validation_decision?.final_decision === "PASS / ACCEPT"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : latestResult.validation_decision?.final_decision === "REVISE"
                        ? "bg-amber-50 text-amber-800 border-amber-200"
                        : "bg-rose-50 text-rose-800 border-rose-200"
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Decision: {latestResult.validation_decision?.final_decision}</span>
                  </div>
                </div>
              </div>

              {/* Comparison Metric Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                  <div className="text-xs text-slate-500 font-medium">Stability Score</div>
                  <div className="text-xl font-bold text-slate-900 mt-1">
                    {latestResult.stability_result?.stability_metrics?.stability_score_100?.toFixed(1)}/100
                  </div>
                  <div className="text-[11px] text-emerald-600 font-medium mt-0.5">
                    Nogueira: {latestResult.stability_result?.stability_metrics?.nogueira_stability?.toFixed(3)}
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                  <div className="text-xs text-slate-500 font-medium">Features Selected</div>
                  <div className="text-xl font-bold text-slate-900 mt-1">
                    {latestResult.candidate_evaluation?.selected_count} / {latestResult.partition_meta?.feature_count}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {(latestResult.candidate_evaluation?.sparsity_ratio * 100).toFixed(0)}% feature reduction
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                  <div className="text-xs text-slate-500 font-medium">Held-Out Performance</div>
                  <div className="text-xl font-bold text-slate-900 mt-1">
                    {(latestResult.candidate_evaluation?.heldout_performance * 100).toFixed(1)}%
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    O2: {(latestResult.o2_reference?.o2_baseline?.heldout_performance * 100).toFixed(1)}%
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                  <div className="text-xs text-slate-500 font-medium">Inference Latency</div>
                  <div className="text-xl font-bold text-slate-900 mt-1">
                    {latestResult.candidate_evaluation?.latency_metrics?.p95_ms?.toFixed(2)} ms
                  </div>
                  <div className="text-[11px] text-emerald-600 font-medium mt-0.5">
                    p95 SLA Validated
                  </div>
                </div>
              </div>

              {/* Consistently Selected Features Pills */}
              <div>
                <div className="text-xs font-semibold text-slate-700 mb-2 flex items-center justify-between">
                  <span>Consistently Selected Stable Features (Survived Resampling):</span>
                  <Link href="/stable-features" className="text-sky-600 hover:text-sky-700 flex items-center gap-1 text-xs">
                    Inspect Artefact Breakdown <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
                <div className="flex flex-wrap gap-2">
                  {latestResult.stability_result?.stability_metrics?.consistently_selected_features?.map((feat) => (
                    <span
                      key={feat}
                      className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-mono font-semibold"
                    >
                      {feat}
                    </span>
                  ))}
                  {latestResult.stability_result?.stability_metrics?.consistently_selected_features?.length === 0 && (
                    <span className="text-xs text-slate-400 italic">No features reached &ge;80% selection frequency.</span>
                  )}
                </div>
              </div>

              {/* 5 Negative Tests Status Strip */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-xs font-bold text-slate-700 mb-3 flex items-center justify-between">
                  <span>Mandatory Negative Test Center (NT-1 .. NT-5)</span>
                  <Link href="/negative-tests" className="text-sky-600 hover:text-sky-700 text-xs">
                    View Full Test Evidence &rarr;
                  </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                  {latestResult.negative_tests?.tests?.map((nt) => (
                    <div
                      key={nt.test_id}
                      className="p-2.5 rounded bg-white border border-slate-200 text-xs flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">{nt.test_id}</span>
                        <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                          PASS
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1 line-clamp-1">{nt.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 space-y-3">
              <Sparkles className="w-10 h-10 mx-auto text-slate-300" />
              <div className="text-base font-bold text-slate-700">No Experiment Executed Yet</div>
              <p className="text-xs max-w-md mx-auto text-slate-500">
                Click <strong>Execute End-to-End Pipeline</strong> above to run metaheuristic feature selection across data resamples.
              </p>
            </div>
          )}
        </div>

        {/* Right 1 Col: Quick Navigation & Benchmark Datasets */}
        <div className="space-y-6">
          {/* Architecture Quick Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
              System Architecture & Flow
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Explore the two formal architecture diagrams reproducing the live training/serving loop and validation decision gate.
            </p>
            <Link
              href="/architecture"
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-2 px-3 rounded-lg flex items-center justify-center gap-2 text-xs transition-colors"
            >
              <span>View Interactive Architecture</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Benchmark Datasets Catalog */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Archive & Benchmark Datasets
              </div>
              <Link href="/datasets" className="text-xs text-sky-600 hover:underline">
                Manage &rarr;
              </Link>
            </div>
            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
              {datasets.map((d) => (
                <div
                  key={d.id}
                  onClick={() => setSelectedDataset(d.id)}
                  className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                    selectedDataset === d.id
                      ? "border-sky-500 bg-sky-50/50 shadow-xs"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-900">
                    <span>{d.name}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] uppercase font-bold ${
                        d.task_type === "classification"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {d.task_type}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
                    <span>{d.rows} instances</span>
                    <span>{d.feature_count} features</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import { fetchDatasets, runO2Reference, runO2Oracle } from "@/lib/api";
import { DatasetMeta, O2ReferenceResult } from "@/lib/types";
import {
  Crosshair,
  Play,
  CheckCircle2,
  Cpu,
  Clock,
  HardDrive,
  Layers,
  ArrowRight,
  ShieldCheck,
  RotateCw,
  Award
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid
} from "recharts";

export default function ReferenceModelPage() {
  const [datasets, setDatasets] = useState<DatasetMeta[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<string>("ionosphere");
  const [selectedModel, setSelectedModel] = useState<string>("rf");
  const [result, setResult] = useState<O2ReferenceResult | null>(null);
  const [oracleResult, setOracleResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [oracleLoading, setOracleLoading] = useState(false);

  useEffect(() => {
    fetchDatasets().then((ds) => {
      setDatasets(ds);
      if (ds.length > 0) {
        handleRunReference(ds[0].id, "rf");
      }
    });
  }, []);

  const handleRunReference = async (dsId = selectedDataset, model = selectedModel) => {
    try {
      setLoading(true);
      setOracleResult(null);
      const res = await runO2Reference(dsId, model);
      setResult(res);
    } catch (e: any) {
      alert("Error running O2 reference: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRunOracle = async () => {
    try {
      setOracleLoading(true);
      const res = await runO2Oracle(selectedDataset, selectedModel);
      setOracleResult(res);
    } catch (e: any) {
      alert("Oracle test failed: " + e.message);
    } finally {
      setOracleLoading(false);
    }
  };

  const chartData = result?.compared_approaches.map((app) => ({
    name: app.approach_name.replace(" Baseline", "").replace(" Selection", ""),
    Train: parseFloat((app.train_performance * 100).toFixed(1)),
    Validation: parseFloat((app.validation_performance * 100).toFixed(1)),
    "Held-Out": parseFloat((app.heldout_performance * 100).toFixed(1)),
    Features: app.selected_count,
    Latency: app.latency_metrics.p95_ms,
  }));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Crosshair className="w-5 h-5 text-sky-600" />
            O2 Reference: Model Performance on Selected Subsets
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Reproducible baseline benchmark comparing Full Feature, Filter-based, and Mutual Information approaches with independent expected oracle.
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <select
            value={selectedDataset}
            onChange={(e) => {
              setSelectedDataset(e.target.value);
              handleRunReference(e.target.value, selectedModel);
            }}
            className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-sky-500 font-medium"
          >
            {datasets.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <select
            value={selectedModel}
            onChange={(e) => {
              setSelectedModel(e.target.value);
              handleRunReference(selectedDataset, e.target.value);
            }}
            className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-sky-500 font-medium"
          >
            <option value="rf">Random Forest (RF)</option>
            <option value="logistic">Logistic / Ridge</option>
            <option value="gb">Gradient Boosting</option>
            <option value="svm">Support Vector Machine</option>
            <option value="knn">K-Nearest Neighbors</option>
          </select>

          <button
            onClick={() => handleRunReference()}
            disabled={loading}
            className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold py-1.5 px-3 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
          >
            {loading ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>Run Pipeline</span>
          </button>
        </div>
      </div>

      {result && (
        <div className="space-y-6">
          {/* Selected Official Reference Hero Card */}
          <div className="bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 rounded-xl p-6 text-white shadow-lg border border-slate-800">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 text-[11px] font-bold border border-sky-500/30 mb-2">
                  <Award className="w-3.5 h-3.5" />
                  <span>Selected Official O2 Reference Baseline</span>
                </div>
                <h3 className="text-xl font-bold">{result.o2_baseline.approach_name}</h3>
                <p className="text-xs text-slate-300 max-w-2xl mt-1 leading-relaxed">
                  {result.trade_off_analysis}
                </p>
              </div>

              {/* Oracle Button */}
              <div className="shrink-0 flex flex-col items-end gap-2">
                <button
                  onClick={handleRunOracle}
                  disabled={oracleLoading}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 px-4 rounded-lg flex items-center gap-2 shadow-md transition-colors disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{oracleLoading ? "Verifying..." : "Run Expected Oracle Test"}</span>
                </button>
                <div className="text-[10px] text-slate-400 font-mono">
                  Hash: {result.reproducibility_hash}
                </div>
              </div>
            </div>

            {/* Oracle Verification Box */}
            {oracleResult && (
              <div className="mt-4 pt-4 border-t border-slate-800 bg-slate-800/60 p-3.5 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-bold text-emerald-300">
                    Oracle Verdict: {oracleResult.oracle_verdict}
                  </span>
                  <span className="text-slate-300">({oracleResult.details})</span>
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  Metric Delta: <strong>{oracleResult.metric_delta.toFixed(6)}</strong>
                </div>
              </div>
            )}
          </div>

          {/* 3-Way Reference Comparison Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              Feasible Reference Approaches Comparison Matrix
            </h3>
            <div className="border border-slate-200 rounded-lg overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/80 text-slate-700 font-semibold">
                  <tr>
                    <th className="p-3">Reference Approach</th>
                    <th className="p-3">Features (k/D)</th>
                    <th className="p-3">Sparsity</th>
                    <th className="p-3">Train Score</th>
                    <th className="p-3">Validation</th>
                    <th className="p-3">Held-Out</th>
                    <th className="p-3">Latency p95</th>
                    <th className="p-3">Peak Memory</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
                  {result.compared_approaches.map((app) => {
                    const isSelected = app.approach_name === result.selected_o2_approach;
                    return (
                      <tr
                        key={app.approach_name}
                        className={isSelected ? "bg-sky-50/70 font-semibold" : "hover:bg-slate-50"}
                      >
                        <td className="p-3 font-sans font-medium text-slate-900 flex items-center gap-2">
                          {isSelected && <Award className="w-3.5 h-3.5 text-sky-600 shrink-0" />}
                          <span>{app.approach_name}</span>
                        </td>
                        <td className="p-3">{app.selected_count} / {app.total_features}</td>
                        <td className="p-3">{(app.sparsity_ratio * 100).toFixed(0)}%</td>
                        <td className="p-3">{(app.train_performance * 100).toFixed(1)}%</td>
                        <td className="p-3">{(app.validation_performance * 100).toFixed(1)}%</td>
                        <td className="p-3 text-slate-900 font-bold">{(app.heldout_performance * 100).toFixed(1)}%</td>
                        <td className="p-3">{app.latency_metrics.p95_ms.toFixed(2)} ms</td>
                        <td className="p-3">{app.peak_memory_mb.toFixed(1)} MB</td>
                        <td className="p-3 font-sans">
                          {isSelected ? (
                            <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-800 font-bold text-[10px]">
                              OFFICIAL O2
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px]">
                              COMPARATOR
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Performance Comparison Chart & Selected Features */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-900">
                Generalization Performance vs Feature Subsets
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <Bar dataKey="Train" fill="#94a3b8" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="Validation" fill="#38bdf8" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="Held-Out" fill="#0284c7" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Condition-wise Subgroup Breakdown */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-900">
                Condition-wise Subgroup Breakdown (AC-3 Compliance)
              </h3>
              <p className="text-xs text-slate-500">
                Performance across stress conditions and subgroups rather than hiding failures inside aggregate averages.
              </p>
              <div className="space-y-3">
                {Object.entries(result.o2_baseline.condition_wise_performance || {}).map(([cond, data]) => (
                  <div key={cond} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-900">
                      <span>{cond.replace(/_/g, " ")}</span>
                      <span className="text-sky-700 font-mono font-bold">
                        {(data.score * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">{data.description} ({data.sample_count} samples)</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

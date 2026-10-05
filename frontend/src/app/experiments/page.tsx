"use client";

import React, { useEffect, useState } from "react";
import { listExperiments, fetchExperimentResult } from "@/lib/api";
import { ExperimentFullResult } from "@/lib/types";
import {
  History,
  Search,
  CheckCircle2,
  FileCode,
  ShieldCheck,
  Award,
  Layers,
  Sparkles,
  ArrowRight,
  ExternalLink
} from "lucide-react";
import Link from "next/link";

export default function ExperimentsPage() {
  const [experiments, setExperiments] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedResult, setSelectedResult] = useState<ExperimentFullResult | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadList();
  }, []);

  const loadList = async () => {
    try {
      setLoading(true);
      const list = await listExperiments();
      setExperiments(list);
      if (list.length > 0) {
        setSelectedId(list[0].experiment_id);
        const res = await fetchExperimentResult(list[0].experiment_id);
        setSelectedResult(res);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (id: string) => {
    setSelectedId(id);
    try {
      const res = await fetchExperimentResult(id);
      setSelectedResult(res);
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = experiments.filter((e) =>
    e.experiment_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.dataset_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.algorithm.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <History className="w-5 h-5 text-sky-600" />
          Experiment History &amp; Evidence Log
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Audited repository of all executed feature selection experiments with complete provenance and reproducibility trails.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: List of Experiments */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 flex flex-col space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by ID, dataset, algo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto max-h-[600px] pr-1">
            {filtered.map((exp) => {
              const isSelected = selectedId === exp.experiment_id;
              const isPass = exp.final_decision === "PASS / ACCEPT";
              return (
                <div
                  key={exp.experiment_id}
                  onClick={() => handleSelect(exp.experiment_id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? "border-sky-500 bg-sky-50/60 shadow-xs"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-slate-900 truncate max-w-[150px]">
                      {exp.experiment_id}
                    </span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                        isPass ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {exp.final_decision}
                    </span>
                  </div>

                  <div className="text-xs font-semibold text-slate-700 mt-1">
                    {exp.dataset_name} &bull; {exp.algorithm}
                  </div>

                  <div className="text-[10px] text-slate-400 mt-2 flex justify-between border-t border-slate-100 pt-1.5">
                    <span>Stability: {exp.stability_score.toFixed(1)}/100</span>
                    <span>Held-Out: {(exp.heldout_performance * 100).toFixed(1)}%</span>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="p-4 text-center text-xs text-slate-400">No experiments found.</div>
            )}
          </div>
        </div>

        {/* Right 2 Columns: Deep Dive Inspector */}
        <div className="lg:col-span-2 space-y-6">
          {selectedResult ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
                <div>
                  <span className="font-mono text-xs text-sky-700 font-bold bg-sky-50 px-2 py-0.5 rounded">
                    {selectedResult.experiment_id}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 mt-1">
                    {selectedResult.dataset_meta?.name} &bull; {selectedResult.metaheuristic_config?.algorithm.toUpperCase()} Search
                  </h3>
                  <div className="text-xs text-slate-400 mt-0.5">Executed: {selectedResult.created_at}</div>
                </div>

                <Link
                  href="/evidence"
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold py-2 px-3.5 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors self-start sm:self-auto"
                >
                  <FileCode className="w-4 h-4" />
                  <span>Inspect Manifest</span>
                </Link>
              </div>

              {/* Stat Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs">
                  <div className="text-slate-400">Stability Score</div>
                  <div className="text-xl font-bold text-slate-900 mt-0.5">
                    {selectedResult.stability_result?.stability_metrics?.stability_score_100.toFixed(1)}/100
                  </div>
                  <div className="text-[10px] text-emerald-600 font-semibold">
                    Nogueira: {selectedResult.stability_result?.stability_metrics?.nogueira_stability.toFixed(3)}
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs">
                  <div className="text-slate-400">Features Selected</div>
                  <div className="text-xl font-bold text-slate-900 mt-0.5">
                    {selectedResult.candidate_evaluation?.selected_count} / {selectedResult.partition_meta?.feature_count}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {(selectedResult.candidate_evaluation?.sparsity_ratio * 100).toFixed(0)}% reduced
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs">
                  <div className="text-slate-400">Held-Out Score</div>
                  <div className="text-xl font-bold text-slate-900 mt-0.5">
                    {(selectedResult.candidate_evaluation?.heldout_performance * 100).toFixed(1)}%
                  </div>
                  <div className="text-[10px] text-slate-500">
                    O2: {(selectedResult.o2_reference?.o2_baseline?.heldout_performance * 100).toFixed(1)}%
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs">
                  <div className="text-slate-400">Final Decision</div>
                  <div className="text-sm font-bold text-emerald-700 mt-1">
                    {selectedResult.validation_decision?.final_decision}
                  </div>
                  <div className="text-[10px] text-slate-500">AC-1..AC-4 Verified</div>
                </div>
              </div>

              {/* Selected Subset Pills */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-800">Final Consensus Feature Subset:</div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedResult.candidate_evaluation?.selected_features?.map((f) => (
                    <span
                      key={f}
                      className="px-2.5 py-1 rounded bg-slate-100 text-slate-800 border border-slate-200 font-mono text-xs font-medium"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>

              {/* Raw JSON Artifact Preview */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>Structured Evidence Fingerprint:</span>
                  <span className="font-mono text-[10px] text-slate-400">
                    SHA256: {selectedResult.evidence_manifest?.evidence_sha256?.slice(0, 16)}...
                  </span>
                </div>
                <pre className="bg-slate-950 text-slate-300 p-4 rounded-xl text-[11px] font-mono overflow-x-auto max-h-[250px] leading-relaxed">
                  {JSON.stringify(
                    {
                      experiment_id: selectedResult.experiment_id,
                      dataset: selectedResult.dataset_meta?.name,
                      algorithm: selectedResult.metaheuristic_config,
                      o2_baseline: selectedResult.o2_reference?.o2_baseline?.heldout_performance,
                      o3_stability_score: selectedResult.stability_result?.stability_metrics?.stability_score_100,
                      final_decision: selectedResult.validation_decision?.final_decision,
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
              Select an experiment to view full audit logs.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

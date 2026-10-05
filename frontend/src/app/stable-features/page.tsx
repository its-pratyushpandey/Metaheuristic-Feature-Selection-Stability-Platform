"use client";

import React, { useEffect, useState } from "react";
import { listExperiments, fetchExperimentResult } from "@/lib/api";
import { FeatureStabilityRow, FeatureClassificationResult, ExperimentFullResult } from "@/lib/types";
import {
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  XCircle,
  Search,
  Filter,
  ShieldCheck,
  TrendingUp,
  Sliders,
  Sparkles,
  Info
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid
} from "recharts";

export default function StableFeaturesPage() {
  const [experiment, setExperiment] = useState<ExperimentFullResult | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const exps = await listExperiments();
        if (exps.length > 0) {
          const res = await fetchExperimentResult(exps[0].experiment_id);
          setExperiment(res);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const classified = experiment?.classified_features;
  const features = classified?.features || [];
  const summary = classified?.summary;

  const filteredFeatures = features.filter((f) => {
    const matchesStatus = statusFilter === "ALL" || f.final_status === statusFilter;
    const matchesSearch = f.feature_name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const chartData = features.slice(0, 15).map((f) => ({
    name: f.feature_name,
    Percentage: f.selection_percentage,
    Contribution: parseFloat((f.model_contribution * 100).toFixed(1)),
    status: f.final_status,
  }));

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Consistently Selected":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
      case "Potentially Stable":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "Unstable":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "Search Artefact":
        return "bg-rose-100 text-rose-800 border-rose-300";
      default:
        return "bg-slate-100 text-slate-800 border-slate-300";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Consistently Selected":
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />;
      case "Potentially Stable":
        return <HelpCircle className="w-3.5 h-3.5 text-blue-600" />;
      case "Unstable":
        return <AlertCircle className="w-3.5 h-3.5 text-amber-600" />;
      case "Search Artefact":
        return <XCircle className="w-3.5 h-3.5 text-rose-600" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          Distinguish Consistently Selected Features from Search Artefacts
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Dedicated classification taxonomy separating genuinely stable predictive signals from sample-specific artefacts and stochastic noise.
        </p>
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div
            onClick={() => setStatusFilter("Consistently Selected")}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              statusFilter === "Consistently Selected"
                ? "border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-400/20"
                : "bg-white border-slate-200 hover:border-slate-300 shadow-xs"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">Consistently Selected</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-700 mt-2">{summary.consistently_selected}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">&ge; 80% selection frequency</div>
          </div>

          <div
            onClick={() => setStatusFilter("Potentially Stable")}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              statusFilter === "Potentially Stable"
                ? "border-blue-500 bg-blue-50/70 ring-2 ring-blue-400/20"
                : "bg-white border-slate-200 hover:border-slate-300 shadow-xs"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">Potentially Stable</span>
              <HelpCircle className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-black text-blue-700 mt-2">{summary.potentially_stable}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">50% - 80% frequency</div>
          </div>

          <div
            onClick={() => setStatusFilter("Unstable")}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              statusFilter === "Unstable"
                ? "border-amber-500 bg-amber-50/70 ring-2 ring-amber-400/20"
                : "bg-white border-slate-200 hover:border-slate-300 shadow-xs"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">Unstable / Volatile</span>
              <AlertCircle className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-amber-700 mt-2">{summary.unstable}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">20% - 50% frequency</div>
          </div>

          <div
            onClick={() => setStatusFilter("Search Artefact")}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              statusFilter === "Search Artefact"
                ? "border-rose-500 bg-rose-50/70 ring-2 ring-rose-400/20"
                : "bg-white border-slate-200 hover:border-slate-300 shadow-xs"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">Search Artefacts</span>
              <XCircle className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl font-black text-rose-700 mt-2">{summary.search_artefacts}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">&lt; 20% frequency (Pruned)</div>
          </div>
        </div>
      )}

      {/* Feature Frequency & Contribution Chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-sky-600" />
              Feature Selection Frequency vs Model Importance Contribution
            </h3>
            <span className="text-xs text-slate-500">
              Null chance baseline: <strong>{(summary?.null_hypothesis_chance_prob ? summary.null_hypothesis_chance_prob * 100 : 25).toFixed(1)}%</strong>
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-25} textAnchor="end" height={45} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                <Tooltip />
                <Bar dataKey="Percentage" name="Selection Frequency %" fill="#0284c7" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Contribution" name="Model Permutation Importance %" fill="#10b981" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          {["ALL", "Consistently Selected", "Potentially Stable", "Unstable", "Search Artefact"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                statusFilter === st
                  ? "bg-slate-900 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search feature name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-sky-500"
          />
        </div>
      </div>

      {/* Features Taxonomy Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            Feature Classification & Statistical Gating Table
          </h3>
          <span className="text-xs text-slate-500">
            Showing {filteredFeatures.length} of {features.length} features
          </span>
        </div>

        <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-[500px]">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 text-slate-700 font-semibold sticky top-0">
              <tr>
                <th className="p-3">Feature Name</th>
                <th className="p-3">Selection Count</th>
                <th className="p-3">Frequency %</th>
                <th className="p-3">Stability Score</th>
                <th className="p-3">Model Contribution</th>
                <th className="p-3">95% CI (Freq)</th>
                <th className="p-3">p-value (vs Chance)</th>
                <th className="p-3">Final Status</th>
                <th className="p-3">Engineering Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-mono text-[11px]">
              {filteredFeatures.map((f) => (
                <tr key={f.feature_name} className="hover:bg-slate-50">
                  <td className="p-3 font-sans font-bold text-slate-900">{f.feature_name}</td>
                  <td className="p-3">
                    {f.selection_count} / {f.total_resamples}
                  </td>
                  <td className="p-3 font-bold text-slate-900">{f.selection_percentage.toFixed(1)}%</td>
                  <td className="p-3 text-sky-700 font-bold">{f.stability_score.toFixed(1)}/100</td>
                  <td className="p-3">{(f.model_contribution * 100).toFixed(1)}%</td>
                  <td className="p-3 text-slate-500">
                    [{f.confidence_interval_95[0]}%, {f.confidence_interval_95[1]}%]
                  </td>
                  <td className="p-3">
                    <span className={f.is_statistically_significant ? "text-emerald-600 font-bold" : "text-slate-400"}>
                      {f.p_value_vs_chance < 0.001 ? "< 0.001" : f.p_value_vs_chance.toFixed(3)}
                    </span>
                  </td>
                  <td className="p-3 font-sans">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusColor(
                        f.final_status
                      )}`}
                    >
                      {getStatusIcon(f.final_status)}
                      <span>{f.final_status}</span>
                    </span>
                  </td>
                  <td className="p-3 font-sans text-slate-600 text-[10px] max-w-[220px]">
                    {f.engineering_recommendation}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

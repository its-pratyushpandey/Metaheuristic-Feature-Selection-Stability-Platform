"use client";

import React, { useEffect, useState } from "react";
import { fetchDatasets, fetchDatasetQuality, uploadDataset } from "@/lib/api";
import { DatasetMeta, DatasetQualityReport } from "@/lib/types";
import {
  Database,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Info,
  Layers,
  FileSpreadsheet,
  BarChart2,
  RefreshCw,
  Search
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell
} from "recharts";

export default function DatasetsPage() {
  const [datasets, setDatasets] = useState<DatasetMeta[]>([]);
  const [selectedId, setSelectedId] = useState<string>("ionosphere");
  const [quality, setQuality] = useState<DatasetQualityReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [qualityLoading, setQualityLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Upload modal state
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [uploadTarget, setUploadTarget] = useState("");
  const [uploadTask, setUploadTask] = useState<"classification" | "regression">("classification");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadCatalog();
  }, []);

  const loadCatalog = async () => {
    try {
      setLoading(true);
      const list = await fetchDatasets();
      setDatasets(list);
      if (list.length > 0) {
        setSelectedId(list[0].id);
        loadQuality(list[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadQuality = async (id: string) => {
    try {
      setQualityLoading(true);
      const rep = await fetchDatasetQuality(id);
      setQuality(rep);
    } catch (e) {
      console.error(e);
    } finally {
      setQualityLoading(false);
    }
  };

  const handleSelectDataset = (id: string) => {
    setSelectedId(id);
    loadQuality(id);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !uploadName || !uploadTarget) {
      alert("Please provide all required fields");
      return;
    }
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append("file", uploadFile);
      fd.append("name", uploadName);
      fd.append("target_col", uploadTarget);
      fd.append("task_type", uploadTask);
      const resp = await uploadDataset(fd);
      alert(`Dataset '${resp.name}' uploaded successfully!`);
      setShowUpload(false);
      await loadCatalog();
      handleSelectDataset(resp.dataset_id);
    } catch (e: any) {
      alert("Upload failed: " + e.message);
    } finally {
      setUploading(false);
    }
  };

  const selectedMeta = datasets.find((d) => d.id === selectedId);
  const filteredDatasets = datasets.filter(
    (d) =>
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Database className="w-5 h-5 text-sky-600" />
            Dataset Management & Quality Validation
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Ingest UCI archive datasets, validate schemas, inspect class distributions, and enforce data leakage prevention.
          </p>
        </div>

        <button
          onClick={() => setShowUpload(true)}
          className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold py-2 px-4 rounded-lg flex items-center gap-2 shadow-xs transition-colors self-start sm:self-auto"
        >
          <Upload className="w-4 h-4" />
          <span>Upload Custom CSV</span>
        </button>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Dataset List & Search */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 flex flex-col space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search datasets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto max-h-[600px] pr-1">
            {filteredDatasets.map((d) => (
              <div
                key={d.id}
                onClick={() => handleSelectDataset(d.id)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedId === d.id
                    ? "border-sky-500 bg-sky-50/50 shadow-xs"
                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-900">{d.name}</div>
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
                <div className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  {d.description}
                </div>
                <div className="text-[10px] text-slate-400 mt-2 flex items-center justify-between border-t border-slate-100 pt-1.5">
                  <span>{d.rows} instances</span>
                  <span>{d.feature_count} features</span>
                  <span>{d.source}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 2 Columns: Dataset Quality Audit & Metadata */}
        <div className="lg:col-span-2 space-y-6">
          {selectedMeta && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6">
              {/* Top Overview & Provenance */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900">{selectedMeta.name}</h3>
                    {selectedMeta.is_archive && (
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-purple-100 text-purple-800 border border-purple-200">
                        Archive Benchmark
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Source: <span className="font-semibold">{selectedMeta.source}</span> &bull; Target Column:{" "}
                    <span className="font-mono text-sky-700 bg-sky-50 px-1 py-0.5 rounded font-semibold">
                      {selectedMeta.target_col}
                    </span>
                  </div>
                </div>

                {quality && (
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                        quality.quality_grade === "EXCELLENT"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : quality.quality_grade === "ACCEPTABLE"
                          ? "bg-blue-50 text-blue-800 border-blue-200"
                          : "bg-amber-50 text-amber-800 border-amber-200"
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Quality Grade: {quality.quality_grade}</span>
                    </span>
                  </div>
                )}
              </div>

              {/* Data Shape & Leakage Prevention Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                  <div className="text-slate-400">Total Instances</div>
                  <div className="text-lg font-bold text-slate-900 mt-0.5">{quality?.total_rows || selectedMeta.rows}</div>
                  <div className="text-[10px] text-slate-500">Rows in dataset</div>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                  <div className="text-slate-400">Feature Count</div>
                  <div className="text-lg font-bold text-slate-900 mt-0.5">{quality?.feature_count || selectedMeta.feature_count}</div>
                  <div className="text-[10px] text-slate-500">
                    {quality?.numerical_features_count || 0} num, {quality?.categorical_features_count || 0} cat
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                  <div className="text-slate-400">Missing / Duplicates</div>
                  <div className="text-lg font-bold text-slate-900 mt-0.5">
                    {quality?.missing_total || 0} / {quality?.duplicate_rows || 0}
                  </div>
                  <div className="text-[10px] text-slate-500">Cleaned & median imputed</div>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                  <div className="text-slate-400">Leakage Guard</div>
                  <div className="text-lg font-bold text-emerald-600 mt-0.5">ACTIVE</div>
                  <div className="text-[10px] text-slate-500">Held-Out 20% Isolated</div>
                </div>
              </div>

              {/* Class or Target Distribution Chart */}
              {quality?.target_stats?.distribution && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="text-xs font-bold text-slate-800 mb-3 flex items-center justify-between">
                    <span>Class Distribution & Imbalance Check</span>
                    <span className="text-[11px] font-normal text-slate-500">
                      Imbalance Ratio: <strong>{quality.target_stats.imbalance_ratio}:1</strong>
                    </span>
                  </div>
                  <div className="h-40 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={quality.target_stats.distribution}>
                        <XAxis dataKey="class" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#0284c7" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Feature Statistics Table */}
              <div>
                <div className="text-xs font-bold text-slate-800 mb-2 flex items-center justify-between">
                  <span>Feature Schema & Summary Statistics:</span>
                  <span className="text-[11px] text-slate-400 font-normal">Showing {quality?.feature_stats?.length || 0} features</span>
                </div>
                <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-[300px]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/80 text-slate-600 sticky top-0 font-semibold">
                      <tr>
                        <th className="p-2.5">Feature Name</th>
                        <th className="p-2.5">Dtype</th>
                        <th className="p-2.5">Mean &plusmn; Std</th>
                        <th className="p-2.5">Min &bull; Max</th>
                        <th className="p-2.5">Missing</th>
                        <th className="p-2.5">Zeros</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {quality?.feature_stats?.map((f) => (
                        <tr key={f.name} className="hover:bg-slate-50 font-mono text-[11px]">
                          <td className="p-2.5 font-sans font-medium text-slate-900">{f.name}</td>
                          <td className="p-2.5 text-slate-500">{f.dtype}</td>
                          <td className="p-2.5">
                            {f.is_numerical ? `${f.mean?.toFixed(2)} \u00B1 ${f.std?.toFixed(2)}` : f.top_value}
                          </td>
                          <td className="p-2.5">
                            {f.is_numerical ? `[${f.min?.toFixed(2)}, ${f.max?.toFixed(2)}]` : "N/A"}
                          </td>
                          <td className="p-2.5">
                            {f.missing_count > 0 ? (
                              <span className="text-rose-600 font-bold">{f.missing_count}</span>
                            ) : (
                              "0"
                            )}
                          </td>
                          <td className="p-2.5">{f.zeros_count ?? 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Upload Custom CSV Dataset</h3>
            <form onSubmit={handleUploadSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Dataset Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Clinical Biomarker Study"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded focus:border-sky-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Target Column Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. target or label"
                  value={uploadTarget}
                  onChange={(e) => setUploadTarget(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded focus:border-sky-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Task Type</label>
                <select
                  value={uploadTask}
                  onChange={(e) => setUploadTask(e.target.value as any)}
                  className="w-full p-2 border border-slate-300 rounded focus:border-sky-500 focus:outline-none"
                >
                  <option value="classification">Classification</option>
                  <option value="regression">Regression</option>
                </select>
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">CSV File</label>
                <input
                  type="file"
                  required
                  accept=".csv"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full p-2 border border-slate-300 rounded focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUpload(false)}
                  className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-4 py-1.5 rounded bg-sky-600 text-white font-semibold hover:bg-sky-500 disabled:opacity-50"
                >
                  {uploading ? "Uploading..." : "Upload & Validate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

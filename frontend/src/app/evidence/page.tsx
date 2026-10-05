"use client";

import React, { useEffect, useState } from "react";
import { listExperiments, fetchExperimentResult } from "@/lib/api";
import { ExperimentFullResult } from "@/lib/types";
import {
  FileCheck,
  Download,
  Copy,
  Check,
  ShieldCheck,
  Code,
  FileText,
  Layers,
  Terminal
} from "lucide-react";

export default function EvidencePage() {
  const [experiments, setExperiments] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [result, setResult] = useState<ExperimentFullResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"manifest" | "script">("manifest");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listExperiments().then((exps) => {
      setExperiments(exps);
      if (exps.length > 0) {
        setSelectedId(exps[0].experiment_id);
        fetchExperimentResult(exps[0].experiment_id).then((res) => {
          setResult(res);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });
  }, []);

  const handleSelectExp = async (id: string) => {
    setSelectedId(id);
    try {
      const res = await fetchExperimentResult(id);
      setResult(res);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadScript = () => {
    if (!result?.reproducibility_script) return;
    const blob = new Blob([result.reproducibility_script], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `reproduce_${result.experiment_id}.py`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadManifest = () => {
    if (!result?.evidence_manifest) return;
    const blob = new Blob([JSON.stringify(result.evidence_manifest, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `manifest_${result.experiment_id}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-sky-600" />
            Evidence Manifest &amp; Reproducibility Package
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tamper-evident JSON-LD provenance manifests and standalone executable reproduction packages.
          </p>
        </div>

        {/* Experiment Switcher */}
        <select
          value={selectedId || ""}
          onChange={(e) => handleSelectExp(e.target.value)}
          className="text-xs bg-white border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-sky-500 font-mono font-medium self-start sm:self-auto"
        >
          {experiments.map((e) => (
            <option key={e.experiment_id} value={e.experiment_id}>
              {e.experiment_id} ({e.dataset_name})
            </option>
          ))}
        </select>
      </div>

      {result ? (
        <div className="space-y-6">
          {/* Manifest Fingerprint Hero Card */}
          <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 text-white rounded-xl p-6 shadow-lg border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="text-xs font-bold text-sky-400 uppercase tracking-wider">
                  Tamper-Evident SHA-256 Provenance Fingerprint
                </div>
                <div className="font-mono text-xs text-slate-200 bg-slate-950/70 p-2.5 rounded-lg border border-slate-800 break-all select-all">
                  {result.evidence_manifest?.evidence_sha256}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={activeTab === "manifest" ? handleDownloadManifest : handleDownloadScript}
                  className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold py-2 px-3.5 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Download {activeTab === "manifest" ? "JSON Manifest" : "Python Script"}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2 border-t border-slate-800/80">
              <div>
                <span className="text-slate-400">Dataset Source:</span>
                <div className="font-bold text-slate-100">{result.dataset_meta?.source}</div>
              </div>
              <div>
                <span className="text-slate-400">License:</span>
                <div className="font-bold text-slate-100">CC-BY 4.0 Benchmark</div>
              </div>
              <div>
                <span className="text-slate-400">Random Seed:</span>
                <div className="font-bold font-mono text-sky-300">{result.metaheuristic_config?.seed}</div>
              </div>
              <div>
                <span className="text-slate-400">Decision:</span>
                <div className="font-bold text-emerald-400">{result.validation_decision?.final_decision}</div>
              </div>
            </div>
          </div>

          {/* Tab Selection */}
          <div className="flex items-center justify-between border-b border-slate-200">
            <div className="flex items-center gap-4 text-xs font-bold">
              <button
                onClick={() => setActiveTab("manifest")}
                className={`pb-3 border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === "manifest"
                    ? "border-sky-600 text-sky-600"
                    : "border-transparent text-slate-500 hover:text-slate-900"
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>JSON-LD Evidence Manifest</span>
              </button>

              <button
                onClick={() => setActiveTab("script")}
                className={`pb-3 border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === "script"
                    ? "border-sky-600 text-sky-600"
                    : "border-transparent text-slate-500 hover:text-slate-900"
                }`}
              >
                <Code className="w-4 h-4" />
                <span>Standalone Python Reproducibility Script</span>
              </button>
            </div>

            <button
              onClick={() =>
                handleCopy(
                  activeTab === "manifest"
                    ? JSON.stringify(result.evidence_manifest, null, 2)
                    : result.reproducibility_script
                )
              }
              className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded transition-colors mb-2"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied!" : "Copy Content"}</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="bg-slate-950 rounded-xl p-6 shadow-md border border-slate-900">
            {activeTab === "manifest" ? (
              <pre className="text-xs font-mono text-sky-200 overflow-x-auto max-h-[600px] leading-relaxed select-all">
                {JSON.stringify(result.evidence_manifest, null, 2)}
              </pre>
            ) : (
              <pre className="text-xs font-mono text-emerald-300 overflow-x-auto max-h-[600px] leading-relaxed select-all">
                {result.reproducibility_script}
              </pre>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
          No experiment loaded.
        </div>
      )}
    </div>
  );
}

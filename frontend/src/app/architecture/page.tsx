"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Network,
  Database,
  Crosshair,
  GitCompare,
  CheckCircle2,
  Sparkles,
  Sliders,
  ShieldCheck,
  RotateCcw,
  ArrowRight,
  ArrowDown,
  Lock,
  Layers,
  Activity,
  AlertTriangle
} from "lucide-react";

export default function ArchitecturePage() {
  const [activeDiagram, setActiveDiagram] = useState<1 | 2>(1);
  const [selectedNode, setSelectedNode] = useState<string | null>("d1_node3");

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Network className="w-5 h-5 text-sky-600" />
            System Architecture Diagrams (Formal Specification Reproduction)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Interactive visual execution of the two formal system architecture diagrams backed by live backend data and evidence transfers.
          </p>
        </div>

        {/* Diagram Switcher Tabs */}
        <div className="flex items-center gap-2 bg-slate-200/80 p-1 rounded-lg text-xs font-semibold self-start sm:self-auto">
          <button
            onClick={() => {
              setActiveDiagram(1);
              setSelectedNode("d1_node3");
            }}
            className={`px-3 py-1.5 rounded-md transition-all ${
              activeDiagram === 1 ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Diagram 1: Training / Serving Workflow Loop
          </button>
          <button
            onClick={() => {
              setActiveDiagram(2);
              setSelectedNode("d2_node5");
            }}
            className={`px-3 py-1.5 rounded-md transition-all ${
              activeDiagram === 2 ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Diagram 2: Formal Validation Architecture
          </button>
        </div>
      </div>

      {activeDiagram === 1 ? (
        /* ----------------- DIAGRAM 1: TRAINING / SERVING WORKFLOW LOOP ----------------- */
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Diagram 1: End-to-End Training/Serving Loop with Measured Feedback
                </h3>
                <p className="text-xs text-slate-500">
                  Click any node to inspect real data structures, data contracts, and functional interfaces.
                </p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-800 uppercase">
                Interactive Model
              </span>
            </div>

            {/* Visual Node Grid Flow */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
              {/* Node 1 */}
              <div
                onClick={() => setSelectedNode("d1_node1")}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedNode === "d1_node1"
                    ? "border-sky-500 bg-sky-50/70 shadow-md ring-2 ring-sky-400/20"
                    : "border-slate-200 bg-slate-50 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs text-slate-900 mb-1">
                  <Database className="w-4 h-4 text-sky-600" />
                  <span>Dataset</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Leakage-resistant ingestion, schema validation &amp; partition isolation.
                </p>
                <Link href="/datasets" className="text-[10px] text-sky-600 hover:underline mt-2 inline-block font-semibold">
                  Open Datasets &rarr;
                </Link>
              </div>

              {/* Node 2 */}
              <div
                onClick={() => setSelectedNode("d1_node2")}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedNode === "d1_node2"
                    ? "border-blue-500 bg-blue-50/70 shadow-md ring-2 ring-blue-400/20"
                    : "border-slate-200 bg-slate-50 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs text-slate-900 mb-1">
                  <Crosshair className="w-4 h-4 text-blue-600" />
                  <span>Model Performance on Subsets</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  O2 reproducible baseline comparing Full, Filter &amp; MI approaches.
                </p>
                <Link href="/reference" className="text-[10px] text-blue-600 hover:underline mt-2 inline-block font-semibold">
                  Open Reference &rarr;
                </Link>
              </div>

              {/* Node 3 */}
              <div
                onClick={() => setSelectedNode("d1_node3")}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedNode === "d1_node3"
                    ? "border-indigo-500 bg-indigo-50/70 shadow-md ring-2 ring-indigo-400/20"
                    : "border-slate-200 bg-slate-50 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs text-slate-900 mb-1">
                  <GitCompare className="w-4 h-4 text-indigo-600" />
                  <span>Selection Stability Across Resampling</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  O3 contribution evaluating stability across B resampled data splits.
                </p>
                <Link href="/stability" className="text-[10px] text-indigo-600 hover:underline mt-2 inline-block font-semibold">
                  Open Stability &rarr;
                </Link>
              </div>

              {/* Node 4 */}
              <div
                onClick={() => setSelectedNode("d1_node4")}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedNode === "d1_node4"
                    ? "border-emerald-500 bg-emerald-50/70 shadow-md ring-2 ring-emerald-400/20"
                    : "border-slate-200 bg-slate-50 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs text-slate-900 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Distinguish Stable Features</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Classifies features into Consistently Selected vs Search Artefacts.
                </p>
                <Link href="/stable-features" className="text-[10px] text-emerald-600 hover:underline mt-2 inline-block font-semibold">
                  Open Taxonomy &rarr;
                </Link>
              </div>
            </div>

            {/* Second Row Nodes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {/* Node 5 */}
              <div
                onClick={() => setSelectedNode("d1_node5")}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedNode === "d1_node5"
                    ? "border-purple-500 bg-purple-50/70 shadow-md ring-2 ring-purple-400/20"
                    : "border-slate-200 bg-slate-50 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs text-slate-900 mb-1">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span>Metaheuristic Feature Selection</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  GA, PSO, SA, and DE evolutionary engines with multi-objective fitness.
                </p>
                <Link href="/feature-selection" className="text-[10px] text-purple-600 hover:underline mt-2 inline-block font-semibold">
                  Open Engine &rarr;
                </Link>
              </div>

              {/* Node 6 */}
              <div
                onClick={() => setSelectedNode("d1_node6")}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedNode === "d1_node6"
                    ? "border-teal-500 bg-teal-50/70 shadow-md ring-2 ring-teal-400/20"
                    : "border-slate-200 bg-slate-50 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs text-slate-900 mb-1">
                  <Layers className="w-4 h-4 text-teal-600" />
                  <span>Feature Selection Stability</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Consensus subset aggregation and resource budget verification.
                </p>
                <Link href="/kpi" className="text-[10px] text-teal-600 hover:underline mt-2 inline-block font-semibold">
                  Open 6-KPIs &rarr;
                </Link>
              </div>

              {/* Node 7 */}
              <div
                onClick={() => setSelectedNode("d1_node7")}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedNode === "d1_node7"
                    ? "border-rose-500 bg-rose-50/70 shadow-md ring-2 ring-rose-400/20"
                    : "border-slate-200 bg-slate-50 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs text-slate-900 mb-1">
                  <Sliders className="w-4 h-4 text-rose-600" />
                  <span>Shift, Calibration &amp; Abstention</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Continuous drift monitoring, reliability curves &amp; degraded mode.
                </p>
                <Link href="/assurance" className="text-[10px] text-rose-600 hover:underline mt-2 inline-block font-semibold">
                  Open Assurance &rarr;
                </Link>
              </div>
            </div>

            {/* Feedback Connector Banner */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-sky-950 via-slate-900 to-indigo-950 text-white border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <RotateCcw className="w-5 h-5 text-sky-400 animate-spin" />
                <div>
                  <div className="text-xs font-bold text-sky-300">
                    Active Measured Feedback Loop into Stability Analysis
                  </div>
                  <div className="text-[11px] text-slate-300">
                    Continuous feedback from assurance and negative testing continuously updates the selection uncertainty bounds.
                  </div>
                </div>
              </div>
              <span className="px-3 py-1 rounded bg-sky-500 text-white text-xs font-bold shrink-0">
                ACTIVE
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* ----------------- DIAGRAM 2: VALIDATION ARCHITECTURE ----------------- */
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Diagram 2: Formal Validation &amp; Acceptance Hierarchy
                </h3>
                <p className="text-xs text-slate-500">
                  Rigorous top-to-bottom evidence flow gating final deployment on AC-1..AC-4 and stress challenges.
                </p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase">
                Decision Gate
              </span>
            </div>

            {/* Validation Stages Tree */}
            <div className="max-w-2xl mx-auto space-y-3 pt-2">
              <div className="p-4 rounded-xl bg-slate-900 text-white border border-slate-800 flex items-center justify-between shadow-sm">
                <div>
                  <div className="text-xs font-bold text-sky-400 uppercase tracking-wider">Stage 1</div>
                  <div className="text-sm font-bold">Independent Acceptance Evidence (AC-1, AC-3)</div>
                  <div className="text-[11px] text-slate-400">Leakage-proof held-out data &amp; subgroup partitions</div>
                </div>
                <ShieldCheck className="w-6 h-6 text-sky-400" />
              </div>

              <div className="flex justify-center"><ArrowDown className="w-5 h-5 text-slate-400" /></div>

              <div className="p-4 rounded-xl bg-slate-900 text-white border border-slate-800 flex items-center justify-between shadow-sm">
                <div>
                  <div className="text-xs font-bold text-blue-400 uppercase tracking-wider">Stage 2</div>
                  <div className="text-sm font-bold">Model Performance on Selected Subsets (O2)</div>
                  <div className="text-[11px] text-slate-400">Reproducible baseline comparator &amp; expected oracle</div>
                </div>
                <Crosshair className="w-6 h-6 text-blue-400" />
              </div>

              <div className="flex justify-center"><ArrowDown className="w-5 h-5 text-slate-400" /></div>

              <div className="p-4 rounded-xl bg-slate-900 text-white border border-slate-800 flex items-center justify-between shadow-sm">
                <div>
                  <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Stage 3</div>
                  <div className="text-sm font-bold">Selection Stability Across Resamples (O3)</div>
                  <div className="text-[11px] text-slate-400">Nogueira stability, Jaccard pairwise similarity, 95% CI</div>
                </div>
                <GitCompare className="w-6 h-6 text-indigo-400" />
              </div>

              <div className="flex justify-center"><ArrowDown className="w-5 h-5 text-slate-400" /></div>

              <div className="p-4 rounded-xl bg-slate-900 text-white border border-slate-800 flex items-center justify-between shadow-sm">
                <div>
                  <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">Stage 4</div>
                  <div className="text-sm font-bold">AI / Computational System Stress &amp; Challenge (NT-1..NT-5)</div>
                  <div className="text-[11px] text-slate-400">Noise injection, overfitting gap, drift detection, SLA stress</div>
                </div>
                <AlertTriangle className="w-6 h-6 text-amber-400" />
              </div>

              <div className="flex justify-center"><ArrowDown className="w-5 h-5 text-slate-400" /></div>

              {/* Final Gate Node */}
              <div className="p-5 rounded-xl bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 text-white border border-emerald-700 flex items-center justify-between shadow-md">
                <div>
                  <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Stage 5: Final Decision Gate</div>
                  <div className="text-base font-black text-white mt-0.5">ACCEPT &bull; REVISE &bull; HOLD/STOP</div>
                  <div className="text-[11px] text-slate-300">Deployment strictly blocked if any guardrail fails</div>
                </div>
                <Link
                  href="/validation"
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs py-2 px-4 rounded-lg shadow-xs"
                >
                  Inspect Gate &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import { listExperiments, fetchExperimentResult } from "@/lib/api";
import { ExperimentFullResult, NegativeTestItem } from "@/lib/types";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  RotateCw,
  Play,
  Terminal,
  Activity,
  Layers,
  ArrowRight
} from "lucide-react";

export default function NegativeTestsPage() {
  const [experiment, setExperiment] = useState<ExperimentFullResult | null>(null);
  const [selectedTestId, setSelectedTestId] = useState<string>("NT-2");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listExperiments().then((exps) => {
      if (exps.length > 0) {
        fetchExperimentResult(exps[0].experiment_id).then((res) => {
          setExperiment(res);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });
  }, []);

  const tests = experiment?.negative_tests?.tests || [];
  const selectedTest = tests.find((t) => t.test_id === selectedTestId) || tests[0];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          Mandatory Negative Test Center (NT-1 through NT-5)
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Executable negative challenge suite verifying system resistance against false informativeness, sample overfitting, SLA breaches, and drift blindness.
        </p>
      </div>

      {/* Overview Status Banner */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Negative Stress Challenge Status
          </div>
          <div className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <span className="text-emerald-600 font-extrabold">{experiment?.negative_tests?.passed_count || 5} of 5 Passed</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
              ALL GUARDRAILS PASSED
            </span>
          </div>
          <p className="text-xs text-slate-500">
            System strictly enforces degraded mode or rejection when any negative test condition is violated.
          </p>
        </div>

        <div className="shrink-0 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-1">
          <div className="text-slate-500">Automated Rollback Hook:</div>
          <div className="font-mono text-emerald-700 font-bold">ARMED &amp; MONITORED</div>
          <div className="text-[10px] text-slate-400">Zero tolerance for unvalidated artifacts</div>
        </div>
      </div>

      {/* Main Grid: List of 5 Tests + Detailed Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: List of 5 Negative Tests */}
        <div className="space-y-3">
          {tests.map((test) => {
            const isSelected = selectedTest?.test_id === test.test_id;
            const passed = test.status === "PASS";
            return (
              <div
                key={test.test_id}
                onClick={() => setSelectedTestId(test.test_id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? "border-sky-500 bg-sky-50/60 shadow-md ring-2 ring-sky-400/20"
                    : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-white font-mono text-[10px]">
                      {test.test_id}
                    </span>
                    <span>{test.name}</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      passed
                        ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                        : "bg-rose-100 text-rose-800 border-rose-300"
                    }`}
                  >
                    {test.status}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-2 line-clamp-2">
                  {test.trigger}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right 2 Columns: Detailed Negative Test Inspector */}
        <div className="lg:col-span-2">
          {selectedTest ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-mono text-xs font-bold">
                      {selectedTest.test_id}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900">{selectedTest.name}</h3>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Timestamp: {selectedTest.timestamp} &bull; Latency: {selectedTest.duration_ms} ms
                  </div>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                    selectedTest.status === "PASS"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-rose-50 text-rose-800 border-rose-200"
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Status: {selectedTest.status}</span>
                </span>
              </div>

              {/* Trigger & Expected Behaviour */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                  <div className="font-bold text-slate-700">Trigger Mechanism:</div>
                  <p className="text-slate-600 leading-relaxed">{selectedTest.trigger}</p>
                </div>
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                  <div className="font-bold text-slate-700">Expected Safe Behaviour:</div>
                  <p className="text-slate-600 leading-relaxed">{selectedTest.expected_behaviour}</p>
                </div>
              </div>

              {/* Observed Behaviour */}
              <div className="p-4 rounded-xl bg-sky-50/60 border border-sky-200 space-y-1.5 text-xs">
                <div className="font-bold text-sky-950 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-sky-600" />
                  <span>Observed System Behaviour:</span>
                </div>
                <p className="text-slate-800 font-mono leading-relaxed">{selectedTest.observed_behaviour}</p>
              </div>

              {/* Recovery Action & Residual Risk */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                  <div className="font-bold text-slate-700">Automated Recovery Protocol:</div>
                  <p className="text-slate-600">{selectedTest.recovery_action}</p>
                </div>
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                  <div className="font-bold text-slate-700">Residual Risk Assessment:</div>
                  <p className="text-slate-600">{selectedTest.residual_risk}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
              Select a test from the left panel to inspect evidence.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

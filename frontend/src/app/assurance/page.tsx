"use client";

import React, { useEffect, useState } from "react";
import {
  fetchDatasets,
  fetchShiftAssurance,
  fetchCalibration,
  fetchAbstentionTest,
  triggerRollbackRecovery,
  fetchRecoveryLogs
} from "@/lib/api";
import { DatasetMeta } from "@/lib/types";
import {
  Sliders,
  AlertTriangle,
  ShieldCheck,
  RotateCcw,
  Activity,
  CheckCircle2,
  TrendingDown,
  RefreshCw,
  Layers
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell
} from "recharts";

export default function AssurancePage() {
  const [datasets, setDatasets] = useState<DatasetMeta[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<string>("ionosphere");
  const [shiftMagnitude, setShiftMagnitude] = useState<number>(2.0);
  const [shiftResult, setShiftResult] = useState<any | null>(null);
  const [calibrationResult, setCalibrationResult] = useState<any | null>(null);
  const [abstentionResult, setAbstentionResult] = useState<any | null>(null);
  const [recoveryLogs, setRecoveryLogs] = useState<any[]>([]);
  const [loadingShift, setLoadingShift] = useState(false);
  const [loadingAbstain, setLoadingAbstain] = useState(false);
  const [loadingRollback, setLoadingRollback] = useState(false);

  useEffect(() => {
    fetchDatasets().then((ds) => {
      setDatasets(ds);
      if (ds.length > 0) {
        handleRunShiftTest(ds[0].id, 2.0);
        handleRunCalibrationTest(ds[0].id);
        handleRunAbstentionTest("classification", false);
        loadRecoveryLogs();
      }
    });
  }, []);

  const loadRecoveryLogs = async () => {
    try {
      const logs = await fetchRecoveryLogs();
      setRecoveryLogs(logs);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRunShiftTest = async (dsId = selectedDataset, mag = shiftMagnitude) => {
    try {
      setLoadingShift(true);
      const res = await fetchShiftAssurance(dsId, mag);
      setShiftResult(res);
    } catch (e: any) {
      alert("Shift test failed: " + e.message);
    } finally {
      setLoadingShift(false);
    }
  };

  const handleRunAbstentionTest = async (taskType = "classification", simulatedLowConf = false) => {
    try {
      setLoadingAbstain(true);
      const res = await fetchAbstentionTest(taskType, simulatedLowConf);
      setAbstentionResult(res);
    } catch (e: any) {
      alert("Abstention test failed: " + e.message);
    } finally {
      setLoadingAbstain(false);
    }
  };

  const handleRunCalibrationTest = async (dsId = selectedDataset) => {
    try {
      const res = await fetchCalibration(dsId);
      setCalibrationResult(res);
    } catch (e) {
      console.error(e);
    }
  };

  const handleTriggerRollback = async () => {
    try {
      setLoadingRollback(true);
      await triggerRollbackRecovery("Manual safety verification trigger");
      await loadRecoveryLogs();
      alert("Rollback recovery protocol executed! Restored conservative serving baseline.");
    } catch (e: any) {
      alert("Rollback failed: " + e.message);
    } finally {
      setLoadingRollback(false);
    }
  };

  const shiftChartData = shiftResult?.feature_details?.slice(0, 10).map((f: any) => ({
    name: f.feature_name,
    PSI: f.psi_score,
    Wasserstein: f.wasserstein_distance,
    status: f.drift_status,
  })) || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Sliders className="w-5 h-5 text-sky-600" />
            Shift Detection, Calibration & Selective Abstention Assurance
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Continuous runtime assurance detecting covariate drift, ECE calibration degradation, and enforcing uncertainty-aware abstention.
          </p>
        </div>

        <button
          onClick={handleTriggerRollback}
          disabled={loadingRollback}
          className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold py-2 px-4 rounded-lg flex items-center gap-2 shadow-xs transition-colors self-start sm:self-auto disabled:opacity-50"
        >
          <RotateCcw className="w-4 h-4" />
          <span>{loadingRollback ? "Restoring..." : "Trigger Automated Rollback"}</span>
        </button>
      </div>

      {/* Grid: 1. Covariate Shift Detector + 2. Selective Abstention */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Covariate Shift Detector */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-sky-600" />
              Covariate Shift &amp; PSI Detector
            </h3>
            <span
              className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${
                shiftResult?.requires_abstention
                  ? "bg-rose-100 text-rose-800 border-rose-200"
                  : "bg-emerald-100 text-emerald-800 border-emerald-200"
              }`}
            >
              {shiftResult?.overall_shift_verdict || "MONITORING"}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <select
              value={selectedDataset}
              onChange={(e) => {
                setSelectedDataset(e.target.value);
                handleRunShiftTest(e.target.value, shiftMagnitude);
              }}
              className="bg-slate-50 border border-slate-300 rounded p-1.5 focus:outline-none text-xs"
            >
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>

            <select
              value={shiftMagnitude}
              onChange={(e) => {
                const m = parseFloat(e.target.value);
                setShiftMagnitude(m);
                handleRunShiftTest(selectedDataset, m);
              }}
              className="bg-slate-50 border border-slate-300 rounded p-1.5 focus:outline-none text-xs"
            >
              <option value={0.0}>0.0&sigma; (Clean Unshifted)</option>
              <option value={1.5}>1.5&sigma; (Moderate Shift)</option>
              <option value={2.5}>2.5&sigma; (Severe Drift Challenge)</option>
            </select>

            <button
              onClick={() => handleRunShiftTest()}
              disabled={loadingShift}
              className="px-3 py-1.5 bg-sky-600 text-white rounded text-xs font-semibold hover:bg-sky-500"
            >
              {loadingShift ? "Testing..." : "Test Shift"}
            </button>
          </div>

          {shiftResult && (
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-lg text-center text-xs">
                <div>
                  <div className="text-[10px] text-slate-400">Drifted Features</div>
                  <div className="text-base font-bold text-slate-900 mt-0.5">
                    {shiftResult.drifted_features_count} / {shiftResult.total_features}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Drift Ratio</div>
                  <div className="text-base font-bold text-sky-700 mt-0.5">
                    {shiftResult.drift_percentage.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Abstention Alert</div>
                  <div
                    className={`text-base font-bold mt-0.5 ${
                      shiftResult.requires_abstention ? "text-rose-600" : "text-emerald-600"
                    }`}
                  >
                    {shiftResult.requires_abstention ? "TRIGGERED" : "PASS"}
                  </div>
                </div>
              </div>

              {/* Chart */}
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={shiftChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-25} textAnchor="end" height={40} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="PSI" name="PSI Score" fill="#0284c7" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* 2. Selective Prediction & Uncertainty Abstention */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-sky-600" />
              Selective Prediction &amp; Abstention Gate
            </h3>
            <span
              className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${
                abstentionResult?.is_degraded_mode_triggered
                  ? "bg-amber-100 text-amber-800 border-amber-200"
                  : "bg-emerald-100 text-emerald-800 border-emerald-200"
              }`}
            >
              {abstentionResult?.guardrail_status || "NORMAL SERVING"}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => handleRunAbstentionTest("classification", false)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-semibold text-xs"
            >
              Simulate High Confidence
            </button>
            <button
              onClick={() => handleRunAbstentionTest("classification", true)}
              className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded font-semibold text-xs"
            >
              Simulate Uncertain / OOD Query
            </button>
          </div>

          {abstentionResult && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-lg text-center text-xs">
                <div>
                  <div className="text-[10px] text-slate-400">Total Queries</div>
                  <div className="text-base font-bold text-slate-900 mt-0.5">
                    {abstentionResult.total_predictions}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Abstained Queries</div>
                  <div className="text-base font-bold text-rose-600 mt-0.5">
                    {abstentionResult.abstained_count}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Abstention Rate</div>
                  <div className="text-base font-bold text-slate-900 mt-0.5">
                    {abstentionResult.abstention_percentage.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Avg Confidence</div>
                  <div className="text-base font-bold text-sky-700 mt-0.5">
                    {(abstentionResult.average_confidence * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
                <div className="font-bold text-slate-700">Remediation Policy:</div>
                <p className="text-slate-600 font-mono text-[11px]">{abstentionResult.remediation}</p>
              </div>
            </div>
          )}

          {calibrationResult?.calibration && (
            <div className="p-3 bg-sky-50 rounded-lg border border-sky-200 text-xs space-y-1">
              <div className="flex items-center justify-between font-bold text-sky-950">
                <span>Measured Held-Out Calibration</span>
                <span className={calibrationResult.calibration.passes_target_sla ? "text-emerald-700" : "text-rose-700"}>
                  ECE {calibrationResult.calibration.ece.toFixed(4)}
                </span>
              </div>
              <p className="text-slate-600">
                {calibrationResult.calibration.status} across {calibrationResult.heldout_instances} independent held-out samples.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Recovery Audit Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-sky-600" />
            Automated Recovery &amp; Rollback Audit Log
          </h3>
          <span className="text-xs text-slate-400 font-mono">{recoveryLogs.length} events logged</span>
        </div>

        <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-[300px]">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 text-slate-700 font-semibold sticky top-0">
              <tr>
                <th className="p-3">Recovery ID</th>
                <th className="p-3">Timestamp</th>
                <th className="p-3">Trigger Event</th>
                <th className="p-3">Action Taken</th>
                <th className="p-3">Recovery Time</th>
                <th className="p-3">Risk Decision</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-mono text-[11px]">
              {recoveryLogs.map((log) => (
                <tr key={log.recovery_id} className="hover:bg-slate-50">
                  <td className="p-3 font-bold text-slate-900">{log.recovery_id}</td>
                  <td className="p-3 text-slate-500">{log.timestamp}</td>
                  <td className="p-3 text-rose-700 font-semibold">{log.trigger_event}</td>
                  <td className="p-3 font-sans text-slate-600 max-w-[280px]">{log.action_taken}</td>
                  <td className="p-3 text-slate-900 font-bold">{log.recovery_time_ms} ms</td>
                  <td className="p-3 font-sans font-bold text-amber-700">{log.risk_decision}</td>
                </tr>
              ))}
              {recoveryLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-slate-400 italic font-sans">
                    No recovery rollback events triggered. System operating normally.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

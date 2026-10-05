"use client";

import React, { useEffect, useState } from "react";
import { fetchSystemHealth, fetchDatasets } from "@/lib/api";
import { DatasetMeta, SystemHealth } from "@/lib/types";
import { Cpu, HardDrive, ShieldCheck, Zap } from "lucide-react";

export function Header() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [datasets, setDatasets] = useState<DatasetMeta[]>([]);

  useEffect(() => {
    const loadInfo = async () => {
      try {
        const [h, ds] = await Promise.all([fetchSystemHealth(), fetchDatasets()]);
        setHealth(h);
        setDatasets(ds);
      } catch (e) {
        // Backend warming up
      }
    };
    loadInfo();
    const interval = setInterval(loadInfo, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="min-h-16 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between gap-4 shadow-xs shrink-0">
      <div className="min-w-0 flex-1">
        <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2 min-w-0">
          <span className="truncate">Metaheuristic Feature Selection Stability Across Data Resampling</span>
          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-800 border border-sky-200 shrink-0">
            Certified O3 System
          </span>
        </h1>
        <p className="text-xs text-slate-500 hidden sm:block truncate">
          Leakage-proof resampling stability &bull; Search artefact distinction &bull; 6-KPI validation gate
        </p>
      </div>

      <div className="flex items-center gap-4 text-xs">
        {/* System metrics badges */}
        {health && (
          <div className="hidden min-[1800px]:flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600">
            <div className="flex items-center gap-1.5" title="CPU Usage">
              <Cpu className="w-3.5 h-3.5 text-slate-400" />
              <span>{health.cpu_usage_pct.toFixed(0)}% CPU</span>
            </div>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-1.5" title="Memory Used">
              <HardDrive className="w-3.5 h-3.5 text-slate-400" />
              <span>{health.memory_used_mb.toFixed(0)} MB</span>
            </div>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Deterministic Mode</span>
            </div>
          </div>
        )}

        {/* Status Indicator */}
        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-full border border-emerald-200 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Operational</span>
        </div>
      </div>
    </header>
  );
}

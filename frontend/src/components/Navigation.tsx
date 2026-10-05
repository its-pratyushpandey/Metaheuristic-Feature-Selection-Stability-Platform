"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Database,
  Crosshair,
  Sparkles,
  GitCompare,
  CheckCircle2,
  Repeat,
  ShieldCheck,
  AlertTriangle,
  BarChart3,
  History,
  FileCheck,
  Network,
  Milestone,
  Activity,
  Sliders
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_GROUPS = [
  {
    group: "OVERVIEW",
    items: [
      { name: "Dashboard", href: "/", icon: LayoutDashboard },
      { name: "Datasets & Quality", href: "/datasets", icon: Database },
      { name: "Architecture Flow", href: "/architecture", icon: Network },
    ],
  },
  {
    group: "ML PIPELINE & SEARCH",
    items: [
      { name: "O2 Reference Baseline", href: "/reference", icon: Crosshair },
      { name: "Metaheuristic Selector", href: "/feature-selection", icon: Sparkles },
      { name: "O3 Stability Across Resamples", href: "/stability", icon: GitCompare },
      { name: "Stable vs Artefacts", href: "/stable-features", icon: CheckCircle2 },
      { name: "Training / Serving Loop", href: "/loop", icon: Repeat },
    ],
  },
  {
    group: "ASSURANCE & VALIDATION",
    items: [
      { name: "Validation & Decision Gate", href: "/validation", icon: ShieldCheck },
      { name: "Negative Test Center", href: "/negative-tests", icon: AlertTriangle },
      { name: "6-KPI Performance", href: "/kpi", icon: BarChart3 },
      { name: "Shift, Calib & Abstention", href: "/assurance", icon: Sliders },
    ],
  },
  {
    group: "GOVERNANCE & AUDIT",
    items: [
      { name: "Experiment History", href: "/experiments", icon: History },
      { name: "Evidence & Provenance", href: "/evidence", icon: FileCheck },
      { name: "Capstone Roadmap", href: "/roadmap", icon: Milestone },
      { name: "System Health & Jobs", href: "/system", icon: Activity },
    ],
  },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 min-h-screen border-r border-slate-800">
      {/* Brand */}
      <div className="p-4 border-b border-slate-800 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-sky-500 flex items-center justify-center font-bold text-white shadow-md shadow-sky-500/20">
          FS
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-sky-400">
            Capstone System
          </div>
          <div className="text-sm font-bold text-white truncate max-w-[170px]" title="Stability Across Resampling">
            Metaheuristic FS
          </div>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6 text-xs">
        {NAV_GROUPS.map((group, idx) => (
          <div key={idx} className="space-y-1">
            <div className="px-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              {group.group}
            </div>
            {group.items.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 px-2.5 py-2 rounded-md font-medium transition-colors",
                    isActive
                      ? "bg-sky-600/90 text-white shadow-sm"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  )}
                >
                  <Icon className={cn("w-4 h-4", isActive ? "text-white" : "text-slate-400")} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800 text-[11px] text-slate-400 flex justify-between items-center bg-slate-950/40">
        <div>
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
          <span>Core v2.0</span>
        </div>
        <span className="text-slate-400 font-mono">FastAPI + Next</span>
      </div>
    </aside>
  );
}

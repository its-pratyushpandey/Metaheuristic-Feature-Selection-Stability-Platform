"use client";

import React, { useEffect, useState } from "react";
import { fetchProjectRoadmap } from "@/lib/api";
import {
  Milestone,
  CheckCircle2,
  Calendar,
  Layers,
  Award,
  ShieldCheck,
  ArrowRight,
  FileCheck,
  Sparkles
} from "lucide-react";
import Link from "next/link";

export default function RoadmapPage() {
  const [roadmap, setRoadmap] = useState<any | null>(null);

  useEffect(() => {
    fetchProjectRoadmap().then((r) => setRoadmap(r));
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Milestone className="w-5 h-5 text-sky-600" />
          Two-Semester Capstone Project Engineering Roadmap
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Structured execution plan and milestone deliverables for Capstone Project I (Semester VII) and Capstone Project II (Semester VIII).
        </p>
      </div>

      {roadmap && (
        <div className="space-y-8">
          {/* Semester VII Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-800 flex items-center justify-center font-bold text-sm">
                  I
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{roadmap.semester_vii_capstone_1?.title}</h3>
                  <div className="text-xs text-slate-400">Problem Validation, Engineering Contract &amp; Reproducible Reference Slice</div>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 self-start sm:self-auto">
                100% COMPLETE &bull; APPROVED
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {roadmap.semester_vii_capstone_1?.milestones?.map((m: any) => (
                <div key={m.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 bg-slate-900 text-white rounded">
                      {m.id}
                    </span>
                    <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{m.status}</span>
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900">{m.name}</h4>

                  <ul className="space-y-1.5 text-xs text-slate-600">
                    {m.deliverables?.map((d: string, i: number) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-sky-600 font-bold">&bull;</span>
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="text-[11px] text-slate-400 font-mono pt-2 border-t border-slate-200">
                    Evidence Ref: {m.evidence_ref}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Semester VIII Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold text-sm">
                  II
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{roadmap.semester_viii_capstone_2?.title}</h3>
                  <div className="text-xs text-slate-400">Differentiating Contribution, System Integration &amp; Independent Acceptance</div>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 self-start sm:self-auto">
                100% COMPLETE &bull; FULLY OPERABLE
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {roadmap.semester_viii_capstone_2?.milestones?.map((m: any) => (
                <div key={m.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 bg-indigo-900 text-white rounded">
                      {m.id}
                    </span>
                    <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{m.status}</span>
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900">{m.name}</h4>

                  <ul className="space-y-1.5 text-xs text-slate-600">
                    {m.deliverables?.map((d: string, i: number) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-indigo-600 font-bold">&bull;</span>
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="text-[11px] text-slate-400 font-mono pt-2 border-t border-slate-200">
                    Evidence Ref: {m.evidence_ref}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

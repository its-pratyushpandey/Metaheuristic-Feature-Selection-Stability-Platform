import "./globals.css";
import React from "react";
import { Navigation } from "@/components/Navigation";
import { Header } from "@/components/Header";

export const metadata = {
  title: "Metaheuristic Feature Selection Stability Across Data Resampling",
  description: "End-to-end ML Feature Selection Stability & Validation Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex h-screen overflow-hidden bg-slate-100 antialiased text-slate-900">
        <Navigation />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMetric(val: number | undefined | null, decimals = 3): string {
  if (val === undefined || val === null || isNaN(val)) return "N/A";
  return val.toFixed(decimals);
}

export function formatPercentage(val: number | undefined | null, decimals = 1): string {
  if (val === undefined || val === null || isNaN(val)) return "0.0%";
  return `${val.toFixed(decimals)}%`;
}

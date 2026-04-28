"use client";

import { useScannerStore } from "@/lib/stores/scanner-store";
import { AlertCircle, TrendingUp, X, BellRing } from "lucide-react";
import { useEffect, useState } from "react";
import { format } from "date-fns";

export function EconomicNewsBanner() {
  const { newsWarnings, newsReleases, dismissNewsWarning, dismissNewsRelease } = useScannerStore();
  
  if (newsWarnings.length === 0 && newsReleases.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2 mb-6">
      {/* Warnings */}
      {newsWarnings.map((warning) => (
        <div 
          key={warning.eventId}
          className="relative overflow-hidden rounded-lg border border-red-200 bg-red-50/80 dark:border-red-900/50 dark:bg-red-950/20 p-4 shadow-sm animate-in fade-in slide-in-from-top-2"
        >
          <div className="absolute top-0 left-0 w-1 h-full bg-red-500 animate-pulse" />
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-full bg-red-100 p-1.5 dark:bg-red-900/30">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="font-semibold text-red-800 dark:text-red-300 flex items-center gap-2">
                  {warning.message}
                </h3>
                <div className="mt-1 flex items-center gap-3 text-sm text-red-700/80 dark:text-red-400/80">
                  <span className="font-medium bg-red-100 dark:bg-red-900/40 px-2 py-0.5 rounded text-xs">
                    {warning.currency} ({warning.country})
                  </span>
                  {warning.forecast != null && (
                    <span>Forecast: {warning.forecast}</span>
                  )}
                  {warning.previous != null && (
                    <span>Prev: {warning.previous}</span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => dismissNewsWarning(warning.eventId)}
              className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Dismiss</span>
            </button>
          </div>
        </div>
      ))}

      {/* Releases */}
      {newsReleases.map((release) => (
        <div 
          key={release.eventId}
          className="relative overflow-hidden rounded-lg border border-blue-200 bg-blue-50/80 dark:border-blue-900/50 dark:bg-blue-950/20 p-4 shadow-sm animate-in fade-in slide-in-from-top-2"
        >
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-full bg-blue-100 p-1.5 dark:bg-blue-900/30">
                <BellRing className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-bounce" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-800 dark:text-blue-300 flex items-center gap-2">
                  {release.message}
                </h3>
                <div className="mt-1 flex items-center gap-3 text-sm text-blue-700/80 dark:text-blue-400/80">
                  <span className="font-medium bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 rounded text-xs">
                    {release.currency} ({release.country})
                  </span>
                  {release.forecast != null && (
                    <span>Forecast: {release.forecast}</span>
                  )}
                  {release.previous != null && (
                    <span>Prev: {release.previous}</span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => dismissNewsRelease(release.eventId)}
              className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Dismiss</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

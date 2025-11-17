"use client";

import type React from "react";
import { TrendingUp } from "lucide-react";
import Card from "../../../../../../shared/components/ui/Card";
import Loader from "../../../../../../shared/components/ui/Loader";
import type { ReportSummary } from "../types";

interface ReportSummaryProps {
  summary: ReportSummary;
  isLoading: boolean;
  categoryLabel: string;
  dateRange: { start: string; end: string };
}

export const ReportSummaryComponent: React.FC<ReportSummaryProps> = ({
  summary,
  isLoading,
  categoryLabel,
  dateRange,
}) => {
  return (
    <Card className="w-full">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Report Summary</h2>
          <TrendingUp size={20} className="text-primary" />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Total Records */}
            <div className="pb-4 border-b border-border">
              <p className="text-sm text-muted-foreground mb-1">
                Total Records
              </p>
              <p className="text-3xl font-bold text-primary">
                {summary.totalRecords.toLocaleString()}
              </p>
            </div>

            {/* Active/Inactive Count */}
            {summary.activeCount !== undefined &&
              summary.inactiveCount !== undefined && (
                <div className="grid grid-cols-2 gap-4 pb-4 border-b border-border">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Active</p>
                    <p className="text-2xl font-bold text-green-600">
                      {summary.activeCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Inactive
                    </p>
                    <p className="text-2xl font-bold text-red-600">
                      {summary.inactiveCount}
                    </p>
                  </div>
                </div>
              )}

            {/* Condition Breakdown */}
            {summary.conditionBreakdown &&
              Object.keys(summary.conditionBreakdown).length > 0 && (
                <div className="pb-4 border-b border-border">
                  <p className="text-sm font-medium mb-3">
                    Condition Breakdown
                  </p>
                  <div className="space-y-2">
                    {Object.entries(summary.conditionBreakdown).map(
                      ([condition, count]) => (
                        <div
                          key={condition}
                          className="flex justify-between items-center"
                        >
                          <span className="text-sm text-muted-foreground capitalize">
                            {condition}
                          </span>
                          <span className="font-semibold">{count}</span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

            {/* Location Breakdown */}
            {summary.locationBreakdown &&
              Object.keys(summary.locationBreakdown).length > 0 && (
                <div className="pb-4">
                  <p className="text-sm font-medium mb-3">Top Locations</p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {Object.entries(summary.locationBreakdown)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 5)
                      .map(([location, count]) => (
                        <div
                          key={location}
                          className="flex justify-between items-center"
                        >
                          <span className="text-sm text-muted-foreground truncate">
                            {location}
                          </span>
                          <span className="font-semibold">{count}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

            {/* Report Metadata */}
            <div className="pt-4 border-t border-border space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Category</span>
                <span className="font-medium">{categoryLabel}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Date Range</span>
                <span className="font-medium">
                  {dateRange.start} to {dateRange.end}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Generated</span>
                <span className="font-medium">
                  {new Date().toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

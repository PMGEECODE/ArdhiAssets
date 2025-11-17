"use client";

import React from "react";
import { Download, FileText, Table } from "lucide-react";
import Button from "../../../../../../shared/components/ui/Button";
import Card from "../../../../../../shared/components/ui/Card";
import type { ExportOptions as ExportOptionsType } from "../types";
import { EXPORT_MODES } from "../constants";

interface ReportExportSectionProps {
  onExportPDF: (options: ExportOptionsType) => void;
  onExportCSV: () => void;
  isLoading: boolean;
  categoryLabel: string;
  recordCount: number;
}

export const ReportExportSection: React.FC<ReportExportSectionProps> = ({
  onExportPDF,
  onExportCSV,
  isLoading,
  categoryLabel,
  recordCount,
}) => {
  const [exportMode, setExportMode] = React.useState<
    "summary" | "data" | "full"
  >("full");
  const [includeCharts, setIncludeCharts] = React.useState(true);

  const handlePDFExport = () => {
    onExportPDF({
      format: "pdf",
      mode: exportMode,
      includeCharts,
    });
  };

  return (
    <Card className="w-full">
      <div className="p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Download size={20} className="text-primary" />
          Export Report
        </h2>

        <div className="space-y-4">
          {/* Export Mode Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Export Mode
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {EXPORT_MODES.map((mode) => (
                <button
                  key={mode.value}
                  onClick={() =>
                    setExportMode(mode.value as "summary" | "data" | "full")
                  }
                  className={`px-4 py-2 rounded-md border-2 transition-colors ${
                    exportMode === mode.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-foreground hover:border-primary"
                  }`}
                  aria-pressed={exportMode === mode.value}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          {/* Chart Inclusion Option */}
          <div className="flex items-center gap-3 p-3 bg-muted rounded-md">
            <input
              type="checkbox"
              id="includeCharts"
              checked={includeCharts}
              onChange={(e) => setIncludeCharts(e.target.checked)}
              className="w-4 h-4 cursor-pointer"
              aria-label="Include charts in PDF export"
            />
            <label htmlFor="includeCharts" className="text-sm cursor-pointer">
              Include charts in PDF export
            </label>
          </div>

          {/* Export Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4 border-t border-border">
            <Button
              onClick={handlePDFExport}
              disabled={isLoading || recordCount === 0}
              className="flex items-center justify-center gap-2"
              variant="primary"
            >
              <FileText size={16} />
              Export as PDF
            </Button>
            <Button
              onClick={onExportCSV}
              disabled={isLoading || recordCount === 0}
              className="flex items-center justify-center gap-2"
              variant="secondary"
            >
              <Table size={16} />
              Export as CSV
            </Button>
          </div>

          {/* Info Text */}
          <p className="text-xs text-muted-foreground pt-2">
            {recordCount === 0
              ? "No records to export. Adjust filters to generate data."
              : `Ready to export ${recordCount.toLocaleString()} records from ${categoryLabel}`}
          </p>
        </div>
      </div>
    </Card>
  );
};

/* ──────────────────────────────────────────────────────────────
   2. ExcelUploadSection
   ────────────────────────────────────────────────────────────── */
"use client";

import type React from "react";
import Card from "../../../../../shared/components/ui/Card";

interface ExcelUploadSectionProps {
  isProcessingExcel: boolean;
  isUploading: boolean;
  uploadProgress: number;
  excelData: any[];
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onReviewData: () => void;
  onResetData: () => void;
}

export const ExcelUploadSection: React.FC<ExcelUploadSectionProps> = ({
  isProcessingExcel,
  isUploading,
  uploadProgress,
  excelData,
  fileInputRef,
  onFileUpload,
  onReviewData,
  onResetData,
}) => {
  return (
    <Card className="border-primary-200 dark:border-primary-700 bg-white dark:bg-primary-800">
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-primary-800 dark:text-primary-200 uppercase tracking-wide">
            Upload Excel File
          </h2>
          <div className="flex items-center space-x-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-accent-600 animate-pulse"></div>
            <span className="text-xs text-primary-500 dark:text-primary-400">
              Ready to upload
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {/* File input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={onFileUpload}
            disabled={isProcessingExcel || isUploading}
            className="block w-full text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-accent-50 file:text-accent-700 hover:file:bg-accent-100 disabled:opacity-50 cursor-pointer"
          />

          {/* Progress */}
          {(isProcessingExcel || isUploading) && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-primary-600 dark:text-primary-400">
                <span>
                  {isProcessingExcel ? "Processing Excel…" : "Uploading…"}
                </span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <div className="w-full h-1.5 bg-primary-200 dark:bg-primary-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent-600 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Success / Ready */}
          {excelData.length > 0 && !isProcessingExcel && !isUploading && (
            <div className="flex items-center justify-between p-2.5 bg-success-50 dark:bg-success-950 border border-success-200 dark:border-success-800 rounded-md">
              <div className="flex items-center space-x-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-success-600"></div>
                <span className="text-xs text-success-700 dark:text-success-300">
                  {excelData.length} asset{excelData.length !== 1 ? "s" : ""}{" "}
                  ready
                </span>
              </div>
              <button
                type="button"
                onClick={onReviewData}
                className="text-xs font-medium text-success-700 dark:text-success-300 hover:underline"
              >
                Review →
              </button>
            </div>
          )}

          {/* Hint */}
          <div className="p-2.5 bg-primary-50 dark:bg-primary-900 border border-primary-200 dark:border-primary-700 rounded-md text-xs text-primary-600 dark:text-primary-400">
            <strong className="font-medium">Excel format:</strong> columns like{" "}
            <code className="font-mono">Asset Description</code>,{" "}
            <code className="font-mono">Serial Number</code>, etc.
          </div>
        </div>
      </div>
    </Card>
  );
};

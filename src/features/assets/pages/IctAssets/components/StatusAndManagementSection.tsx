/* ──────────────────────────────────────────────────────────────
   7. StatusAndManagementSection
   ────────────────────────────────────────────────────────────── */
"use client";

import type React from "react";
import Input from "../../../../../shared/components/ui/Input";
import Select from "../../../../../shared/components/ui/Select";
import TextArea from "../../../../../shared/components/ui/TextArea";
import Card from "../../../../../shared/components/ui/Card";
import type { IctAsset } from "../../../../../shared/store/ictAssetsStore";

interface StatusAndManagementSectionProps {
  formData: Partial<IctAsset>;
  onInputChange: (field: keyof IctAsset, value: any) => void;
}

export const StatusAndManagementSection: React.FC<
  StatusAndManagementSectionProps
> = ({ formData, onInputChange }) => {
  return (
    <Card className="border-primary-200 dark:border-primary-700 bg-white dark:bg-primary-800">
      <div className="p-5">
        <h2 className="mb-4 text-sm font-semibold text-primary-800 dark:text-primary-200 uppercase tracking-wide">
          Status & Management
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Asset Condition */}
          <div>
            <label className="block text-xs font-medium text-primary-600 dark:text-primary-400 mb-1">
              Asset Condition
            </label>
            <Select
              value={formData.asset_condition ?? ""}
              onChange={(e) => onInputChange("asset_condition", e.target.value)}
              className="w-full text-sm border-primary-200 dark:border-primary-700 bg-primary-50 dark:bg-primary-900 focus:ring-accent-500 dark:focus:ring-accent-400"
            >
              <option value="">Select condition</option>
              <option value="New">New</option>
              <option value="Good">Good</option>
              <option value="Worn">Worn</option>
              <option value="Needs Replacement">Needs Replacement</option>
            </Select>
          </div>

          {/* Responsible Officer */}
          <div>
            <label className="block text-xs font-medium text-primary-600 dark:text-primary-400 mb-1">
              Responsible Officer
            </label>
            <Input
              value={formData.responsible_officer ?? ""}
              onChange={(e) =>
                onInputChange("responsible_officer", e.target.value)
              }
              placeholder="Enter responsible officer"
              className="w-full text-sm border-primary-200 dark:border-primary-700 bg-primary-50 dark:bg-primary-900 focus:ring-accent-500 dark:focus:ring-accent-400"
            />
          </div>

          {/* Notes – full width */}
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-primary-600 dark:text-primary-400 mb-1">
              Notes
            </label>
            <TextArea
              value={formData.notes ?? ""}
              onChange={(e) => onInputChange("notes", e.target.value)}
              placeholder="Enter any additional notes"
              rows={4}
              className="w-full text-sm border-primary-200 dark:border-primary-700 bg-primary-50 dark:bg-primary-900 focus:ring-accent-500 dark:focus:ring-accent-400"
            />
          </div>
        </div>
      </div>
    </Card>
  );
};

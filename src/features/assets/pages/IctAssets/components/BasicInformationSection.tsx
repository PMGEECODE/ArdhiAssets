/* ──────────────────────────────────────────────────────────────
   1. BasicInformationSection
   ────────────────────────────────────────────────────────────── */
"use client";

import type React from "react";
import TextArea from "../../../../../shared/components/ui/TextArea";
import Input from "../../../../../shared/components/ui/Input";
import Card from "../../../../../shared/components/ui/Card";
import type { IctAsset } from "../../../../../shared/store/ictAssetsStore";

interface BasicInformationSectionProps {
  formData: Partial<IctAsset>;
  validationErrors: Record<string, string>;
  onInputChange: (field: keyof IctAsset, value: any) => void;
}

export const BasicInformationSection: React.FC<
  BasicInformationSectionProps
> = ({ formData, validationErrors, onInputChange }) => {
  return (
    <Card className="border-primary-200 dark:border-primary-700 bg-white dark:bg-primary-800">
      <div className="p-5">
        <h2 className="mb-4 text-sm font-semibold text-primary-800 dark:text-primary-200 uppercase tracking-wide flex items-center">
          <span className="mr-2">Basic Information</span>
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Asset Description – full width */}
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-primary-600 dark:text-primary-400 mb-1">
              Asset Description <span className="text-error-600">*</span>
            </label>
            <TextArea
              value={formData.asset_description ?? ""}
              onChange={(e) =>
                onInputChange("asset_description", e.target.value)
              }
              placeholder="Enter detailed description of the asset"
              rows={3}
              className={`w-full text-sm border-primary-200 dark:border-primary-700 bg-primary-50 dark:bg-primary-900 focus:ring-accent-500 dark:focus:ring-accent-400 ${
                validationErrors.asset_description ? "border-error-500" : ""
              }`}
            />
            {validationErrors.asset_description && (
              <p className="mt-1 text-xs text-error-600">
                {validationErrors.asset_description}
              </p>
            )}
          </div>

          {/* Make / Model */}
          <div>
            <label className="block text-xs font-medium text-primary-600 dark:text-primary-400 mb-1">
              Make / Model
            </label>
            <Input
              value={formData.make_model ?? ""}
              onChange={(e) => onInputChange("make_model", e.target.value)}
              placeholder="Enter make and model"
              className="w-full text-sm border-primary-200 dark:border-primary-700 bg-primary-50 dark:bg-primary-900 focus:ring-accent-500 dark:focus:ring-accent-400"
            />
          </div>

          {/* Financed By */}
          <div>
            <label className="block text-xs font-medium text-primary-600 dark:text-primary-400 mb-1">
              Financed By
            </label>
            <Input
              value={formData.financed_by ?? ""}
              onChange={(e) => onInputChange("financed_by", e.target.value)}
              placeholder="Enter financing source"
              className="w-full text-sm border-primary-200 dark:border-primary-700 bg-primary-50 dark:bg-primary-900 focus:ring-accent-500 dark:focus:ring-accent-400"
            />
          </div>
        </div>
      </div>
    </Card>
  );
};

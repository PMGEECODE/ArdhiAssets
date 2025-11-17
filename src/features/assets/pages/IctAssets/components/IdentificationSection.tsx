/* ──────────────────────────────────────────────────────────────
   4. IdentificationSection
   ────────────────────────────────────────────────────────────── */
"use client";

import type React from "react";
import { RefreshCw, Loader2 } from "lucide-react";
import Input from "../../../../../shared/components/ui/Input";
import Button from "../../../../../shared/components/ui/Button";
import Card from "../../../../../shared/components/ui/Card";
import type { IctAsset } from "../../../../../shared/store/ictAssetsStore";

interface IdentificationSectionProps {
  formData: Partial<IctAsset>;
  validationErrors: Record<string, string>;
  isValidatingSerial: boolean;
  isValidatingTag: boolean;
  isGeneratingTag: boolean;
  isTagGenerationDisabled: boolean;
  onInputChange: (field: keyof IctAsset, value: any) => void;
  onGenerateTag: () => void;
}

export const IdentificationSection: React.FC<IdentificationSectionProps> = ({
  formData,
  validationErrors,
  isValidatingSerial,
  isValidatingTag,
  isGeneratingTag,
  isTagGenerationDisabled,
  onInputChange,
  onGenerateTag,
}) => {
  return (
    <Card className="border-primary-200 dark:border-primary-700 bg-white dark:bg-primary-800">
      <div className="p-5">
        <h2 className="mb-4 text-sm font-semibold text-primary-800 dark:text-primary-200 uppercase tracking-wide">
          Identification
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Serial Number */}
          <div>
            <label className="block text-xs font-medium text-primary-600 dark:text-primary-400 mb-1">
              Serial Number <span className="text-error-600">*</span>
            </label>
            <Input
              value={formData.serial_number ?? ""}
              onChange={(e) => onInputChange("serial_number", e.target.value)}
              placeholder="Enter serial number"
              className={`w-full text-sm border-primary-200 dark:border-primary-700 bg-primary-50 dark:bg-primary-900 focus:ring-accent-500 dark:focus:ring-accent-400 ${
                validationErrors.serial_number ? "border-error-500" : ""
              }`}
            />
            {isValidatingSerial && (
              <p className="mt-1 text-xs text-accent-600 flex items-center">
                <Loader2 size={12} className="mr-1 animate-spin" />
                Validating…
              </p>
            )}
            {validationErrors.serial_number && (
              <p className="mt-1 text-xs text-error-600">
                {validationErrors.serial_number}
              </p>
            )}
          </div>

          {/* Tag Number + Generate */}
          <div>
            <label className="block text-xs font-medium text-primary-600 dark:text-primary-400 mb-1">
              Tag Number <span className="text-error-600">*</span>
            </label>
            <div className="flex gap-2">
              <Input
                value={formData.tag_number ?? ""}
                onChange={(e) => onInputChange("tag_number", e.target.value)}
                placeholder="Auto-generated or manual"
                className={`flex-1 text-sm border-primary-200 dark:border-primary-700 bg-primary-50 dark:bg-primary-900 focus:ring-accent-500 dark:focus:ring-accent-400 ${
                  validationErrors.tag_number ? "border-error-500" : ""
                }`}
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={onGenerateTag}
                disabled={isTagGenerationDisabled}
                className="px-2"
                title={
                  !formData.serial_number?.trim()
                    ? "Serial required"
                    : validationErrors.serial_number
                    ? "Fix serial first"
                    : formData.tag_number
                    ? "Already generated"
                    : "Generate tag"
                }
              >
                {isGeneratingTag ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <RefreshCw size={14} />
                )}
              </Button>
            </div>

            {isValidatingTag && (
              <p className="mt-1 text-xs text-accent-600 flex items-center">
                <Loader2 size={12} className="mr-1 animate-spin" />
                Validating…
              </p>
            )}
            {validationErrors.tag_number && (
              <p className="mt-1 text-xs text-error-600">
                {validationErrors.tag_number}
              </p>
            )}
            {!validationErrors.tag_number && !isValidatingTag && (
              <p className="mt-1 text-xs text-primary-500 dark:text-primary-400">
                Click <RefreshCw size={12} className="inline" /> to
                auto-generate (e.g. Y-4578A)
              </p>
            )}
          </div>

          {/* PV Number */}
          <div>
            <label className="block text-xs font-medium text-primary-600 dark:text-primary-400 mb-1">
              PV Number
            </label>
            <Input
              value={formData.pv_number ?? ""}
              onChange={(e) => onInputChange("pv_number", e.target.value)}
              placeholder="Enter PV number"
              className="w-full text-sm border-primary-200 dark:border-primary-700 bg-primary-50 dark:bg-primary-900 focus:ring-accent-500 dark:focus:ring-accent-400"
            />
          </div>
        </div>
      </div>
    </Card>
  );
};

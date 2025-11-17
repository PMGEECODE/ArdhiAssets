/* ──────────────────────────────────────────────────────────────
   6. LocationInformationSection
   ────────────────────────────────────────────────────────────── */
"use client";

import type React from "react";
import Input from "../../../../../shared/components/ui/Input";
import Card from "../../../../../shared/components/ui/Card";
import type { IctAsset } from "../../../../../shared/store/ictAssetsStore";

interface LocationInformationSectionProps {
  formData: Partial<IctAsset>;
  onInputChange: (field: keyof IctAsset, value: any) => void;
}

export const LocationInformationSection: React.FC<
  LocationInformationSectionProps
> = ({ formData, onInputChange }) => {
  return (
    <Card className="border-primary-200 dark:border-primary-700 bg-white dark:bg-primary-800">
      <div className="p-5">
        <h2 className="mb-4 text-sm font-semibold text-primary-800 dark:text-primary-200 uppercase tracking-wide">
          Location Information
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-primary-600 dark:text-primary-400 mb-1">
              Original Location
            </label>
            <Input
              value={formData.original_location ?? ""}
              onChange={(e) =>
                onInputChange("original_location", e.target.value)
              }
              placeholder="Enter original location"
              className="w-full text-sm border-primary-200 dark:border-primary-700 bg-primary-50 dark:bg-primary-900 focus:ring-accent-500 dark:focus:ring-accent-400"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-primary-600 dark:text-primary-400 mb-1">
              Current Location
            </label>
            <Input
              value={formData.current_location ?? ""}
              onChange={(e) =>
                onInputChange("current_location", e.target.value)
              }
              placeholder="Enter current location"
              className="w-full text-sm border-primary-200 dark:border-primary-700 bg-primary-50 dark:bg-primary-900 focus:ring-accent-500 dark:focus:ring-accent-400"
            />
          </div>
        </div>
      </div>
    </Card>
  );
};

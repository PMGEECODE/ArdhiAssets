/* ──────────────────────────────────────────────────────────────
   5. ImportantDatesSection
   ────────────────────────────────────────────────────────────── */
"use client";

import type React from "react";
import Input from "../../../../../shared/components/ui/Input";
import Card from "../../../../../shared/components/ui/Card";
import type { IctAsset } from "../../../../../shared/store/ictAssetsStore";

interface ImportantDatesSectionProps {
  formData: Partial<IctAsset>;
  onInputChange: (field: keyof IctAsset, value: any) => void;
}

export const ImportantDatesSection: React.FC<ImportantDatesSectionProps> = ({
  formData,
  onInputChange,
}) => {
  return (
    <Card className="border-primary-200 dark:border-primary-700 bg-white dark:bg-primary-800">
      <div className="p-5">
        <h2 className="mb-4 text-sm font-semibold text-primary-800 dark:text-primary-200 uppercase tracking-wide">
          Important Dates
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            {
              label: "Delivery / Installation",
              field: "delivery_installation_date",
            },
            { label: "Replacement", field: "replacement_date" },
            { label: "Disposal", field: "disposal_date" },
          ].map(({ label, field }) => (
            <div key={field}>
              <label className="block text-xs font-medium text-primary-600 dark:text-primary-400 mb-1">
                {label}
              </label>
              <Input
                type="date"
                value={formData[field as keyof IctAsset] ?? ""}
                onChange={(e) =>
                  onInputChange(field as keyof IctAsset, e.target.value || null)
                }
                className="w-full text-sm border-primary-200 dark:border-primary-700 bg-primary-50 dark:bg-primary-900 focus:ring-accent-500 dark:focus:ring-accent-400"
              />
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};

"use client";

import type React from "react";
import { X, Save, Loader2 } from "lucide-react";
import Button from "../../../../../shared/components/ui/Button";

interface FormActionsProps {
  isEditing: boolean;
  isLoading: boolean;
  isSubmitDisabled: boolean;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const FormActions: React.FC<FormActionsProps> = ({
  isEditing,
  isLoading,
  isSubmitDisabled,
  onCancel,
  onSubmit,
}) => {
  return (
    <div className="flex justify-end space-x-3 pt-6 border-t border-primary-200 dark:border-primary-700">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={onCancel}
        className="px-4"
        leftIcon={<X size={16} />}
      >
        Cancel
      </Button>
      <Button
        type="submit"
        variant="success"
        size="sm"
        onClick={onSubmit}
        disabled={isSubmitDisabled || isLoading}
        isLoading={isLoading}
        className="px-5"
        leftIcon={
          isLoading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Save size={16} />
          )
        }
      >
        {isEditing ? "Update Asset" : "Create Asset"}
      </Button>
    </div>
  );
};

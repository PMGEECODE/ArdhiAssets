"use client";

import type React from "react";
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "axios";

import {
  useIctAssetsStore,
  type IctAsset,
} from "../../../../shared/store/ictAssetsStore";
import ConfirmationModal from "../../../../shared/components/ui/ConfirmationPopup";
import ConfirmIctAssetsExcelModal from "../../../../shared/components/ui/ConfirmIctAssetsExcelModal";

// Styled Components (Themed)
import { PageHeader } from "./components/PageHeader";
import { BasicInformationSection } from "./components/BasicInformationSection";
import { IdentificationSection } from "./components/IdentificationSection";
import { LocationInformationSection } from "./components/LocationInformationSection";
import { FinancialInformationSection } from "./components/FinancialInformationSection";
import { ImportantDatesSection } from "./components/ImportantDatesSection";
import { StatusAndManagementSection } from "./components/StatusAndManagementSection";
import { ExcelUploadSection } from "./components/ExcelUploadSection";
import { FormActions } from "./components/FormActions";

// Custom Hooks
import { useFormValidation } from "./hooks/useFormValidation";
import { useExcelUpload } from "./hooks/useExcelUpload";

interface ValidationErrors {
  [key: string]: string;
}

const IctAssetsForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id && id !== "new");

  const { createIctAsset, updateIctAsset, getIctAssetById, isLoading } =
    useIctAssetsStore();

  const {
    validationErrors,
    setValidationErrors,
    isValidatingSerial,
    isValidatingTag,
    validateSerialNumber,
    validateTagNumber,
    validateForm,
    clearFieldError,
  } = useFormValidation(isEditing, id);

  const {
    excelData,
    showExcelModal,
    isUploading,
    uploadProgress,
    isProcessingExcel,
    fileInputRef,
    handleFileUpload,
    handleExcelSubmit,
    setShowExcelModal,
    resetExcelData,
  } = useExcelUpload();

  const [isGeneratingTag, setIsGeneratingTag] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const [formData, setFormData] = useState<Partial<IctAsset>>({
    asset_description: "",
    financed_by: "",
    serial_number: "",
    tag_number: "",
    make_model: "",
    delivery_installation_date: "",
    pv_number: "",
    original_location: "",
    current_location: "",
    replacement_date: "",
    purchase_amount: undefined,
    depreciation_rate: undefined,
    annual_depreciation: undefined,
    accumulated_depreciation: undefined,
    net_book_value: undefined,
    disposal_date: "",
    disposal_value: "",
    responsible_officer: "",
    asset_condition: "New",
    notes: "",
    asset_type: undefined,
    specifications: undefined,
    software_licenses: undefined,
    ip_address: undefined,
    mac_address: undefined,
    operating_system: undefined,
    previous_owner: undefined,
    transfer_department: undefined,
    transfer_location: undefined,
    transfer_room_or_floor: undefined,
    transfer_reason: undefined,
  });

  useEffect(() => {
    if (isEditing && id) {
      loadIctAsset();
    }
  }, [id, isEditing]);

  const loadIctAsset = async () => {
    if (!id) return;

    try {
      const item = await getIctAssetById(id);
      if (item) setFormData(item);
    } catch (error) {
      toast.error("Failed to load ICT asset");
      navigate("/categories/ict-assets");
    }
  };

  const handleInputChange = useCallback(
    (field: keyof IctAsset, value: any) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      clearFieldError(field);

      if (field === "serial_number" && typeof value === "string") {
        const timeoutId = setTimeout(() => {
          validateSerialNumber(value);
        }, 500);
        return () => clearTimeout(timeoutId);
      }

      if (field === "tag_number" && typeof value === "string") {
        const timeoutId = setTimeout(() => {
          validateTagNumber(value);
        }, 500);
        return () => clearTimeout(timeoutId);
      }
    },
    [clearFieldError, validateSerialNumber, validateTagNumber]
  );

  const generateTagNumber = async () => {
    if (!formData.serial_number?.trim()) {
      toast.error("Please provide a serial number before generating a tag");
      return;
    }

    if (validationErrors.serial_number) {
      toast.error(
        "Please resolve serial number validation errors before generating a tag"
      );
      return;
    }

    if (formData.tag_number?.trim()) {
      toast.error("A tag has already been generated for this asset");
      return;
    }

    setIsGeneratingTag(true);
    clearFieldError("tag_number");

    try {
      const response = await axios.post(
        `${
          import.meta.env.VITE_API_URL || "http://localhost:3001"
        }/ict-assets/generate-tag`,
        { serial_number: formData.serial_number }
      );

      const data = response.data;
      handleInputChange("tag_number", data.tag_number);
      toast.success(data.message || "Tag number generated successfully");
    } catch (error: any) {
      console.error("Tag generation error:", error);
      const errorMessage =
        error.response?.data?.detail ||
        error.message ||
        "Failed to generate tag number";
      toast.error(errorMessage);

      if (error.response?.status === 401) {
        navigate("/login");
      }
    } finally {
      setIsGeneratingTag(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors = validateForm(formData);

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      toast.error("Please fix the validation errors before submitting");
      return;
    }

    if (Object.values(validationErrors).some((error) => error !== "")) {
      toast.error("Please fix the validation errors before submitting");
      return;
    }

    setShowConfirmation(true);
  };

  const handleConfirmSubmit = async () => {
    try {
      const cleanedFormData = {
        ...formData,
        delivery_installation_date: formData.delivery_installation_date || null,
        replacement_date: formData.replacement_date || null,
        disposal_date: formData.disposal_date || null,
      };

      if (isEditing && id) {
        await updateIctAsset(id, cleanedFormData);
        toast.success("ICT asset updated successfully");
      } else {
        await createIctAsset(
          cleanedFormData as Omit<IctAsset, "id" | "created_at" | "updated_at">
        );
        toast.success("ICT asset created successfully");
      }

      setShowConfirmation(false);
      navigate("/categories/ict-assets");
    } catch (error) {
      toast.error(
        isEditing ? "Failed to update ICT asset" : "Failed to create ICT asset"
      );
      setShowConfirmation(false);
    }
  };

  const handleCancelConfirmation = () => {
    setShowConfirmation(false);
  };

  const handleExcelSubmitWrapper = async (data_to_upload?: any[]) => {
    const result = await handleExcelSubmit(data_to_upload);
    if (result.success) {
      setTimeout(() => {
        resetExcelData();
        navigate("/categories/ict-assets");
      }, 1500);
    }
  };

  const hasValidationErrors = Object.values(validationErrors).some(
    (error) => error !== ""
  );
  const isTagGenerationDisabled =
    isGeneratingTag ||
    !formData.serial_number?.trim() ||
    Boolean(validationErrors.serial_number) ||
    Boolean(formData.tag_number);
  const isSubmitDisabled =
    isLoading || hasValidationErrors || isValidatingSerial || isValidatingTag;

  return (
    <div className="min-h-screen bg-primary-50 dark:bg-primary-900 py-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <PageHeader isEditing={isEditing} />

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <BasicInformationSection
            formData={formData}
            validationErrors={validationErrors}
            onInputChange={handleInputChange}
          />

          {/* Identification */}
          <IdentificationSection
            formData={formData}
            validationErrors={validationErrors}
            isValidatingSerial={isValidatingSerial}
            isValidatingTag={isValidatingTag}
            isGeneratingTag={isGeneratingTag}
            isTagGenerationDisabled={isTagGenerationDisabled}
            onInputChange={handleInputChange}
            onGenerateTag={generateTagNumber}
          />

          {/* Location Information */}
          <LocationInformationSection
            formData={formData}
            onInputChange={handleInputChange}
          />

          {/* Financial Information */}
          <FinancialInformationSection
            formData={formData}
            onInputChange={handleInputChange}
          />

          {/* Important Dates */}
          <ImportantDatesSection
            formData={formData}
            onInputChange={handleInputChange}
          />

          {/* Status and Management */}
          <StatusAndManagementSection
            formData={formData}
            onInputChange={handleInputChange}
          />

          {/* Excel Upload Section */}
          <ExcelUploadSection
            isProcessingExcel={isProcessingExcel}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
            excelData={excelData}
            fileInputRef={fileInputRef}
            onFileUpload={handleFileUpload}
            onReviewData={() => setShowExcelModal(true)}
            onResetData={resetExcelData}
          />

          {/* Form Actions */}
          <FormActions
            isEditing={isEditing}
            isLoading={isLoading}
            isSubmitDisabled={isSubmitDisabled}
            onCancel={() => navigate("/categories/ict-assets")}
            onSubmit={handleSubmit}
          />
        </form>

        {/* Confirmation Modal */}
        <ConfirmationModal
          isOpen={showConfirmation}
          onClose={handleCancelConfirmation}
          onConfirm={handleConfirmSubmit}
          title={isEditing ? "Confirm Asset Update" : "Confirm Asset Creation"}
          message={
            isEditing
              ? `Are you sure you want to update this ICT asset? This action will modify the existing asset record with the current form data.`
              : `Are you sure you want to create this ICT asset? This action will add a new asset record to the system.`
          }
          confirmText={isEditing ? "Update Asset" : "Create Asset"}
          cancelText="Cancel"
          isLoading={isLoading}
        />

        {/* Excel Confirmation Modal */}
        <ConfirmIctAssetsExcelModal
          show={showExcelModal}
          data={excelData}
          onConfirm={handleExcelSubmitWrapper}
          onCancel={resetExcelData}
          isLoading={isUploading}
        />
      </div>
    </div>
  );
};

export default IctAssetsForm;

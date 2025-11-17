"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Sofa,
  Save,
  X,
  ChevronRight,
  Home,
  FolderOpen,
  RefreshCw,
  Calculator,
} from "lucide-react";
import axios from "axios";

import {
  useFurnitureEquipmentStore,
  type FurnitureEquipment,
} from "../../../../shared/store/furnitureEquipmentStore";
import Button from "../../../../shared/components/ui/Button";
import Card from "../../../../shared/components/ui/Card";
import Input from "../../../../shared/components/ui/Input";
import Select from "../../../../shared/components/ui/Select";
import TextArea from "../../../../shared/components/ui/TextArea";

interface ValidationErrors {
  [key: string]: string;
}

const FurnitureEquipmentForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id && id !== "new");

  const {
    createFurnitureEquipment,
    updateFurnitureEquipment,
    getFurnitureEquipmentById,
    isLoading,
  } = useFurnitureEquipmentStore();

  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    {}
  );
  const [isGeneratingTag, setIsGeneratingTag] = useState(false);
  const [isValidatingTag, setIsValidatingTag] = useState(false);
  const [autoCalculate, setAutoCalculate] = useState(true);

  const [formData, setFormData] = useState<Partial<FurnitureEquipment>>({
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
    disposal_value: undefined,
    responsible_officer: "",
    asset_condition: "New",
    notes: "",
  });

  useEffect(() => {
    if (isEditing && id) {
      loadFurnitureEquipment();
    }
  }, [id, isEditing]);

  const loadFurnitureEquipment = async () => {
    if (!id) return;

    try {
      const furnitureEquipment = await getFurnitureEquipmentById(id);
      if (furnitureEquipment) {
        setFormData(furnitureEquipment);
      }
    } catch (error) {
      toast.error("Failed to load furniture equipment");
      navigate("/categories/furniture-equipment");
    }
  };

  const generateTagNumber = async () => {
    setIsGeneratingTag(true);
    setValidationErrors((prev) => ({ ...prev, tag_number: "" }));

    try {
      const response = await axios.post(
        `${
          import.meta.env.VITE_API_URL || "http://localhost:3001"
        }/furniture-equipment/generate-tag`
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

  const validateTagNumber = async (tagNumber: string) => {
    if (!tagNumber.trim()) {
      setValidationErrors((prev) => ({ ...prev, tag_number: "" }));
      return;
    }

    setIsValidatingTag(true);

    try {
      const response = await axios.post(
        `${
          import.meta.env.VITE_API_URL || "http://localhost:3001"
        }/furniture-equipment/validate-tag${
          isEditing ? `?asset_id=${id}` : ""
        }`,
        { tag_number: tagNumber }
      );

      const data = response.data;

      if (!data.valid) {
        setValidationErrors((prev) => ({ ...prev, tag_number: data.message }));
      } else {
        setValidationErrors((prev) => ({ ...prev, tag_number: "" }));
      }
    } catch (error: any) {
      console.error("Tag validation error:", error);
      const errorMessage =
        error.response?.data?.detail ||
        error.message ||
        "Failed to validate tag number";
      setValidationErrors((prev) => ({ ...prev, tag_number: errorMessage }));

      if (error.response?.status === 401) {
        navigate("/login");
      }
    } finally {
      setIsValidatingTag(false);
    }
  };

  const handleInputChange = (field: keyof FurnitureEquipment, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (
      autoCalculate &&
      [
        "annual_depreciation",
        "accumulated_depreciation",
        "net_book_value",
      ].includes(field)
    ) {
      setAutoCalculate(false);
      toast.info(
        "Auto-calculation disabled. Click 'Recalculate' to re-enable."
      );
    }

    if (validationErrors[field]) {
      setValidationErrors((prev) => ({ ...prev, [field]: "" }));
    }

    if (field === "tag_number" && typeof value === "string") {
      const timeoutId = setTimeout(() => {
        validateTagNumber(value);
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  };

  const handleRecalculate = () => {
    setAutoCalculate(true);
    toast.success("Auto-calculation re-enabled");
  };

  useEffect(() => {
    if (
      autoCalculate &&
      formData.purchase_amount &&
      formData.depreciation_rate
    ) {
      const annualDep =
        (formData.purchase_amount * formData.depreciation_rate) / 100;
      setFormData((prev) => ({
        ...prev,
        annual_depreciation: Number(annualDep.toFixed(2)),
      }));
    }
  }, [formData.purchase_amount, formData.depreciation_rate, autoCalculate]);

  useEffect(() => {
    if (
      autoCalculate &&
      formData.annual_depreciation &&
      formData.delivery_installation_date
    ) {
      const deliveryDate = new Date(formData.delivery_installation_date);
      const endDate = formData.disposal_date
        ? new Date(formData.disposal_date)
        : formData.replacement_date
        ? new Date(formData.replacement_date)
        : new Date();

      const daysInUse = Math.max(
        0,
        Math.floor(
          (endDate.getTime() - deliveryDate.getTime()) / (1000 * 60 * 60 * 24)
        )
      );
      const yearsInUse = daysInUse / 365;

      const accumulatedDep = formData.annual_depreciation * yearsInUse;

      setFormData((prev) => ({
        ...prev,
        accumulated_depreciation: Number(accumulatedDep.toFixed(2)),
      }));
    }
  }, [
    formData.annual_depreciation,
    formData.delivery_installation_date,
    formData.disposal_date,
    formData.replacement_date,
    autoCalculate,
  ]);

  useEffect(() => {
    if (
      autoCalculate &&
      formData.purchase_amount !== undefined &&
      formData.accumulated_depreciation !== undefined
    ) {
      const nbv = Math.max(
        0,
        formData.purchase_amount - formData.accumulated_depreciation
      );
      setFormData((prev) => ({
        ...prev,
        net_book_value: Number(nbv.toFixed(2)),
      }));
    }
  }, [
    formData.purchase_amount,
    formData.accumulated_depreciation,
    autoCalculate,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: ValidationErrors = {};

    if (!formData.asset_description?.trim()) {
      errors.asset_description = "Asset description is required";
    }

    if (!formData.serial_number?.trim()) {
      errors.serial_number = "Serial number is required";
    }

    if (!formData.tag_number?.trim()) {
      errors.tag_number = "Tag number is required";
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      toast.error("Please fix the validation errors before submitting");
      return;
    }

    if (Object.values(validationErrors).some((error) => error !== "")) {
      toast.error("Please fix the validation errors before submitting");
      return;
    }

    try {
      const cleanedFormData = {
        ...formData,
        delivery_installation_date: formData.delivery_installation_date || null,
        replacement_date: formData.replacement_date || null,
        disposal_date: formData.disposal_date || null,
      };

      if (isEditing && id) {
        await updateFurnitureEquipment(id, cleanedFormData);
        toast.success("Furniture equipment updated successfully");
      } else {
        await createFurnitureEquipment(
          cleanedFormData as Omit<
            FurnitureEquipment,
            "id" | "created_at" | "updated_at"
          >
        );
        toast.success("Furniture equipment created successfully");
      }

      navigate("/categories/furniture-equipment");
    } catch (error) {
      toast.error(
        isEditing
          ? "Failed to update furniture equipment"
          : "Failed to create furniture equipment"
      );
    }
  };

  return (
    <div className="space-y-6">
      <nav className="flex items-center mb-6 space-x-2 text-sm text-gray-600">
        <Link
          to="/"
          className="flex items-center transition-colors hover:text-blue-600"
        >
          <Home size={16} className="mr-1" />
          Home
        </Link>
        <ChevronRight size={16} />
        <Link
          to="/asset-categories"
          className="flex items-center transition-colors hover:text-blue-600"
        >
          <FolderOpen size={16} className="mr-1" />
          Asset Categories
        </Link>
        <ChevronRight size={16} />
        <Link
          to="/categories/furniture-equipment"
          className="transition-colors hover:text-blue-600"
        >
          Furniture & Fittings Equipment
        </Link>
        <ChevronRight size={16} />
        <span className="flex items-center font-medium text-gray-900">
          <Sofa size={16} className="mr-1" />
          {isEditing ? "Edit Equipment" : "Add Equipment"}
        </span>
      </nav>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {isEditing ? "Edit Equipment" : "Add Equipment"}
          </h1>
          <p className="mt-2 text-gray-600">
            {isEditing
              ? "Update furniture equipment information"
              : "Create a new furniture equipment entry"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <div className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Basic Information
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Asset Description <span className="text-red-500">*</span>
                </label>
                <TextArea
                  value={formData.asset_description || ""}
                  onChange={(e) =>
                    handleInputChange("asset_description", e.target.value)
                  }
                  placeholder="Enter detailed description of the asset"
                  className={
                    validationErrors.asset_description ? "border-red-500" : ""
                  }
                />
                {validationErrors.asset_description && (
                  <p className="mt-1 text-sm text-red-600">
                    {validationErrors.asset_description}
                  </p>
                )}
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Make/Model
                </label>
                <Input
                  value={formData.make_model || ""}
                  onChange={(e) =>
                    handleInputChange("make_model", e.target.value)
                  }
                  placeholder="Enter make and model"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Financed By
                </label>
                <Input
                  value={formData.financed_by || ""}
                  onChange={(e) =>
                    handleInputChange("financed_by", e.target.value)
                  }
                  placeholder="Enter financing source"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Identification */}
        <Card>
          <div className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Identification
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Serial Number <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formData.serial_number || ""}
                  onChange={(e) =>
                    handleInputChange("serial_number", e.target.value)
                  }
                  placeholder="Enter serial number"
                  className={
                    validationErrors.serial_number ? "border-red-500" : ""
                  }
                />
                {validationErrors.serial_number && (
                  <p className="mt-1 text-sm text-red-600">
                    {validationErrors.serial_number}
                  </p>
                )}
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Tag Number <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      value={formData.tag_number || ""}
                      onChange={(e) =>
                        handleInputChange("tag_number", e.target.value)
                      }
                      placeholder="Enter tag number or generate one"
                      className={
                        validationErrors.tag_number ? "border-red-500" : ""
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={generateTagNumber}
                    disabled={isGeneratingTag}
                    className="px-3 py-2 min-w-0 hover:bg-gray-100 border border-gray-300 rounded-md transition-colors disabled:opacity-50"
                    title="Generate tag number from backend"
                  >
                    <RefreshCw
                      size={16}
                      className={`text-gray-600 ${
                        isGeneratingTag ? "animate-spin" : ""
                      }`}
                    />
                  </Button>
                </div>
                <div className="mt-1">
                  {isValidatingTag && (
                    <p className="text-xs text-blue-600">
                      Validating tag number...
                    </p>
                  )}
                  {!isValidatingTag && !validationErrors.tag_number && (
                    <p className="text-xs text-gray-500">
                      Click the refresh button to auto-generate a unique tag
                      number (Format: F-4578A)
                    </p>
                  )}
                  {validationErrors.tag_number && (
                    <p className="text-sm text-red-600">
                      {validationErrors.tag_number}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  PV Number
                </label>
                <Input
                  value={formData.pv_number || ""}
                  onChange={(e) =>
                    handleInputChange("pv_number", e.target.value)
                  }
                  placeholder="Enter PV number"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Location Information */}
        <Card>
          <div className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Location Information
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Original Location
                </label>
                <Input
                  value={formData.original_location || ""}
                  onChange={(e) =>
                    handleInputChange("original_location", e.target.value)
                  }
                  placeholder="Enter original location"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Current Location
                </label>
                <Input
                  value={formData.current_location || ""}
                  onChange={(e) =>
                    handleInputChange("current_location", e.target.value)
                  }
                  placeholder="Enter current location"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Financial Information */}
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Financial Information
              </h2>
              <div className="flex items-center gap-2">
                {autoCalculate ? (
                  <span className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full">
                    <Calculator size={14} />
                    Auto-calculating
                  </span>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-amber-700 bg-amber-100 rounded-full">
                      Manual override
                    </span>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleRecalculate}
                      className="px-3 py-1 text-xs"
                    >
                      Recalculate
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {autoCalculate && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Auto-calculation enabled:</strong> Annual
                  depreciation, accumulated depreciation, and net book value are
                  calculated automatically based on purchase amount,
                  depreciation rate, and delivery date. Edit any calculated
                  field to override.
                </p>
              </div>
            )}

            {!autoCalculate && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  <strong>Manual mode:</strong> You've edited a calculated
                  field. Click "Recalculate" to restore automatic calculations.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Purchase Amount
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.purchase_amount || ""}
                  onChange={(e) =>
                    handleInputChange(
                      "purchase_amount",
                      Number.parseFloat(e.target.value) || undefined
                    )
                  }
                  placeholder="Enter purchase amount"
                  className={autoCalculate ? "ring-2 ring-blue-200" : ""}
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Depreciation Rate (%)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.depreciation_rate || ""}
                  onChange={(e) =>
                    handleInputChange(
                      "depreciation_rate",
                      Number.parseFloat(e.target.value) || undefined
                    )
                  }
                  placeholder="Enter depreciation rate"
                  className={autoCalculate ? "ring-2 ring-blue-200" : ""}
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Annual Depreciation{" "}
                  {autoCalculate && (
                    <span className="text-xs text-green-600">(auto)</span>
                  )}
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.annual_depreciation || ""}
                  onChange={(e) =>
                    handleInputChange(
                      "annual_depreciation",
                      Number.parseFloat(e.target.value) || undefined
                    )
                  }
                  placeholder="Enter annual depreciation"
                  className={autoCalculate ? "bg-green-50" : ""}
                  readOnly={autoCalculate}
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Accumulated Depreciation{" "}
                  {autoCalculate && (
                    <span className="text-xs text-green-600">(auto)</span>
                  )}
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.accumulated_depreciation || ""}
                  onChange={(e) =>
                    handleInputChange(
                      "accumulated_depreciation",
                      Number.parseFloat(e.target.value) || undefined
                    )
                  }
                  placeholder="Enter accumulated depreciation"
                  className={autoCalculate ? "bg-green-50" : ""}
                  readOnly={autoCalculate}
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Net Book Value{" "}
                  {autoCalculate && (
                    <span className="text-xs text-green-600">(auto)</span>
                  )}
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.net_book_value || ""}
                  onChange={(e) =>
                    handleInputChange(
                      "net_book_value",
                      Number.parseFloat(e.target.value) || undefined
                    )
                  }
                  placeholder="Enter net book value"
                  className={autoCalculate ? "bg-green-50" : ""}
                  readOnly={autoCalculate}
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Disposal Value
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.disposal_value || ""}
                  onChange={(e) =>
                    handleInputChange(
                      "disposal_value",
                      Number.parseFloat(e.target.value) || undefined
                    )
                  }
                  placeholder="Enter disposal value"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Important Dates */}
        <Card>
          <div className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Important Dates
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Delivery/Installation Date
                </label>
                <Input
                  type="date"
                  value={formData.delivery_installation_date || ""}
                  onChange={(e) =>
                    handleInputChange(
                      "delivery_installation_date",
                      e.target.value
                    )
                  }
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Replacement Date
                </label>
                <Input
                  type="date"
                  value={formData.replacement_date || ""}
                  onChange={(e) =>
                    handleInputChange("replacement_date", e.target.value)
                  }
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Disposal Date
                </label>
                <Input
                  type="date"
                  value={formData.disposal_date || ""}
                  onChange={(e) =>
                    handleInputChange("disposal_date", e.target.value)
                  }
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Status and Management */}
        <Card>
          <div className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Status and Management
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Asset Condition
                </label>
                <Select
                  value={formData.asset_condition || ""}
                  onChange={(e) =>
                    handleInputChange("asset_condition", e.target.value)
                  }
                >
                  <option value="">Select condition</option>
                  <option value="New">New</option>
                  <option value="Good">Good</option>
                  <option value="Worn">Worn</option>
                  <option value="Needs Replacement">Needs Replacement</option>
                </Select>
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Responsible Officer
                </label>
                <Input
                  value={formData.responsible_officer || ""}
                  onChange={(e) =>
                    handleInputChange("responsible_officer", e.target.value)
                  }
                  placeholder="Enter responsible officer"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Notes
                </label>
                <TextArea
                  value={formData.notes || ""}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  placeholder="Enter any additional notes"
                  rows={4}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Form Actions */}
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate("/categories/furniture-equipment")}
            leftIcon={<X size={16} />}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="bg-amber-600 hover:bg-amber-700"
            leftIcon={<Save size={16} />}
            isLoading={isLoading}
          >
            {isEditing ? "Update Equipment" : "Create Equipment"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default FurnitureEquipmentForm;

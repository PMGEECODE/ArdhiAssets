"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Settings,
  Save,
  X,
  ChevronRight,
  Home,
  FolderOpen,
  RefreshCw,
  Calculator,
} from "lucide-react";
import axios from "axios"; // Added axios import for API calls

import {
  usePlantMachineryStore,
  type PlantMachinery,
} from "../../../../shared/store/plantMachineryStore";
import Button from "../../../../shared/components/ui/Button";
import Card from "../../../../shared/components/ui/Card";
import Input from "../../../../shared/components/ui/Input";
import Select from "../../../../shared/components/ui/Select";
import TextArea from "../../../../shared/components/ui/TextArea";

interface ValidationErrors {
  [key: string]: string;
}

const PlantMachineryForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id && id !== "new");

  const {
    createPlantMachinery,
    updatePlantMachinery,
    getPlantMachineryById,
    isLoading,
  } = usePlantMachineryStore();

  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    {}
  );
  const [isGeneratingTag, setIsGeneratingTag] = useState(false);
  const [isValidatingTag, setIsValidatingTag] = useState(false);
  const [autoCalculate, setAutoCalculate] = useState(true);

  const [formData, setFormData] = useState<Partial<PlantMachinery>>({
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
      loadPlantMachinery();
    }
  }, [id, isEditing]);

  useEffect(() => {
    if (
      autoCalculate &&
      formData.purchase_amount &&
      formData.depreciation_rate
    ) {
      calculateFinancialFields();
    }
  }, [
    formData.purchase_amount,
    formData.depreciation_rate,
    formData.delivery_installation_date,
    autoCalculate,
  ]);

  useEffect(() => {
    if (autoCalculate && formData.delivery_installation_date) {
      calculateFinancialFields();

      const interval = setInterval(() => {
        calculateFinancialFields();
      }, 24 * 60 * 60 * 1000);

      return () => clearInterval(interval);
    }
  }, [
    formData.purchase_amount,
    formData.depreciation_rate,
    formData.delivery_installation_date,
    formData.disposal_date,
    formData.replacement_date,
    autoCalculate,
  ]);

  const loadPlantMachinery = async () => {
    if (!id) return;

    try {
      const plantMachinery = await getPlantMachineryById(id);
      if (plantMachinery) {
        setFormData(plantMachinery);
        setAutoCalculate(false);
      }
    } catch (error) {
      toast.error("Failed to load plant machinery");
      navigate("/categories/plant-machinery");
    }
  };

  const generateTagNumber = async () => {
    setIsGeneratingTag(true);
    setValidationErrors((prev) => ({ ...prev, tag_number: "" }));

    try {
      const response = await axios.post(
        `${
          import.meta.env.VITE_API_URL || "http://localhost:3001"
        }/plant-machinery/generate-tag`
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
        }/plant-machinery/validate-tag${isEditing ? `?asset_id=${id}` : ""}`,
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

  const calculateFinancialFields = () => {
    const purchaseAmount = formData.purchase_amount || 0;
    const depreciationRate = formData.depreciation_rate || 0;
    const deliveryDateStr = formData.delivery_installation_date;

    if (!purchaseAmount || !depreciationRate || !deliveryDateStr) return;

    const deliveryDate = new Date(deliveryDateStr);

    const disposalDate = formData.disposal_date
      ? new Date(formData.disposal_date)
      : null;
    const replacementDate = formData.replacement_date
      ? new Date(formData.replacement_date)
      : null;

    const today = new Date();
    const endDate = [disposalDate, replacementDate, today]
      .filter(Boolean)
      .reduce((earliest, date) =>
        date && earliest
          ? date < earliest
            ? date
            : earliest
          : date || earliest
      );

    const daysInUse = Math.max(
      0,
      Math.floor(
        (endDate.getTime() - deliveryDate.getTime()) / (1000 * 60 * 60 * 24)
      )
    );

    const annualDepreciation = purchaseAmount * (depreciationRate / 100);
    const dailyDepreciation = annualDepreciation / 365;
    const accumulatedDepreciation = Math.min(
      dailyDepreciation * daysInUse,
      purchaseAmount
    );

    const netBookValue = Math.max(0, purchaseAmount - accumulatedDepreciation);

    setFormData((prev) => ({
      ...prev,
      annual_depreciation: Number(annualDepreciation.toFixed(2)),
      accumulated_depreciation: Number(accumulatedDepreciation.toFixed(2)),
      net_book_value: Number(netBookValue.toFixed(2)),
    }));
  };

  const handleInputChange = (field: keyof PlantMachinery, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (validationErrors[field]) {
      setValidationErrors((prev) => ({ ...prev, [field]: "" }));
    }

    if (field === "tag_number" && typeof value === "string") {
      const timeoutId = setTimeout(() => {
        validateTagNumber(value);
      }, 500);

      return () => clearTimeout(timeoutId);
    }

    if (
      [
        "annual_depreciation",
        "accumulated_depreciation",
        "net_book_value",
      ].includes(field) &&
      value !== formData[field]
    ) {
      setAutoCalculate(false);
    }
  };

  const handleRecalculate = () => {
    if (!formData.purchase_amount || !formData.depreciation_rate) {
      toast.error("Please enter purchase amount and depreciation rate first");
      return;
    }
    setAutoCalculate(true);
    calculateFinancialFields();
    toast.success("Financial values recalculated");
  };

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
      if (isEditing && id) {
        await updatePlantMachinery(id, formData);
        toast.success("Plant machinery updated successfully");
      } else {
        await createPlantMachinery(
          formData as Omit<PlantMachinery, "id" | "created_at" | "updated_at">
        );
        toast.success("Plant machinery created successfully");
      }

      navigate("/categories/plant-machinery");
    } catch (error) {
      toast.error(
        isEditing
          ? "Failed to update plant machinery"
          : "Failed to create plant machinery"
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
          to="/categories/plant-machinery"
          className="transition-colors hover:text-blue-600"
        >
          Plant & Machinery
        </Link>
        <ChevronRight size={16} />
        <span className="flex items-center font-medium text-gray-900">
          <Settings size={16} className="mr-1" />
          {isEditing ? "Edit Machinery" : "Add Machinery"}
        </span>
      </nav>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {isEditing ? "Edit Machinery" : "Add Machinery"}
          </h1>
          <p className="mt-2 text-gray-600">
            {isEditing
              ? "Update plant machinery information"
              : "Create a new plant machinery entry"}
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
                      number (Format: P-4578A)
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
              <div className="flex items-center space-x-2">
                {!autoCalculate && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleRecalculate}
                    leftIcon={<Calculator size={14} />}
                    className="text-xs"
                  >
                    Recalculate
                  </Button>
                )}
                <div className="flex items-center">
                  <span
                    className={`text-xs ${
                      autoCalculate ? "text-green-600" : "text-orange-600"
                    }`}
                  >
                    {autoCalculate ? "●" : "●"}{" "}
                    {autoCalculate ? "Auto-calculating" : "Manual override"}
                  </span>
                </div>
              </div>
            </div>

            {autoCalculate && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <Calculator size={14} className="inline mr-1" />
                  Financial values will be automatically calculated when you
                  enter Purchase Amount and Depreciation Rate. You can still
                  edit any field manually, which will disable auto-calculation.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Purchase Amount <span className="text-red-500">*</span>
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
                  className="ring-2 ring-blue-200 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Depreciation Rate (%) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.depreciation_rate || ""}
                  onChange={(e) =>
                    handleInputChange(
                      "depreciation_rate",
                      Number.parseFloat(e.target.value) || undefined
                    )
                  }
                  placeholder="Enter depreciation rate"
                  className="ring-2 ring-blue-200 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Annual Depreciation
                  {autoCalculate && (
                    <span className="text-green-600 text-xs ml-1">(auto)</span>
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
                  className={
                    autoCalculate ? "bg-green-50 border-green-200" : ""
                  }
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Accumulated Depreciation
                  {autoCalculate && (
                    <span className="text-green-600 text-xs ml-1">(auto)</span>
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
                  className={
                    autoCalculate ? "bg-green-50 border-green-200" : ""
                  }
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Net Book Value
                  {autoCalculate && (
                    <span className="text-green-600 text-xs ml-1">(auto)</span>
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
                  className={
                    autoCalculate ? "bg-green-50 border-green-200" : ""
                  }
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

            {autoCalculate && formData.delivery_installation_date && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  Accumulated depreciation is calculated based on days since
                  delivery date: {formData.delivery_installation_date}
                </p>
              </div>
            )}
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
                  {autoCalculate && (
                    <span className="text-blue-600 text-xs ml-1">
                      (affects depreciation)
                    </span>
                  )}
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
                  className={autoCalculate ? "ring-1 ring-blue-200" : ""}
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
            onClick={() => navigate("/categories/plant-machinery")}
            leftIcon={<X size={16} />}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="bg-blue-600 hover:bg-blue-700"
            leftIcon={<Save size={16} />}
            isLoading={isLoading}
          >
            {isEditing ? "Update Machinery" : "Create Machinery"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default PlantMachineryForm;

"use client";

import type React from "react";
import { useState, useEffect, useCallback, useRef } from "react";
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
} from "lucide-react";
import axios from "axios";
import * as XLSX from "xlsx";

import {
  useIctAssetsStore,
  type IctAsset,
} from "../../../../shared/store/ictAssetsStore";
import Button from "../../../../shared/components/ui/Button";
import Card from "../../../../shared/components/ui/Card";
import Input from "../../../../shared/components/ui/Input";
import Select from "../../../../shared/components/ui/Select";
import TextArea from "../../../../shared/components/ui/TextArea";
import ConfirmationModal from "../../../../shared/components/ui/ConfirmationPopup";
import ConfirmIctAssetsExcelModal from "../../../../shared/components/ui/ConfirmIctAssetsExcelModal";

interface ValidationErrors {
  [key: string]: string;
}

const IctAssetsForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id && id !== "new");

  const { createIctAsset, updateIctAsset, getIctAssetById, isLoading } =
    useIctAssetsStore();

  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    {}
  );
  const [isGeneratingTag, setIsGeneratingTag] = useState(false);
  const [isValidatingTag, setIsValidatingTag] = useState(false);
  const [isValidatingSerial, setIsValidatingSerial] = useState(false);
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

  // Excel upload state variables
  const [excel_data, set_excel_data] = useState<any[]>([]);
  const [show_excel_modal, set_show_excel_modal] = useState<boolean>(false);
  const [is_uploading, set_is_uploading] = useState(false);
  const [upload_progress, set_upload_progress] = useState<number>(0);
  const [is_processing_excel, setIs_processing_excel] = useState(false);
  const file_input_ref = useRef<HTMLInputElement | null>(null);

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

  const validateSerialNumber = useCallback(
    async (serialNumber: string): Promise<void> => {
      if (!serialNumber.trim()) {
        setValidationErrors((prev) => ({ ...prev, serial_number: "" }));
        return;
      }

      setIsValidatingSerial(true);
      setValidationErrors((prev) => ({ ...prev, serial_number: "" }));

      try {
        const response = await axios.post(
          `${
            import.meta.env.VITE_API_URL || "http://localhost:3001"
          }/ict-assets/validate-serial${isEditing ? `?asset_id=${id}` : ""}`,
          { serial_number: serialNumber }
        );

        const data = response.data;

        if (!data.valid) {
          setValidationErrors((prev) => ({
            ...prev,
            serial_number:
              data.message || "Serial number already exists in the system",
          }));
        } else {
          setValidationErrors((prev) => ({ ...prev, serial_number: "" }));
        }
      } catch (error: any) {
        console.error("Serial validation error:", error);
        const errorMessage =
          error.response?.data?.detail ||
          error.message ||
          "Failed to validate serial number";
        setValidationErrors((prev) => ({
          ...prev,
          serial_number: errorMessage,
        }));

        if (error.response?.status === 401) {
          navigate("/login");
        }
      } finally {
        setIsValidatingSerial(false);
      }
    },
    [id, isEditing, navigate]
  );

  const generateTagNumber = async () => {
    // Rule 1: Require serial number
    if (!formData.serial_number?.trim()) {
      toast.error("Please provide a serial number before generating a tag");
      return;
    }

    // Rule 2: Check if serial number has validation errors
    if (validationErrors.serial_number) {
      toast.error(
        "Please resolve serial number validation errors before generating a tag"
      );
      return;
    }

    // Rule 3: Prevent regenerating if already generated
    if (formData.tag_number?.trim()) {
      toast.error("A tag has already been generated for this asset");
      return;
    }

    setIsGeneratingTag(true);
    setValidationErrors((prev) => ({ ...prev, tag_number: "" }));

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
        }/ict-assets/validate-tag${isEditing ? `?asset_id=${id}` : ""}`,
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

  const handleInputChange = (field: keyof IctAsset, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (validationErrors[field]) {
      setValidationErrors((prev) => ({ ...prev, [field]: "" }));
    }

    // Handle serial number validation with debounce
    if (field === "serial_number" && typeof value === "string") {
      const timeoutId = setTimeout(() => {
        validateSerialNumber(value);
      }, 500);

      return () => clearTimeout(timeoutId);
    }

    // Handle tag number validation with debounce
    if (field === "tag_number" && typeof value === "string") {
      const timeoutId = setTimeout(() => {
        validateTagNumber(value);
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  };

  const validateForm = (): ValidationErrors => {
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

    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors = validateForm();

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      toast.error("Please fix the validation errors before submitting");
      return;
    }

    if (Object.values(validationErrors).some((error) => error !== "")) {
      toast.error("Please fix the validation errors before submitting");
      return;
    }

    // Show confirmation modal instead of submitting directly
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

  // Excel file upload handler
  const handle_file_upload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded_file = e.target.files?.[0];
    if (!uploaded_file) return;

    setIs_processing_excel(true);
    set_upload_progress(0);

    const reader = new FileReader();

    reader.onload = (event) => {
      // Simulate processing progress
      const progressInterval = setInterval(() => {
        set_upload_progress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      const data = new Uint8Array(event.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json_data: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      console.log("Excel columns found:", Object.keys(json_data[0] || {}));
      console.log("First row data:", json_data[0]);

      const mapped_data = json_data.map((row: any) => ({
        // Required fields
        asset_description:
          row["Asset Description"] || row["asset_description"] || "",
        financed_by: row["Financed By"] || row["financed_by"] || "",
        serial_number: row["Serial Number"] || row["serial_number"] || "",
        tag_number: row["Tag Number"] || row["tag_number"] || "",
        make_model: row["Make/Model"] || row["make_model"] || "",
        purchase_amount:
          Number.parseFloat(
            row["Purchase Amount"] || row["purchase_amount"] || "0"
          ) || 0,

        // Optional basic fields
        pv_number: row["PV Number"] || row["pv_number"] || undefined,

        // ICT-specific fields
        asset_type: row["Asset Type"] || row["asset_type"] || undefined,
        specifications:
          row["Specifications"] || row["specifications"] || undefined,
        software_licenses:
          row["Software Licenses"] || row["software_licenses"] || undefined,
        ip_address: row["IP Address"] || row["ip_address"] || undefined,
        mac_address: row["MAC Address"] || row["mac_address"] || undefined,
        operating_system:
          row["Operating System"] || row["operating_system"] || undefined,

        // Location fields
        original_location:
          row["Original Location"] || row["original_location"] || undefined,
        current_location:
          row["Current Location"] || row["current_location"] || undefined,
        responsible_officer:
          row["Responsible Officer"] || row["responsible_officer"] || undefined,

        // Date fields
        delivery_installation_date:
          row["Delivery/Installation Date"] ||
          row["delivery_installation_date"] ||
          undefined,
        replacement_date:
          row["Replacement Date"] || row["replacement_date"] || undefined,
        disposal_date:
          row["Disposal Date"] || row["disposal_date"] || undefined,

        // Financial fields
        depreciation_rate:
          Number.parseFloat(
            row["Depreciation Rate"] || row["depreciation_rate"] || "0"
          ) || undefined,
        annual_depreciation:
          Number.parseFloat(
            row["Annual Depreciation"] || row["annual_depreciation"] || "0"
          ) || undefined,
        accumulated_depreciation:
          Number.parseFloat(
            row["Accumulated Depreciation"] ||
              row["accumulated_depreciation"] ||
              "0"
          ) || undefined,
        net_book_value:
          Number.parseFloat(
            row["Net Book Value"] || row["net_book_value"] || "0"
          ) || undefined,
        disposal_value:
          Number.parseFloat(
            row["Disposal Value"] || row["disposal_value"] || "0"
          ) || undefined,

        // Status fields
        asset_condition:
          row["Asset Condition"] || row["asset_condition"] || undefined,
        notes: row["Notes"] || row["notes"] || undefined,

        // Transfer fields
        previous_owner:
          row["Previous Owner"] || row["previous_owner"] || undefined,
        transfer_department:
          row["Transfer Department"] || row["transfer_department"] || undefined,
        transfer_location:
          row["Transfer Location"] || row["transfer_location"] || undefined,
        transfer_room_or_floor:
          row["Transfer Room/Floor"] ||
          row["transfer_room_or_floor"] ||
          undefined,
        transfer_reason:
          row["Transfer Reason"] || row["transfer_reason"] || undefined,
      }));

      console.log("Mapped ICT assets data:", mapped_data);

      // Complete the progress
      set_upload_progress(100);
      setTimeout(() => {
        setIs_processing_excel(false);
        set_upload_progress(0);
        set_excel_data(mapped_data);
        set_show_excel_modal(true);
      }, 500);
    };

    reader.readAsArrayBuffer(uploaded_file);
  };

  // Excel data submission handler
  const handle_excel_submit = async (data_to_upload?: any[]) => {
    if (is_uploading) return;

    set_is_uploading(true);
    set_upload_progress(0);

    const data_to_process = data_to_upload || excel_data;

    if (data_to_process.length === 0) {
      toast.error("No data found in the Excel file.");
      set_is_uploading(false);
      set_upload_progress(0);
      return;
    }

    try {
      const serial_numbers = data_to_process.map(
        (asset) => asset.serial_number
      );

      // Check serial numbers first
      set_upload_progress(20);
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/ict-assets/check-serial-numbers`,
        { serial_numbers },
        {
          withCredentials: true,
        }
      );

      set_upload_progress(40);
      const existing_serial_numbers =
        response.data.existing_serial_numbers || [];
      const assets_to_insert = data_to_process.filter(
        (asset) => !existing_serial_numbers.includes(asset.serial_number)
      );

      if (assets_to_insert.length > 0) {
        set_upload_progress(60);

        // Create axios instance with upload progress
        const uploadAxios = axios.create();
        uploadAxios.interceptors.request.use((config) => {
          config.onUploadProgress = (progressEvent) => {
            if (progressEvent.total) {
              const progress = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              set_upload_progress(60 + progress * 0.3); // 60% to 90%
            }
          };
          return config;
        });

        await uploadAxios.post(
          `${import.meta.env.VITE_API_URL}/ict-assets/upload-excel-data`,
          { data: assets_to_insert },
          {
            withCredentials: true,
          }
        );

        set_upload_progress(100);
        toast.success("Excel data uploaded successfully!");

        setTimeout(() => {
          set_show_excel_modal(false);
          set_upload_progress(0);
          navigate("/categories/ict-assets");
        }, 1500);
      } else {
        set_upload_progress(100);
        toast.error("All assets in the Excel file already exist.");
        setTimeout(() => {
          set_upload_progress(0);
        }, 1000);
      }
    } catch (err: any) {
      const message =
        err.response?.data?.message || "Failed to upload excel data";
      toast.error(message);
      set_upload_progress(0);
    } finally {
      set_is_uploading(false);
    }
  };

  // Check if form has validation errors that should disable submit
  const hasValidationErrors = Object.values(validationErrors).some(
    (error) => error !== ""
  );

  // Check if tag generation should be disabled
  const isTagGenerationDisabled =
    isGeneratingTag ||
    !formData.serial_number?.trim() ||
    Boolean(validationErrors.serial_number) ||
    Boolean(formData.tag_number);

  // Check if submit should be disabled
  const isSubmitDisabled =
    isLoading || hasValidationErrors || isValidatingSerial || isValidatingTag;

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
          to="/categories/ict-assets"
          className="transition-colors hover:text-blue-600"
        >
          ICT Assets
        </Link>
        <ChevronRight size={16} />
        <span className="flex items-center font-medium text-gray-900">
          <Settings size={16} className="mr-1" />
          {isEditing ? "Edit Asset" : "Add Asset"}
        </span>
      </nav>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {isEditing ? "Edit ICT Asset" : "Add ICT Asset"}
          </h1>
          <p className="mt-2 text-gray-600">
            {isEditing
              ? "Update ICT asset information"
              : "Create a new ICT asset entry"}
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
                <div className="mt-1">
                  {isValidatingSerial && (
                    <p className="text-xs text-blue-600">
                      Validating serial number...
                    </p>
                  )}
                  {validationErrors.serial_number && (
                    <p className="text-sm text-red-600">
                      {validationErrors.serial_number}
                    </p>
                  )}
                </div>
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
                    disabled={isTagGenerationDisabled}
                    className="px-3 py-2 min-w-0 hover:bg-gray-100 border border-gray-300 rounded-md transition-colors disabled:opacity-50"
                    title={
                      !formData.serial_number?.trim()
                        ? "Enter serial number first"
                        : validationErrors.serial_number
                        ? "Resolve serial number validation errors first"
                        : formData.tag_number
                        ? "Tag already generated"
                        : "Generate tag number from backend"
                    }
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
                      number (Format: Y-4578A)
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
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Financial Information
            </h2>
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
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Annual Depreciation
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
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Accumulated Depreciation
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
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Net Book Value
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
                    handleInputChange("disposal_value", e.target.value)
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

        {/* Excel Upload Section */}
        <Card>
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Upload Excel File
              </h2>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-500">Ready to upload</span>
              </div>
            </div>

            <div className="space-y-4">
              {/* File Input */}
              <div className="relative">
                <input
                  ref={file_input_ref}
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handle_file_upload}
                  className="block w-full text-sm text-gray-500 cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 file:cursor-pointer"
                  disabled={is_processing_excel || is_uploading}
                />
              </div>

              {/* Progress Bar */}
              {(is_processing_excel || is_uploading) && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>
                      {is_processing_excel
                        ? "Processing Excel file..."
                        : "Uploading to server..."}
                    </span>
                    <span>{Math.round(upload_progress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${upload_progress}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {is_processing_excel && "Reading and mapping Excel data..."}
                    {is_uploading && "Sending data to server..."}
                  </div>
                </div>
              )}

              {/* Status Messages */}
              {is_processing_excel && (
                <div className="flex items-center p-3 space-x-2 text-blue-600 bg-blue-50 rounded-md">
                  <div className="w-4 h-4 rounded-full border-2 border-blue-600 animate-spin border-t-transparent"></div>
                  <span className="text-sm font-medium">
                    Processing Excel file...
                  </span>
                </div>
              )}

              {is_uploading && (
                <div className="flex items-center p-3 space-x-2 text-green-600 bg-green-50 rounded-md">
                  <div className="w-4 h-4 rounded-full border-2 border-green-600 animate-spin border-t-transparent"></div>
                  <span className="text-sm font-medium">
                    Uploading to server...
                  </span>
                </div>
              )}

              {/* File Info */}
              {excel_data.length > 0 &&
                !is_processing_excel &&
                !is_uploading && (
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-md border border-green-200">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-green-700">
                        {excel_data.length} asset(s) ready for review
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => set_show_excel_modal(true)}
                      className="text-sm font-medium text-green-700 hover:text-green-800"
                    >
                      Review Data →
                    </button>
                  </div>
                )}

              {/* Help Text */}
              <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
                <p className="text-sm text-gray-600">
                  <strong>Excel Format:</strong> Your Excel file should include
                  columns like "Asset Description", "Serial Number", "Tag
                  Number", "Make/Model", "Financed By", "Purchase Amount", etc.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Form Actions */}
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate("/categories/ict-assets")}
            leftIcon={<X size={16} />}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="bg-blue-600 hover:bg-blue-700"
            leftIcon={<Save size={16} />}
            disabled={isSubmitDisabled}
          >
            {isEditing ? "Update Asset" : "Create Asset"}
          </Button>
        </div>
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
        show={show_excel_modal}
        data={excel_data}
        onConfirm={handle_excel_submit}
        onCancel={() => {
          set_show_excel_modal(false);
          if (file_input_ref.current) file_input_ref.current.value = "";
        }}
        isLoading={is_uploading}
      />
    </div>
  );
};

export default IctAssetsForm;

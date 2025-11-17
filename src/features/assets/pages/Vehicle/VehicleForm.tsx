"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Settings,
  Save,
  X,
  ChevronRight,
  Home,
  FolderOpen,
  Upload,
  ImageIcon,
  Trash2,
  Plus,
  Camera,
  RotateCcw,
  Check,
  RefreshCw,
  Calculator,
} from "lucide-react";
import axios from "axios";
import * as XLSX from "xlsx";

import {
  processExcelData,
  getMappingReport,
} from "../../../../shared/utils/columnMapper";

import {
  useVehicleStore,
  type Vehicle,
} from "../../../../shared/store/vehicleStore";
import Button from "../../../../shared/components/ui/Button";
import Card from "../../../../shared/components/ui/Card";
import Input from "../../../../shared/components/ui/Input";
import Select from "../../../../shared/components/ui/Select";
import TextArea from "../../../../shared/components/ui/TextArea";
import ConfirmVehicleExcelModal from "../../../../shared/components/ui/ConfirmVehicleExcelModal";

interface ImagePreview {
  file?: File;
  url: string;
  id: string;
  isExisting?: boolean;
}

interface ValidationErrors {
  [key: string]: string;
}

const VehicleForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id && id !== "new");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { createVehicle, updateVehicle, getVehicleById, isLoading } =
    useVehicleStore();

  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    {}
  );
  const [isGeneratingTag, setIsGeneratingTag] = useState(false);
  const [isValidatingTag, setIsValidatingTag] = useState(false);
  const [autoCalculate, setAutoCalculate] = useState(true);

  const [excel_data, set_excel_data] = useState<any[]>([]);
  const [show_excel_modal, set_show_excel_modal] = useState<boolean>(false);
  const [is_uploading, set_is_uploading] = useState(false);
  const [upload_progress, set_upload_progress] = useState<number>(0);
  const [is_processing_excel, setIs_processing_excel] = useState(false);
  const excel_file_input_ref = useRef<HTMLInputElement | null>(null);

  const [formData, setFormData] = useState<Partial<Vehicle>>({
    registration_number: "",
    financed_by: "",
    engine_number: "",
    chassis_number: "",
    tag_number: "",
    make_model: "",
    year_of_purchase: "",
    pv_number: "",
    color: "",
    original_location: "",
    current_location: "",
    replacement_date: "",
    amount: undefined,
    depreciation_rate: undefined,
    annual_depreciation: undefined,
    accumulated_depreciation: undefined,
    net_book_value: undefined,
    date_of_disposal: "",
    disposal_value: undefined,
    responsible_officer: "",
    asset_condition: "New",
    has_logbook: "N",
    notes: "",
  });

  const [images, setImages] = useState<ImagePreview[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing && id) {
      loadVehicle();
    }
  }, [id, isEditing]);

  // Cleanup URLs when component unmounts
  useEffect(() => {
    return () => {
      images.forEach((image) => {
        if (!image.isExisting && image.url.startsWith("blob:")) {
          URL.revokeObjectURL(image.url);
        }
      });
      // Cleanup camera stream
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (
      autoCalculate &&
      formData.amount &&
      formData.depreciation_rate !== undefined
    ) {
      const annualDep = (formData.amount * formData.depreciation_rate) / 100;
      setFormData((prev) => ({
        ...prev,
        annual_depreciation: Number.parseFloat(annualDep.toFixed(2)),
      }));
    }
  }, [formData.amount, formData.depreciation_rate, autoCalculate]);

  useEffect(() => {
    if (
      autoCalculate &&
      formData.amount &&
      formData.annual_depreciation !== undefined &&
      formData.year_of_purchase
    ) {
      const purchaseYear = Number.parseInt(formData.year_of_purchase);
      const currentYear = new Date().getFullYear();
      const yearsInUse = Math.max(0, currentYear - purchaseYear);

      const accumulatedDep = Math.min(
        formData.annual_depreciation * yearsInUse,
        formData.amount
      );
      const netBookVal = Math.max(0, formData.amount - accumulatedDep);

      setFormData((prev) => ({
        ...prev,
        accumulated_depreciation: Number.parseFloat(accumulatedDep.toFixed(2)),
        net_book_value: Number.parseFloat(netBookVal.toFixed(2)),
      }));
    }
  }, [
    formData.amount,
    formData.annual_depreciation,
    formData.year_of_purchase,
    autoCalculate,
  ]);

  const loadVehicle = async () => {
    if (!id) return;
    try {
      const vehicle = await getVehicleById(id);
      if (vehicle) {
        const formattedVehicle = {
          ...vehicle,
          replacement_date: vehicle.replacement_date
            ? vehicle.replacement_date.split("T")[0]
            : "",
          date_of_disposal: vehicle.date_of_disposal
            ? vehicle.date_of_disposal.split("T")[0]
            : "",
        };
        setFormData(formattedVehicle);

        if (vehicle.image_urls && vehicle.image_urls.length > 0) {
          const existingImages: ImagePreview[] = vehicle.image_urls.map(
            (url, index) => ({
              url: url.startsWith("http")
                ? url
                : `${
                    process.env.VITE_PROD_API_URL ||
                    "https://assetsmanagementsystem-1.onrender.com"
                  }${url}`,
              id: `existing-${index}`,
              isExisting: true,
            })
          );
          setImages(existingImages);
        }
      }
    } catch (error) {
      toast.error("Failed to load vehicle");
      navigate("/categories/vehicles");
    }
  };

  const generateTagNumber = async () => {
    setIsGeneratingTag(true);
    setValidationErrors((prev) => ({ ...prev, tag_number: "" }));

    try {
      const response = await axios.post(
        `${
          import.meta.env.VITE_API_URL || "http://localhost:3001"
        }/vehicles/generate-tag`
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
        }/vehicles/validate-tag${isEditing ? `?asset_id=${id}` : ""}`,
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

  const handleInputChange = (field: keyof Vehicle, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (
      [
        "annual_depreciation",
        "accumulated_depreciation",
        "net_book_value",
      ].includes(field)
    ) {
      setAutoCalculate(false);
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

  const handleFileSelect = (files: FileList) => {
    const validFiles = Array.from(files).filter((file) => {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image file`);
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        // 10MB limit
        toast.error(`${file.name} is too large (max 10MB)`);
        return false;
      }
      return true;
    });

    const newImages: ImagePreview[] = validFiles.map((file) => ({
      file,
      url: URL.createObjectURL(file),
      id: Math.random().toString(36).substring(2, 15),
      isExisting: false,
    }));

    setImages((prev) => [...prev, ...newImages]);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const removeImage = (imageId: string) => {
    setImages((prev) => {
      const imageToRemove = prev.find((img) => img.id === imageId);
      if (
        imageToRemove &&
        !imageToRemove.isExisting &&
        imageToRemove.url.startsWith("blob:")
      ) {
        URL.revokeObjectURL(imageToRemove.url);
      }
      return prev.filter((img) => img.id !== imageId);
    });
  };

  // Camera functionality
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }, // Use back camera on mobile
        audio: false,
      });

      setStream(mediaStream);
      setIsCameraOpen(true);
      setCapturedPhoto(null);

      // Set video source after a small delay to ensure the video element is rendered
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch(console.error);
        }
      }, 100);
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast.error("Unable to access camera. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsCameraOpen(false);
    setCapturedPhoto(null);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context || video.videoWidth === 0 || video.videoHeight === 0) {
      toast.error("Camera not ready. Please wait a moment and try again.");
      return;
    }

    // Set canvas size to video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the video frame to the canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to blob and create preview URL
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          setCapturedPhoto(url);
        }
      },
      "image/jpeg",
      0.8
    );
  };

  const retakePhoto = () => {
    if (capturedPhoto) {
      URL.revokeObjectURL(capturedPhoto);
    }
    setCapturedPhoto(null);
  };

  const confirmPhoto = () => {
    if (!capturedPhoto || !canvasRef.current) return;

    canvasRef.current.toBlob(
      (blob) => {
        if (blob) {
          // Create a file from the blob
          const timestamp = new Date().getTime();
          const file = new File([blob], `camera-photo-${timestamp}.jpg`, {
            type: "image/jpeg",
          });

          const newImage: ImagePreview = {
            file,
            url: capturedPhoto,
            id: Math.random().toString(36).substring(2, 15),
            isExisting: false,
          };

          setImages((prev) => [...prev, newImage]);
          stopCamera();
          toast.success("Photo captured successfully!");
        }
      },
      "image/jpeg",
      0.8
    );
  };

  const handle_file_upload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded_file = e.target.files?.[0];
    if (!uploaded_file) return;

    setIs_processing_excel(true);
    set_upload_progress(0);

    const reader = new FileReader();

    reader.onload = (event) => {
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

      console.log("[v0] Excel columns found:", Object.keys(json_data[0] || {}));
      console.log("[v0] First row data:", json_data[0]);

      const mapped_data = processExcelData(json_data);

      if (json_data.length > 0) {
        const mappingReport = getMappingReport(json_data[0]);
        console.log("[v0] Column mapping report:", mappingReport);
      }

      console.log("[v0] Mapped vehicle data:", mapped_data);

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
      const registration_numbers = data_to_process.map(
        (vehicle) => vehicle.registration_number
      );

      set_upload_progress(20);
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/vehicles/check-registration-numbers`,
        { registration_numbers },
        {
          withCredentials: true,
        }
      );

      set_upload_progress(40);
      const existing_registration_numbers =
        response.data.existing_registration_numbers || [];
      const vehicles_to_insert = data_to_process.filter(
        (vehicle) =>
          !existing_registration_numbers.includes(vehicle.registration_number)
      );

      if (vehicles_to_insert.length > 0) {
        set_upload_progress(60);

        const uploadAxios = axios.create();
        uploadAxios.interceptors.request.use((config) => {
          config.onUploadProgress = (progressEvent) => {
            if (progressEvent.total) {
              const progress = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              set_upload_progress(60 + progress * 0.3);
            }
          };
          return config;
        });

        await uploadAxios.post(
          `${import.meta.env.VITE_API_URL}/vehicles/upload-excel-data`,
          { data: vehicles_to_insert },
          {
            withCredentials: true,
          }
        );

        set_upload_progress(100);
        toast.success("Excel data uploaded successfully!");

        setTimeout(() => {
          set_show_excel_modal(false);
          set_upload_progress(0);
          navigate("/categories/vehicles");
        }, 1500);
      } else {
        set_upload_progress(100);
        toast.error("All vehicles in the Excel file already exist.");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: ValidationErrors = {};

    if (!formData.registration_number?.trim()) {
      errors.registration_number = "Vehicle Registration Number is required";
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
      const newImages = images
        .filter((img) => img.file && img.file.size > 0)
        .map((img) => img.file!);
      const hasExistingImages = images.some((img) => img.isExisting);

      console.log("[v0] Form submission data:", {
        formData,
        newImagesCount: newImages.length,
        hasExistingImages,
      });

      const submitData = {
        ...formData,
        replacement_date: formData.replacement_date || undefined,
        date_of_disposal: formData.date_of_disposal || undefined,
        images: newImages,
        keep_existing_images: hasExistingImages,
      };

      if (isEditing && id) {
        await updateVehicle(id, submitData);
        toast.success("Vehicle updated successfully");
      } else {
        await createVehicle(submitData as any);
        toast.success("Vehicle created successfully");
      }
      navigate("/categories/vehicles");
    } catch (error) {
      console.log("[v0] Form submission error:", error);
      toast.error(
        isEditing ? "Failed to update vehicle" : "Failed to create vehicle"
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Camera Modal */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 p-4">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Take Photo</h3>
              <button
                type="button"
                onClick={stopCamera}
                className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"
              >
                <X size={24} />
              </button>
            </div>

            <div className="relative flex flex-col items-center">
              {!capturedPhoto ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full max-w-2xl rounded-lg bg-gray-900"
                    style={{ maxHeight: "60vh", minHeight: "300px" }}
                  />
                  <div className="flex justify-center mt-4 space-x-4">
                    <Button
                      type="button"
                      onClick={capturePhoto}
                      variant="primary"
                      className="bg-blue-600 hover:bg-blue-700"
                      leftIcon={<Camera size={20} />}
                    >
                      Take Photo
                    </Button>
                    <Button
                      type="button"
                      onClick={stopCamera}
                      variant="secondary"
                      leftIcon={<X size={20} />}
                    >
                      Cancel
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <img
                    src={capturedPhoto || "/placeholder.svg"}
                    alt="Captured"
                    className="w-full max-w-2xl rounded-lg"
                    style={{ maxHeight: "60vh", minHeight: "300px" }}
                  />
                  <div className="flex justify-center mt-4 space-x-4">
                    <Button
                      type="button"
                      onClick={retakePhoto}
                      variant="secondary"
                      leftIcon={<RotateCcw size={20} />}
                    >
                      Retake
                    </Button>
                    <Button
                      type="button"
                      onClick={confirmPhoto}
                      variant="primary"
                      className="bg-green-600 hover:bg-green-700"
                      leftIcon={<Check size={20} />}
                    >
                      Use Photo
                    </Button>
                  </div>
                </>
              )}
            </div>

            <canvas ref={canvasRef} style={{ display: "none" }} />
          </div>
        </div>
      )}

      <nav className="flex items-center mb-6 space-x-2 text-sm text-primary-600 dark:text-primary-400">
        <Link
          to="/"
          className="flex items-center transition-colors hover:text-primary-900 dark:hover:text-primary-100"
        >
          <Home size={16} className="mr-1" /> Home
        </Link>
        <ChevronRight
          size={16}
          className="text-primary-400 dark:text-primary-600"
        />
        <Link
          to="/asset-categories"
          className="flex items-center transition-colors hover:text-primary-900 dark:hover:text-primary-100"
        >
          <FolderOpen size={16} className="mr-1" /> Asset Categories
        </Link>
        <ChevronRight
          size={16}
          className="text-primary-400 dark:text-primary-600"
        />
        <Link
          to="/categories/vehicles"
          className="transition-colors hover:text-primary-900 dark:hover:text-primary-100"
        >
          Vehicles
        </Link>
        <ChevronRight
          size={16}
          className="text-primary-400 dark:text-primary-600"
        />
        <span className="flex items-center font-medium text-primary-900 dark:text-primary-100">
          <Settings size={16} className="mr-1" />
          {isEditing ? "Edit Vehicle" : "Add Vehicle"}
        </span>
      </nav>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-primary-900 dark:text-primary-50">
            {isEditing ? "Edit Vehicle" : "Add Vehicle"}
          </h1>
          <p className="mt-2 text-primary-600 dark:text-primary-400">
            {isEditing
              ? "Update vehicle information"
              : "Create a new vehicle entry"}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <div className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-primary-900 dark:text-primary-50">
              Basic Information
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="block mb-1 text-sm font-medium text-primary-700 dark:text-primary-300">
                  Vehicle Registration No. *
                </label>
                <Input
                  value={formData.registration_number || ""}
                  onChange={(e) =>
                    handleInputChange("registration_number", e.target.value)
                  }
                  placeholder="Enter registration number"
                  required
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-primary-700 dark:text-primary-300">
                  Financed By / Source of Funds
                </label>
                <Input
                  value={formData.financed_by || ""}
                  onChange={(e) =>
                    handleInputChange("financed_by", e.target.value)
                  }
                  placeholder="Enter financing source"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-primary-700 dark:text-primary-300">
                  Make & Model
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
                <label className="block mb-1 text-sm font-medium text-primary-700 dark:text-primary-300">
                  Year of Purchase
                </label>
                <Input
                  value={formData.year_of_purchase || ""}
                  onChange={(e) =>
                    handleInputChange("year_of_purchase", e.target.value)
                  }
                  placeholder="Enter year of purchase"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Identification */}
        <Card>
          <div className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-primary-900 dark:text-primary-50">
              Identification
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="block mb-1 text-sm font-medium text-primary-700 dark:text-primary-300">
                  Engine No.
                </label>
                <Input
                  value={formData.engine_number || ""}
                  onChange={(e) =>
                    handleInputChange("engine_number", e.target.value)
                  }
                  placeholder="Enter engine number"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-primary-700 dark:text-primary-300">
                  Chassis No.
                </label>
                <Input
                  value={formData.chassis_number || ""}
                  onChange={(e) =>
                    handleInputChange("chassis_number", e.target.value)
                  }
                  placeholder="Enter chassis number"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-primary-700 dark:text-primary-300">
                  Tag Number{" "}
                  <span className="text-error-600 dark:text-error-400">*</span>
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
                        validationErrors.tag_number
                          ? "border-error-500 dark:border-error-400"
                          : ""
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={generateTagNumber}
                    disabled={isGeneratingTag}
                    className="px-3 py-2 min-w-0 transition-colors disabled:opacity-50"
                    title="Generate tag number from backend"
                  >
                    <RefreshCw
                      size={16}
                      className={`text-primary-600 dark:text-primary-300 ${
                        isGeneratingTag ? "animate-spin" : ""
                      }`}
                    />
                  </Button>
                </div>
                <div className="mt-1">
                  {isValidatingTag && (
                    <p className="text-xs text-accent-600 dark:text-accent-400">
                      Validating tag number...
                    </p>
                  )}
                  {!isValidatingTag && !validationErrors.tag_number && (
                    <p className="text-xs text-primary-500 dark:text-primary-500">
                      Click the refresh button to auto-generate a unique tag
                      number (Format: V-4578A)
                    </p>
                  )}
                  {validationErrors.tag_number && (
                    <p className="text-sm text-error-600 dark:text-error-400">
                      {validationErrors.tag_number}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-primary-700 dark:text-primary-300">
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

              {/* ✅ Vehicle Color field */}
              <div>
                <label className="block mb-1 text-sm font-medium text-primary-700 dark:text-primary-300">
                  Vehicle Color
                </label>
                <Input
                  value={formData.color || ""}
                  onChange={(e) => handleInputChange("color", e.target.value)}
                  placeholder="Enter vehicle color"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Location Information */}
        <Card>
          <div className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-primary-900 dark:text-primary-50">
              Location Information
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block mb-1 text-sm font-medium text-primary-700 dark:text-primary-300">
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
                <label className="block mb-1 text-sm font-medium text-primary-700 dark:text-primary-300">
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
              <h2 className="text-lg font-semibold text-primary-900 dark:text-primary-50">
                Financial Information
              </h2>
              <div className="flex items-center gap-2">
                {autoCalculate ? (
                  <span className="flex items-center gap-1 text-sm text-success-600 dark:text-success-400 bg-success-50 dark:bg-success-950 px-3 py-1 rounded-full">
                    <Calculator size={14} />
                    Auto-calculating
                  </span>
                ) : (
                  <>
                    <span className="flex items-center gap-1 text-sm text-warning-600 dark:text-warning-400 bg-warning-50 dark:bg-warning-950 px-3 py-1 rounded-full">
                      Manual override
                    </span>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleRecalculate}
                      className="text-sm"
                      leftIcon={<RefreshCw size={14} />}
                    >
                      Recalculate
                    </Button>
                  </>
                )}
              </div>
            </div>

            {autoCalculate && (
              <div className="mb-4 p-3 bg-accent-50 dark:bg-accent-950 border border-accent-300 dark:border-accent-700 rounded-lg">
                <p className="text-sm text-accent-800 dark:text-accent-300">
                  <strong>Auto-calculation enabled:</strong> Annual
                  depreciation, accumulated depreciation, and net book value are
                  calculated automatically based on purchase amount,
                  depreciation rate, and year of purchase. Edit any calculated
                  field to override.
                </p>
              </div>
            )}

            {!autoCalculate && (
              <div className="mb-4 p-3 bg-warning-50 dark:bg-warning-950 border border-warning-300 dark:border-warning-700 rounded-lg">
                <p className="text-sm text-warning-800 dark:text-warning-300">
                  <strong>Manual mode:</strong> You've edited a calculated
                  field. Click "Recalculate" to re-enable automatic
                  calculations.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="block mb-1 text-sm font-medium text-primary-700 dark:text-primary-300">
                  Amount
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.amount || ""}
                  onChange={(e) =>
                    handleInputChange(
                      "amount",
                      Number.parseFloat(e.target.value) || undefined
                    )
                  }
                  placeholder="Enter amount"
                  className={
                    autoCalculate
                      ? "ring-2 ring-success-200 dark:ring-success-800"
                      : ""
                  }
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-primary-700 dark:text-primary-300">
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
                  className={
                    autoCalculate
                      ? "ring-2 ring-success-200 dark:ring-success-800"
                      : ""
                  }
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-primary-700 dark:text-primary-300">
                  Annual Depreciation{" "}
                  {autoCalculate && (
                    <span className="text-xs text-success-600 dark:text-success-400">
                      (auto)
                    </span>
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
                    autoCalculate ? "bg-success-50 dark:bg-success-950" : ""
                  }
                  readOnly={autoCalculate}
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-primary-700 dark:text-primary-300">
                  Accumulated Depreciation{" "}
                  {autoCalculate && (
                    <span className="text-xs text-success-600 dark:text-success-400">
                      (auto)
                    </span>
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
                    autoCalculate ? "bg-success-50 dark:bg-success-950" : ""
                  }
                  readOnly={autoCalculate}
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-primary-700 dark:text-primary-300">
                  Net Book Value{" "}
                  {autoCalculate && (
                    <span className="text-xs text-success-600 dark:text-success-400">
                      (auto)
                    </span>
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
                    autoCalculate ? "bg-success-50 dark:bg-success-950" : ""
                  }
                  readOnly={autoCalculate}
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-primary-700 dark:text-primary-300">
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
            <h2 className="mb-4 text-lg font-semibold text-primary-900 dark:text-primary-50">
              Important Dates
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block mb-1 text-sm font-medium text-primary-700 dark:text-primary-300">
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
                <label className="block mb-1 text-sm font-medium text-primary-700 dark:text-primary-300">
                  Date of Disposal
                </label>
                <Input
                  type="date"
                  value={formData.date_of_disposal || ""}
                  onChange={(e) =>
                    handleInputChange("date_of_disposal", e.target.value)
                  }
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Status and Management */}
        <Card>
          <div className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-primary-900 dark:text-primary-50">
              Status and Management
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="block mb-1 text-sm font-medium text-primary-700 dark:text-primary-300">
                  Asset Condition
                </label>
                <Select
                  value={formData.asset_condition || ""}
                  onChange={(e) =>
                    handleInputChange("asset_condition", e.target.value)
                  }
                >
                  <option value="New">New</option>
                  <option value="Good">Good</option>
                  <option value="Worn">Worn</option>
                  <option value="Needs Replacement">Needs Replacement</option>
                </Select>
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-primary-700 dark:text-primary-300">
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
              <div>
                <label className="block mb-1 text-sm font-medium text-primary-700 dark:text-primary-300">
                  Does the MV have a log book (Y/N)
                </label>
                <Select
                  value={formData.has_logbook || "N"}
                  onChange={(e) =>
                    handleInputChange("has_logbook", e.target.value)
                  }
                >
                  <option value="Y">Yes</option>
                  <option value="N">No</option>
                </Select>
              </div>
              <div className="md:col-span-3">
                <label className="block mb-1 text-sm font-medium text-primary-700 dark:text-primary-300">
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

        {/* Vehicle Images */}
        <Card>
          <div className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-primary-900 dark:text-primary-50">
              Vehicle Images{" "}
              <small className="text-sm text-primary-600 dark:text-primary-400">
                (optional)
              </small>
            </h2>
            <p className="mb-4 text-sm text-primary-600 dark:text-primary-400">
              Upload images of the vehicle or take photos directly. Supported
              formats: JPG, PNG, GIF (Max 10MB each)
            </p>

            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragOver
                  ? "border-accent-500 dark:border-accent-400 bg-accent-50 dark:bg-accent-950"
                  : "border-primary-300 dark:border-primary-700 hover:border-primary-400 dark:hover:border-primary-600"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div
                    className={`p-3 rounded-full ${
                      isDragOver
                        ? "bg-accent-100 dark:bg-accent-900"
                        : "bg-primary-100 dark:bg-primary-800"
                    }`}
                  >
                    <Upload
                      size={24}
                      className={
                        isDragOver
                          ? "text-accent-600 dark:text-accent-400"
                          : "text-primary-600 dark:text-primary-300"
                      }
                    />
                  </div>
                </div>

                <div>
                  <p className="text-lg font-medium text-primary-900 dark:text-primary-100">
                    {isDragOver
                      ? "Drop images here"
                      : "Upload or capture vehicle images"}
                  </p>
                  <p className="text-sm text-primary-600 dark:text-primary-400 mt-1">
                    Drag and drop images here, or use the buttons below
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => fileInputRef.current?.click()}
                    leftIcon={<Plus size={16} />}
                    className="inline-flex"
                  >
                    Choose Files
                  </Button>

                  <Button
                    type="button"
                    variant="success"
                    onClick={startCamera}
                    leftIcon={<Camera size={16} />}
                    className="inline-flex"
                  >
                    Take Photo
                  </Button>
                </div>
              </div>
            </div>

            {/* Image Previews */}
            {images.length > 0 && (
              <div className="mt-6">
                <h3 className="mb-3 text-sm font-medium text-primary-900 dark:text-primary-100">
                  Vehicle Images ({images.length})
                  {images.some((img) => img.isExisting) && (
                    <span className="ml-2 text-xs text-primary-500 dark:text-primary-500">
                      (includes existing images)
                    </span>
                  )}
                </h3>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {images.map((image) => (
                    <div
                      key={image.id}
                      className="relative group bg-primary-100 dark:bg-primary-800 rounded-lg overflow-hidden aspect-square"
                    >
                      <img
                        src={image.url || "/placeholder.svg"}
                        alt="Vehicle preview"
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />

                      {image.isExisting && (
                        <div className="absolute top-2 left-2 bg-success-600 dark:bg-success-500 text-white text-xs px-2 py-1 rounded">
                          Existing
                        </div>
                      )}

                      {/* Overlay with actions */}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => removeImage(image.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity bg-error-600 hover:bg-error-700 dark:bg-error-500 dark:hover:bg-error-600 text-white p-2 rounded-full shadow-lg"
                          title="Remove image"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {/* File info */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2">
                        <p className="text-xs text-white truncate opacity-0 group-hover:opacity-100 transition-opacity">
                          {image.file?.name || "Existing image"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload Stats */}
            {images.length > 0 && (
              <div className="mt-4 p-3 bg-primary-50 dark:bg-primary-900 rounded-lg">
                <div className="flex items-center justify-between text-sm text-primary-600 dark:text-primary-400">
                  <span className="flex items-center">
                    <ImageIcon size={16} className="mr-1" />
                    {images.length} image{images.length !== 1 ? "s" : ""} (
                    {images.filter((img) => img.isExisting).length} existing,{" "}
                    {images.filter((img) => !img.isExisting).length} new)
                  </span>
                  <span>
                    New files size:{" "}
                    {(
                      images
                        .filter((img) => img.file)
                        .reduce((acc, img) => acc + (img.file?.size || 0), 0) /
                      (1024 * 1024)
                    ).toFixed(1)}{" "}
                    MB
                  </span>
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-primary-900 dark:text-primary-50">
                Upload Excel File
              </h2>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-accent-500 dark:bg-accent-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-primary-600 dark:text-primary-400">
                  Ready to upload
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <input
                  ref={excel_file_input_ref}
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handle_file_upload}
                  className="block w-full text-sm text-primary-600 dark:text-primary-400 cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-accent-50 dark:file:bg-accent-950 file:text-accent-700 dark:file:text-accent-300 hover:file:bg-accent-100 dark:hover:file:bg-accent-900 file:cursor-pointer"
                  disabled={is_processing_excel || is_uploading}
                />
              </div>

              {(is_processing_excel || is_uploading) && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-primary-600 dark:text-primary-400">
                    <span>
                      {is_processing_excel
                        ? "Processing Excel file..."
                        : "Uploading to server..."}
                    </span>
                    <span>{Math.round(upload_progress)}%</span>
                  </div>
                  <div className="w-full bg-primary-200 dark:bg-primary-800 rounded-full h-2.5">
                    <div
                      className="bg-accent-600 dark:bg-accent-500 h-2.5 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${upload_progress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {excel_data.length > 0 &&
                !is_processing_excel &&
                !is_uploading && (
                  <div className="flex justify-between items-center p-3 bg-success-50 dark:bg-success-950 rounded-md border border-success-300 dark:border-success-700">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-success-600 dark:bg-success-400 rounded-full"></div>
                      <span className="text-sm text-success-800 dark:text-success-300">
                        {excel_data.length} vehicle(s) ready for review
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => set_show_excel_modal(true)}
                      className="text-sm font-medium text-success-800 dark:text-success-300 hover:text-success-900 dark:hover:text-success-200"
                    >
                      Review Data →
                    </button>
                  </div>
                )}

              <div className="p-3 bg-primary-50 dark:bg-primary-900 rounded-md border border-primary-300 dark:border-primary-700">
                <p className="text-sm text-primary-700 dark:text-primary-300">
                  <strong>Excel Format:</strong> Your Excel file should include
                  columns matching the form fields: "Registration Number", "Tag
                  Number", "Make/Model", "Year of Purchase", "Engine Number",
                  "Chassis Number", "Amount", etc.
                </p>
              </div>
            </div>
          </div>
        </Card>

        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate("/categories/vehicles")}
            leftIcon={<X size={16} />}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            leftIcon={<Save size={16} />}
            isLoading={isLoading}
          >
            {isEditing ? "Update Vehicle" : "Create Vehicle"}
          </Button>
        </div>
      </form>

      <ConfirmVehicleExcelModal
        show={show_excel_modal}
        data={excel_data}
        onConfirm={handle_excel_submit}
        onCancel={() => {
          set_show_excel_modal(false);
          if (excel_file_input_ref.current)
            excel_file_input_ref.current.value = "";
        }}
        isLoading={is_uploading}
      />
    </div>
  );
};

export default VehicleForm;

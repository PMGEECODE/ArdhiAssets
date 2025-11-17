"use client";

// src/pages/Buildings/BuildingForm.tsx
import type React from "react";
import { useState, useRef, useEffect } from "react";
import { useNavigate, Link, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import Button from "../../../../shared//components/ui/Button";
import ConfirmBuildingExcelModal from "../../../../shared//components/ui/ConfirmBuildingExcelModal";
import * as XLSX from "xlsx";
import {
  ChevronRight,
  Home,
  Plus,
  Upload,
  Camera,
  X,
  Trash2,
  ImageIcon,
  RotateCcw,
  Check,
  FileText,
} from "lucide-react";
import { useBuildingStore } from "../../../../shared//store/buildingStore";
import { intelligentColumnMapper } from "../../../../shared//utils/columnMapper";
import { API_URL } from "../../../../shared//config/constants";

interface FilePreview {
  file?: File;
  url: string;
  id: string;
  isExisting?: boolean;
  type: "image" | "document";
}

const BuildingForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const {
    createBuilding,
    checkBuildingNames,
    uploadExcelData,
    isLoading,
    buildings,
    updateBuilding,
  } = useBuildingStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [form_data, set_form_data] = useState({
    description_name_of_building: "",
    building_ownership: "",
    category: "",
    building_no: "",
    institution_no: "",

    // Location fields
    nearest_town_shopping_centre: "",
    street: "",
    county: "",
    sub_county: "",
    division: "",
    location: "",
    sub_location: "",

    // Land and ownership
    lr_no: "",
    size_of_land_ha: "",
    ownership_status: "",
    source_of_funds: "",
    mode_of_acquisition: "",
    date_of_purchase_or_commissioning: "",

    // Building specifications
    type_of_building: "",
    designated_use: "",
    estimated_useful_life: "",
    no_of_floors: "",
    plinth_area: "",

    // Financial fields
    cost_of_construction_or_valuation: "",
    annual_depreciation: "",
    accumulated_depreciation_to_date: "",
    net_book_value: "",
    annual_rental_income: "",

    // Additional information
    remarks: "",
  });

  const [files, setFiles] = useState<FilePreview[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

  const [excel_data, set_excel_data] = useState<any[]>([]);
  const [show_modal, set_show_modal] = useState<boolean>(false);
  const [upload_progress, set_upload_progress] = useState<number>(0);
  const [is_processing_excel, setIs_processing_excel] = useState(false);
  const [is_loading_building, set_is_loading_building] = useState(false);

  const file_input_ref = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (id && id !== "new") {
      set_is_loading_building(true);
      const found = buildings.find((b) => String(b.id) === id);

      if (found) {
        // Populate form with existing building data
        set_form_data({
          description_name_of_building:
            found.description_name_of_building || "",
          building_ownership: found.building_ownership || "",
          category: found.category || "",
          building_no: found.building_no || "",
          institution_no: found.institution_no || "",
          nearest_town_shopping_centre:
            found.nearest_town_shopping_centre || "",
          street: found.street || "",
          county: found.county || "",
          sub_county: found.sub_county || "",
          division: found.division || "",
          location: found.location || "",
          sub_location: found.sub_location || "",
          lr_no: found.lr_no || "",
          size_of_land_ha: found.size_of_land_ha
            ? String(found.size_of_land_ha)
            : "",
          ownership_status: found.ownership_status || "",
          source_of_funds: found.source_of_funds || "",
          mode_of_acquisition: found.mode_of_acquisition || "",
          date_of_purchase_or_commissioning:
            found.date_of_purchase_or_commissioning
              ? new Date(found.date_of_purchase_or_commissioning)
                  .toISOString()
                  .split("T")[0]
              : "",
          type_of_building: found.type_of_building || "",
          designated_use: found.designated_use || "",
          estimated_useful_life: found.estimated_useful_life
            ? String(found.estimated_useful_life)
            : "",
          no_of_floors: found.no_of_floors ? String(found.no_of_floors) : "",
          plinth_area: found.plinth_area ? String(found.plinth_area) : "",
          cost_of_construction_or_valuation:
            found.cost_of_construction_or_valuation
              ? String(found.cost_of_construction_or_valuation)
              : "",
          annual_depreciation: found.annual_depreciation
            ? String(found.annual_depreciation)
            : "",
          accumulated_depreciation_to_date:
            found.accumulated_depreciation_to_date
              ? String(found.accumulated_depreciation_to_date)
              : "",
          net_book_value: found.net_book_value
            ? String(found.net_book_value)
            : "",
          annual_rental_income: found.annual_rental_income
            ? String(found.annual_rental_income)
            : "",
          remarks: found.remarks || "",
        });
        set_is_loading_building(false);
      } else {
        // Fetch from API if not in store
        const fetchBuilding = async () => {
          try {
            const storedAuth = localStorage.getItem("auth-storage");
            const authData = storedAuth ? JSON.parse(storedAuth) : null;
            const token = authData?.state?.token;

            const response = await fetch(`${API_URL}/buildings/${id}`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });

            if (!response.ok) throw new Error("Failed to fetch building");

            const fetched = await response.json();
            set_form_data({
              description_name_of_building:
                fetched.description_name_of_building || "",
              building_ownership: fetched.building_ownership || "",
              category: fetched.category || "",
              building_no: fetched.building_no || "",
              institution_no: fetched.institution_no || "",
              nearest_town_shopping_centre:
                fetched.nearest_town_shopping_centre || "",
              street: fetched.street || "",
              county: fetched.county || "",
              sub_county: fetched.sub_county || "",
              division: fetched.division || "",
              location: fetched.location || "",
              sub_location: fetched.sub_location || "",
              lr_no: fetched.lr_no || "",
              size_of_land_ha: fetched.size_of_land_ha
                ? String(fetched.size_of_land_ha)
                : "",
              ownership_status: fetched.ownership_status || "",
              source_of_funds: fetched.source_of_funds || "",
              mode_of_acquisition: fetched.mode_of_acquisition || "",
              date_of_purchase_or_commissioning:
                fetched.date_of_purchase_or_commissioning
                  ? new Date(fetched.date_of_purchase_or_commissioning)
                      .toISOString()
                      .split("T")[0]
                  : "",
              type_of_building: fetched.type_of_building || "",
              designated_use: fetched.designated_use || "",
              estimated_useful_life: fetched.estimated_useful_life
                ? String(fetched.estimated_useful_life)
                : "",
              no_of_floors: fetched.no_of_floors
                ? String(fetched.no_of_floors)
                : "",
              plinth_area: fetched.plinth_area
                ? String(fetched.plinth_area)
                : "",
              cost_of_construction_or_valuation:
                fetched.cost_of_construction_or_valuation
                  ? String(fetched.cost_of_construction_or_valuation)
                  : "",
              annual_depreciation: fetched.annual_depreciation
                ? String(fetched.annual_depreciation)
                : "",
              accumulated_depreciation_to_date:
                fetched.accumulated_depreciation_to_date
                  ? String(fetched.accumulated_depreciation_to_date)
                  : "",
              net_book_value: fetched.net_book_value
                ? String(fetched.net_book_value)
                : "",
              annual_rental_income: fetched.annual_rental_income
                ? String(fetched.annual_rental_income)
                : "",
              remarks: fetched.remarks || "",
            });
          } catch (error) {
            console.error("Failed to fetch building:", error);
            toast.error("Failed to load building data");
          } finally {
            set_is_loading_building(false);
          }
        };

        fetchBuilding();
      }
    }
  }, [id, buildings]);

  useEffect(() => {
    return () => {
      files.forEach((file) => {
        if (!file.isExisting && file.url.startsWith("blob:")) {
          URL.revokeObjectURL(file.url);
        }
      });
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handle_change = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    set_form_data((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // File handling functions
  const handleFileSelect = (selectedFiles: FileList) => {
    const validFiles = Array.from(selectedFiles).filter((file) => {
      const isImage = file.type.startsWith("image/");
      const isPDF = file.type === "application/pdf";

      if (!isImage && !isPDF) {
        toast.error(
          `${file.name} is not a supported file type (images or PDF only)`
        );
        return false;
      }

      if (file.size > 50 * 1024 * 1024) {
        // 50MB limit
        toast.error(`${file.name} is too large (max 50MB)`);
        return false;
      }

      return true;
    });

    const newFiles: FilePreview[] = validFiles.map((file) => ({
      file,
      url: URL.createObjectURL(file),
      id: Math.random().toString(36).substring(2, 15),
      type: file.type.startsWith("image/") ? "image" : "document",
      isExisting: false,
    }));

    setFiles((prev) => [...prev, ...newFiles]);
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

  const removeFile = (fileId: string) => {
    setFiles((prev) => {
      const fileToRemove = prev.find((f) => f.id === fileId);
      if (
        fileToRemove &&
        !fileToRemove.isExisting &&
        fileToRemove.url.startsWith("blob:")
      ) {
        URL.revokeObjectURL(fileToRemove.url);
      }
      return prev.filter((f) => f.id !== fileId);
    });
  };

  // Camera functions
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });

      setStream(mediaStream);
      setIsCameraOpen(true);
      setCapturedPhoto(null);

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

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

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
          const timestamp = new Date().getTime();
          const file = new File([blob], `building-photo-${timestamp}.jpg`, {
            type: "image/jpeg",
          });

          const newFile: FilePreview = {
            file,
            url: capturedPhoto,
            id: Math.random().toString(36).substring(2, 15),
            type: "image",
            isExisting: false,
          };

          setFiles((prev) => [...prev, newFile]);
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

      const mapped_data = json_data.map((row: any) => {
        const mapped = intelligentColumnMapper(row, {
          description_name_of_building: [
            "Description Name of Building",
            "Building Name",
            "Name",
          ],
          building_ownership: ["Building Ownership", "Ownership"],
          category: ["Category"],
          building_no: ["Building No", "Building Number", "Bldg No"],
          institution_no: ["Institution No", "Institution Number", "Inst No"],
          nearest_town_shopping_centre: [
            "Nearest Town Shopping Centre",
            "Nearest Town",
            "Town",
          ],
          street: ["Street"],
          county: ["County"],
          sub_county: ["Sub County", "Subcounty"],
          division: ["Division"],
          location: ["Location"],
          sub_location: ["Sub Location", "Sublocation"],
          lr_no: ["LR No", "LR Number", "Land Reference"],
          size_of_land_ha: ["Size of Land Ha", "Land Size", "Size Ha"],
          ownership_status: ["Ownership Status", "Status"],
          source_of_funds: ["Source of Funds", "Funding Source"],
          mode_of_acquisition: ["Mode of Acquisition", "Acquisition Mode"],
          date_of_purchase_or_commissioning: [
            "Date of Purchase or Commissioning",
            "Purchase Date",
            "Date",
          ],
          type_of_building: ["Type of Building", "Building Type"],
          designated_use: ["Designated Use", "Use"],
          estimated_useful_life: [
            "Estimated Useful Life",
            "Useful Life",
            "Life Years",
          ],
          no_of_floors: ["No of Floors", "Floors", "Number of Floors"],
          plinth_area: ["Plinth Area", "Area"],
          cost_of_construction_or_valuation: [
            "Cost of Construction or Valuation",
            "Cost",
            "Valuation",
          ],
          annual_depreciation: ["Annual Depreciation", "Depreciation"],
          accumulated_depreciation_to_date: [
            "Accumulated Depreciation to Date",
            "Accumulated Depreciation",
          ],
          net_book_value: ["Net Book Value", "Book Value", "NBV"],
          annual_rental_income: ["Annual Rental Income", "Rental Income"],
          remarks: ["Remarks", "Notes", "Comments"],
        });

        console.log("[v0] Mapped building:", mapped);
        return mapped;
      });

      console.log("[v0] All mapped data:", mapped_data);

      set_upload_progress(100);
      setTimeout(() => {
        setIs_processing_excel(false);
        set_upload_progress(0);
        set_excel_data(mapped_data);
        set_show_modal(true);
      }, 500);
    };

    reader.readAsArrayBuffer(uploaded_file);
  };

  const is_valid_date = (date_str: string) => {
    const d = new Date(date_str);
    return d instanceof Date && !isNaN(d.getTime());
  };

  const handle_submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    const newFiles = files
      .filter((f) => f.file && f.file.size > 0)
      .map((f) => f.file!);

    const clean_form_data = {
      ...form_data,
      no_of_floors: form_data.no_of_floors
        ? Number.parseInt(form_data.no_of_floors)
        : null,
      estimated_useful_life: form_data.estimated_useful_life
        ? Number.parseInt(form_data.estimated_useful_life)
        : null,
      size_of_land_ha: form_data.size_of_land_ha
        ? Number.parseFloat(form_data.size_of_land_ha)
        : null,
      plinth_area: form_data.plinth_area
        ? Number.parseFloat(form_data.plinth_area)
        : null,
      cost_of_construction_or_valuation:
        form_data.cost_of_construction_or_valuation
          ? Number.parseFloat(form_data.cost_of_construction_or_valuation)
          : null,
      annual_depreciation: form_data.annual_depreciation
        ? Number.parseFloat(form_data.annual_depreciation)
        : null,
      accumulated_depreciation_to_date:
        form_data.accumulated_depreciation_to_date
          ? Number.parseFloat(form_data.accumulated_depreciation_to_date)
          : null,
      net_book_value: form_data.net_book_value
        ? Number.parseFloat(form_data.net_book_value)
        : null,
      annual_rental_income: form_data.annual_rental_income
        ? Number.parseFloat(form_data.annual_rental_income)
        : null,
      date_of_purchase_or_commissioning: is_valid_date(
        form_data.date_of_purchase_or_commissioning
      )
        ? new Date(form_data.date_of_purchase_or_commissioning).toISOString()
        : null,
      support_files: newFiles,
      keep_existing_files: files.some((f) => f.isExisting),
    };

    try {
      if (id && id !== "new") {
        await updateBuilding(id!, clean_form_data as any);
      } else {
        await createBuilding(clean_form_data as any);
      }
      toast.success(
        `Building ${id && id !== "new" ? "updated" : "added"} successfully!`
      );
      setTimeout(() => navigate("/categories/buildings"), 1500);
    } catch (err: any) {
      toast.error(
        `Failed to ${id && id !== "new" ? "update" : "create"} building`
      );
    }
  };

  const handle_excel_submit = async (data_to_upload?: any[]) => {
    if (isLoading) return;

    set_upload_progress(0);
    const data_to_process = data_to_upload || excel_data;

    if (data_to_process.length === 0) {
      toast.error("No data found in the Excel file.");
      return;
    }

    try {
      const building_names = data_to_process.map(
        (building) => building.description_name_of_building
      );

      set_upload_progress(20);
      const existing_names = await checkBuildingNames(building_names);

      set_upload_progress(40);
      const buildings_to_insert = data_to_process.filter(
        (building) =>
          !existing_names.includes(building.description_name_of_building)
      );

      if (buildings_to_insert.length > 0) {
        set_upload_progress(60);
        await uploadExcelData(buildings_to_insert);
        set_upload_progress(100);
        toast.success("Excel data uploaded successfully!");

        setTimeout(() => {
          set_show_modal(false);
          set_upload_progress(0);
        }, 1000);
      } else {
        set_upload_progress(100);
        toast.error("All buildings in the Excel file already exist.");
        setTimeout(() => {
          set_upload_progress(0);
        }, 1000);
      }
    } catch (err: any) {
      toast.error("Failed to upload excel data");
      set_upload_progress(0);
    }
  };

  const render_input = (key: string, label?: string, type = "text") => (
    <div key={key} className="col-span-1">
      <label
        htmlFor={key}
        className="block mb-1 text-sm font-medium text-gray-700 capitalize"
      >
        {label || key.replace(/_/g, " ")}
      </label>
      {key === "remarks" ? (
        <textarea
          id={key}
          name={key}
          value={form_data[key as keyof typeof form_data]}
          onChange={handle_change}
          rows={3}
          className="px-3 py-2 w-full rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter any additional remarks..."
        />
      ) : key === "ownership_status" ? (
        <select
          id={key}
          name={key}
          value={form_data[key as keyof typeof form_data]}
          onChange={handle_change}
          className="px-3 py-2 w-full rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select ownership status</option>
          <option value="Owned">Owned</option>
          <option value="Leased">Leased</option>
          <option value="Rented">Rented</option>
          <option value="Government">Government</option>
        </select>
      ) : key === "mode_of_acquisition" ? (
        <select
          id={key}
          name={key}
          value={form_data[key as keyof typeof form_data]}
          onChange={handle_change}
          className="px-3 py-2 w-full rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select acquisition mode</option>
          <option value="Purchase">Purchase</option>
          <option value="Donation">Donation</option>
          <option value="Construction">Construction</option>
          <option value="Transfer">Transfer</option>
          <option value="Inheritance">Inheritance</option>
        </select>
      ) : (
        <input
          id={key}
          type={type}
          name={key}
          value={form_data[key as keyof typeof form_data]}
          onChange={handle_change}
          className="px-3 py-2 w-full rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      )}
    </div>
  );

  if (is_loading_building) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="flex items-center space-x-2 text-gray-500">
          <svg
            className="w-5 h-5 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
          <span>Loading building details...</span>
        </div>
      </div>
    );
  }

  const is_edit_mode = id && id !== "new";

  return (
    <div className="p-2 mx-auto">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf"
        onChange={handleFileInputChange}
        className="hidden"
      />

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

      {/* Navigation Breadcrumb */}
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
          className="transition-colors hover:text-blue-600"
        >
          Asset Categories
        </Link>
        <ChevronRight size={16} />
        <Link
          to="/categories/buildings"
          className="transition-colors hover:text-blue-600"
        >
          Buildings
        </Link>
        <ChevronRight size={16} />
        <span className="flex items-center font-medium text-gray-900">
          <Plus size={16} className="mr-1" />
          {is_edit_mode ? "Edit Building" : "Add New Building"}
        </span>
      </nav>

      <h2 className="mb-6 text-2xl font-bold text-left">
        {is_edit_mode ? "Edit Building" : "Add New Building"}
      </h2>

      <form onSubmit={handle_submit} className="space-y-10">
        {/* Basic Building Information */}
        <div>
          <h3 className="mb-4 text-lg font-semibold">
            Basic Building Information
          </h3>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {render_input("description_name_of_building", "Building Name")}
            {render_input("building_ownership", "Building Ownership")}
            {render_input("category", "Category")}
            {render_input("building_no", "Building Number")}
            {render_input("institution_no", "Institution Number")}
          </div>
        </div>

        {/* Location Information */}
        <div>
          <h3 className="mb-4 text-lg font-semibold">Location Information</h3>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {render_input(
              "nearest_town_shopping_centre",
              "Nearest Town/Shopping Centre"
            )}
            {render_input("street", "Street")}
            {render_input("county", "County")}
            {render_input("sub_county", "Sub County")}
            {render_input("division", "Division")}
            {render_input("location", "Location")}
            {render_input("sub_location", "Sub Location")}
          </div>
        </div>

        {/* Land and Ownership Details */}
        <div>
          <h3 className="mb-4 text-lg font-semibold">
            Land and Ownership Details
          </h3>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {render_input("lr_no", "LR Number")}
            {render_input("size_of_land_ha", "Size of Land (Ha)", "number")}
            {render_input("ownership_status", "Ownership Status")}
            {render_input("source_of_funds", "Source of Funds")}
            {render_input("mode_of_acquisition", "Mode of Acquisition")}
            {render_input(
              "date_of_purchase_or_commissioning",
              "Date of Purchase/Commissioning",
              "date"
            )}
          </div>
        </div>

        {/* Building Specifications */}
        <div>
          <h3 className="mb-4 text-lg font-semibold">
            Building Specifications
          </h3>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {render_input("type_of_building", "Type of Building")}
            {render_input("designated_use", "Designated Use")}
            {render_input(
              "estimated_useful_life",
              "Estimated Useful Life (Years)",
              "number"
            )}
            {render_input("no_of_floors", "Number of Floors", "number")}
            {render_input("plinth_area", "Plinth Area (sq m)", "number")}
          </div>
        </div>

        {/* Financial Information */}
        <div>
          <h3 className="mb-4 text-lg font-semibold">Financial Information</h3>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {render_input(
              "cost_of_construction_or_valuation",
              "Cost of Construction/Valuation",
              "number"
            )}
            {render_input(
              "annual_depreciation",
              "Annual Depreciation",
              "number"
            )}
            {render_input(
              "accumulated_depreciation_to_date",
              "Accumulated Depreciation to Date",
              "number"
            )}
            {render_input("net_book_value", "Net Book Value", "number")}
            {render_input(
              "annual_rental_income",
              "Annual Rental Income",
              "number"
            )}
          </div>
        </div>

        {/* Additional Information */}
        <div>
          <h3 className="mb-4 text-lg font-semibold">Additional Information</h3>
          <div className="grid grid-cols-1 gap-6">
            {render_input("remarks", "Remarks")}
          </div>
        </div>

        <div className="p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            Support Files{" "}
            <small className="text-sm text-gray-600">(optional)</small>
          </h3>
          <p className="mb-4 text-sm text-gray-600">
            Upload building images, floor plans, PDFs, or other support
            documents. Supported formats: JPG, PNG, GIF, PDF (Max 50MB each)
          </p>

          {/* Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragOver
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 hover:border-gray-400"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="space-y-4">
              <div className="flex justify-center">
                <div
                  className={`p-3 rounded-full ${
                    isDragOver ? "bg-blue-100" : "bg-gray-100"
                  }`}
                >
                  <Upload
                    size={24}
                    className={isDragOver ? "text-blue-600" : "text-gray-600"}
                  />
                </div>
              </div>

              <div>
                <p className="text-lg font-medium text-gray-900">
                  {isDragOver
                    ? "Drop files here"
                    : "Upload or capture building files"}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Drag and drop files here, or use the buttons below
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
                  variant="primary"
                  onClick={startCamera}
                  leftIcon={<Camera size={16} />}
                  className="inline-flex bg-green-600 hover:bg-green-700"
                >
                  Take Photo
                </Button>
              </div>
            </div>
          </div>

          {/* File Previews */}
          {files.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-3 text-sm font-medium text-gray-900">
                Support Files ({files.length})
                {files.some((f) => f.isExisting) && (
                  <span className="ml-2 text-xs text-gray-500">
                    (includes existing files)
                  </span>
                )}
              </h3>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="relative group bg-gray-100 rounded-lg overflow-hidden aspect-square"
                  >
                    {file.type === "image" ? (
                      <img
                        src={file.url || "/placeholder.svg"}
                        alt="Building file"
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-red-50">
                        <FileText size={32} className="text-red-600" />
                      </div>
                    )}

                    {file.isExisting && (
                      <div className="absolute top-2 left-2 bg-green-600 text-white text-xs px-2 py-1 rounded">
                        Existing
                      </div>
                    )}

                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => removeFile(file.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-600 hover:bg-red-700 text-white p-2 rounded-full shadow-lg"
                        title="Remove file"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2">
                      <p className="text-xs text-white truncate opacity-0 group-hover:opacity-100 transition-opacity">
                        {file.file?.name || "Existing file"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Stats */}
          {files.length > 0 && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span className="flex items-center">
                  <ImageIcon size={16} className="mr-1" />
                  {files.length} file{files.length !== 1 ? "s" : ""} (
                  {files.filter((f) => f.isExisting).length} existing,{" "}
                  {files.filter((f) => !f.isExisting).length} new)
                </span>
                <span>
                  New files size:{" "}
                  {(
                    files
                      .filter((f) => f.file)
                      .reduce((acc, f) => acc + (f.file?.size || 0), 0) /
                    (1024 * 1024)
                  ).toFixed(1)}{" "}
                  MB
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Excel Upload - Only show on create mode */}
        {!is_edit_mode && (
          <div className="p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Upload Excel File
              </h3>
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
                  disabled={is_processing_excel || isLoading}
                />
              </div>

              {/* Progress Bar */}
              {(is_processing_excel || isLoading) && (
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
                    {isLoading && "Sending data to server..."}
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

              {isLoading && (
                <div className="flex items-center p-3 space-x-2 text-green-600 bg-green-50 rounded-md">
                  <div className="w-4 h-4 rounded-full border-2 border-green-600 animate-spin border-t-transparent"></div>
                  <span className="text-sm font-medium">
                    Uploading to server...
                  </span>
                </div>
              )}

              {/* File Info */}
              {excel_data.length > 0 && !is_processing_excel && !isLoading && (
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-md border border-green-200">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-green-700">
                      {excel_data.length} building(s) ready for review
                    </span>
                  </div>
                  <button
                    onClick={() => set_show_modal(true)}
                    className="text-sm font-medium text-green-700 hover:text-green-800"
                  >
                    Review Data →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading
              ? "Submitting..."
              : is_edit_mode
              ? "Update Building"
              : "Submit"}
          </Button>
        </div>
      </form>

      <ConfirmBuildingExcelModal
        show={show_modal}
        data={excel_data}
        onConfirm={handle_excel_submit}
        onCancel={() => {
          set_show_modal(false);
          if (file_input_ref.current) file_input_ref.current.value = "";
        }}
        isLoading={isLoading}
      />
    </div>
  );
};

export default BuildingForm;

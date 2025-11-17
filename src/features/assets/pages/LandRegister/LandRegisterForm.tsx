"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { toast } from "react-toastify";
import {
  MapPin,
  Save,
  X,
  Plus,
  Trash2,
  ChevronRight,
  Home,
  FolderOpen,
} from "lucide-react";
import * as XLSX from "xlsx";
import axios from "axios"; // Import axios

import {
  useLandRegisterStore,
  type LandRegister,
} from "../../../../shared/store/landRegisterStore";
import Button from "../../../../shared/components/ui/Button";
import Card from "../../../../shared/components/ui/Card";
import Input from "../../../../shared/components/ui/Input";
import Select from "../../../../shared/components/ui/Select";
import TextArea from "../../../../shared/components/ui/TextArea";
import ConfirmationModal from "../../../../shared/components/ui/ConfirmationPopup";
import Combobox from "../../../../shared/components/ui/Combobox";
import ConfirmLandRegisterExcelModal from "../../../../shared/components/ui/ConfirmLandRegisterExcelModal"; // Import the new modal

// Import Kenya location data
import {
  counties,
  getSubCountiesByCounty,
  getDivisionsBySubCounty,
  getLocationsByDivision,
  getSubLocationsByLocation,
  getTownsByCounty,
} from "../../../../shared/data/kenyaLocations";

const LandRegisterForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id && id !== "new");

  const {
    createLandRegister,
    updateLandRegister,
    getLandRegisterById,
    isLoading,
  } = useLandRegisterStore();

  // Form state
  const [formData, setFormData] = useState<Partial<LandRegister>>({
    description_of_land: "",
    mode_of_acquisition: "",
    category: "",
    county: "",
    sub_county: "",
    division: "",
    location: "",
    sub_location: "",
    nearest_town_location: "",
    gps_coordinates: "",
    polygon: { A: "" },
    lr_certificate_no: "",
    document_of_ownership: "",
    proprietorship_details: "",
    size_ha: undefined,
    land_tenure: "",
    acquisition_date: "",
    registration_date: "",
    disputed: "",
    encumbrances: "",
    planned_unplanned: "",
    purpose_use_of_land: "",
    surveyed: "",
    acquisition_amount: undefined,
    fair_value: undefined,
    disposal_date: "",
    disposal_value: undefined,
    annual_rental_income: undefined,
    remarks: "",
  });

  // Location dropdown state
  const [availableSubCounties, setAvailableSubCounties] = useState<any[]>([]);
  const [availableDivisions, setAvailableDivisions] = useState<any[]>([]);
  const [availableLocations, setAvailableLocations] = useState<any[]>([]);
  const [availableSubLocations, setAvailableSubLocations] = useState<any[]>([]);
  const [availableTowns, setAvailableTowns] = useState<any[]>([]);

  const [polygonPoints, setPolygonPoints] = useState<Record<string, string>>({
    A: "",
  });

  const [polygonErrors, setPolygonErrors] = useState<Record<string, string>>(
    {}
  );

  // Form validation errors
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  // Confirmation modal state
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingSubmitData, setPendingSubmitData] = useState<any>(null);

  const [excel_data, set_excel_data] = useState<any[]>([]);
  const [show_excel_modal, set_show_excel_modal] = useState<boolean>(false);
  const [is_uploading, set_is_uploading] = useState(false);
  const [upload_progress, set_upload_progress] = useState<number>(0);
  const [is_processing_excel, setIs_processing_excel] = useState(false);
  const file_input_ref = useRef<HTMLInputElement | null>(null);

  // Load existing land register data for editing
  useEffect(() => {
    if (isEditing && id) {
      loadLandRegister();
    }
  }, [id, isEditing]);

  // Update dependent dropdowns when location values change
  useEffect(() => {
    if (formData.county) {
      setAvailableSubCounties(getSubCountiesByCounty(formData.county));
      setAvailableTowns(getTownsByCounty(formData.county));

      // Clear dependent fields if county changes
      if (!availableSubCounties.find((sc) => sc.code === formData.sub_county)) {
        setFormData((prev) => ({
          ...prev,
          sub_county: "",
          division: "",
          location: "",
          sub_location: "",
        }));
      }
    } else {
      setAvailableSubCounties([]);
      setAvailableTowns([]);
    }
  }, [formData.county]);

  useEffect(() => {
    if (formData.sub_county) {
      setAvailableDivisions(getDivisionsBySubCounty(formData.sub_county));

      // Clear dependent fields if sub-county changes
      if (!availableDivisions.find((d) => d.code === formData.division)) {
        setFormData((prev) => ({
          ...prev,
          division: "",
          location: "",
          sub_location: "",
        }));
      }
    } else {
      setAvailableDivisions([]);
    }
  }, [formData.sub_county]);

  useEffect(() => {
    if (formData.division) {
      setAvailableLocations(getLocationsByDivision(formData.division));

      // Clear dependent fields if division changes
      if (!availableLocations.find((l) => l.code === formData.location)) {
        setFormData((prev) => ({
          ...prev,
          location: "",
          sub_location: "",
        }));
      }
    } else {
      setAvailableLocations([]);
    }
  }, [formData.division]);

  useEffect(() => {
    if (formData.location) {
      setAvailableSubLocations(getSubLocationsByLocation(formData.location));

      // Clear sub-location if location changes
      if (
        !availableSubLocations.find((sl) => sl.code === formData.sub_location)
      ) {
        setFormData((prev) => ({
          ...prev,
          sub_location: "",
        }));
      }
    } else {
      setAvailableSubLocations([]);
    }
  }, [formData.location]);

  const loadLandRegister = async () => {
    if (!id) return;

    try {
      const landRegister = await getLandRegisterById(id);
      if (landRegister) {
        setFormData(landRegister);
        setPolygonPoints(landRegister.polygon || { A: "" });
      }
    } catch (error) {
      toast.error("Failed to load land register");
      navigate("/categories/land-register");
    }
  };

  // Form input handlers
  const handleInputChange = (field: keyof LandRegister, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Polygon point management
  const addPolygonPoint = () => {
    const nextLetter = String.fromCharCode(
      65 + Object.keys(polygonPoints).length
    );
    setPolygonPoints((prev) => ({ ...prev, [nextLetter]: "" }));
  };

  const updatePolygonPoint = (point: string, value: string) => {
    // Allow empty string, negative/positive numbers, commas, and decimals
    if (
      value === "" ||
      /^-?\d*\.?\d*(,\s*-?\d*\.?\d*)?$/.test(value) // allows "-12.34,56.8219" or "239000,9849228"
    ) {
      setPolygonPoints((prev) => ({ ...prev, [point]: value }));

      if (polygonErrors[point]) {
        setPolygonErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[point];
          return newErrors;
        });
      }
    }
  };

  const removePolygonPoint = (point: string) => {
    if (Object.keys(polygonPoints).length > 1) {
      const newPoints = { ...polygonPoints };
      delete newPoints[point];
      setPolygonPoints(newPoints);
    }
  };

  // Validation functions
  const validatePolygonPoint = (value: string): string | null => {
    if (!value.trim()) {
      return "Coordinates are required";
    }

    const coords = value.split(",").map((coord) => coord.trim());

    if (coords.length !== 2) {
      return "Please enter coordinates separated by comma (e.g., -1.2921,36.8219 or 239000,9849228)";
    }

    const [x, y] = coords;
    const numX = Number(x);
    const numY = Number(y);

    if (isNaN(numX) || isNaN(numY)) {
      return "Coordinates must be valid numbers";
    }

    // Case 1: Lat/Lng
    if (numX >= -90 && numX <= 90 && numY >= -180 && numY <= 180) {
      return null; // valid lat/long
    }

    // Case 2: UTM-like (large values, e.g., >100000)
    if (numX > 1000 && numY > 1000) {
      return null; // valid UTM-style coords
    }

    return "Coordinates must be either Lat/Lng (-90–90, -180–180) or valid UTM values";
  };

  const validateForm = (): string[] => {
    const errors: string[] = [];
    const newValidationErrors: Record<string, string> = {};

    // Basic validation
    if (!formData.description_of_land?.trim()) {
      errors.push("Description of land is required");
      newValidationErrors.description_of_land = "Field required";
    }

    // Required fields validation
    if (!formData.lr_certificate_no?.trim()) {
      errors.push("LR Certificate No. is required");
      newValidationErrors.lr_certificate_no = "Field required";
    }

    if (!formData.proprietorship_details?.trim()) {
      errors.push("Ownership Details is required");
      newValidationErrors.proprietorship_details = "Field required";
    }

    if (!formData.acquisition_date?.trim()) {
      errors.push("Acquisition Date is required");
      newValidationErrors.acquisition_date = "Field required";
    }

    // Set validation errors
    setValidationErrors(newValidationErrors);

    // Validate polygon points
    const newPolygonErrors: Record<string, string> = {};
    let hasPolygonErrors = false;

    Object.entries(polygonPoints).forEach(([point, value]) => {
      if (value.trim()) {
        // Only validate if value is provided
        const error = validatePolygonPoint(value);
        if (error) {
          newPolygonErrors[point] = error;
          hasPolygonErrors = true;
        }
      }
    });

    if (hasPolygonErrors) {
      setPolygonErrors(newPolygonErrors);
      errors.push("Please fix polygon coordinate errors");
    }

    return errors;
  };

  // GPS location handler
  const getCurrentLocation = (onSuccess: (coords: string) => void) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = `${pos.coords.latitude},${pos.coords.longitude}`;
          onSuccess(coords);
        },
        (err) => {
          console.error("Error fetching location:", err);
          alert("Unable to fetch location. Please enable GPS.");
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      alert("Geolocation not supported by your browser.");
    }
  };

  // Helper functions to convert location codes to names
  const getCountyName = (code: string): string => {
    const county = counties.find((c) => c.code === code);
    return county ? county.name : code;
  };

  const getSubCountyName = (code: string): string => {
    if (!formData.county) return code;
    const subCounties = getSubCountiesByCounty(formData.county);
    const subCounty = subCounties.find((sc) => sc.code === code);
    return subCounty ? subCounty.name : code;
  };

  const getDivisionName = (code: string): string => {
    if (!formData.sub_county) return code;
    const divisions = getDivisionsBySubCounty(formData.sub_county);
    const division = divisions.find((d) => d.code === code);
    return division ? division.name : code;
  };

  const getLocationName = (code: string): string => {
    if (!formData.division) return code;
    const locations = getLocationsByDivision(formData.division);
    const location = locations.find((l) => l.code === code);
    return location ? location.name : code;
  };

  const getSubLocationName = (code: string): string => {
    if (!formData.location) return code;
    const subLocations = getSubLocationsByLocation(formData.location);
    const subLocation = subLocations.find((sl) => sl.code === code);
    return subLocation ? subLocation.name : code;
  };

  const getTownName = (code: string): string => {
    if (!formData.county) return code;
    const towns = getTownsByCounty(formData.county);
    const town = towns.find((t) => t.code === code);
    return town ? town.name : code;
  };

  // Form submission handlers
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors = validateForm();

    if (errors.length > 0) {
      errors.forEach((error) => toast.error(error));
      return;
    }

    const submitData = {
      description_of_land: formData.description_of_land,
      mode_of_acquisition: formData.mode_of_acquisition || null,
      category: formData.category || null,
      county: formData.county ? getCountyName(formData.county) : null,
      sub_county: formData.sub_county
        ? getSubCountyName(formData.sub_county)
        : null,
      division: formData.division ? getDivisionName(formData.division) : null,
      location: formData.location ? getLocationName(formData.location) : null,
      sub_location: formData.sub_location
        ? getSubLocationName(formData.sub_location)
        : null,
      nearest_town_location: formData.nearest_town_location
        ? getTownName(formData.nearest_town_location)
        : null,
      gps_coordinates: formData.gps_coordinates || null,
      polygon:
        Object.keys(polygonPoints).length > 0 &&
        Object.values(polygonPoints).some((v) => v.trim())
          ? polygonPoints
          : null,
      lr_certificate_no: formData.lr_certificate_no || null,
      document_of_ownership: formData.document_of_ownership || null,
      proprietorship_details: formData.proprietorship_details || null,
      size_ha: formData.size_ha || null,
      land_tenure: formData.land_tenure || null,
      surveyed: formData.surveyed || null,
      acquisition_date: formData.acquisition_date || null,
      registration_date: formData.registration_date || null,
      disposal_date: formData.disposal_date || null,
      disputed: formData.disputed || null,
      planned_unplanned: formData.planned_unplanned || null,
      purpose_use_of_land: formData.purpose_use_of_land || null,
      acquisition_amount: formData.acquisition_amount || null,
      fair_value: formData.fair_value || null,
      disposal_value: formData.disposal_value || null,
      annual_rental_income: formData.annual_rental_income || null,
      encumbrances: formData.encumbrances || null,
      remarks: formData.remarks || null,
    };

    // Store submit data and show confirmation modal
    setPendingSubmitData(submitData);
    setShowConfirmation(true);
  };

  const handleConfirmSubmit = async () => {
    if (!pendingSubmitData) return;

    try {
      if (isEditing && id) {
        await updateLandRegister(id, pendingSubmitData);
        toast.success("Land register updated successfully");
      } else {
        await createLandRegister(
          pendingSubmitData as Omit<
            LandRegister,
            "id" | "created_at" | "updated_at"
          >
        );
        toast.success("Land register created successfully");
      }

      setShowConfirmation(false);
      setPendingSubmitData(null);
      navigate("/categories/land-register");
    } catch (error) {
      toast.error(
        isEditing
          ? "Failed to update land register"
          : "Failed to create land register"
      );
      setShowConfirmation(false);
      setPendingSubmitData(null);
    }
  };

  const handleCancelSubmit = () => {
    setShowConfirmation(false);
    setPendingSubmitData(null);
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

      console.log("Excel columns found:", Object.keys(json_data[0] || {}));
      console.log("First row data:", json_data[0]);

      const mapped_data = json_data.map((row: any) => ({
        // Required fields
        description_of_land:
          row["Description of Land"] || row["description_of_land"] || "",
        lr_certificate_no:
          row["LR Certificate No"] || row["lr_certificate_no"] || "",
        proprietorship_details:
          row["Ownership Details"] || row["proprietorship_details"] || "",
        acquisition_date:
          row["Acquisition Date"] || row["acquisition_date"] || "",

        // Optional basic fields
        mode_of_acquisition:
          row["Mode of Acquisition"] || row["mode_of_acquisition"] || undefined,
        category: row["Category"] || row["category"] || undefined,

        // Location fields
        county: row["County"] || row["county"] || undefined,
        sub_county: row["Sub County"] || row["sub_county"] || undefined,
        division: row["Division"] || row["division"] || undefined,
        location: row["Location"] || row["location"] || undefined,
        sub_location: row["Sub Location"] || row["sub_location"] || undefined,
        nearest_town_location:
          row["Nearest Town"] || row["nearest_town_location"] || undefined,
        gps_coordinates:
          row["GPS Coordinates"] || row["gps_coordinates"] || undefined,

        // Legal fields
        document_of_ownership:
          row["Document of Ownership"] ||
          row["document_of_ownership"] ||
          undefined,
        land_tenure: row["Land Tenure"] || row["land_tenure"] || undefined,
        surveyed: row["Surveyed"] || row["surveyed"] || undefined,

        // Size and dates
        size_ha:
          Number.parseFloat(row["Size (ha)"] || row["size_ha"] || "0") ||
          undefined,
        registration_date:
          row["Registration Date"] || row["registration_date"] || undefined,
        disposal_date:
          row["Disposal Date"] || row["disposal_date"] || undefined,

        // Status fields
        disputed: row["Disputed"] || row["disputed"] || undefined,
        planned_unplanned:
          row["Planned/Unplanned"] || row["planned_unplanned"] || undefined,
        purpose_use_of_land:
          row["Purpose of Land"] || row["purpose_use_of_land"] || undefined,
        encumbrances: row["Encumbrances"] || row["encumbrances"] || undefined,

        // Financial fields
        acquisition_amount:
          Number.parseFloat(
            row["Acquisition Amount"] || row["acquisition_amount"] || "0"
          ) || undefined,
        fair_value:
          Number.parseFloat(row["Fair Value"] || row["fair_value"] || "0") ||
          undefined,
        disposal_value:
          Number.parseFloat(
            row["Disposal Value"] || row["disposal_value"] || "0"
          ) || undefined,
        annual_rental_income:
          Number.parseFloat(
            row["Annual Rental Income"] || row["annual_rental_income"] || "0"
          ) || undefined,

        // Additional fields
        remarks: row["Remarks"] || row["remarks"] || undefined,
      }));

      console.log("Mapped land register data:", mapped_data);

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
      const lr_numbers = data_to_process.map((land) => land.lr_certificate_no);

      set_upload_progress(20);
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/land-assets/check-lr-numbers`,
        { lr_numbers },
        {
          withCredentials: true,
        }
      );

      set_upload_progress(40);
      const existing_lr_numbers = response.data.existing_lr_numbers || [];
      const lands_to_insert = data_to_process.filter(
        (land) => !existing_lr_numbers.includes(land.lr_certificate_no)
      );

      if (lands_to_insert.length > 0) {
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
          `${import.meta.env.VITE_API_URL}/land-assets/upload-excel-data`,
          { data: lands_to_insert },
          {
            withCredentials: true,
          }
        );

        set_upload_progress(100);
        toast.success("Excel data uploaded successfully!");

        setTimeout(() => {
          set_show_excel_modal(false);
          set_upload_progress(0);
          navigate("/categories/land-register");
        }, 1500);
      } else {
        set_upload_progress(100);
        toast.error("All land records in the Excel file already exist.");
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="flex sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm w-full">
        <div className="w-full flex justify-between px-2 py-0.5 sm:px-4 lg:px-6 ">
          <nav className="flex items-center mb-2 space-x-2 text-sm text-gray-600">
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
              to="/categories/land-register"
              className="transition-colors hover:text-blue-600"
            >
              Land Register
            </Link>
            <ChevronRight size={16} />
            <span className="flex items-center font-medium text-gray-900">
              <MapPin size={16} className="mr-1" />
              {isEditing ? "Edit Land Record" : "Add Land Record"}
            </span>
          </nav>

          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-1xl font-bold text-gray-900">
                {isEditing ? "Edit Land Record" : "Add Land Record"}
              </h1>
              <p className="mt-0 text-sm text-gray-400">
                {isEditing
                  ? "Update land register information"
                  : "Create a new land register entry"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="px-2 py-2 space-y-2">
        <form onSubmit={handleSubmit} className="space-y-2">
          {/* Basic Information */}
          <Card>
            <div className="p-4">
              <h2 className="mb-2 text-lg font-semibold text-gray-900">
                Basic Information
              </h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Description of Land <span className="text-red-500">*</span>
                  </label>
                  <TextArea
                    value={formData.description_of_land || ""}
                    onChange={(e) =>
                      handleInputChange("description_of_land", e.target.value)
                    }
                    placeholder="Enter detailed description of the land"
                    required
                    className={
                      validationErrors.description_of_land
                        ? "border-red-300 focus:border-red-500"
                        : ""
                    }
                  />
                  {validationErrors.description_of_land && (
                    <p className="mt-1 text-sm text-red-600">
                      {validationErrors.description_of_land}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Mode of Acquisition
                  </label>
                  <Select
                    value={formData.mode_of_acquisition || ""}
                    onChange={(e) =>
                      handleInputChange("mode_of_acquisition", e.target.value)
                    }
                  >
                    <option value="">Select mode</option>
                    <option value="Purchase">Purchase</option>
                    <option value="Transfer">Transfer</option>
                    <option value="Donation">Donation</option>
                    <option value="Inheritance">Inheritance</option>
                    <option value="Government Allocation">
                      Government Allocation
                    </option>
                  </Select>
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Category
                  </label>
                  <Select
                    value={formData.category || ""}
                    onChange={(e) =>
                      handleInputChange("category", e.target.value)
                    }
                  >
                    <option value="">Select category</option>
                    <option value="Land">Land</option>
                    <option value="Investment Property">
                      Investment Property
                    </option>
                  </Select>
                </div>
              </div>
            </div>
          </Card>

          {/* Location Details */}
          <Card>
            <div className="p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Location Details
              </h2>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    County
                  </label>
                  <Select
                    value={formData.county || ""}
                    onChange={(e) =>
                      handleInputChange("county", e.target.value)
                    }
                  >
                    <option value="">Select county</option>
                    {counties.map((county) => (
                      <option key={county.code} value={county.code}>
                        {county.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    Sub County
                  </label>
                  <Select
                    value={formData.sub_county || ""}
                    onChange={(e) =>
                      handleInputChange("sub_county", e.target.value)
                    }
                  >
                    <option value="">Select sub county</option>
                    {availableSubCounties.map((subCounty) => (
                      <option key={subCounty.code} value={subCounty.code}>
                        {subCounty.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    Division
                  </label>
                  <Select
                    value={formData.division || ""}
                    onChange={(e) =>
                      handleInputChange("division", e.target.value)
                    }
                  >
                    <option value="">Select division</option>
                    {availableDivisions.map((division) => (
                      <option key={division.code} value={division.code}>
                        {division.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    Location
                  </label>
                  <Select
                    value={formData.location || ""}
                    onChange={(e) =>
                      handleInputChange("location", e.target.value)
                    }
                  >
                    <option value="">Select location</option>
                    {availableLocations.map((location) => (
                      <option key={location.code} value={location.code}>
                        {location.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="relative">
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    Sub Location
                  </label>
                  <Combobox
                    value={formData.sub_location || ""}
                    onChange={(value) =>
                      handleInputChange("sub_location", value)
                    }
                    options={availableSubLocations}
                    placeholder="Select or type sub location"
                  />
                </div>
                <div className="relative">
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    Nearest Town
                  </label>
                  <Combobox
                    value={formData.nearest_town_location || ""}
                    onChange={(value) =>
                      handleInputChange("nearest_town_location", value)
                    }
                    options={availableTowns}
                    placeholder="Select or type nearest town"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Geographic Information */}
          <Card>
            <div className="p-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                Geographic Information
              </h2>
              <div className="space-y-4">
                {/* GPS Coordinates */}
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    GPS Coordinates
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={formData.gps_coordinates || ""}
                      onChange={(e) =>
                        handleInputChange("gps_coordinates", e.target.value)
                      }
                      placeholder="Enter GPS coordinates (lat,long)"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        getCurrentLocation((coords) =>
                          handleInputChange("gps_coordinates", coords)
                        )
                      }
                    >
                      📍 Use My Location
                    </Button>
                  </div>
                </div>

                {/* Survey Points */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Survey Points
                      </label>
                      <p className="mt-1 text-xs text-gray-500">
                        Type coordinates manually or press 📍 to capture from
                        GPS
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={addPolygonPoint}
                      className="flex gap-1 items-center bg-transparent"
                    >
                      <Plus size={16} />
                      Add Point
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {Object.entries(polygonPoints).map(([point, value]) => (
                      <div key={point} className="space-y-1">
                        <div className="flex gap-2 items-center">
                          <span className="w-8 text-sm font-medium text-gray-700">
                            {point}:
                          </span>

                          {/* Editable input (manual or GPS) */}
                          <Input
                            type="text"
                            inputMode="decimal"
                            pattern="-?[0-9]*\.?[0-9]*,-?[0-9]*\.?[0-9]*"
                            value={value}
                            onChange={(e) =>
                              updatePolygonPoint(point, e.target.value)
                            }
                            placeholder="-0.22455,36.82195"
                            className={`flex-1 ${
                              polygonErrors[point]
                                ? "border-red-500 focus:border-red-500"
                                : ""
                            }`}
                          />

                          {/* 📍 Capture from device */}
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() =>
                              getCurrentLocation((coords) =>
                                updatePolygonPoint(point, coords)
                              )
                            }
                          >
                            📍
                          </Button>

                          {/* Delete point */}
                          {Object.keys(polygonPoints).length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removePolygonPoint(point)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 size={16} />
                            </Button>
                          )}
                        </div>
                        {polygonErrors[point] && (
                          <p className="ml-10 text-sm text-red-600">
                            {polygonErrors[point]}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Legal Documentation */}
          <Card>
            <div className="p-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                Legal Documentation
              </h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    LR Certificate No. <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.lr_certificate_no || ""}
                    onChange={(e) =>
                      handleInputChange("lr_certificate_no", e.target.value)
                    }
                    placeholder="Enter LR certificate number"
                    required
                    className={
                      validationErrors.lr_certificate_no
                        ? "border-red-300 focus:border-red-500"
                        : ""
                    }
                  />
                  {validationErrors.lr_certificate_no && (
                    <p className="mt-1 text-sm text-red-600">
                      {validationErrors.lr_certificate_no}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Document of Ownership
                  </label>
                  <Select
                    value={formData.document_of_ownership || ""}
                    onChange={(e) =>
                      handleInputChange("document_of_ownership", e.target.value)
                    }
                  >
                    <option value="">Select document type</option>
                    <option value="Title Deed">Title Deed</option>
                    <option value="Certificate">Certificate</option>
                    <option value="Allotment Letter">Allotment Letter</option>
                    <option value="Other">Other</option>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Ownership Details <span className="text-red-500">*</span>
                  </label>
                  <TextArea
                    value={formData.proprietorship_details || ""}
                    onChange={(e) =>
                      handleInputChange(
                        "proprietorship_details",
                        e.target.value
                      )
                    }
                    placeholder="Enter ownership details as per document of title"
                    required
                    className={
                      validationErrors.proprietorship_details
                        ? "border-red-300 focus:border-red-500"
                        : ""
                    }
                  />
                  {validationErrors.proprietorship_details && (
                    <p className="mt-1 text-sm text-red-600">
                      {validationErrors.proprietorship_details}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Land Specifications */}
          <Card>
            <div className="p-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                Land Specifications
              </h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Size (ha)
                  </label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={formData.size_ha || ""}
                    onChange={(e) =>
                      handleInputChange(
                        "size_ha",
                        Number.parseFloat(e.target.value) || undefined
                      )
                    }
                    placeholder="Enter size in hectares"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Land Tenure
                  </label>
                  <Select
                    value={formData.land_tenure || ""}
                    onChange={(e) =>
                      handleInputChange("land_tenure", e.target.value)
                    }
                  >
                    <option value="">Select tenure</option>
                    <option value="Freehold">Freehold</option>
                    <option value="Leasehold">Leasehold</option>
                  </Select>
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Survey Status
                  </label>
                  <Select
                    value={formData.surveyed || ""}
                    onChange={(e) =>
                      handleInputChange("surveyed", e.target.value)
                    }
                  >
                    <option value="">Select status</option>
                    <option value="Surveyed">Surveyed</option>
                    <option value="Not Surveyed">Not Surveyed</option>
                  </Select>
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
                    Acquisition Date <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={formData.acquisition_date || ""}
                    onChange={(e) =>
                      handleInputChange("acquisition_date", e.target.value)
                    }
                    required
                    className={
                      validationErrors.acquisition_date
                        ? "border-red-300 focus:border-red-500"
                        : ""
                    }
                  />
                  {validationErrors.acquisition_date && (
                    <p className="mt-1 text-sm text-red-600">
                      {validationErrors.acquisition_date}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Registration Date
                  </label>
                  <Input
                    type="date"
                    value={formData.registration_date || ""}
                    onChange={(e) =>
                      handleInputChange("registration_date", e.target.value)
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

          {/* Status and Conditions */}
          <Card>
            <div className="p-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                Status and Conditions
              </h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Disputed Status
                  </label>
                  <Select
                    value={formData.disputed || ""}
                    onChange={(e) =>
                      handleInputChange("disputed", e.target.value)
                    }
                  >
                    <option value="">Select status</option>
                    <option value="Undisputed">Undisputed</option>
                    <option value="Disputed">Disputed</option>
                  </Select>
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Planned Status
                  </label>
                  <Select
                    value={formData.planned_unplanned || ""}
                    onChange={(e) =>
                      handleInputChange("planned_unplanned", e.target.value)
                    }
                  >
                    <option value="">Select status</option>
                    <option value="Planned">Planned</option>
                    <option value="Unplanned">Unplanned</option>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Purpose of Land
                  </label>
                  <TextArea
                    value={formData.purpose_use_of_land || ""}
                    onChange={(e) =>
                      handleInputChange("purpose_use_of_land", e.target.value)
                    }
                    placeholder="Enter purpose/use of land"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Encumbrances
                  </label>
                  <TextArea
                    value={formData.encumbrances || ""}
                    onChange={(e) =>
                      handleInputChange("encumbrances", e.target.value)
                    }
                    placeholder="Enter any encumbrances"
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
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Acquisition Amount
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.acquisition_amount || ""}
                    onChange={(e) =>
                      handleInputChange(
                        "acquisition_amount",
                        Number.parseFloat(e.target.value) || undefined
                      )
                    }
                    placeholder="Enter acquisition amount"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Fair Value
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.fair_value || ""}
                    onChange={(e) =>
                      handleInputChange(
                        "fair_value",
                        Number.parseFloat(e.target.value) || undefined
                      )
                    }
                    placeholder="Enter fair value"
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
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Annual Rental Income
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.annual_rental_income || ""}
                    onChange={(e) =>
                      handleInputChange(
                        "annual_rental_income",
                        Number.parseFloat(e.target.value) || undefined
                      )
                    }
                    placeholder="Enter annual rental income"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Additional Information */}
          <Card>
            <div className="p-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                Additional Information
              </h2>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Remarks
                </label>
                <TextArea
                  value={formData.remarks || ""}
                  onChange={(e) => handleInputChange("remarks", e.target.value)}
                  placeholder="Enter any additional remarks"
                  rows={4}
                />
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Upload Excel File
                </h2>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-gray-500">Ready to upload</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <input
                    ref={file_input_ref}
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handle_file_upload}
                    className="block w-full text-sm text-gray-500 cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 file:cursor-pointer"
                    disabled={is_processing_excel || is_uploading}
                  />
                </div>

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
                        className="bg-emerald-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${upload_progress}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {is_processing_excel &&
                        "Reading and mapping Excel data..."}
                      {is_uploading && "Sending data to server..."}
                    </div>
                  </div>
                )}

                {is_processing_excel && (
                  <div className="flex items-center p-3 space-x-2 text-emerald-600 bg-emerald-50 rounded-md">
                    <div className="w-4 h-4 rounded-full border-2 border-emerald-600 animate-spin border-t-transparent"></div>
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

                {excel_data.length > 0 &&
                  !is_processing_excel &&
                  !is_uploading && (
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-md border border-green-200">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-green-700">
                          {excel_data.length} land record(s) ready for review
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

                <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
                  <p className="text-sm text-gray-600">
                    <strong>Excel Format:</strong> Your Excel file should
                    include columns like "Description of Land", "LR Certificate
                    No", "Ownership Details", "County", "Size (ha)",
                    "Acquisition Date", "Acquisition Amount", etc.
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
              onClick={() => navigate("/categories/land-register")}
              leftIcon={<X size={16} />}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="bg-emerald-600 hover:bg-emerald-700"
              leftIcon={<Save size={16} />}
              isLoading={isLoading}
            >
              {isEditing ? "Update Land Record" : "Create Land Record"}
            </Button>
          </div>
        </form>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmation}
        onClose={handleCancelSubmit}
        onConfirm={handleConfirmSubmit}
        title="Confirm Land Record Creation"
        message={
          isEditing
            ? "Are you sure you want to update this land register record? This action will save all changes permanently."
            : "Are you sure you want to create this new land register record? Please review all information before confirming."
        }
        confirmText={isEditing ? "Update Record" : "Create Record"}
        cancelText="Cancel"
        isLoading={isLoading}
      />

      <ConfirmLandRegisterExcelModal
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

export default LandRegisterForm;

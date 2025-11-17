"use client";

import type React from "react";
import { useEffect, useState } from "react";
import {
  useParams,
  useNavigate,
  useSearchParams,
  Link,
} from "react-router-dom";
import {
  ArrowLeft,
  Save,
  ChevronRight,
  Home,
  Eye,
  Camera,
  ImageIcon,
  Car,
  FileText,
  MapPin,
  Calendar,
  User,
  Clock,
} from "lucide-react";
import { toast } from "react-toastify";

import { useVehicleStore } from "../../../../shared/store/vehicleStore";
import type { Vehicle } from "../../../../shared/store/vehicleStore";
import Button from "../../../../shared/components/ui/Button";
import Card from "../../../../shared/components/ui/Card";
import ImageGallery from "../Vehicle/ImageGallery";
import { KshIcon } from "../../../../shared/components/ui/icons/KshIcon";

const VehicleDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEditMode = searchParams.get("edit") === "true";

  const {
    getVehicleById,
    updateVehicle,
    selectedVehicle,
    setSelectedVehicle,
    isLoading,
  } = useVehicleStore();

  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadVehicle = async () => {
      if (id && id !== "new") {
        try {
          const vehicle = await getVehicleById(id);
          if (vehicle) {
            setSelectedVehicle(vehicle);
          }
        } catch (error) {
          console.error("Error loading vehicle:", error);
          toast.error("Failed to load vehicle details");
          navigate("/categories/vehicles");
        }
      } else {
        toast.error("Invalid vehicle ID");
        navigate("/categories/vehicles");
      }
    };

    loadVehicle();
    return () => setSelectedVehicle(null);
  }, [id, getVehicleById, setSelectedVehicle, navigate]);

  const handleSave = async () => {
    if (!selectedVehicle) return;

    setIsSaving(true);
    try {
      await updateVehicle(selectedVehicle.id, selectedVehicle);
      toast.success("Vehicle updated successfully");
      navigate("/categories/vehicles");
    } catch (error) {
      console.error("Error updating vehicle:", error);
      toast.error("Failed to update vehicle");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
    field: keyof Vehicle
  ) => {
    if (selectedVehicle) {
      let value: any = e.target.value;

      // Handle numeric fields
      if (
        [
          "amount",
          "depreciation_rate",
          "annual_depreciation",
          "accumulated_depreciation",
          "net_book_value",
          "disposal_value",
        ].includes(field)
      ) {
        value = value === "" ? undefined : Number.parseFloat(value);
      }

      setSelectedVehicle({
        ...selectedVehicle,
        [field]: value,
      });
    }
  };

  const getImageUrls = () => {
    if (!selectedVehicle?.image_urls) return [];
    try {
      const urls = Array.isArray(selectedVehicle.image_urls)
        ? selectedVehicle.image_urls
        : JSON.parse(selectedVehicle.image_urls);

      const backendUrl =
        process.env.VITE_PROD_API_URL || "http://localhost:3001";

      return urls
        .filter((url: string) => url && url.trim() !== "")
        .map((url: string) => {
          if (url.startsWith("http")) return url;
          return `${backendUrl}${url}`;
        });
    } catch {
      return [];
    }
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
      time: date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
    };
  };

  const imageUrls = getImageUrls();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="w-6 h-6 rounded-full border-b-2 border-blue-600 animate-spin"></div>
      </div>
    );
  }

  if (!selectedVehicle) {
    return (
      <div className="p-4 text-center">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Vehicle not found
        </h2>
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<ArrowLeft size={14} />}
          onClick={() => navigate("/categories/vehicles")}
        >
          Back to Vehicles
        </Button>
      </div>
    );
  }

  const createdInfo = formatDateTime(selectedVehicle.created_at);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile-optimized Navigation */}
      <nav className="px-3 py-2 bg-white border-b border-gray-200">
        <div className="flex items-center space-x-1 text-xs text-gray-600 overflow-x-auto">
          <Link
            to="/"
            className="flex items-center whitespace-nowrap hover:text-blue-600 transition-colors"
          >
            <Home size={12} className="mr-1" />
            Home
          </Link>
          <ChevronRight size={12} />
          <Link
            to="/asset-categories"
            className="whitespace-nowrap hover:text-blue-600 transition-colors"
          >
            Categories
          </Link>
          <ChevronRight size={12} />
          <Link
            to="/categories/vehicles"
            className="whitespace-nowrap hover:text-blue-600 transition-colors"
          >
            Vehicles
          </Link>
          <ChevronRight size={12} />
          <span className="flex items-center font-medium text-gray-900 whitespace-nowrap">
            <Eye size={12} className="mr-1" />
            {isEditMode ? "Edit" : "View"}
          </span>
        </div>
      </nav>

      {/* Header */}
      <div
        className="sticky top-0 z-10 bg-white border-b border-gray-200 px-3 py-3 
            flex items-center justify-between"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-2">
          <div className="flex items-center space-x-2 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              className="p-1.5"
              onClick={() => navigate("/categories/vehicles")}
            >
              <ArrowLeft size={16} />
            </Button>
            <h1 className="text-lg font-bold text-gray-900 truncate">
              {selectedVehicle.registration_number || "Vehicle Details"}
            </h1>
          </div>
          <div className="flex space-x-1 mt-2 lg:mt-0">
            {isEditMode && (
              <Button
                variant="primary"
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 text-xs px-2 py-1.5"
                leftIcon={<Save size={14} />}
                onClick={handleSave}
                isLoading={isSaving}
              >
                Save
              </Button>
            )}
          </div>
        </div>

        {/* Creation Metadata Card */}
        <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
          <div className="flex flex-col text-xs text-gray-500 space-y-2">
            <div className="flex items-center space-x-2">
              <User size={12} />
              <span className="font-medium">Created by:</span>
              <span className="text-gray-700">
                {selectedVehicle.created_by || "System"}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar size={12} />
              <span className="font-medium">Date:</span>
              <span className="text-gray-700">{createdInfo.date}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock size={12} />
              <span className="font-medium">Time:</span>
              <span className="text-gray-700">{createdInfo.time}</span>
            </div>
            {selectedVehicle.updated_at &&
              selectedVehicle.updated_at !== selectedVehicle.created_at && (
                <div className="flex items-center space-x-2">
                  <span className="font-medium">Last updated:</span>
                  <span className="text-gray-700">
                    {formatDateTime(selectedVehicle.updated_at).date}
                  </span>
                </div>
              )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-3 py-4 space-y-4">
        {/* Vehicle Information Section */}
        <Card>
          <div className="p-4">
            <div className="flex items-center mb-3">
              <Car size={16} className="text-blue-600 mr-2" />
              <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
                Vehicle Information
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: "Registration No.", field: "registration_number" },
                { label: "Make & Model", field: "make_model" },
                { label: "Engine Number", field: "engine_number" },
                { label: "Chassis Number", field: "chassis_number" },
                { label: "Tag Number", field: "tag_number" },
                { label: "Vehicle Color", field: "color" },
                { label: "Responsible Officer", field: "responsible_officer" },
                // { label: "Log Book Available", field: "has_logbook" },
              ].map(({ label, field }) => (
                <div key={field}>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    {label}
                  </label>
                  {isEditMode ? (
                    <input
                      value={(selectedVehicle as any)[field] || ""}
                      onChange={(e) => handleChange(e, field as any)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                      {(selectedVehicle as any)[field] || "N/A"}
                    </p>
                  )}
                </div>
              ))}

              {/* Financed By - Full Width */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Financed By / Source of Funds
                </label>
                {isEditMode ? (
                  <input
                    value={selectedVehicle.financed_by || ""}
                    onChange={(e) => handleChange(e, "financed_by")}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    {selectedVehicle.financed_by || "N/A"}
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Financial Information Section */}
        <Card>
          <div className="p-4">
            <div className="flex items-center mb-3">
              <KshIcon size={16} className="text-green-600 mr-2" />
              <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
                Financial Information
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: "Year of Purchase", field: "year_of_purchase" },
                { label: "PV Number", field: "pv_number" },
                { label: "Amount", field: "amount", isCurrency: true },
                { label: "Depreciation Rate (%)", field: "depreciation_rate" },
                {
                  label: "Annual Depreciation",
                  field: "annual_depreciation",
                  isCurrency: true,
                },
                {
                  label: "Accumulated Depreciation",
                  field: "accumulated_depreciation",
                  isCurrency: true,
                },
                {
                  label: "Net Book Value",
                  field: "net_book_value",
                  isCurrency: true,
                },
                {
                  label: "Disposal Value",
                  field: "disposal_value",
                  isCurrency: true,
                },
              ].map(({ label, field, isCurrency }) => (
                <div key={field}>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    {label}
                  </label>
                  {isEditMode ? (
                    <input
                      type={isCurrency ? "number" : "text"}
                      step={isCurrency ? "0.01" : undefined}
                      value={(selectedVehicle as any)[field] || ""}
                      onChange={(e) => handleChange(e, field as any)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                      {(selectedVehicle as any)[field]
                        ? isCurrency
                          ? `Ksh. ${(selectedVehicle as any)[
                              field
                            ].toLocaleString()}`
                          : field === "depreciation_rate"
                          ? `${(selectedVehicle as any)[field]}%`
                          : (selectedVehicle as any)[field]
                        : "N/A"}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Location & Status Section */}
        <Card>
          <div className="p-4">
            <div className="flex items-center mb-3">
              <MapPin size={16} className="text-blue-600 mr-2" />
              <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
                Location & Status
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: "Original Location", field: "original_location" },
                { label: "Current Location", field: "current_location" },
                {
                  label: "Asset Condition",
                  field: "asset_condition",
                  isSelect: true,
                },
              ].map(({ label, field, isSelect }) => (
                <div key={field}>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    {label}
                  </label>
                  {isEditMode ? (
                    isSelect ? (
                      <select
                        value={(selectedVehicle as any)[field] || ""}
                        onChange={(e) => handleChange(e, field as any)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select condition</option>
                        <option value="New">New</option>
                        <option value="Good">Good</option>
                        <option value="Fair">Fair</option>
                        <option value="Poor">Poor</option>
                        <option value="Needs Replacement">
                          Needs Replacement
                        </option>
                      </select>
                    ) : (
                      <input
                        value={(selectedVehicle as any)[field] || ""}
                        onChange={(e) => handleChange(e, field as any)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    )
                  ) : (
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                      {(selectedVehicle as any)[field] || "N/A"}
                    </p>
                  )}
                </div>
              ))}

              {/* Has Log Book */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Has Log Book
                </label>
                {isEditMode ? (
                  <select
                    value={selectedVehicle.has_logbook || ""}
                    onChange={(e) => handleChange(e, "has_logbook")}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select</option>
                    <option value="Y">Yes</option>
                    <option value="N">No</option>
                  </select>
                ) : (
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    {selectedVehicle.has_logbook === "Y"
                      ? "Yes"
                      : selectedVehicle.has_logbook === "N"
                      ? "No"
                      : "N/A"}
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Important Dates Section */}
        <Card>
          <div className="p-4">
            <div className="flex items-center mb-3">
              <Calendar size={16} className="text-red-600 mr-2" />
              <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
                Important Dates
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { label: "Replacement Date", field: "replacement_date" },
                { label: "Date of Disposal", field: "date_of_disposal" },
              ].map(({ label, field }) => (
                <div key={field}>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    {label}
                  </label>
                  {isEditMode ? (
                    <input
                      type="date"
                      value={
                        (selectedVehicle as any)[field]
                          ? new Date((selectedVehicle as any)[field])
                              .toISOString()
                              .split("T")[0]
                          : ""
                      }
                      onChange={(e) => handleChange(e, field as any)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                      {(selectedVehicle as any)[field]
                        ? new Date(
                            (selectedVehicle as any)[field]
                          ).toLocaleDateString()
                        : "N/A"}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Notes Section */}
        <Card>
          <div className="p-4">
            <div className="flex items-center mb-3">
              <FileText size={16} className="text-orange-600 mr-2" />
              <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
                Notes
              </h2>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Additional Notes
              </label>
              {isEditMode ? (
                <textarea
                  value={selectedVehicle.notes || ""}
                  onChange={(e) => handleChange(e, "notes")}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[80px]"
                  placeholder="Enter any additional notes about this vehicle..."
                />
              ) : (
                <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded min-h-[40px]">
                  {selectedVehicle.notes || "No additional notes"}
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* Vehicle Images Section */}
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <Camera size={16} className="text-indigo-600 mr-2" />
                <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
                  Vehicle Images
                </h2>
              </div>
              {imageUrls.length > 0 && (
                <span className="px-2 py-1 text-xs text-indigo-600 bg-indigo-100 rounded-full">
                  {imageUrls.length}{" "}
                  {imageUrls.length === 1 ? "image" : "images"}
                </span>
              )}
            </div>

            {imageUrls.length > 0 ? (
              <div className="border border-gray-200 rounded-lg bg-gray-50 p-3">
                {/* Image Preview Grid */}
                <div className="mb-3">
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {imageUrls.slice(0, 8).map((url: string, index: number) => (
                      <div
                        key={index}
                        className="aspect-square border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm"
                      >
                        <img
                          src={url || "/placeholder.svg"}
                          alt={`Vehicle image ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                    {imageUrls.length > 8 && (
                      <div className="aspect-square border border-gray-200 rounded-lg bg-gray-200 flex items-center justify-center">
                        <span className="text-xs font-medium text-gray-600">
                          +{imageUrls.length - 8}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsGalleryOpen(true)}
                  leftIcon={<ImageIcon size={14} />}
                  className="w-full border-indigo-200 text-indigo-700 hover:bg-indigo-50 text-xs py-2"
                >
                  View All Images
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg">
                <div className="text-center">
                  <Camera size={32} className="mx-auto mb-2 text-gray-400" />
                  <p className="text-sm font-medium text-gray-600">
                    No images available
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Images will appear here when uploaded
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* ImageGallery Modal */}
      <ImageGallery
        images={imageUrls}
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
      />
    </div>
  );
};

export default VehicleDetails;

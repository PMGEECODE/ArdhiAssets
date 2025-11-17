"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Edit,
  Home,
  ChevronRight,
  Building,
  FileText,
} from "lucide-react";
import { format } from "date-fns";

import { useBuildingStore } from "../../../../shared/store/buildingStore";
import type { BuildingType } from "../../../../shared/types";
import Button from "../../../../shared/components/ui/Button";
import Card from "../../../../shared/components/ui/Card";
import { API_URL } from "../../../../shared/config/constants";
import BuildingFileGallery from "../../../../shared/components/ui/BuildingFileGallery";

const BuildingDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { buildings } = useBuildingStore();

  const [building, setBuilding] = useState<BuildingType | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFileGalleryOpen, setIsFileGalleryOpen] = useState(false);

  useEffect(() => {
    const found = buildings.find((b) => String(b.id) === id);
    if (found) {
      setBuilding(found);
      setLoading(false);
    } else {
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
          setBuilding(fetched);
        } catch (error) {
          console.error("Failed to fetch building:", error);
        } finally {
          setLoading(false);
        }
      };

      fetchBuilding();
    }
  }, [id, buildings]);

  const getSupportFiles = () => {
    if (!building?.support_files) return [];
    try {
      let files: any[] = [];

      if (Array.isArray(building.support_files)) {
        files = building.support_files;
      } else if (typeof building.support_files === "string") {
        try {
          files = JSON.parse(building.support_files);
        } catch {
          return [];
        }
      }

      const backendUrl =
        process.env.VITE_PROD_API_URL || "http://localhost:3001";

      return files
        .filter((file: any) => file && (file.url || typeof file === "string"))
        .map((file: any) => {
          // Handle both object format {url, name, type} and string format (just URL)
          const fileUrl = typeof file === "string" ? file : file.url;
          const fileName =
            typeof file === "string"
              ? file.split("/").pop() || "File"
              : file.name || file.url.split("/").pop() || "File";
          const fileType =
            typeof file === "string"
              ? file.endsWith(".pdf")
                ? "pdf"
                : "image"
              : file.type === "pdf" || file.url.endsWith(".pdf")
              ? "pdf"
              : "image";

          const url = fileUrl.startsWith("http")
            ? fileUrl
            : `${backendUrl}${fileUrl}`;

          return {
            url,
            name: fileName,
            type: fileType,
          };
        });
    } catch {
      return [];
    }
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/categories/buildings");
    }
  };

  const handleEdit = () => {
    navigate(`/categories/buildings/${id}/edit`);
  };

  const handleRemoveFile = (index: number) => {
    if (!building) return;
    const files = Array.isArray(building.support_files)
      ? building.support_files
      : JSON.parse(building.support_files);

    const updatedFiles = files.filter((_: any, i: number) => i !== index);

    setBuilding({
      ...building,
      support_files: updatedFiles,
    });
  };

  if (loading) {
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

  if (!building) {
    return (
      <div className="py-8 text-center text-gray-500">Building not found</div>
    );
  }

  const supportFiles = getSupportFiles();

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="flex items-center px-6 pt-6 mb-6 space-x-2 text-sm text-gray-600">
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
          <Building size={16} className="mr-1" />
          {building.lr_no}
        </span>
      </nav>

      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-2 py-2 mx-auto">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Button variant="secondary" onClick={handleBack}>
                <ArrowLeft size={16} className="mr-2" />
                Back
              </Button>
              <h1 className="text-2xl font-bold text-gray-900">
                Building Details
              </h1>
            </div>
            <Button variant="primary" onClick={handleEdit}>
              <Edit size={16} className="mr-2" />
              Edit Building
            </Button>
          </div>
        </div>
      </div>

      <div className="px-2 py-2 mx-auto">
        <div className="space-y-6">
          <Card className="bg-white border border-gray-200 shadow-sm">
            <div className="p-6">
              <h2 className="pb-2 mb-4 text-lg font-semibold text-gray-900 border-b border-gray-100">
                Basic Information
              </h2>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">
                    Building Name
                  </p>
                  <p className="text-base text-gray-900">{building.lr_no}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">Location</p>
                  <p className="text-base text-gray-900">
                    {building.location || "N/A"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">
                    Building Type
                  </p>
                  <p className="text-base text-gray-900">
                    {building.type_of_building || "N/A"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">
                    Ownership Status
                  </p>
                  <p className="text-base text-gray-900">
                    {building.ownership_status || "N/A"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">
                    Land Area (Ha)
                  </p>
                  <p className="text-base text-gray-900">
                    {building.size_of_land_ha
                      ? `${building.size_of_land_ha} Ha`
                      : "N/A"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">
                    Building Area (m²)
                  </p>
                  <p className="text-base text-gray-900">
                    {building.plinth_area
                      ? `${building.plinth_area} m²`
                      : "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="bg-white border border-gray-200 shadow-sm">
            <div className="p-6">
              <h2 className="pb-2 mb-4 text-lg font-semibold text-gray-900 border-b border-gray-100">
                Financial Information
              </h2>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">
                    Cost of Construction/Valuation
                  </p>
                  <p className="text-base text-gray-900">
                    {building.cost_of_construction_or_valuation
                      ? `Ksh. ${building.cost_of_construction_or_valuation.toLocaleString()}`
                      : "N/A"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">
                    Net Book Value
                  </p>
                  <p className="text-base text-gray-900">
                    {building.net_book_value
                      ? `Ksh. ${building.net_book_value.toLocaleString()}`
                      : "N/A"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">
                    Purchase/Commission Date
                  </p>
                  <p className="text-base text-gray-900">
                    {building.date_of_purchase_or_commissioning
                      ? format(
                          new Date(building.date_of_purchase_or_commissioning),
                          "MMM dd, yyyy"
                        )
                      : "N/A"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">
                    Annual Depreciation
                  </p>
                  <p className="text-base text-gray-900">
                    {building.annual_depreciation
                      ? `Ksh. ${building.annual_depreciation.toLocaleString()}`
                      : "N/A"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">
                    Accumulated Depreciation
                  </p>
                  <p className="text-base text-gray-900">
                    {building.accumulated_depreciation_to_date
                      ? `Ksh. ${building.accumulated_depreciation_to_date.toLocaleString()}`
                      : "N/A"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">
                    Annual Rental Income
                  </p>
                  <p className="text-base text-gray-900">
                    {building.annual_rental_income
                      ? `Ksh. ${building.annual_rental_income.toLocaleString()}`
                      : "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="bg-white border border-gray-200 shadow-sm">
            <div className="p-6">
              <h2 className="pb-2 mb-4 text-lg font-semibold text-gray-900 border-b border-gray-100">
                Additional Details
              </h2>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">
                    Building Number
                  </p>
                  <p className="text-base text-gray-900">
                    {building.building_no || "N/A"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">
                    Institution Number
                  </p>
                  <p className="text-base text-gray-900">
                    {building.institution_no || "N/A"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">
                    Designated Use
                  </p>
                  <p className="text-base text-gray-900">
                    {building.designated_use || "N/A"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">
                    Mode of Acquisition
                  </p>
                  <p className="text-base text-gray-900">
                    {building.mode_of_acquisition || "N/A"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">
                    Number of Floors
                  </p>
                  <p className="text-base text-gray-900">
                    {building.no_of_floors || "N/A"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">
                    Estimated Useful Life
                  </p>
                  <p className="text-base text-gray-900">
                    {building.estimated_useful_life
                      ? `${building.estimated_useful_life} years`
                      : "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {supportFiles.length > 0 && (
            <Card className="bg-white border border-gray-200 shadow-sm">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <FileText size={20} className="text-blue-600 mr-2" />
                    <h2 className="text-lg font-semibold text-gray-900">
                      Support Files
                    </h2>
                  </div>
                  <span className="px-3 py-1 text-sm text-blue-600 bg-blue-100 rounded-full">
                    {supportFiles.length}{" "}
                    {supportFiles.length === 1 ? "file" : "files"}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {supportFiles.map((file, index) => (
                    <div
                      key={index}
                      className="relative group border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                    >
                      {file.type === "image" ? (
                        <>
                          <img
                            src={file.url || "/placeholder.svg"}
                            alt={file.name}
                            className="w-full h-40 object-cover"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <button
                              onClick={() => setIsFileGalleryOpen(true)}
                              className="px-3 py-1 bg-white text-gray-900 rounded text-sm font-medium"
                            >
                              View
                            </button>
                            <button
                              onClick={() => handleRemoveFile(index)}
                              className="ml-2 px-3 py-1 bg-red-500 text-white rounded text-xs font-medium hover:bg-red-600 transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-40 bg-gradient-to-br from-red-50 to-red-100 flex flex-col items-center justify-center p-4">
                          <FileText size={32} className="text-red-500 mb-2" />
                          <p className="text-sm font-medium text-gray-900 text-center truncate">
                            {file.name}
                          </p>
                          <button
                            onClick={() => setIsFileGalleryOpen(true)}
                            className="mt-2 px-3 py-1 bg-red-500 text-white rounded text-xs font-medium hover:bg-red-600 transition-colors"
                          >
                            View PDF
                          </button>
                          <button
                            onClick={() => handleRemoveFile(index)}
                            className="mt-2 px-3 py-1 bg-red-500 text-white rounded text-xs font-medium hover:bg-red-600 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setIsFileGalleryOpen(true)}
                  className="mt-4 w-full px-4 py-2 border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium"
                >
                  View All Files
                </button>
              </div>
            </Card>
          )}
        </div>
      </div>

      <BuildingFileGallery
        files={supportFiles}
        isOpen={isFileGalleryOpen}
        onClose={() => setIsFileGalleryOpen(false)}
      />
    </div>
  );
};

export default BuildingDetail;

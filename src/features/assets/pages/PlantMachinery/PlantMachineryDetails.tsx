"use client";

import React, { useEffect, useState } from "react";
import {
  useParams,
  useNavigate,
  useSearchParams,
  Link,
} from "react-router-dom";
import { ArrowLeft, Save, ChevronRight, Home, Settings } from "lucide-react";
import { toast } from "react-toastify";

import { usePlantMachineryStore } from "../../../../shared/store/plantMachineryStore";
import type { PlantMachinery } from "../../../../shared/store/plantMachineryStore";
import Button from "../../../../shared/components/ui/Button";
import Card from "../../../../shared/components/ui/Card";

const PlantMachineryDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEditMode = searchParams.get("edit") === "true";

  const {
    getPlantMachineryById,
    updatePlantMachinery,
    selectedPlantMachinery,
    setSelectedPlantMachinery,
    isLoading,
  } = usePlantMachineryStore();

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadPlantMachinery = async () => {
      if (id && id !== "new") {
        try {
          const plantMachinery = await getPlantMachineryById(id);
          if (plantMachinery) {
            setSelectedPlantMachinery(plantMachinery);
          }
        } catch (error) {
          console.error("Error loading plant machinery:", error);
          toast.error("Failed to load plant machinery details");
          navigate("/categories/plant-machinery");
        }
      } else {
        toast.error("Invalid plant machinery ID");
        navigate("/categories/plant-machinery");
      }
    };

    loadPlantMachinery();

    return () => setSelectedPlantMachinery(null);
  }, [id, getPlantMachineryById, setSelectedPlantMachinery, navigate]);

  const handleSave = async () => {
    if (!selectedPlantMachinery) return;

    setIsSaving(true);
    try {
      await updatePlantMachinery(
        selectedPlantMachinery.id,
        selectedPlantMachinery
      );
      toast.success("Plant machinery updated successfully");
      navigate("/categories/plant-machinery");
    } catch (error) {
      console.error("Error updating plant machinery:", error);
      toast.error("Failed to update plant machinery");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
    field: keyof PlantMachinery
  ) => {
    if (selectedPlantMachinery) {
      let value: any = e.target.value;

      // Handle numeric fields
      if (
        field === "purchase_amount" ||
        field === "depreciation_rate" ||
        field === "annual_depreciation" ||
        field === "accumulated_depreciation" ||
        field === "net_book_value" ||
        field === "disposal_value"
      ) {
        value = value === "" ? undefined : parseFloat(value);
      }

      setSelectedPlantMachinery({
        ...selectedPlantMachinery,
        [field]: value,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 rounded-full border-b-2 border-blue-600 animate-spin"></div>
      </div>
    );
  }

  if (!selectedPlantMachinery) {
    return (
      <div className="py-8 text-center">
        <h2 className="text-xl font-semibold text-gray-900">
          Plant machinery not found
        </h2>
        <Button
          variant="secondary"
          className="mt-4"
          leftIcon={<ArrowLeft size={16} />}
          onClick={() => navigate("/categories/plant-machinery")}
        >
          Back to Plant Machinery
        </Button>
      </div>
    );
  }

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
          className="transition-colors hover:text-blue-600"
        >
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
          {isEditMode ? "Edit" : "View"} Machinery
        </span>
      </nav>

      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            className="p-2"
            onClick={() => navigate("/categories/plant-machinery")}
          >
            <ArrowLeft size={20} />
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">
            {selectedPlantMachinery.serial_number}
          </h1>
        </div>
        {isEditMode && (
          <Button
            variant="primary"
            className="bg-blue-600 hover:bg-blue-700"
            leftIcon={<Save size={16} />}
            onClick={handleSave}
            isLoading={isSaving}
          >
            Save Changes
          </Button>
        )}
      </div>

      <Card>
        <div className="grid grid-cols-1 gap-6 p-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Asset Information Section */}
          <div className="asset-info-wrapper md-22">
            <h1 className="mb-4 text-2xl font-semibold text-gray-800 title">
              Asset Information
            </h1>

            {/* Asset Description */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-500">
                Asset Description
              </h3>
              {isEditMode ? (
                <textarea
                  name="asset_description"
                  value={selectedPlantMachinery.asset_description || ""}
                  onChange={(e) => handleChange(e, "asset_description")}
                  className="px-2 py-1 mt-1 w-full rounded border border-gray-300 min-h-[80px]"
                />
              ) : (
                <p className="mt-1 text-gray-900">
                  {selectedPlantMachinery.asset_description}
                </p>
              )}
            </div>

            {/* Make/Model */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-500">Make/Model</h3>
              {isEditMode ? (
                <input
                  name="make_model"
                  type="text"
                  value={selectedPlantMachinery.make_model || ""}
                  onChange={(e) => handleChange(e, "make_model")}
                  className="px-2 py-1 mt-1 w-full rounded border border-gray-300"
                />
              ) : (
                <p className="mt-1 text-gray-900">
                  {selectedPlantMachinery.make_model || "N/A"}
                </p>
              )}
            </div>

            {/* Serial Number */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-500">
                Serial Number
              </h3>
              {isEditMode ? (
                <input
                  name="serial_number"
                  type="text"
                  value={selectedPlantMachinery.serial_number || ""}
                  onChange={(e) => handleChange(e, "serial_number")}
                  className="px-2 py-1 mt-1 w-full rounded border border-gray-300"
                />
              ) : (
                <p className="mt-1 text-gray-900">
                  {selectedPlantMachinery.serial_number || "N/A"}
                </p>
              )}
            </div>

            {/* Tag Number */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-500">Tag Number</h3>
              {isEditMode ? (
                <input
                  name="tag_number"
                  type="text"
                  value={selectedPlantMachinery.tag_number || ""}
                  onChange={(e) => handleChange(e, "tag_number")}
                  className="px-2 py-1 mt-1 w-full rounded border border-gray-300"
                />
              ) : (
                <p className="mt-1 text-gray-900">
                  {selectedPlantMachinery.tag_number || "N/A"}
                </p>
              )}
            </div>
          </div>

          {/* Financial Information Section */}
          <div className="financial-wrapper md-22">
            <h1 className="mb-4 text-2xl font-semibold text-gray-800 title">
              Financial Information
            </h1>

            {/* Purchase Amount */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-500">
                Purchase Amount
              </h3>
              {isEditMode ? (
                <input
                  name="purchase_amount"
                  type="number"
                  step="0.01"
                  value={selectedPlantMachinery.purchase_amount || ""}
                  onChange={(e) => handleChange(e, "purchase_amount")}
                  className="px-2 py-1 mt-1 w-full rounded border border-gray-300"
                />
              ) : (
                <p className="mt-1 text-gray-900">
                  {selectedPlantMachinery.purchase_amount
                    ? `Ksh.${selectedPlantMachinery.purchase_amount.toLocaleString()}`
                    : "N/A"}
                </p>
              )}
            </div>

            {/* Depreciation Rate */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-500">
                Depreciation Rate (%)
              </h3>
              {isEditMode ? (
                <input
                  name="depreciation_rate"
                  type="number"
                  step="0.01"
                  value={selectedPlantMachinery.depreciation_rate || ""}
                  onChange={(e) => handleChange(e, "depreciation_rate")}
                  className="px-2 py-1 mt-1 w-full rounded border border-gray-300"
                />
              ) : (
                <p className="mt-1 text-gray-900">
                  {selectedPlantMachinery.depreciation_rate
                    ? `${selectedPlantMachinery.depreciation_rate}%`
                    : "N/A"}
                </p>
              )}
            </div>

            {/* Annual Depreciation */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-500">
                Annual Depreciation
              </h3>
              {isEditMode ? (
                <input
                  name="annual_depreciation"
                  type="number"
                  step="0.01"
                  value={selectedPlantMachinery.annual_depreciation || ""}
                  onChange={(e) => handleChange(e, "annual_depreciation")}
                  className="px-2 py-1 mt-1 w-full rounded border border-gray-300"
                />
              ) : (
                <p className="mt-1 text-gray-900">
                  {selectedPlantMachinery.annual_depreciation
                    ? `Ksh.${selectedPlantMachinery.annual_depreciation.toLocaleString()}`
                    : "N/A"}
                </p>
              )}
            </div>

            {/* Accumulated Depreciation */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-500">
                Accumulated Depreciation
              </h3>
              {isEditMode ? (
                <input
                  name="accumulated_depreciation"
                  type="number"
                  step="0.01"
                  value={selectedPlantMachinery.accumulated_depreciation || ""}
                  onChange={(e) => handleChange(e, "accumulated_depreciation")}
                  className="px-2 py-1 mt-1 w-full rounded border border-gray-300"
                />
              ) : (
                <p className="mt-1 text-gray-900">
                  {selectedPlantMachinery.accumulated_depreciation
                    ? `Ksh.${selectedPlantMachinery.accumulated_depreciation.toLocaleString()}`
                    : "N/A"}
                </p>
              )}
            </div>

            {/* Net Book Value */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-500">
                Net Book Value
              </h3>
              {isEditMode ? (
                <input
                  name="net_book_value"
                  type="number"
                  step="0.01"
                  value={selectedPlantMachinery.net_book_value || ""}
                  onChange={(e) => handleChange(e, "net_book_value")}
                  className="px-2 py-1 mt-1 w-full rounded border border-gray-300"
                />
              ) : (
                <p className="mt-1 text-gray-900">
                  {selectedPlantMachinery.net_book_value
                    ? `Ksh.${selectedPlantMachinery.net_book_value.toLocaleString()}`
                    : "N/A"}
                </p>
              )}
            </div>
          </div>

          {/* Location & Status Section */}
          <div className="location-status-wrapper md-22">
            <h1 className="mb-4 text-2xl font-semibold text-gray-800 title">
              Location & Status
            </h1>

            {/* Original Location */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-500">
                Original Location
              </h3>
              {isEditMode ? (
                <input
                  name="original_location"
                  type="text"
                  value={selectedPlantMachinery.original_location || ""}
                  onChange={(e) => handleChange(e, "original_location")}
                  className="px-2 py-1 mt-1 w-full rounded border border-gray-300"
                />
              ) : (
                <p className="mt-1 text-gray-900">
                  {selectedPlantMachinery.original_location || "N/A"}
                </p>
              )}
            </div>

            {/* Current Location */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-500">
                Current Location
              </h3>
              {isEditMode ? (
                <input
                  name="current_location"
                  type="text"
                  value={selectedPlantMachinery.current_location || ""}
                  onChange={(e) => handleChange(e, "current_location")}
                  className="px-2 py-1 mt-1 w-full rounded border border-gray-300"
                />
              ) : (
                <p className="mt-1 text-gray-900">
                  {selectedPlantMachinery.current_location || "N/A"}
                </p>
              )}
            </div>

            {/* Asset Condition */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-500">
                Asset Condition
              </h3>
              {isEditMode ? (
                <select
                  name="asset_condition"
                  value={selectedPlantMachinery.asset_condition || ""}
                  onChange={(e) => handleChange(e, "asset_condition")}
                  className="px-2 py-1 mt-1 w-full rounded border border-gray-300"
                >
                  <option value="">Select condition</option>
                  <option value="New">New</option>
                  <option value="Good">Good</option>
                  <option value="Worn">Worn</option>
                  <option value="Needs Replacement">Needs Replacement</option>
                </select>
              ) : (
                <p className="mt-1 text-gray-900">
                  {selectedPlantMachinery.asset_condition || "N/A"}
                </p>
              )}
            </div>

            {/* Responsible Officer */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-500">
                Responsible Officer
              </h3>
              {isEditMode ? (
                <input
                  name="responsible_officer"
                  type="text"
                  value={selectedPlantMachinery.responsible_officer || ""}
                  onChange={(e) => handleChange(e, "responsible_officer")}
                  className="px-2 py-1 mt-1 w-full rounded border border-gray-300"
                />
              ) : (
                <p className="mt-1 text-gray-900">
                  {selectedPlantMachinery.responsible_officer || "N/A"}
                </p>
              )}
            </div>
          </div>

          {/* Additional Details Section */}
          <div className="additional-wrapper md-22">
            <h1 className="mb-4 text-2xl font-semibold text-gray-800 title">
              Additional Details
            </h1>

            {/* Financed By */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-500">Financed By</h3>
              {isEditMode ? (
                <input
                  name="financed_by"
                  type="text"
                  value={selectedPlantMachinery.financed_by || ""}
                  onChange={(e) => handleChange(e, "financed_by")}
                  className="px-2 py-1 mt-1 w-full rounded border border-gray-300"
                />
              ) : (
                <p className="mt-1 text-gray-900">
                  {selectedPlantMachinery.financed_by || "N/A"}
                </p>
              )}
            </div>

            {/* PV Number */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-500">PV Number</h3>
              {isEditMode ? (
                <input
                  name="pv_number"
                  type="text"
                  value={selectedPlantMachinery.pv_number || ""}
                  onChange={(e) => handleChange(e, "pv_number")}
                  className="px-2 py-1 mt-1 w-full rounded border border-gray-300"
                />
              ) : (
                <p className="mt-1 text-gray-900">
                  {selectedPlantMachinery.pv_number || "N/A"}
                </p>
              )}
            </div>

            {/* Notes */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-500">Notes</h3>
              {isEditMode ? (
                <textarea
                  name="notes"
                  value={selectedPlantMachinery.notes || ""}
                  onChange={(e) => handleChange(e, "notes")}
                  className="px-2 py-1 mt-1 w-full rounded border border-gray-300 min-h-[60px]"
                />
              ) : (
                <p className="mt-1 text-gray-900">
                  {selectedPlantMachinery.notes || "N/A"}
                </p>
              )}
            </div>
          </div>

          {/* Important Dates Section */}
          <div className="dates-wrapper md-22">
            <h1 className="mb-4 text-2xl font-semibold text-gray-800 title">
              Important Dates
            </h1>

            {/* Delivery/Installation Date */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-500">
                Delivery/Installation Date
              </h3>
              {isEditMode ? (
                <input
                  name="delivery_installation_date"
                  type="date"
                  value={
                    selectedPlantMachinery.delivery_installation_date
                      ? new Date(
                          selectedPlantMachinery.delivery_installation_date
                        )
                          .toISOString()
                          .split("T")[0]
                      : ""
                  }
                  onChange={(e) =>
                    handleChange(e, "delivery_installation_date")
                  }
                  className="px-2 py-1 mt-1 w-full rounded border border-gray-300"
                />
              ) : (
                <p className="mt-1 text-gray-900">
                  {selectedPlantMachinery.delivery_installation_date
                    ? new Date(
                        selectedPlantMachinery.delivery_installation_date
                      ).toLocaleDateString()
                    : "N/A"}
                </p>
              )}
            </div>

            {/* Replacement Date */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-500">
                Replacement Date
              </h3>
              {isEditMode ? (
                <input
                  name="replacement_date"
                  type="date"
                  value={
                    selectedPlantMachinery.replacement_date
                      ? new Date(selectedPlantMachinery.replacement_date)
                          .toISOString()
                          .split("T")[0]
                      : ""
                  }
                  onChange={(e) => handleChange(e, "replacement_date")}
                  className="px-2 py-1 mt-1 w-full rounded border border-gray-300"
                />
              ) : (
                <p className="mt-1 text-gray-900">
                  {selectedPlantMachinery.replacement_date
                    ? new Date(
                        selectedPlantMachinery.replacement_date
                      ).toLocaleDateString()
                    : "N/A"}
                </p>
              )}
            </div>

            {/* Disposal Date */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-500">
                Disposal Date
              </h3>
              {isEditMode ? (
                <input
                  name="disposal_date"
                  type="date"
                  value={
                    selectedPlantMachinery.disposal_date
                      ? new Date(selectedPlantMachinery.disposal_date)
                          .toISOString()
                          .split("T")[0]
                      : ""
                  }
                  onChange={(e) => handleChange(e, "disposal_date")}
                  className="px-2 py-1 mt-1 w-full rounded border border-gray-300"
                />
              ) : (
                <p className="mt-1 text-gray-900">
                  {selectedPlantMachinery.disposal_date
                    ? new Date(
                        selectedPlantMachinery.disposal_date
                      ).toLocaleDateString()
                    : "N/A"}
                </p>
              )}
            </div>

            {/* Disposal Value */}
            {(selectedPlantMachinery.disposal_value || isEditMode) && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-500">
                  Disposal Value
                </h3>
                {isEditMode ? (
                  <input
                    name="disposal_value"
                    type="number"
                    step="0.01"
                    value={selectedPlantMachinery.disposal_value || ""}
                    onChange={(e) => handleChange(e, "disposal_value")}
                    className="px-2 py-1 mt-1 w-full rounded border border-gray-300"
                  />
                ) : (
                  <p className="mt-1 text-gray-900">
                    {selectedPlantMachinery.disposal_value
                      ? `Ksh.${selectedPlantMachinery.disposal_value.toLocaleString()}`
                      : "N/A"}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default PlantMachineryDetail;

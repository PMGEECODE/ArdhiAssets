"use client";

import type React from "react";
import { useEffect, useState } from "react";
import {
  useParams,
  useNavigate,
  useSearchParams,
  Link,
} from "react-router-dom";
import { ArrowLeft, Save, ChevronRight, Home, Sofa } from "lucide-react";
import { toast } from "react-toastify";

import { useFurnitureEquipmentStore } from "../../../../shared/store/furnitureEquipmentStore";
import type { FurnitureEquipment } from "../../../../shared/store/furnitureEquipmentStore";
import Button from "../../../../shared/components/ui/Button";
import Card from "../../../../shared/components/ui/Card";

const FurnitureEquipmentDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEditMode = searchParams.get("edit") === "true";

  const {
    getFurnitureEquipmentById,
    updateFurnitureEquipment,
    selectedFurnitureEquipment,
    setSelectedFurnitureEquipment,
    isLoading,
  } = useFurnitureEquipmentStore();

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadFurnitureEquipment = async () => {
      if (id && id !== "new") {
        try {
          console.log("[v0] Loading furniture equipment with ID:", id);
          const furnitureEquipment = await getFurnitureEquipmentById(id);
          if (furnitureEquipment) {
            console.log(
              "[v0] Successfully loaded furniture equipment:",
              furnitureEquipment
            );
            setSelectedFurnitureEquipment(furnitureEquipment);
          } else {
            console.log("[v0] No furniture equipment found for ID:", id);
            toast.error("Furniture equipment not found");
            navigate("/categories/furniture-equipment");
          }
        } catch (error) {
          console.error("[v0] Error loading furniture equipment:", error);
          toast.error("Failed to load furniture equipment details");
          navigate("/categories/furniture-equipment");
        }
      } else {
        console.log("[v0] Invalid furniture equipment ID:", id);
        toast.error("Invalid furniture equipment ID");
        navigate("/categories/furniture-equipment");
      }
    };

    loadFurnitureEquipment();

    return () => setSelectedFurnitureEquipment(null);
  }, [id, getFurnitureEquipmentById, setSelectedFurnitureEquipment, navigate]);

  const handleSave = async () => {
    if (!selectedFurnitureEquipment) return;

    setIsSaving(true);
    try {
      await updateFurnitureEquipment(
        selectedFurnitureEquipment.id,
        selectedFurnitureEquipment
      );
      toast.success("Furniture equipment updated successfully");
      navigate("/categories/furniture-equipment");
    } catch (error) {
      console.error("Error updating furniture equipment:", error);
      toast.error("Failed to update furniture equipment");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
    field: keyof FurnitureEquipment
  ) => {
    if (selectedFurnitureEquipment) {
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
        value = value === "" ? undefined : Number.parseFloat(value);
      }

      setSelectedFurnitureEquipment({
        ...selectedFurnitureEquipment,
        [field]: value,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 rounded-full border-b-2 border-amber-600 animate-spin"></div>
      </div>
    );
  }

  if (!selectedFurnitureEquipment) {
    return (
      <div className="py-8 text-center">
        <h2 className="text-xl font-semibold text-gray-900">
          Furniture equipment not found
        </h2>
        <Button
          variant="secondary"
          className="mt-4"
          leftIcon={<ArrowLeft size={16} />}
          onClick={() => navigate("/categories/furniture-equipment")}
        >
          Back to Furniture Equipment
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
          to="/categories/furniture-equipment"
          className="transition-colors hover:text-blue-600"
        >
          Furniture & Fittings Equipment
        </Link>
        <ChevronRight size={16} />
        <span className="flex items-center font-medium text-gray-900">
          <Sofa size={16} className="mr-1" />
          {isEditMode ? "Edit" : "View"} Equipment
        </span>
      </nav>

      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            className="p-2"
            onClick={() => navigate("/categories/furniture-equipment")}
          >
            <ArrowLeft size={20} />
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">
            {selectedFurnitureEquipment.asset_description}
          </h1>
        </div>
        {isEditMode && (
          <Button
            variant="primary"
            className="bg-amber-600 hover:bg-amber-700"
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
                  value={selectedFurnitureEquipment.asset_description || ""}
                  onChange={(e) => handleChange(e, "asset_description")}
                  className="px-2 py-1 mt-1 w-full rounded border border-gray-300 min-h-[80px]"
                />
              ) : (
                <p className="mt-1 text-gray-900">
                  {selectedFurnitureEquipment.asset_description}
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
                  value={selectedFurnitureEquipment.make_model || ""}
                  onChange={(e) => handleChange(e, "make_model")}
                  className="px-2 py-1 mt-1 w-full rounded border border-gray-300"
                />
              ) : (
                <p className="mt-1 text-gray-900">
                  {selectedFurnitureEquipment.make_model || "N/A"}
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
                  value={selectedFurnitureEquipment.serial_number || ""}
                  onChange={(e) => handleChange(e, "serial_number")}
                  className="px-2 py-1 mt-1 w-full rounded border border-gray-300"
                />
              ) : (
                <p className="mt-1 text-gray-900">
                  {selectedFurnitureEquipment.serial_number || "N/A"}
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
                  value={selectedFurnitureEquipment.tag_number || ""}
                  onChange={(e) => handleChange(e, "tag_number")}
                  className="px-2 py-1 mt-1 w-full rounded border border-gray-300"
                />
              ) : (
                <p className="mt-1 text-gray-900">
                  {selectedFurnitureEquipment.tag_number || "N/A"}
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
                  value={selectedFurnitureEquipment.purchase_amount || ""}
                  onChange={(e) => handleChange(e, "purchase_amount")}
                  className="px-2 py-1 mt-1 w-full rounded border border-gray-300"
                />
              ) : (
                <p className="mt-1 text-gray-900">
                  {selectedFurnitureEquipment.purchase_amount
                    ? `Ksh.${selectedFurnitureEquipment.purchase_amount.toLocaleString()}`
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
                  value={selectedFurnitureEquipment.depreciation_rate || ""}
                  onChange={(e) => handleChange(e, "depreciation_rate")}
                  className="px-2 py-1 mt-1 w-full rounded border border-gray-300"
                />
              ) : (
                <p className="mt-1 text-gray-900">
                  {selectedFurnitureEquipment.depreciation_rate
                    ? `${selectedFurnitureEquipment.depreciation_rate}%`
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
                  value={selectedFurnitureEquipment.annual_depreciation || ""}
                  onChange={(e) => handleChange(e, "annual_depreciation")}
                  className="px-2 py-1 mt-1 w-full rounded border border-gray-300"
                />
              ) : (
                <p className="mt-1 text-gray-900">
                  {selectedFurnitureEquipment.annual_depreciation
                    ? `Ksh.${selectedFurnitureEquipment.annual_depreciation.toLocaleString()}`
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
                  value={
                    selectedFurnitureEquipment.accumulated_depreciation || ""
                  }
                  onChange={(e) => handleChange(e, "accumulated_depreciation")}
                  className="px-2 py-1 mt-1 w-full rounded border border-gray-300"
                />
              ) : (
                <p className="mt-1 text-gray-900">
                  {selectedFurnitureEquipment.accumulated_depreciation
                    ? `Ksh.${selectedFurnitureEquipment.accumulated_depreciation.toLocaleString()}`
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
                  value={selectedFurnitureEquipment.net_book_value || ""}
                  onChange={(e) => handleChange(e, "net_book_value")}
                  className="px-2 py-1 mt-1 w-full rounded border border-gray-300"
                />
              ) : (
                <p className="mt-1 text-gray-900">
                  {selectedFurnitureEquipment.net_book_value
                    ? `Ksh.${selectedFurnitureEquipment.net_book_value.toLocaleString()}`
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
                  value={selectedFurnitureEquipment.original_location || ""}
                  onChange={(e) => handleChange(e, "original_location")}
                  className="px-2 py-1 mt-1 w-full rounded border border-gray-300"
                />
              ) : (
                <p className="mt-1 text-gray-900">
                  {selectedFurnitureEquipment.original_location || "N/A"}
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
                  value={selectedFurnitureEquipment.current_location || ""}
                  onChange={(e) => handleChange(e, "current_location")}
                  className="px-2 py-1 mt-1 w-full rounded border border-gray-300"
                />
              ) : (
                <p className="mt-1 text-gray-900">
                  {selectedFurnitureEquipment.current_location || "N/A"}
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
                  value={selectedFurnitureEquipment.asset_condition || ""}
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
                  {selectedFurnitureEquipment.asset_condition || "N/A"}
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
                  value={selectedFurnitureEquipment.responsible_officer || ""}
                  onChange={(e) => handleChange(e, "responsible_officer")}
                  className="px-2 py-1 mt-1 w-full rounded border border-gray-300"
                />
              ) : (
                <p className="mt-1 text-gray-900">
                  {selectedFurnitureEquipment.responsible_officer || "N/A"}
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
                  value={selectedFurnitureEquipment.financed_by || ""}
                  onChange={(e) => handleChange(e, "financed_by")}
                  className="px-2 py-1 mt-1 w-full rounded border border-gray-300"
                />
              ) : (
                <p className="mt-1 text-gray-900">
                  {selectedFurnitureEquipment.financed_by || "N/A"}
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
                  value={selectedFurnitureEquipment.pv_number || ""}
                  onChange={(e) => handleChange(e, "pv_number")}
                  className="px-2 py-1 mt-1 w-full rounded border border-gray-300"
                />
              ) : (
                <p className="mt-1 text-gray-900">
                  {selectedFurnitureEquipment.pv_number || "N/A"}
                </p>
              )}
            </div>

            {/* Notes */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-500">Notes</h3>
              {isEditMode ? (
                <textarea
                  name="notes"
                  value={selectedFurnitureEquipment.notes || ""}
                  onChange={(e) => handleChange(e, "notes")}
                  className="px-2 py-1 mt-1 w-full rounded border border-gray-300 min-h-[60px]"
                />
              ) : (
                <p className="mt-1 text-gray-900">
                  {selectedFurnitureEquipment.notes || "N/A"}
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
                    selectedFurnitureEquipment.delivery_installation_date
                      ? new Date(
                          selectedFurnitureEquipment.delivery_installation_date
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
                  {selectedFurnitureEquipment.delivery_installation_date
                    ? new Date(
                        selectedFurnitureEquipment.delivery_installation_date
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
                    selectedFurnitureEquipment.replacement_date
                      ? new Date(selectedFurnitureEquipment.replacement_date)
                          .toISOString()
                          .split("T")[0]
                      : ""
                  }
                  onChange={(e) => handleChange(e, "replacement_date")}
                  className="px-2 py-1 mt-1 w-full rounded border border-gray-300"
                />
              ) : (
                <p className="mt-1 text-gray-900">
                  {selectedFurnitureEquipment.replacement_date
                    ? new Date(
                        selectedFurnitureEquipment.replacement_date
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
                    selectedFurnitureEquipment.disposal_date
                      ? new Date(selectedFurnitureEquipment.disposal_date)
                          .toISOString()
                          .split("T")[0]
                      : ""
                  }
                  onChange={(e) => handleChange(e, "disposal_date")}
                  className="px-2 py-1 mt-1 w-full rounded border border-gray-300"
                />
              ) : (
                <p className="mt-1 text-gray-900">
                  {selectedFurnitureEquipment.disposal_date
                    ? new Date(
                        selectedFurnitureEquipment.disposal_date
                      ).toLocaleDateString()
                    : "N/A"}
                </p>
              )}
            </div>

            {/* Disposal Value */}
            {(selectedFurnitureEquipment.disposal_value || isEditMode) && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-500">
                  Disposal Value
                </h3>
                {isEditMode ? (
                  <input
                    name="disposal_value"
                    type="number"
                    step="0.01"
                    value={selectedFurnitureEquipment.disposal_value || ""}
                    onChange={(e) => handleChange(e, "disposal_value")}
                    className="px-2 py-1 mt-1 w-full rounded border border-gray-300"
                  />
                ) : (
                  <p className="mt-1 text-gray-900">
                    {selectedFurnitureEquipment.disposal_value
                      ? `Ksh.${selectedFurnitureEquipment.disposal_value.toLocaleString()}`
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

export default FurnitureEquipmentDetail;

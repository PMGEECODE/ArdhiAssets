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

import { useOfficeEquipmentStore } from "../../../../shared/store/officeEquipmentStore";
import type { OfficeEquipment } from "../../../../shared/store/officeEquipmentStore";
import Button from "../../../../shared/components/ui/Button";
import Card from "../../../../shared/components/ui/Card";

const OfficeEquipmentDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEditMode = searchParams.get("edit") === "true";

  const {
    getOfficeEquipmentById,
    updateOfficeEquipment,
    selectedOfficeEquipment,
    setSelectedOfficeEquipment,
    isLoading,
  } = useOfficeEquipmentStore();

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadOfficeEquipment = async () => {
      if (id && id !== "new") {
        try {
          const item = await getOfficeEquipmentById(id);
          if (item) setSelectedOfficeEquipment(item);
        } catch (error) {
          console.error("Error loading office equipment:", error);
          toast.error("Failed to load office equipment details");
          navigate("/categories/office-equipment");
        }
      } else {
        toast.error("Invalid office equipment ID");
        navigate("/categories/office-equipment");
      }
    };

    loadOfficeEquipment();

    return () => setSelectedOfficeEquipment(null);
  }, [id, getOfficeEquipmentById, setSelectedOfficeEquipment, navigate]);

  const handleSave = async () => {
    if (!selectedOfficeEquipment) return;

    setIsSaving(true);
    try {
      await updateOfficeEquipment(
        selectedOfficeEquipment.id,
        selectedOfficeEquipment
      );
      toast.success("Office equipment updated successfully");
      navigate("/categories/office-equipment");
    } catch (error) {
      console.error("Error updating office equipment:", error);
      toast.error("Failed to update office equipment");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
    field: keyof OfficeEquipment
  ) => {
    if (selectedOfficeEquipment) {
      let value: any = e.target.value;

      // Handle numeric fields
      if (
        [
          "purchase_amount",
          "depreciation_rate",
          "annual_depreciation",
          "accumulated_depreciation",
          "net_book_value",
          "disposal_value",
        ].includes(field)
      ) {
        value = value === "" ? undefined : parseFloat(value);
      }

      setSelectedOfficeEquipment({
        ...selectedOfficeEquipment,
        [field]: value,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 rounded-full border-b-2 border-orange-600 animate-spin"></div>
      </div>
    );
  }

  if (!selectedOfficeEquipment) {
    return (
      <div className="py-8 text-center">
        <h2 className="text-xl font-semibold text-gray-900">
          Office equipment not found
        </h2>
        <Button
          variant="secondary"
          className="mt-4"
          leftIcon={<ArrowLeft size={16} />}
          onClick={() => navigate("/categories/office-equipment")}
        >
          Back to Office Equipment
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
          to="/categories/office-equipment"
          className="transition-colors hover:text-blue-600"
        >
          Office Equipment
        </Link>
        <ChevronRight size={16} />
        <span className="flex items-center font-medium text-gray-900">
          <Settings size={16} className="mr-1" />
          {isEditMode ? "Edit" : "View"} Equipment
        </span>
      </nav>

      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            className="p-2"
            onClick={() => navigate("/categories/office-equipment")}
          >
            <ArrowLeft size={20} />
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">
            {selectedOfficeEquipment.serial_number}
          </h1>
        </div>
        {isEditMode && (
          <Button
            variant="primary"
            className="bg-orange-600 hover:bg-orange-700"
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
          {/* Asset Information */}
          <div>
            <h2 className="mb-4 text-2xl font-semibold text-gray-800">
              Asset Information
            </h2>

            {/* Asset Description */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-500">
                Asset Description
              </h3>
              {isEditMode ? (
                <textarea
                  value={selectedOfficeEquipment.asset_description || ""}
                  onChange={(e) => handleChange(e, "asset_description")}
                  className="px-2 py-1 mt-1 w-full rounded border border-gray-300 min-h-[80px]"
                />
              ) : (
                <p className="mt-1 text-gray-900">
                  {selectedOfficeEquipment.asset_description}
                </p>
              )}
            </div>

            {/* Make/Model */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-500">Make/Model</h3>
              {isEditMode ? (
                <input
                  value={selectedOfficeEquipment.make_model || ""}
                  onChange={(e) => handleChange(e, "make_model")}
                  className="px-2 py-1 mt-1 w-full rounded border border-gray-300"
                />
              ) : (
                <p className="mt-1 text-gray-900">
                  {selectedOfficeEquipment.make_model || "N/A"}
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
                  value={selectedOfficeEquipment.serial_number || ""}
                  onChange={(e) => handleChange(e, "serial_number")}
                  className="px-2 py-1 mt-1 w-full rounded border border-gray-300"
                />
              ) : (
                <p className="mt-1 text-gray-900">
                  {selectedOfficeEquipment.serial_number || "N/A"}
                </p>
              )}
            </div>

            {/* Tag Number */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-500">Tag Number</h3>
              {isEditMode ? (
                <input
                  value={selectedOfficeEquipment.tag_number || ""}
                  onChange={(e) => handleChange(e, "tag_number")}
                  className="px-2 py-1 mt-1 w-full rounded border border-gray-300"
                />
              ) : (
                <p className="mt-1 text-gray-900">
                  {selectedOfficeEquipment.tag_number || "N/A"}
                </p>
              )}
            </div>
          </div>

          {/* Financial Information */}
          <div>
            <h2 className="mb-4 text-2xl font-semibold text-gray-800">
              Financial Information
            </h2>

            {[
              { label: "Purchase Amount", field: "purchase_amount" },
              { label: "Depreciation Rate (%)", field: "depreciation_rate" },
              { label: "Annual Depreciation", field: "annual_depreciation" },
              {
                label: "Accumulated Depreciation",
                field: "accumulated_depreciation",
              },
              { label: "Net Book Value", field: "net_book_value" },
              { label: "Disposal Value", field: "disposal_value" },
            ].map(({ label, field }) => (
              <div className="mb-4" key={field}>
                <h3 className="text-sm font-medium text-gray-500">{label}</h3>
                {isEditMode ? (
                  <input
                    type="number"
                    step="0.01"
                    value={(selectedOfficeEquipment as any)[field] || ""}
                    onChange={(e) => handleChange(e, field as any)}
                    className="px-2 py-1 mt-1 w-full rounded border border-gray-300"
                  />
                ) : (
                  <p className="mt-1 text-gray-900">
                    {(selectedOfficeEquipment as any)[field]
                      ? `Ksh.${(selectedOfficeEquipment as any)[
                          field
                        ].toLocaleString()}`
                      : "N/A"}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Location & Status */}
          <div>
            <h2 className="mb-4 text-2xl font-semibold text-gray-800">
              Location & Status
            </h2>

            {[
              { label: "Original Location", field: "original_location" },
              { label: "Current Location", field: "current_location" },
              { label: "Asset Condition", field: "asset_condition" },
              { label: "Responsible Officer", field: "responsible_officer" },
            ].map(({ label, field }) => (
              <div className="mb-4" key={field}>
                <h3 className="text-sm font-medium text-gray-500">{label}</h3>
                {isEditMode ? (
                  field === "asset_condition" ? (
                    <select
                      value={(selectedOfficeEquipment as any)[field] || ""}
                      onChange={(e) => handleChange(e, field as any)}
                      className="px-2 py-1 mt-1 w-full rounded border border-gray-300"
                    >
                      <option value="">Select condition</option>
                      <option value="Excellent">Excellent</option>
                      <option value="Good">Good</option>
                      <option value="Fair">Fair</option>
                      <option value="Poor">Poor</option>
                      <option value="Needs Repair">Needs Repair</option>
                      <option value="Disposed">Disposed</option>
                    </select>
                  ) : (
                    <input
                      value={(selectedOfficeEquipment as any)[field] || ""}
                      onChange={(e) => handleChange(e, field as any)}
                      className="px-2 py-1 mt-1 w-full rounded border border-gray-300"
                    />
                  )
                ) : (
                  <p className="mt-1 text-gray-900">
                    {(selectedOfficeEquipment as any)[field] || "N/A"}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Additional Details */}
          <div>
            <h2 className="mb-4 text-2xl font-semibold text-gray-800">
              Additional Details
            </h2>

            {[
              { label: "Financed By", field: "financed_by" },
              { label: "PV Number", field: "pv_number" },
              { label: "Notes", field: "notes", isTextArea: true },
            ].map(({ label, field, isTextArea }) => (
              <div className="mb-4" key={field}>
                <h3 className="text-sm font-medium text-gray-500">{label}</h3>
                {isEditMode ? (
                  isTextArea ? (
                    <textarea
                      value={(selectedOfficeEquipment as any)[field] || ""}
                      onChange={(e) => handleChange(e, field as any)}
                      className="px-2 py-1 mt-1 w-full rounded border border-gray-300 min-h-[60px]"
                    />
                  ) : (
                    <input
                      value={(selectedOfficeEquipment as any)[field] || ""}
                      onChange={(e) => handleChange(e, field as any)}
                      className="px-2 py-1 mt-1 w-full rounded border border-gray-300"
                    />
                  )
                ) : (
                  <p className="mt-1 text-gray-900">
                    {(selectedOfficeEquipment as any)[field] || "N/A"}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Important Dates */}
          <div>
            <h2 className="mb-4 text-2xl font-semibold text-gray-800">
              Important Dates
            </h2>

            {[
              {
                label: "Date of Delivery",
                field: "date_of_delivery",
              },
              { label: "Replacement Date", field: "replacement_date" },
              { label: "Date of Disposal", field: "date_of_disposal" },
            ].map(({ label, field }) => (
              <div className="mb-4" key={field}>
                <h3 className="text-sm font-medium text-gray-500">{label}</h3>
                {isEditMode ? (
                  <input
                    type="date"
                    value={
                      (selectedOfficeEquipment as any)[field]
                        ? new Date((selectedOfficeEquipment as any)[field])
                            .toISOString()
                            .split("T")[0]
                        : ""
                    }
                    onChange={(e) => handleChange(e, field as any)}
                    className="px-2 py-1 mt-1 w-full rounded border border-gray-300"
                  />
                ) : (
                  <p className="mt-1 text-gray-900">
                    {(selectedOfficeEquipment as any)[field]
                      ? new Date(
                          (selectedOfficeEquipment as any)[field]
                        ).toLocaleDateString()
                      : "N/A"}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default OfficeEquipmentDetail;

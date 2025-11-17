"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { AlertTriangle, Info, Edit3, Trash2 } from "lucide-react";

interface ConfirmBuildingExcelModalProps {
  show: boolean;
  data: any[];
  onConfirm: (data: any[]) => void;
  onCancel: () => void;
  isLoading: boolean;
}

const ConfirmBuildingExcelModal: React.FC<ConfirmBuildingExcelModalProps> = ({
  show,
  data,
  onConfirm,
  onCancel,
  isLoading,
}) => {
  const [editedData, setEditedData] = useState<any[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);

  useEffect(() => {
    setEditedData([...data]);
  }, [data]);

  const handleEdit = (index: number, field: string, value: any) => {
    const newData = [...editedData];
    newData[index] = { ...newData[index], [field]: value };
    setEditedData(newData);
  };

  const handleRemove = (index: number) => {
    const newData = editedData.filter((_, i) => i !== index);
    setEditedData(newData);
  };

  const startEditing = (index: number, field: string) => {
    setEditingIndex(index);
    setEditingField(field);
  };

  const stopEditing = () => {
    setEditingIndex(null);
    setEditingField(null);
  };

  const renderEditableField = (
    value: any,
    index: number,
    field: string,
    type: "text" | "number" | "date" | "select" = "text",
    options?: string[]
  ) => {
    const isEditing = editingIndex === index && editingField === field;

    if (isEditing) {
      if (type === "select" && options) {
        return (
          <select
            value={value || ""}
            onChange={(e) => handleEdit(index, field, e.target.value)}
            onBlur={stopEditing}
            autoFocus
            className="px-2 py-1 w-full text-sm rounded border border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select...</option>
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );
      }

      return (
        <input
          type={type}
          value={value || ""}
          onChange={(e) => handleEdit(index, field, e.target.value)}
          onBlur={stopEditing}
          autoFocus
          className="px-2 py-1 w-full text-sm rounded border border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      );
    }

    return (
      <div
        onClick={() => startEditing(index, field)}
        className="px-2 py-1 text-sm rounded cursor-pointer hover:bg-blue-50 group"
        title="Click to edit"
      >
        <span className="group-hover:hidden">{value || "—"}</span>
        <span className="hidden group-hover:inline-flex items-center gap-1 text-blue-600">
          <Edit3 size={12} />
          {value || "Click to edit"}
        </span>
      </div>
    );
  };

  if (!show) return null;

  return (
    <div className="flex fixed inset-0 z-50 justify-center items-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-[95vw] max-h-[95vh] relative overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-20 p-6 pb-4 bg-white border-b">
          <h3 className="text-xl font-bold">Confirm Building Excel Data</h3>
          <p className="mt-1 text-sm text-gray-600">
            Review and edit the data before uploading. Click any field to edit
            it.
          </p>
          <div className="flex items-center gap-2 mt-3 p-2 bg-blue-50 rounded-md border border-blue-200">
            <Info className="w-4 h-4 text-blue-600" />
            <span className="text-xs text-blue-700">
              Intelligent column mapping is active - columns have been
              automatically matched to the correct fields
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-auto flex-1 p-6">
          <div className="overflow-x-auto rounded-md border">
            <table className="min-w-full border-collapse table-auto">
              <thead className="sticky top-0 z-10 bg-gray-50">
                <tr className="border-b">
                  <th className="px-3 py-2 text-xs font-semibold text-left bg-gray-50">
                    Actions
                  </th>
                  <th className="px-3 py-2 text-xs font-semibold text-left whitespace-nowrap bg-gray-50">
                    Building Name
                  </th>
                  <th className="px-3 py-2 text-xs font-semibold text-left whitespace-nowrap bg-gray-50">
                    Building Ownership
                  </th>
                  <th className="px-3 py-2 text-xs font-semibold text-left whitespace-nowrap bg-gray-50">
                    Category
                  </th>
                  <th className="px-3 py-2 text-xs font-semibold text-left whitespace-nowrap bg-gray-50">
                    Building No
                  </th>
                  <th className="px-3 py-2 text-xs font-semibold text-left whitespace-nowrap bg-gray-50">
                    Institution No
                  </th>
                  <th className="px-3 py-2 text-xs font-semibold text-left whitespace-nowrap bg-gray-50">
                    Nearest Town
                  </th>
                  <th className="px-3 py-2 text-xs font-semibold text-left whitespace-nowrap bg-gray-50">
                    Street
                  </th>
                  <th className="px-3 py-2 text-xs font-semibold text-left whitespace-nowrap bg-gray-50">
                    County
                  </th>
                  <th className="px-3 py-2 text-xs font-semibold text-left whitespace-nowrap bg-gray-50">
                    Sub County
                  </th>
                  <th className="px-3 py-2 text-xs font-semibold text-left whitespace-nowrap bg-gray-50">
                    Division
                  </th>
                  <th className="px-3 py-2 text-xs font-semibold text-left whitespace-nowrap bg-gray-50">
                    Location
                  </th>
                  <th className="px-3 py-2 text-xs font-semibold text-left whitespace-nowrap bg-gray-50">
                    Sub Location
                  </th>
                  <th className="px-3 py-2 text-xs font-semibold text-left whitespace-nowrap bg-gray-50">
                    LR No
                  </th>
                  <th className="px-3 py-2 text-xs font-semibold text-left whitespace-nowrap bg-gray-50">
                    Land Size (Ha)
                  </th>
                  <th className="px-3 py-2 text-xs font-semibold text-left whitespace-nowrap bg-gray-50">
                    Ownership Status
                  </th>
                  <th className="px-3 py-2 text-xs font-semibold text-left whitespace-nowrap bg-gray-50">
                    Source of Funds
                  </th>
                  <th className="px-3 py-2 text-xs font-semibold text-left whitespace-nowrap bg-gray-50">
                    Mode of Acquisition
                  </th>
                  <th className="px-3 py-2 text-xs font-semibold text-left whitespace-nowrap bg-gray-50">
                    Date of Purchase
                  </th>
                  <th className="px-3 py-2 text-xs font-semibold text-left whitespace-nowrap bg-gray-50">
                    Type of Building
                  </th>
                  <th className="px-3 py-2 text-xs font-semibold text-left whitespace-nowrap bg-gray-50">
                    Designated Use
                  </th>
                  <th className="px-3 py-2 text-xs font-semibold text-left whitespace-nowrap bg-gray-50">
                    Useful Life (Years)
                  </th>
                  <th className="px-3 py-2 text-xs font-semibold text-left whitespace-nowrap bg-gray-50">
                    No of Floors
                  </th>
                  <th className="px-3 py-2 text-xs font-semibold text-left whitespace-nowrap bg-gray-50">
                    Plinth Area (sq m)
                  </th>
                  <th className="px-3 py-2 text-xs font-semibold text-left whitespace-nowrap bg-gray-50">
                    Cost/Valuation
                  </th>
                  <th className="px-3 py-2 text-xs font-semibold text-left whitespace-nowrap bg-gray-50">
                    Annual Depreciation
                  </th>
                  <th className="px-3 py-2 text-xs font-semibold text-left whitespace-nowrap bg-gray-50">
                    Accumulated Depreciation
                  </th>
                  <th className="px-3 py-2 text-xs font-semibold text-left whitespace-nowrap bg-gray-50">
                    Net Book Value
                  </th>
                  <th className="px-3 py-2 text-xs font-semibold text-left whitespace-nowrap bg-gray-50">
                    Annual Rental Income
                  </th>
                  <th className="px-3 py-2 text-xs font-semibold text-left whitespace-nowrap bg-gray-50">
                    Remarks
                  </th>
                </tr>
              </thead>
              <tbody>
                {editedData.map((building, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <button
                        onClick={() => handleRemove(index)}
                        className="p-1 text-red-600 rounded transition-colors hover:bg-red-100"
                        title="Remove this row"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                    <td className="px-3 py-2 min-w-[200px]">
                      {renderEditableField(
                        building.description_name_of_building,
                        index,
                        "description_name_of_building"
                      )}
                    </td>
                    <td className="px-3 py-2 min-w-[150px]">
                      {renderEditableField(
                        building.building_ownership,
                        index,
                        "building_ownership"
                      )}
                    </td>
                    <td className="px-3 py-2 min-w-[120px]">
                      {renderEditableField(
                        building.category,
                        index,
                        "category"
                      )}
                    </td>
                    <td className="px-3 py-2 min-w-[120px]">
                      {renderEditableField(
                        building.building_no,
                        index,
                        "building_no"
                      )}
                    </td>
                    <td className="px-3 py-2 min-w-[120px]">
                      {renderEditableField(
                        building.institution_no,
                        index,
                        "institution_no"
                      )}
                    </td>
                    <td className="px-3 py-2 min-w-[150px]">
                      {renderEditableField(
                        building.nearest_town_shopping_centre,
                        index,
                        "nearest_town_shopping_centre"
                      )}
                    </td>
                    <td className="px-3 py-2 min-w-[120px]">
                      {renderEditableField(building.street, index, "street")}
                    </td>
                    <td className="px-3 py-2 min-w-[120px]">
                      {renderEditableField(building.county, index, "county")}
                    </td>
                    <td className="px-3 py-2 min-w-[120px]">
                      {renderEditableField(
                        building.sub_county,
                        index,
                        "sub_county"
                      )}
                    </td>
                    <td className="px-3 py-2 min-w-[120px]">
                      {renderEditableField(
                        building.division,
                        index,
                        "division"
                      )}
                    </td>
                    <td className="px-3 py-2 min-w-[120px]">
                      {renderEditableField(
                        building.location,
                        index,
                        "location"
                      )}
                    </td>
                    <td className="px-3 py-2 min-w-[120px]">
                      {renderEditableField(
                        building.sub_location,
                        index,
                        "sub_location"
                      )}
                    </td>
                    <td className="px-3 py-2 min-w-[120px]">
                      {renderEditableField(building.lr_no, index, "lr_no")}
                    </td>
                    <td className="px-3 py-2 min-w-[120px]">
                      {renderEditableField(
                        building.size_of_land_ha,
                        index,
                        "size_of_land_ha",
                        "number"
                      )}
                    </td>
                    <td className="px-3 py-2 min-w-[150px]">
                      {renderEditableField(
                        building.ownership_status,
                        index,
                        "ownership_status",
                        "select",
                        ["Owned", "Leased", "Rented", "Government"]
                      )}
                    </td>
                    <td className="px-3 py-2 min-w-[150px]">
                      {renderEditableField(
                        building.source_of_funds,
                        index,
                        "source_of_funds"
                      )}
                    </td>
                    <td className="px-3 py-2 min-w-[150px]">
                      {renderEditableField(
                        building.mode_of_acquisition,
                        index,
                        "mode_of_acquisition",
                        "select",
                        [
                          "Purchase",
                          "Donation",
                          "Construction",
                          "Transfer",
                          "Inheritance",
                        ]
                      )}
                    </td>
                    <td className="px-3 py-2 min-w-[150px]">
                      {renderEditableField(
                        building.date_of_purchase_or_commissioning,
                        index,
                        "date_of_purchase_or_commissioning",
                        "date"
                      )}
                    </td>
                    <td className="px-3 py-2 min-w-[150px]">
                      {renderEditableField(
                        building.type_of_building,
                        index,
                        "type_of_building"
                      )}
                    </td>
                    <td className="px-3 py-2 min-w-[150px]">
                      {renderEditableField(
                        building.designated_use,
                        index,
                        "designated_use"
                      )}
                    </td>
                    <td className="px-3 py-2 min-w-[120px]">
                      {renderEditableField(
                        building.estimated_useful_life,
                        index,
                        "estimated_useful_life",
                        "number"
                      )}
                    </td>
                    <td className="px-3 py-2 min-w-[120px]">
                      {renderEditableField(
                        building.no_of_floors,
                        index,
                        "no_of_floors",
                        "number"
                      )}
                    </td>
                    <td className="px-3 py-2 min-w-[120px]">
                      {renderEditableField(
                        building.plinth_area,
                        index,
                        "plinth_area",
                        "number"
                      )}
                    </td>
                    <td className="px-3 py-2 min-w-[150px]">
                      {renderEditableField(
                        building.cost_of_construction_or_valuation,
                        index,
                        "cost_of_construction_or_valuation",
                        "number"
                      )}
                    </td>
                    <td className="px-3 py-2 min-w-[150px]">
                      {renderEditableField(
                        building.annual_depreciation,
                        index,
                        "annual_depreciation",
                        "number"
                      )}
                    </td>
                    <td className="px-3 py-2 min-w-[180px]">
                      {renderEditableField(
                        building.accumulated_depreciation_to_date,
                        index,
                        "accumulated_depreciation_to_date",
                        "number"
                      )}
                    </td>
                    <td className="px-3 py-2 min-w-[150px]">
                      {renderEditableField(
                        building.net_book_value,
                        index,
                        "net_book_value",
                        "number"
                      )}
                    </td>
                    <td className="px-3 py-2 min-w-[150px]">
                      {renderEditableField(
                        building.annual_rental_income,
                        index,
                        "annual_rental_income",
                        "number"
                      )}
                    </td>
                    <td className="px-3 py-2 min-w-[200px]">
                      {renderEditableField(building.remarks, index, "remarks")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {editedData.length === 0 && (
            <div className="flex flex-col justify-center items-center py-12 text-gray-500">
              <AlertTriangle className="mb-2 w-12 h-12" />
              <p>No data to display</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 p-6 bg-white border-t">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {editedData.length} building(s) ready to upload
            </div>
            <div className="flex space-x-4">
              <button
                onClick={onCancel}
                className="px-4 py-2 bg-gray-300 rounded transition hover:bg-gray-400"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                onClick={() => onConfirm(editedData)}
                disabled={isLoading || editedData.length === 0}
                className={`px-4 py-2 rounded transition ${
                  isLoading || editedData.length === 0
                    ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {isLoading ? "Uploading..." : "Confirm Upload"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmBuildingExcelModal;

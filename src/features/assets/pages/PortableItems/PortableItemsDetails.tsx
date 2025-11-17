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
  Settings,
  ArrowRightLeft,
  MapPin,
  History,
  Clock,
  Package,
  FileText,
  Calendar,
} from "lucide-react";
import { toast } from "react-toastify";

import { usePortableItemsStore } from "../../../../shared/store/portableItemsStore";
import type { PortableItem } from "../../../../shared/store/portableItemsStore";
import Button from "../../../../shared/components/ui/Button";
import Card from "../../../../shared/components/ui/Card";
import { KshIcon } from "../../../../shared/components/ui/icons/KshIcon";

const PortableItemsDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEditMode = searchParams.get("edit") === "true";

  const {
    getPortableItemById,
    updatePortableItem,
    selectedPortableItem,
    setSelectedPortableItem,
    isLoading,
  } = usePortableItemsStore();

  const [isSaving, setIsSaving] = useState(false);
  const [calculatedValues, setCalculatedValues] = useState<{
    accumulated_depreciation?: number;
    net_book_value?: number;
  }>({});

  useEffect(() => {
    const loadPortableItem = async () => {
      if (id && id !== "new") {
        try {
          const item = await getPortableItemById(id);
          if (item) {
            setSelectedPortableItem(item);
          }
        } catch (error) {
          console.error("Error loading portable item:", error);
          toast.error("Failed to load portable item details");
          navigate("/categories/portable-items");
        }
      } else {
        toast.error("Invalid portable item ID");
        navigate("/categories/portable-items");
      }
    };

    loadPortableItem();

    return () => setSelectedPortableItem(null);
  }, [id, getPortableItemById, setSelectedPortableItem, navigate]);

  useEffect(() => {
    if (selectedPortableItem) {
      calculateFinancialFields();

      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setHours(24, 0, 0, 0);
      const msUntilMidnight = tomorrow.getTime() - now.getTime();

      let dailyInterval: NodeJS.Timeout | null = null;

      const midnightTimeout = setTimeout(() => {
        calculateFinancialFields();

        dailyInterval = setInterval(() => {
          calculateFinancialFields();
        }, 24 * 60 * 60 * 1000); // 24 hours
      }, msUntilMidnight);

      return () => {
        clearTimeout(midnightTimeout);
        if (dailyInterval) {
          clearInterval(dailyInterval);
        }
      };
    }
  }, [selectedPortableItem]);

  const calculateFinancialFields = () => {
    if (!selectedPortableItem) return;

    const purchaseAmount = selectedPortableItem.purchase_amount || 0;
    const depreciationRate = selectedPortableItem.depreciation_rate || 0;
    const deliveryDateStr = selectedPortableItem.delivery_installation_date;

    if (!purchaseAmount || !depreciationRate || !deliveryDateStr) {
      setCalculatedValues({});
      return;
    }

    const deliveryDate = new Date(deliveryDateStr);
    deliveryDate.setHours(0, 0, 0, 0);

    const disposalDate = selectedPortableItem.disposal_date
      ? new Date(selectedPortableItem.disposal_date)
      : null;
    const replacementDate = selectedPortableItem.replacement_date
      ? new Date(selectedPortableItem.replacement_date)
      : null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endDate = [disposalDate, replacementDate, today]
      .filter(Boolean)
      .reduce((earliest, date) =>
        date && earliest
          ? date < earliest
            ? date
            : earliest
          : date || earliest
      );

    const daysInUse = Math.max(
      0,
      Math.floor(
        (endDate.getTime() - deliveryDate.getTime()) / (1000 * 60 * 60 * 24)
      )
    );

    const annualDepreciation = purchaseAmount * (depreciationRate / 100);
    const dailyDepreciation = annualDepreciation / 365;
    const accumulatedDepreciation = Math.min(
      dailyDepreciation * daysInUse,
      purchaseAmount
    );

    const netBookValue = Math.max(0, purchaseAmount - accumulatedDepreciation);

    console.log("[v0] Live Depreciation Calculation:", {
      deliveryDate: deliveryDate.toISOString().split("T")[0],
      today: today.toISOString().split("T")[0],
      daysInUse,
      purchaseAmount,
      depreciationRate,
      annualDepreciation,
      dailyDepreciation,
      accumulatedDepreciation,
      netBookValue,
    });

    setCalculatedValues({
      accumulated_depreciation: Number(accumulatedDepreciation.toFixed(2)),
      net_book_value: Number(netBookValue.toFixed(2)),
    });
  };

  const handleSave = async () => {
    if (!selectedPortableItem) return;

    setIsSaving(true);
    try {
      await updatePortableItem(selectedPortableItem.id, selectedPortableItem);
      toast.success("Portable item updated successfully");
      navigate("/categories/portable-items");
    } catch (error) {
      console.error("Error updating portable item:", error);
      toast.error("Failed to update portable item");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTransfer = () => {
    if (selectedPortableItem) {
      navigate(
        `/categories/portable-items/${selectedPortableItem.id}/transfer`
      );
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
    field: keyof PortableItem
  ) => {
    if (selectedPortableItem) {
      let value: any = e.target.value;

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
        value = value === "" ? undefined : Number.parseFloat(value);
      }

      setSelectedPortableItem({
        ...selectedPortableItem,
        [field]: value,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="w-6 h-6 rounded-full border-b-2 border-blue-600 animate-spin"></div>
      </div>
    );
  }

  if (!selectedPortableItem) {
    return (
      <div className="p-4 text-center">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Portable item not found
        </h2>
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<ArrowLeft size={14} />}
          onClick={() => navigate("/categories/portable-items")}
        >
          Back to Portable Items
        </Button>
      </div>
    );
  }

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
            to="/categories/portable-items"
            className="whitespace-nowrap hover:text-blue-600 transition-colors"
          >
            Portable Items
          </Link>
          <ChevronRight size={12} />
          <span className="flex items-center font-medium text-gray-900 whitespace-nowrap">
            <Settings size={12} className="mr-1" />
            {isEditMode ? "Edit" : "View"}
          </span>
        </div>
      </nav>

      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-3 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              className="p-1.5"
              onClick={() => navigate("/categories/portable-items")}
            >
              <ArrowLeft size={16} />
            </Button>
            <h1 className="text-lg font-bold text-gray-900 truncate">
              {selectedPortableItem.serial_number}
            </h1>
          </div>
          <div className="flex space-x-1">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<ArrowRightLeft size={14} />}
              onClick={handleTransfer}
              className="bg-purple-600 text-white hover:bg-purple-700 text-xs px-2 py-1.5"
            >
              Transfer
            </Button>
            {isEditMode && (
              <Button
                variant="primary"
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-xs px-2 py-1.5"
                leftIcon={<Save size={14} />}
                onClick={handleSave}
                isLoading={isSaving}
              >
                Save
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-3 py-4 space-y-4">
        {/* Asset Information Section */}
        <Card>
          <div className="p-4">
            <div className="flex items-center mb-3">
              <Package size={16} className="text-indigo-600 mr-2" />
              <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
                Asset Information
              </h2>
            </div>

            <div className="space-y-3">
              {/* Asset Description */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Asset Description
                </label>
                {isEditMode ? (
                  <textarea
                    value={selectedPortableItem.asset_description || ""}
                    onChange={(e) => handleChange(e, "asset_description")}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[60px]"
                  />
                ) : (
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    {selectedPortableItem.asset_description || "N/A"}
                  </p>
                )}
              </div>

              {/* Asset Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: "Make/Model", field: "make_model" },
                  { label: "Serial Number", field: "serial_number" },
                  { label: "Tag Number", field: "tag_number" },
                ].map(({ label, field }) => (
                  <div key={field}>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      {label}
                    </label>
                    {isEditMode ? (
                      <input
                        value={(selectedPortableItem as any)[field] || ""}
                        onChange={(e) => handleChange(e, field as any)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                        {(selectedPortableItem as any)[field] || "N/A"}
                      </p>
                    )}
                  </div>
                ))}
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
                { label: "Purchase Amount", field: "purchase_amount" },
                { label: "Depreciation Rate (%)", field: "depreciation_rate" },
                { label: "Annual Depreciation", field: "annual_depreciation" },
              ].map(({ label, field }) => (
                <div key={field}>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    {label}
                  </label>
                  {isEditMode ? (
                    <input
                      type="number"
                      step="0.01"
                      value={(selectedPortableItem as any)[field] || ""}
                      onChange={(e) => handleChange(e, field as any)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                      {(selectedPortableItem as any)[field]
                        ? `Ksh. ${(selectedPortableItem as any)[
                            field
                          ].toLocaleString()}`
                        : "N/A"}
                    </p>
                  )}
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Accumulated Depreciation
                  <span className="text-green-600 text-xs ml-1">(live)</span>
                </label>
                {isEditMode ? (
                  <input
                    type="number"
                    step="0.01"
                    value={selectedPortableItem.accumulated_depreciation || ""}
                    onChange={(e) =>
                      handleChange(e, "accumulated_depreciation")
                    }
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-sm text-gray-900 bg-green-50 p-2 rounded border border-green-200">
                    {calculatedValues.accumulated_depreciation
                      ? `Ksh. ${calculatedValues.accumulated_depreciation.toLocaleString()}`
                      : "N/A"}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Net Book Value
                  <span className="text-green-600 text-xs ml-1">(live)</span>
                </label>
                {isEditMode ? (
                  <input
                    type="number"
                    step="0.01"
                    value={selectedPortableItem.net_book_value || ""}
                    onChange={(e) => handleChange(e, "net_book_value")}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-sm text-gray-900 bg-green-50 p-2 rounded border border-green-200">
                    {calculatedValues.net_book_value
                      ? `Ksh. ${calculatedValues.net_book_value.toLocaleString()}`
                      : "N/A"}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Disposal Value
                </label>
                {isEditMode ? (
                  <input
                    type="number"
                    step="0.01"
                    value={selectedPortableItem.disposal_value || ""}
                    onChange={(e) => handleChange(e, "disposal_value")}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    {selectedPortableItem.disposal_value
                      ? `Ksh. ${selectedPortableItem.disposal_value.toLocaleString()}`
                      : "N/A"}
                  </p>
                )}
              </div>
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
                { label: "Responsible Officer", field: "responsible_officer" },
              ].map(({ label, field, isSelect }) => (
                <div key={field}>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    {label}
                  </label>
                  {isEditMode ? (
                    isSelect ? (
                      <select
                        value={(selectedPortableItem as any)[field] || ""}
                        onChange={(e) => handleChange(e, field as any)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select condition</option>
                        <option value="New">New</option>
                        <option value="Good">Good</option>
                        <option value="Worn">Worn</option>
                        <option value="Needs Replacement">
                          Needs Replacement
                        </option>
                      </select>
                    ) : (
                      <input
                        value={(selectedPortableItem as any)[field] || ""}
                        onChange={(e) => handleChange(e, field as any)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    )
                  ) : (
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                      {(selectedPortableItem as any)[field] || "N/A"}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Additional Details Section */}
        <Card>
          <div className="p-4">
            <div className="flex items-center mb-3">
              <FileText size={16} className="text-orange-600 mr-2" />
              <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
                Additional Details
              </h2>
            </div>

            <div className="space-y-3">
              {[
                { label: "Financed By", field: "financed_by" },
                { label: "PV Number", field: "pv_number" },
              ].map(({ label, field }) => (
                <div key={field}>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    {label}
                  </label>
                  {isEditMode ? (
                    <input
                      value={(selectedPortableItem as any)[field] || ""}
                      onChange={(e) => handleChange(e, field as any)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                      {(selectedPortableItem as any)[field] || "N/A"}
                    </p>
                  )}
                </div>
              ))}

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Notes
                </label>
                {isEditMode ? (
                  <textarea
                    value={selectedPortableItem.notes || ""}
                    onChange={(e) => handleChange(e, "notes")}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[60px]"
                  />
                ) : (
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    {selectedPortableItem.notes || "N/A"}
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
                {
                  label: "Delivery/Installation",
                  field: "delivery_installation_date",
                },
                { label: "Replacement Date", field: "replacement_date" },
                { label: "Disposal Date", field: "disposal_date" },
              ].map(({ label, field }) => (
                <div key={field}>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    {label}
                  </label>
                  {isEditMode ? (
                    <input
                      type="date"
                      value={
                        (selectedPortableItem as any)[field]
                          ? new Date((selectedPortableItem as any)[field])
                              .toISOString()
                              .split("T")[0]
                          : ""
                      }
                      onChange={(e) => handleChange(e, field as any)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                      {(selectedPortableItem as any)[field]
                        ? new Date(
                            (selectedPortableItem as any)[field]
                          ).toLocaleDateString()
                        : "N/A"}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Transfer Information Section */}
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <History size={16} className="text-purple-600 mr-2" />
                <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
                  Transfer Information
                </h2>
              </div>
              <div className="flex items-center space-x-1">
                <ArrowRightLeft size={12} className="text-purple-500" />
                <span className="text-xs text-purple-500 uppercase tracking-wide">
                  Status
                </span>
              </div>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center space-x-2">
                <Clock size={14} className="text-gray-400" />
                <div>
                  <div className="text-xs font-medium text-gray-600">
                    No Transfer History
                  </div>
                  <div className="text-xs text-gray-500">
                    Portable item has not been transferred
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTransfer}
                leftIcon={<ArrowRightLeft size={14} />}
                className="w-full border-purple-200 text-purple-700 hover:bg-purple-50 text-xs py-2"
              >
                Initiate Transfer
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PortableItemsDetail;

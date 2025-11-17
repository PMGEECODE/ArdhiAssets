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
  User,
  History,
  Clock,
  Computer,
  Building,
  FileText,
  Calendar,
} from "lucide-react";
import { toast } from "react-toastify";

import { useIctAssetsStore } from "../../../../shared/store/ictAssetsStore";
import type { IctAsset } from "../../../../shared/store/ictAssetsStore";
import Button from "../../../../shared/components/ui/Button";
import Card from "../../../../shared/components/ui/Card";
import IctAssetTransferHistoryModal from "../../../../shared/components/ui/IctAssetTransferHistoryModal";
import { KshIcon } from "../../../../shared/components/ui/icons/KshIcon";

const IctAssetsDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEditMode = searchParams.get("edit") === "true";

  const {
    getIctAssetById,
    updateIctAsset,
    selectedIctAsset,
    setSelectedIctAsset,
    isLoading,
    fetchTransferHistory,
    transferHistory,
    isLoadingTransfers,
  } = useIctAssetsStore();

  const [isSaving, setIsSaving] = useState(false);
  const [showTransferHistory, setShowTransferHistory] = useState(false);

  useEffect(() => {
    const loadIctAsset = async () => {
      if (id && id !== "new") {
        try {
          const asset = await getIctAssetById(id);
          if (asset) {
            setSelectedIctAsset(asset);
            await fetchTransferHistory(id);
          }
        } catch (error) {
          console.error("Error loading ICT Asset:", error);
          toast.error("Failed to load ICT Asset details");
          navigate("/categories/ict-assets");
        }
      } else {
        toast.error("Invalid ICT Asset ID");
        navigate("/categories/ict-assets");
      }
    };

    loadIctAsset();

    return () => setSelectedIctAsset(null);
  }, [
    id,
    getIctAssetById,
    setSelectedIctAsset,
    navigate,
    fetchTransferHistory,
  ]);

  const handleSave = async () => {
    if (!selectedIctAsset) return;

    setIsSaving(true);
    try {
      await updateIctAsset(selectedIctAsset.id, selectedIctAsset);
      toast.success("ICT Asset updated successfully");
      navigate("/categories/ict-assets");
    } catch (error) {
      console.error("Error updating ICT Asset:", error);
      toast.error("Failed to update ICT Asset");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTransfer = () => {
    if (selectedIctAsset) {
      navigate(`/categories/ict-assets/${selectedIctAsset.id}/transfer`);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
    field: keyof IctAsset
  ) => {
    if (selectedIctAsset) {
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

      setSelectedIctAsset({
        ...selectedIctAsset,
        [field]: value,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="w-6 h-6 rounded-full border-b-2 border-accent-600 animate-spin"></div>
      </div>
    );
  }

  if (!selectedIctAsset) {
    return (
      <div className="p-4 text-center">
        <h2 className="text-lg font-bold text-primary-900 dark:text-primary-50 mb-3">
          ICT Asset not found
        </h2>
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<ArrowLeft size={14} />}
          onClick={() => navigate("/categories/ict-assets")}
        >
          Back to ICT Assets
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary-50 dark:bg-primary-900">
      {/* Mobile-optimized Navigation */}
      <nav className="px-3 py-2 bg-white dark:bg-primary-800 border-b border-primary-200 dark:border-primary-700">
        <div className="flex items-center space-x-1 text-xs text-primary-600 dark:text-primary-400 overflow-x-auto">
          <Link
            to="/"
            className="flex items-center whitespace-nowrap hover:text-accent-600 dark:hover:text-accent-400 transition-colors"
          >
            <Home size={12} className="mr-1" />
            Home
          </Link>
          <ChevronRight size={12} />
          <Link
            to="/asset-categories"
            className="whitespace-nowrap hover:text-accent-600 dark:hover:text-accent-400 transition-colors"
          >
            Categories
          </Link>
          <ChevronRight size={12} />
          <Link
            to="/categories/ict-assets"
            className="whitespace-nowrap hover:text-accent-600 dark:hover:text-accent-400 transition-colors"
          >
            ICT Assets
          </Link>
          <ChevronRight size={12} />
          <span className="flex items-center font-medium text-primary-900 dark:text-primary-100 whitespace-nowrap">
            <Settings size={12} className="mr-1" />
            {isEditMode ? "Edit" : "View"}
          </span>
        </div>
      </nav>

      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-primary-800 border-b border-primary-200 dark:border-primary-700 px-3 py-3 transition-colors duration-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              className="p-1.5"
              onClick={() => navigate("/categories/ict-assets")}
            >
              <ArrowLeft
                size={16}
                className="text-primary-600 dark:text-primary-400"
              />
            </Button>
            <h1 className="text-lg font-bold text-primary-900 dark:text-primary-50 truncate">
              {selectedIctAsset.serial_number}
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
                variant="success"
                size="sm"
                className="bg-success-600 hover:bg-success-700 text-white text-xs px-2 py-1.5 flex items-center space-x-1"
                leftIcon={<Save size={14} />}
                onClick={handleSave}
                isLoading={isSaving}
              >
                <span>{isSaving ? "Saving..." : "Save"}</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-3 py-4 space-y-4">
        {/* Asset Information Section */}
        <Card className="border-primary-200 dark:border-primary-700 bg-white dark:bg-primary-800">
          <div className="p-4">
            <div className="flex items-center mb-3">
              <Computer
                size={16}
                className="text-accent-600 dark:text-accent-400 mr-2"
              />
              <h2 className="text-sm font-semibold text-primary-800 dark:text-primary-200 uppercase tracking-wide">
                Asset Information
              </h2>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-primary-600 dark:text-primary-400 mb-1">
                  Asset Description
                </label>
                {isEditMode ? (
                  <textarea
                    value={selectedIctAsset.asset_description || ""}
                    onChange={(e) => handleChange(e, "asset_description")}
                    className="w-full px-2 py-1.5 text-sm border border-primary-200 dark:border-primary-700 rounded-md
                               bg-primary-50 dark:bg-primary-900 text-primary-900 dark:text-primary-100
                               placeholder:text-primary-500 dark:placeholder:text-primary-500
                               focus:outline-none focus:ring-2 focus:ring-accent-500 dark:focus:ring-accent-400
                               focus:border-accent-500 dark:focus:border-accent-400 transition-all duration-200 min-h-[60px]"
                  />
                ) : (
                  <p className="text-sm text-primary-900 dark:text-primary-100 bg-primary-50 dark:bg-primary-900 p-2 rounded-md border border-primary-200 dark:border-primary-700">
                    {selectedIctAsset.asset_description || "N/A"}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: "Make/Model", field: "make_model" },
                  { label: "Serial Number", field: "serial_number" },
                  { label: "Tag Number", field: "tag_number" },
                ].map(({ label, field }) => (
                  <div key={field}>
                    <label className="block text-xs font-medium text-primary-600 dark:text-primary-400 mb-1">
                      {label}
                    </label>
                    {isEditMode ? (
                      <input
                        value={(selectedIctAsset as any)[field] || ""}
                        onChange={(e) => handleChange(e, field as any)}
                        className="w-full px-2 py-1.5 text-sm border border-primary-200 dark:border-primary-700 rounded-md
                                   bg-primary-50 dark:bg-primary-900 text-primary-900 dark:text-primary-100
                                   placeholder:text-primary-500 dark:placeholder:text-primary-500
                                   focus:outline-none focus:ring-2 focus:ring-accent-500 dark:focus:ring-accent-400
                                   focus:border-accent-500 dark:focus:border-accent-400 transition-all duration-200"
                      />
                    ) : (
                      <p className="text-sm text-primary-900 dark:text-primary-100 bg-primary-50 dark:bg-primary-900 p-2 rounded-md border border-primary-200 dark:border-primary-700">
                        {(selectedIctAsset as any)[field] || "N/A"}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Financial Information Section */}
        <Card className="border-primary-200 dark:border-primary-700 bg-white dark:bg-primary-800">
          <div className="p-4">
            <div className="flex items-center mb-3">
              <KshIcon
                size={16}
                className="text-success-600 dark:text-success-400 mr-2"
              />
              <h2 className="text-sm font-semibold text-primary-800 dark:text-primary-200 uppercase tracking-wide">
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
                  <label className="block text-xs font-medium text-primary-600 dark:text-primary-400 mb-1">
                    {label}
                  </label>
                  {isEditMode ? (
                    <input
                      type="number"
                      step="0.01"
                      value={(selectedIctAsset as any)[field] || ""}
                      onChange={(e) => handleChange(e, field as any)}
                      className="w-full px-2 py-1.5 text-sm border border-primary-200 dark:border-primary-700 rounded-md
                                 bg-primary-50 dark:bg-primary-900 text-primary-900 dark:text-primary-100
                                 focus:outline-none focus:ring-2 focus:ring-accent-500 dark:focus:ring-accent-400
                                 focus:border-accent-500 dark:focus:border-accent-400 transition-all duration-200"
                    />
                  ) : (
                    <p className="text-sm text-primary-900 dark:text-primary-100 bg-primary-50 dark:bg-primary-900 p-2 rounded-md border border-primary-200 dark:border-primary-700">
                      {(selectedIctAsset as any)[field]
                        ? `Ksh. ${(selectedIctAsset as any)[
                            field
                          ].toLocaleString()}`
                        : "N/A"}
                    </p>
                  )}
                </div>
              ))}

              <div>
                <label className="block text-xs font-medium text-primary-600 dark:text-primary-400 mb-1">
                  Accumulated Depreciation
                  <span className="text-success-600 dark:text-success-400 text-xs ml-1">
                    (live)
                  </span>
                </label>
                {isEditMode ? (
                  <input
                    type="number"
                    step="0.01"
                    value={selectedIctAsset.accumulated_depreciation || ""}
                    onChange={(e) =>
                      handleChange(e, "accumulated_depreciation")
                    }
                    className="w-full px-2 py-1.5 text-sm border border-primary-200 dark:border-primary-700 rounded-md
                               bg-primary-50 dark:bg-primary-900 text-primary-900 dark:text-primary-100
                               focus:outline-none focus:ring-2 focus:ring-accent-500 dark:focus:ring-accent-400
                               focus:border-accent-500 dark:focus:border-accent-400 transition-all duration-200"
                  />
                ) : (
                  <p className="text-sm text-success-800 dark:text-success-300 bg-success-50 dark:bg-success-950 p-2 rounded-md border border-success-200 dark:border-success-800">
                    {selectedIctAsset.accumulated_depreciation
                      ? `Ksh. ${Number(
                          selectedIctAsset.accumulated_depreciation
                        ).toLocaleString()}`
                      : "N/A"}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-primary-600 dark:text-primary-400 mb-1">
                  Net Book Value
                  <span className="text-success-600 dark:text-success-400 text-xs ml-1">
                    (live)
                  </span>
                </label>
                {isEditMode ? (
                  <input
                    type="number"
                    step="0.01"
                    value={selectedIctAsset.net_book_value || ""}
                    onChange={(e) => handleChange(e, "net_book_value")}
                    className="w-full px-2 py-1.5 text-sm border border-primary-200 dark:border-primary-700 rounded-md
                               bg-primary-50 dark:bg-primary-900 text-primary-900 dark:text-primary-100
                               focus:outline-none focus:ring-2 focus:ring-accent-500 dark:focus:ring-accent-400
                               focus:border-accent-500 dark:focus:border-accent-400 transition-all duration-200"
                  />
                ) : (
                  <p className="text-sm text-success-800 dark:text-success-300 bg-success-50 dark:bg-success-950 p-2 rounded-md border border-success-200 dark:border-success-800">
                    {selectedIctAsset.net_book_value
                      ? `Ksh. ${Number(
                          selectedIctAsset.net_book_value
                        ).toLocaleString()}`
                      : "N/A"}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-primary-600 dark:text-primary-400 mb-1">
                  Disposal Value
                </label>
                {isEditMode ? (
                  <input
                    type="number"
                    step="0.01"
                    value={selectedIctAsset.disposal_value || ""}
                    onChange={(e) => handleChange(e, "disposal_value")}
                    className="w-full px-2 py-1.5 text-sm border border-primary-200 dark:border-primary-700 rounded-md
                               bg-primary-50 dark:bg-primary-900 text-primary-900 dark:text-primary-100
                               focus:outline-none focus:ring-2 focus:ring-accent-500 dark:focus:ring-accent-400
                               focus:border-accent-500 dark:focus:border-accent-400 transition-all duration-200"
                  />
                ) : (
                  <p className="text-sm text-primary-900 dark:text-primary-100 bg-primary-50 dark:bg-primary-900 p-2 rounded-md border border-primary-200 dark:border-primary-700">
                    {selectedIctAsset.disposal_value
                      ? `Ksh. ${Number(
                          selectedIctAsset.disposal_value
                        ).toLocaleString()}`
                      : "N/A"}
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Location & Status Section */}
        <Card className="border-primary-200 dark:border-primary-700 bg-white dark:bg-primary-800">
          <div className="p-4">
            <div className="flex items-center mb-3">
              <MapPin
                size={16}
                className="text-accent-600 dark:text-accent-400 mr-2"
              />
              <h2 className="text-sm font-semibold text-primary-800 dark:text-primary-200 uppercase tracking-wide">
                Location & Status
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: "Original Location", field: "original_location" },
                { label: "Current Location", field: "current_location" },
                { label: "Responsible Officer", field: "responsible_officer" },
                {
                  label: "Asset Condition",
                  field: "asset_condition",
                  isSelect: true,
                },
              ].map(({ label, field, isSelect }) => (
                <div key={field}>
                  <label className="block text-xs font-medium text-primary-600 dark:text-primary-400 mb-1">
                    {label}
                  </label>
                  {isEditMode ? (
                    isSelect ? (
                      <select
                        value={(selectedIctAsset as any)[field] || ""}
                        onChange={(e) => handleChange(e, field as any)}
                        className="w-full px-2 py-1.5 text-sm border border-primary-200 dark:border-primary-700 rounded-md
                                   bg-primary-50 dark:bg-primary-900 text-primary-900 dark:text-primary-100
                                   focus:outline-none focus:ring-2 focus:ring-accent-500 dark:focus:ring-accent-400
                                   focus:border-accent-500 dark:focus:border-accent-400 transition-all duration-200"
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
                        value={(selectedIctAsset as any)[field] || ""}
                        onChange={(e) => handleChange(e, field as any)}
                        className="w-full px-2 py-1.5 text-sm border border-primary-200 dark:border-primary-700 rounded-md
                                   bg-primary-50 dark:bg-primary-900 text-primary-900 dark:text-primary-100
                                   focus:outline-none focus:ring-2 focus:ring-accent-500 dark:focus:ring-accent-400
                                   focus:border-accent-500 dark:focus:border-accent-400 transition-all duration-200"
                      />
                    )
                  ) : (
                    <p className="text-sm text-primary-900 dark:text-primary-100 bg-primary-50 dark:bg-primary-900 p-2 rounded-md border border-primary-200 dark:border-primary-700">
                      {(selectedIctAsset as any)[field] || "N/A"}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Additional Details Section */}
        <Card className="border-primary-200 dark:border-primary-700 bg-white dark:bg-primary-800">
          <div className="p-4">
            <div className="flex items-center mb-3">
              <FileText
                size={16}
                className="text-warning-600 dark:text-warning-400 mr-2"
              />
              <h2 className="text-sm font-semibold text-primary-800 dark:text-primary-200 uppercase tracking-wide">
                Additional Details
              </h2>
            </div>

            <div className="space-y-3">
              {[
                { label: "Financed By", field: "financed_by" },
                { label: "PV Number", field: "pv_number" },
              ].map(({ label, field }) => (
                <div key={field}>
                  <label className="block text-xs font-medium text-primary-600 dark:text-primary-400 mb-1">
                    {label}
                  </label>
                  {isEditMode ? (
                    <input
                      value={(selectedIctAsset as any)[field] || ""}
                      onChange={(e) => handleChange(e, field as any)}
                      className="w-full px-2 py-1.5 text-sm border border-primary-200 dark:border-primary-700 rounded-md
                                 bg-primary-50 dark:bg-primary-900 text-primary-900 dark:text-primary-100
                                 focus:outline-none focus:ring-2 focus:ring-accent-500 dark:focus:ring-accent-400
                                 focus:border-accent-500 dark:focus:border-accent-400 transition-all duration-200"
                    />
                  ) : (
                    <p className="text-sm text-primary-900 dark:text-primary-100 bg-primary-50 dark:bg-primary-900 p-2 rounded-md border border-primary-200 dark:border-primary-700">
                      {(selectedIctAsset as any)[field] || "N/A"}
                    </p>
                  )}
                </div>
              ))}

              <div>
                <label className="block text-xs font-medium text-primary-600 dark:text-primary-400 mb-1">
                  Notes
                </label>
                {isEditMode ? (
                  <textarea
                    value={selectedIctAsset.notes || ""}
                    onChange={(e) => handleChange(e, "notes")}
                    className="w-full px-2 py-1.5 text-sm border border-primary-200 dark:border-primary-700 rounded-md
                               bg-primary-50 dark:bg-primary-900 text-primary-900 dark:text-primary-100
                               placeholder:text-primary-500 dark:placeholder:text-primary-500
                               focus:outline-none focus:ring-2 focus:ring-accent-500 dark:focus:ring-accent-400
                               focus:border-accent-500 dark:focus:border-accent-400 transition-all duration-200 min-h-[60px]"
                  />
                ) : (
                  <p className="text-sm text-primary-900 dark:text-primary-100 bg-primary-50 dark:bg-primary-900 p-2 rounded-md border border-primary-200 dark:border-primary-700">
                    {selectedIctAsset.notes || "N/A"}
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Important Dates Section */}
        <Card className="border-primary-200 dark:border-primary-700 bg-white dark:bg-primary-800">
          <div className="p-4">
            <div className="flex items-center mb-3">
              <Calendar
                size={16}
                className="text-error-600 dark:text-error-400 mr-2"
              />
              <h2 className="text-sm font-semibold text-primary-800 dark:text-primary-200 uppercase tracking-wide">
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
                  <label className="block text-xs font-medium text-primary-600 dark:text-primary-400 mb-1">
                    {label}
                  </label>
                  {isEditMode ? (
                    <input
                      type="date"
                      value={
                        (selectedIctAsset as any)[field]
                          ? new Date((selectedIctAsset as any)[field])
                              .toISOString()
                              .split("T")[0]
                          : ""
                      }
                      onChange={(e) => handleChange(e, field as any)}
                      className="w-full px-2 py-1.5 text-sm border border-primary-200 dark:border-primary-700 rounded-md
                                 bg-primary-50 dark:bg-primary-900 text-primary-900 dark:text-primary-100
                                 focus:outline-none focus:ring-2 focus:ring-accent-500 dark:focus:ring-accent-400
                                 focus:border-accent-500 dark:focus:border-accent-400 transition-all duration-200"
                    />
                  ) : (
                    <p className="text-sm text-primary-900 dark:text-primary-100 bg-primary-50 dark:bg-primary-900 p-2 rounded-md border border-primary-200 dark:border-primary-700">
                      {(selectedIctAsset as any)[field]
                        ? new Date(
                            (selectedIctAsset as any)[field]
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
        <Card className="border-primary-200 dark:border-primary-700 bg-white dark:bg-primary-800">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <History
                  size={16}
                  className="text-purple-600 dark:text-purple-400 mr-2"
                />
                <h2 className="text-sm font-semibold text-primary-800 dark:text-primary-200 uppercase tracking-wide">
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

            {!isEditMode && (
              <div className="mb-3">
                {transferHistory && transferHistory.length > 0 ? (
                  <div className="p-3 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200 dark:border-purple-800 transition-colors duration-200">
                    <div className="flex items-start space-x-2">
                      <History
                        size={14}
                        className="text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0"
                      />
                      <div>
                        <div className="text-xs font-medium text-purple-900 dark:text-purple-100 mb-1">
                          Transfer History Available
                        </div>
                        <div className="text-xs text-purple-700 dark:text-purple-300">
                          {transferHistory.length} transfer
                          {transferHistory.length !== 1 ? "s" : ""} recorded
                        </div>
                        {transferHistory[0] && (
                          <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                            Latest:{" "}
                            {new Date(
                              transferHistory[0].transfer_date
                            ).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-primary-50 dark:bg-primary-900 rounded-lg border border-primary-200 dark:border-primary-700">
                    <div className="flex items-center space-x-2">
                      <Clock
                        size={14}
                        className="text-primary-400 dark:text-primary-500"
                      />
                      <div>
                        <div className="text-xs font-medium text-primary-600 dark:text-primary-400">
                          No Transfer History
                        </div>
                        <div className="text-xs text-primary-500 dark:text-primary-500">
                          Asset has not been transferred
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mb-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTransferHistory(true)}
                leftIcon={<History size={14} />}
                disabled={isLoadingTransfers}
                className="w-full border-purple-200 dark:border-purple-700 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900 text-xs py-2 transition-all duration-200"
              >
                {isLoadingTransfers ? "Loading..." : "View Transfer History"}
              </Button>
            </div>

            {transferHistory &&
              transferHistory.length > 0 &&
              transferHistory[0] && (
                <div className="space-y-2">
                  <h3 className="text-xs font-medium text-primary-600 dark:text-primary-400 uppercase tracking-wide">
                    Latest Transfer Details
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="p-2 bg-white dark:bg-primary-800 rounded-lg border border-primary-100 dark:border-primary-700">
                      <div className="flex items-center space-x-1 mb-1">
                        <User
                          size={12}
                          className="text-primary-500 dark:text-primary-400"
                        />
                        <span className="text-xs text-primary-500 dark:text-primary-400 uppercase tracking-wide">
                          Current Owner
                        </span>
                      </div>
                      <p className="text-xs font-medium text-primary-900 dark:text-primary-100">
                        {transferHistory[0].assigned_to}
                      </p>
                    </div>

                    {transferHistory[0].transfer_location && (
                      <div className="p-2 bg-white dark:bg-primary-800 rounded-lg border border-primary-100 dark:border-primary-700">
                        <div className="flex items-center space-x-1 mb-1">
                          <MapPin
                            size={12}
                            className="text-primary-500 dark:text-primary-400"
                          />
                          <span className="text-xs text-primary-500 dark:text-primary-400 uppercase tracking-wide">
                            Location
                          </span>
                        </div>
                        <p className="text-xs font-medium text-primary-900 dark:text-primary-100">
                          {transferHistory[0].transfer_location}
                        </p>
                      </div>
                    )}

                    <div className="p-2 bg-white dark:bg-primary-800 rounded-lg border border-primary-100 dark:border-primary-700">
                      <div className="flex items-center space-x-1 mb-1">
                        <Clock
                          size={12}
                          className="text-primary-500 dark:text-primary-400"
                        />
                        <span className="text-xs text-primary-500 dark:text-primary-400 uppercase tracking-wide">
                          Transfer Date
                        </span>
                      </div>
                      <p className="text-xs font-medium text-primary-900 dark:text-primary-100">
                        {new Date(
                          transferHistory[0].transfer_date
                        ).toLocaleDateString()}
                      </p>
                    </div>

                    {transferHistory[0].transfer_department && (
                      <div className="p-2 bg-white dark:bg-primary-800 rounded-lg border border-primary-100 dark:border-primary-700">
                        <div className="flex items-center space-x-1 mb-1">
                          <Building
                            size={12}
                            className="text-primary-500 dark:text-primary-400"
                          />
                          <span className="text-xs text-primary-500 dark:text-primary-400 uppercase tracking-wide">
                            Department
                          </span>
                        </div>
                        <p className="text-xs font-medium text-primary-900 dark:text-primary-100">
                          {transferHistory[0].transfer_department}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
          </div>
        </Card>
      </div>

      <IctAssetTransferHistoryModal
        assetId={id || ""}
        assetDescription={
          selectedIctAsset?.asset_description || "Unknown Asset"
        }
        isOpen={showTransferHistory}
        onClose={() => setShowTransferHistory(false)}
      />
    </div>
  );
};

export default IctAssetsDetail;

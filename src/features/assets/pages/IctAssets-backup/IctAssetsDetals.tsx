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
  ArrowRightLeft,
  MapPin,
  User,
  History,
  Clock,
  Computer,
  Building,
  FileText,
  Calendar,
  RefreshCw,
} from "lucide-react";
import { toast } from "react-toastify";

import { useIctAssetsStore } from "../../../../shared/store/ictAssetsStore";
import type { IctAsset } from "../../../../shared/store/ictAssetsStore";
import Button from "../../../../shared/components/ui/Button";
import Card from "../../../../shared/components/ui/Card";
import IctAssetTransferHistoryModal from "../../../../shared/components/ui/IctAssetTransferHistoryModal";
import { KshIcon } from "../../../../shared/components/ui/icons/KshIcon";

/* ========================================================= */
/*  THEME: Matches AdminUserPermissions EXACTLY              */
/* ========================================================= */
const theme = {
  // Layout
  container: "p-0 sm:p-0 space-y-2",
  stickyHeader:
    "sticky top-0 z-40 bg-primary-50 dark:bg-primary-900 border-b border-primary-200 dark:border-primary-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 transition-colors duration-200",
  nav: "px-4 py-2 border-b border-primary-200 dark:border-primary-700 bg-primary-50 dark:bg-primary-900",

  // Typography
  headerTitle:
    "text-lg sm:text-xl font-bold text-primary-900 dark:text-primary-50",
  headerSubtitle: "text-xs sm:text-sm text-primary-600 dark:text-primary-400",
  sectionTitle:
    "text-sm sm:text-base font-semibold text-primary-900 dark:text-primary-50 uppercase tracking-wide flex items-center",
  label:
    "block text-xs font-medium text-primary-600 dark:text-primary-400 mb-1",
  value:
    "text-sm p-2 rounded bg-primary-50 dark:bg-primary-800 text-primary-900 dark:text-primary-100",

  // Cards
  card: "bg-white dark:bg-primary-900 border border-primary-200 dark:border-primary-700 rounded-lg shadow-sm",
  cardHeader:
    "p-2 sm:p-3 border-b border-primary-200 dark:border-primary-700 flex items-center",
  cardBody: "p-2 sm:p-3",

  // Inputs & Selects
  input:
    "w-full px-2 py-1.5 text-sm border border-primary-200 dark:border-primary-700 rounded-md bg-primary-50 dark:bg-primary-800 text-primary-900 dark:text-primary-100 placeholder-primary-500 dark:placeholder-primary-500 focus:outline-none focus:ring-2 focus:ring-accent-500 dark:focus:ring-accent-400 focus:border-accent-500 dark:focus:border-accent-400 transition-all duration-200",

  // Buttons
  btnPrimary:
    "bg-accent-600 hover:bg-accent-700 text-white disabled:bg-accent-400 dark:bg-accent-500 dark:hover:bg-accent-600",
  btnSecondary:
    "bg-primary-100 hover:bg-primary-200 text-primary-900 dark:bg-primary-800 dark:hover:bg-primary-700 dark:text-primary-100",
  btnOutline:
    "border border-primary-200 dark:border-primary-700 text-accent-600 dark:text-accent-400 hover:bg-primary-100 dark:hover:bg-primary-800",

  // Badges
  liveValue:
    "bg-success-50 dark:bg-success-950 border border-success-200 dark:border-success-800 text-success-800 dark:text-success-300",
  infoBadge:
    "bg-primary-50 dark:bg-primary-800 border border-primary-200 dark:border-primary-700 text-primary-800 dark:text-primary-200",
  transferBadge:
    "bg-accent-50 dark:bg-accent-950 border border-accent-300 dark:border-accent-700 text-accent-800 dark:text-accent-300",
  noTransferBadge:
    "bg-primary-100 dark:bg-primary-800 border border-primary-200 dark:border-primary-700 text-primary-600 dark:text-primary-400",

  // Icons
  icon: {
    primary: "text-accent-600 dark:text-accent-400",
    success: "text-success-600 dark:text-success-400",
    info: "text-primary-600 dark:text-primary-400",
    warning: "text-warning-600 dark:text-warning-400",
    error: "text-error-600 dark:text-error-400",
  },

  // Links
  link: "text-accent-600 dark:text-accent-400 hover:underline",
};

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
      setSelectedIctAsset({ ...selectedIctAsset, [field]: value });
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary-50 dark:bg-primary-900">
        <RefreshCw className="w-6 h-6 text-accent-600 dark:text-accent-400 animate-spin" />
      </div>
    );
  }

  if (!selectedIctAsset) {
    return (
      <div className="p-4 text-center bg-primary-50 dark:bg-primary-900">
        <h2 className="text-lg font-semibold mb-3 text-primary-900 dark:text-primary-50">
          ICT Asset not found
        </h2>
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<ArrowLeft size={14} />}
          onClick={() => navigate("/categories/ict-assets")}
          className={theme.btnSecondary}
        >
          Back to ICT Assets
        </Button>
      </div>
    );
  }

  return (
    <div className={theme.container}>
      {/* Sticky Header */}
      <header className={theme.stickyHeader}>
        <div className="flex items-center space-x-2">
          <Computer className={`w-5 h-5 ${theme.icon.primary}`} />
          <div>
            <h1 className={theme.headerTitle}>
              {selectedIctAsset.serial_number}
            </h1>
            <p className={theme.headerSubtitle}>
              {isEditMode ? "Edit asset details" : "View asset details"}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<ArrowRightLeft size={14} />}
            onClick={handleTransfer}
            className={theme.btnPrimary}
          >
            Transfer
          </Button>
          {isEditMode && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Save size={14} />}
              onClick={handleSave}
              isLoading={isSaving}
              className={theme.btnPrimary}
            >
              Save
            </Button>
          )}
        </div>
      </header>

      {/* Breadcrumb */}
      <nav className={theme.nav}>
        <div className="flex items-center space-x-1 text-xs overflow-x-auto">
          <Link to="/" className={`flex items-center ${theme.link}`}>
            <Home size={12} className="mr-1" /> Home
          </Link>
          <ChevronRight size={12} className="text-primary-400" />
          <Link to="/asset-categories" className={theme.link}>
            Categories
          </Link>
          <ChevronRight size={12} className="text-primary-400" />
          <Link to="/categories/ict-assets" className={theme.link}>
            ICT Assets
          </Link>
          <ChevronRight size={12} className="text-primary-400" />
          <span className="font-medium text-primary-900 dark:text-primary-50">
            {isEditMode ? "Edit" : "View"}
          </span>
        </div>
      </nav>

      {/* Main Content */}
      <main className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 p-4 max-w-7xl mx-auto">
        {/* Asset Information */}
        <Card className={`${theme.card} lg:col-span-2`}>
          <div className={theme.cardHeader}>
            <Computer size={16} className={theme.icon.primary} />
            <h2 className={theme.sectionTitle}>Asset Information</h2>
          </div>
          <div className={theme.cardBody}>
            <div className="space-y-3">
              <div>
                <label className={theme.label}>Asset Description</label>
                {isEditMode ? (
                  <textarea
                    value={selectedIctAsset.asset_description || ""}
                    onChange={(e) => handleChange(e, "asset_description")}
                    className={`${theme.input} min-h-[60px]`}
                  />
                ) : (
                  <p className={theme.value}>
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
                    <label className={theme.label}>{label}</label>
                    {isEditMode ? (
                      <input
                        value={(selectedIctAsset as any)[field] || ""}
                        onChange={(e) => handleChange(e, field as any)}
                        className={theme.input}
                      />
                    ) : (
                      <p className={theme.value}>
                        {(selectedIctAsset as any)[field] || "N/A"}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Financial Information */}
        <Card className={theme.card}>
          <div className={theme.cardHeader}>
            <KshIcon size={16} className={theme.icon.success} />
            <h2 className={theme.sectionTitle}>Financial Information</h2>
          </div>
          <div className={theme.cardBody}>
            <div className="grid grid-cols-1 gap-3">
              {[
                { label: "Purchase Amount", field: "purchase_amount" },
                { label: "Depreciation Rate (%)", field: "depreciation_rate" },
                { label: "Annual Depreciation", field: "annual_depreciation" },
              ].map(({ label, field }) => (
                <div key={field}>
                  <label className={theme.label}>{label}</label>
                  {isEditMode ? (
                    <input
                      type="number"
                      step="0.01"
                      value={(selectedIctAsset as any)[field] || ""}
                      onChange={(e) => handleChange(e, field as any)}
                      className={theme.input}
                    />
                  ) : (
                    <p className={theme.value}>
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
                <label className={theme.label}>
                  Accumulated Depreciation{" "}
                  <span className="text-xs ml-1">(live)</span>
                </label>
                {isEditMode ? (
                  <input
                    type="number"
                    step="0.01"
                    value={selectedIctAsset.accumulated_depreciation || ""}
                    onChange={(e) =>
                      handleChange(e, "accumulated_depreciation")
                    }
                    className={theme.input}
                  />
                ) : (
                  <p className={`${theme.value} ${theme.liveValue}`}>
                    {selectedIctAsset.accumulated_depreciation
                      ? `Ksh. ${Number(
                          selectedIctAsset.accumulated_depreciation
                        ).toLocaleString()}`
                      : "N/A"}
                  </p>
                )}
              </div>

              <div>
                <label className={theme.label}>
                  Net Book Value <span className="text-xs ml-1">(live)</span>
                </label>
                {isEditMode ? (
                  <input
                    type="number"
                    step="0.01"
                    value={selectedIctAsset.net_book_value || ""}
                    onChange={(e) => handleChange(e, "net_book_value")}
                    className={theme.input}
                  />
                ) : (
                  <p className={`${theme.value} ${theme.liveValue}`}>
                    {selectedIctAsset.net_book_value
                      ? `Ksh. ${Number(
                          selectedIctAsset.net_book_value
                        ).toLocaleString()}`
                      : "N/A"}
                  </p>
                )}
              </div>

              <div>
                <label className={theme.label}>Disposal Value</label>
                {isEditMode ? (
                  <input
                    type="number"
                    step="0.01"
                    value={selectedIctAsset.disposal_value || ""}
                    onChange={(e) => handleChange(e, "disposal_value")}
                    className={theme.input}
                  />
                ) : (
                  <p className={theme.value}>
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

        {/* Location & Status */}
        <Card className={theme.card}>
          <div className={theme.cardHeader}>
            <MapPin size={16} className={theme.icon.info} />
            <h2 className={theme.sectionTitle}>Location & Status</h2>
          </div>
          <div className={theme.cardBody}>
            <div className="grid grid-cols-1 gap-3">
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
                  <label className={theme.label}>{label}</label>
                  {isEditMode ? (
                    isSelect ? (
                      <select
                        value={(selectedIctAsset as any)[field] || ""}
                        onChange={(e) => handleChange(e, field as any)}
                        className={theme.input}
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
                        className={theme.input}
                      />
                    )
                  ) : (
                    <p className={theme.value}>
                      {(selectedIctAsset as any)[field] || "N/A"}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Additional Details */}
        <Card className={theme.card}>
          <div className={theme.cardHeader}>
            <FileText size={16} className={theme.icon.warning} />
            <h2 className={theme.sectionTitle}>Additional Details</h2>
          </div>
          <div className={theme.cardBody}>
            <div className="space-y-3">
              {[
                { label: "Financed By", field: "financed_by" },
                { label: "PV Number", field: "pv_number" },
              ].map(({ label, field }) => (
                <div key={field}>
                  <label className={theme.label}>{label}</label>
                  {isEditMode ? (
                    <input
                      value={(selectedIctAsset as any)[field] || ""}
                      onChange={(e) => handleChange(e, field as any)}
                      className={theme.input}
                    />
                  ) : (
                    <p className={theme.value}>
                      {(selectedIctAsset as any)[field] || "N/A"}
                    </p>
                  )}
                </div>
              ))}
              <div>
                <label className={theme.label}>Notes</label>
                {isEditMode ? (
                  <textarea
                    value={selectedIctAsset.notes || ""}
                    onChange={(e) => handleChange(e, "notes")}
                    className={`${theme.input} min-h-[60px]`}
                  />
                ) : (
                  <p className={theme.value}>
                    {selectedIctAsset.notes || "N/A"}
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Important Dates */}
        <Card className={theme.card}>
          <div className={theme.cardHeader}>
            <Calendar size={16} className={theme.icon.error} />
            <h2 className={theme.sectionTitle}>Important Dates</h2>
          </div>
          <div className={theme.cardBody}>
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
                  <label className={theme.label}>{label}</label>
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
                      className={theme.input}
                    />
                  ) : (
                    <p className={theme.value}>
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

        {/* Transfer Information */}
        <Card className={theme.card}>
          <div className={theme.cardHeader}>
            <History size={16} className={theme.icon.primary} />
            <h2 className={theme.sectionTitle}>Transfer Information</h2>
          </div>
          <div className={theme.cardBody}>
            {!isEditMode && (
              <div className="mb-3">
                {transferHistory && transferHistory.length > 0 ? (
                  <div className={`p-3 rounded-lg ${theme.transferBadge}`}>
                    <div className="flex items-start space-x-2">
                      <History size={14} className={theme.icon.primary} />
                      <div>
                        <div className="text-xs font-medium text-primary-900 dark:text-primary-100">
                          Transfer History Available
                        </div>
                        <div className="text-xs text-primary-600 dark:text-primary-400">
                          {transferHistory.length} transfer
                          {transferHistory.length !== 1 ? "s" : ""} recorded
                        </div>
                        {transferHistory[0] && (
                          <div className="text-xs mt-1 text-accent-600 dark:text-accent-400">
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
                  <div className={`p-3 rounded-lg ${theme.noTransferBadge}`}>
                    <div className="flex items-center space-x-2">
                      <Clock size={14} className={theme.icon.info} />
                      <div>
                        <div className="text-xs font-medium text-primary-600 dark:text-primary-400">
                          No Transfer History
                        </div>
                        <div className="text-xs text-primary-600 dark:text-primary-400">
                          Asset has not been transferred
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTransferHistory(true)}
              leftIcon={<History size={14} />}
              disabled={isLoadingTransfers}
              className={`w-full ${theme.btnOutline} text-xs py-2`}
            >
              {isLoadingTransfers ? "Loading..." : "View Transfer History"}
            </Button>

            {transferHistory &&
              transferHistory.length > 0 &&
              transferHistory[0] && (
                <div className="mt-4 space-y-2">
                  <h3 className="text-xs font-medium uppercase tracking-wide text-primary-600 dark:text-primary-400">
                    Latest Transfer Details
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="p-2 bg-primary-50 dark:bg-primary-800 rounded border border-primary-200 dark:border-primary-700">
                      <div className="flex items-center space-x-1 mb-1">
                        <User size={12} className={theme.icon.info} />
                        <span className="text-xs uppercase tracking-wide text-primary-600 dark:text-primary-400">
                          Current Owner
                        </span>
                      </div>
                      <p className="text-xs font-medium text-primary-900 dark:text-primary-100">
                        {transferHistory[0].assigned_to}
                      </p>
                    </div>
                    {transferHistory[0].transfer_location && (
                      <div className="p-2 bg-primary-50 dark:bg-primary-800 rounded border border-primary-200 dark:border-primary-700">
                        <div className="flex items-center space-x-1 mb-1">
                          <MapPin size={12} className={theme.icon.info} />
                          <span className="text-xs uppercase tracking-wide text-primary-600 dark:text-primary-400">
                            Location
                          </span>
                        </div>
                        <p className="text-xs font-medium text-primary-900 dark:text-primary-100">
                          {transferHistory[0].transfer_location}
                        </p>
                      </div>
                    )}
                    <div className="p-2 bg-primary-50 dark:bg-primary-800 rounded border border-primary-200 dark:border-primary-700">
                      <div className="flex items-center space-x-1 mb-1">
                        <Clock size={12} className={theme.icon.info} />
                        <span className="text-xs uppercase tracking-wide text-primary-600 dark:text-primary-400">
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
                      <div className="p-2 bg-primary-50 dark:bg-primary-800 rounded border border-primary-200 dark:border-primary-700">
                        <div className="flex items-center space-x-1 mb-1">
                          <Building size={12} className={theme.icon.info} />
                          <span className="text-xs uppercase tracking-wide text-primary-600 dark:text-primary-400">
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
      </main>

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

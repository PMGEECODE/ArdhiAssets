// components/ui/ConfirmExcelModal.tsx
import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Edit3,
  Save,
  X,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { API_URL } from "../../config";

interface ConfirmExcelModalProps {
  show: boolean;
  data: any[];
  onConfirm: (data: any[]) => void;
  onCancel: () => void;
  isLoading: boolean;
}

interface ValidationResult {
  existingHostnames: string[];
  duplicateHostnames: string[];
  invalidData: any[];
  totalValid: number;
  totalInvalid: number;
  totalDuplicates: number;
  totalExisting: number;
}

const ConfirmExcelModal: React.FC<ConfirmExcelModalProps> = ({
  show,
  data,
  onConfirm,
  onCancel,
  isLoading,
}) => {
  const [validationResult, setValidationResult] =
    useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [editedData, setEditedData] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<
    "summary" | "invalid" | "duplicates" | "existing"
  >("summary");
  const [prefix, setPrefix] = useState<string>("ICT-");

  // Initialize edited data when data changes
  useEffect(() => {
    setEditedData([...data]);
  }, [data]);

  // Check for duplicates and existing hostnames when data changes
  useEffect(() => {
    if (show && data.length > 0) {
      // Debug: Log the data being received
      console.log("ConfirmExcelModal received data:", data);
      console.log("First device sample:", data[0]);
      validateData();
    }
  }, [show, data]);

  // Watch for changes in editedData and refresh validation
  useEffect(() => {
    if (show && editedData.length > 0 && editedData !== data) {
      // Only re-validate if editedData has actually changed from the original data
      console.log("editedData changed, re-validating...");
      validateDataWithData(editedData);
    }
  }, [editedData, show]);

  const validateData = async () => {
    if (data.length === 0) return;

    console.log("Main validateData called with data:", data);
    setIsValidating(true);
    setValidationError(null);

    try {
      // Check for duplicate hostnames within the Excel data
      const hostnames = data.map((device) => device.hostname).filter(Boolean);
      const duplicateHostnames = hostnames.filter(
        (hostname, index) => hostnames.indexOf(hostname) !== index
      );

      console.log("Main validation - Hostnames found:", hostnames);
      console.log(
        "Main validation - Duplicate hostnames detected:",
        duplicateHostnames
      );

      // Check for existing hostnames in database
      let response;
      try {
        response = await fetch(`${API_URL}/devices/check-hostnames`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${
              localStorage.getItem("auth-storage")
                ? JSON.parse(localStorage.getItem("auth-storage")!).state.token
                : ""
            }`,
          },
          body: JSON.stringify({ hostnames }),
        });

        if (!response.ok) {
          throw new Error(
            `Failed to check hostnames: ${response.status} ${response.statusText}`
          );
        }

        const result = await response.json();
        const existingHostnames = result.existing_hostnames || [];

        console.log(
          "Main validation - Existing hostnames from database:",
          existingHostnames
        );

        // Check for invalid data (missing required fields)
        const invalidData = data.filter((device) => {
          const hasHostname = device.hostname && device.hostname.trim() !== "";
          const hasPlatform = device.platform && device.platform.trim() !== "";
          const hasOsVersion =
            device.osVersion && device.osVersion.trim() !== "";

          // Debug: Log what's being checked
          console.log("Main validation - Validating device:", device.hostname, {
            hasHostname,
            hasPlatform,
            hasOsVersion,
            hostname: device.hostname,
            platform: device.platform,
            osVersion: device.osVersion,
          });

          return !hasHostname || !hasPlatform || !hasOsVersion;
        });

        console.log("Main validation - Invalid data found:", invalidData);

        const validationResult: ValidationResult = {
          existingHostnames,
          duplicateHostnames: [...new Set(duplicateHostnames)], // Remove duplicates from duplicates array
          invalidData,
          totalValid:
            data.length -
            invalidData.length -
            duplicateHostnames.length +
            [...new Set(duplicateHostnames)].length,
          totalInvalid: invalidData.length,
          totalDuplicates: [...new Set(duplicateHostnames)].length,
          totalExisting: existingHostnames.length,
        };

        console.log(
          "Main validation - New validation result:",
          validationResult
        );
        setValidationResult(validationResult);
      } catch (error) {
        console.error("Validation error:", error);
        setValidationError("Failed to validate data. Please try again.");
      } finally {
        setIsValidating(false);
      }
    } catch (error) {
      console.error("Validation error:", error);
      setValidationError("Failed to validate data. Please try again.");
      setIsValidating(false);
    }
  };

  const canProceed =
    validationResult &&
    validationResult.totalInvalid === 0 &&
    validationResult.totalDuplicates === 0 &&
    validationResult.totalExisting === 0;

  const getStatusIcon = (type: "success" | "warning" | "error" | "info") => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case "error":
        return <XCircle className="w-5 h-5 text-red-500" />;
      case "info":
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getValidationMessage = (device: any) => {
    if (!device.hostname || device.hostname.trim() === "") {
      return "Missing hostname";
    }
    if (!device.platform || device.platform.trim() === "") {
      return "Missing platform";
    }
    if (!device.osVersion || device.osVersion.trim() === "") {
      return "Missing OS version";
    }

    // Check for duplicates in current editedData
    if (validationResult?.duplicateHostnames.includes(device.hostname)) {
      return "Duplicate hostname in file";
    }
    if (validationResult?.existingHostnames.includes(device.hostname)) {
      return "Hostname already exists";
    }
    return "Valid";
  };

  const generateUniqueHostname = (
    baseHostname: string,
    existingHostnames: string[]
  ): string => {
    let counter = 1;
    let newHostname = `${prefix}${baseHostname}`;

    // Check if the prefixed hostname already exists
    while (existingHostnames.includes(newHostname)) {
      newHostname = `${prefix}${counter}-${baseHostname}`;
      counter++;
    }

    return newHostname;
  };

  const autoFixDuplicates = () => {
    if (!validationResult) return;

    console.log("Auto-fixing duplicates...");
    console.log(
      "Current duplicate hostnames:",
      validationResult.duplicateHostnames
    );

    const newData = [...editedData];
    const existingHostnames = [
      ...validationResult.existingHostnames,
      ...newData.map((d) => d.hostname).filter(Boolean),
    ];

    // Group duplicate hostnames
    const duplicateGroups = new Map<string, number[]>();
    newData.forEach((device, index) => {
      if (
        device.hostname &&
        validationResult.duplicateHostnames.includes(device.hostname)
      ) {
        if (!duplicateGroups.has(device.hostname)) {
          duplicateGroups.set(device.hostname, []);
        }
        duplicateGroups.get(device.hostname)!.push(index);
      }
    });

    console.log("Duplicate groups:", duplicateGroups);

    // Fix duplicates with prefixes
    duplicateGroups.forEach((indices, hostname) => {
      if (indices.length > 1) {
        console.log(
          `Fixing duplicates for hostname: ${hostname} at indices:`,
          indices
        );
        // Keep the first occurrence as is, fix the rest
        indices.slice(1).forEach((index) => {
          const newHostname = generateUniqueHostname(
            hostname,
            existingHostnames
          );
          console.log(
            `Renaming index ${index} from ${hostname} to ${newHostname}`
          );
          newData[index] = { ...newData[index], hostname: newHostname };
          existingHostnames.push(newHostname);
        });
      }
    });

    console.log("Updated data after fixing duplicates:", newData);
    setEditedData(newData);

    // Update the data prop to trigger re-validation
    // This ensures the validation logic runs on the updated data
    setTimeout(() => {
      // Force re-validation by updating the data that validation runs on
      const updatedData = [...newData];
      console.log("Re-validating after auto-fix duplicates...");
      // Re-run validation with updated data
      validateDataWithData(updatedData);
    }, 100);
  };

  // Helper function to validate specific data
  const validateDataWithData = async (dataToValidate: any[]) => {
    if (dataToValidate.length === 0) return;

    console.log("validateDataWithData called with:", dataToValidate);
    setIsValidating(true);
    setValidationError(null);

    try {
      // Check for duplicate hostnames within the Excel data
      const hostnames = dataToValidate
        .map((device) => device.hostname)
        .filter(Boolean);
      const duplicateHostnames = hostnames.filter(
        (hostname, index) => hostnames.indexOf(hostname) !== index
      );

      console.log("Hostnames found:", hostnames);
      console.log("Duplicate hostnames detected:", duplicateHostnames);

      // Check for existing hostnames in database
      let response;
      try {
        response = await fetch(`${API_URL}/devices/check-hostnames`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${
              localStorage.getItem("auth-storage")
                ? JSON.parse(localStorage.getItem("auth-storage")!).state.token
                : ""
            }`,
          },
          body: JSON.stringify({ hostnames }),
        });

        if (!response.ok) {
          throw new Error(
            `Failed to check hostnames: ${response.status} ${response.statusText}`
          );
        }

        const result = await response.json();
        const existingHostnames = result.existing_hostnames || [];

        console.log("Existing hostnames from database:", existingHostnames);

        // Check for invalid data (missing required fields)
        const invalidData = dataToValidate.filter((device) => {
          const hasHostname = device.hostname && device.hostname.trim() !== "";
          const hasPlatform = device.platform && device.platform.trim() !== "";
          const hasOsVersion =
            device.osVersion && device.osVersion.trim() !== "";

          // Debug: Log what's being checked
          console.log("Validating device:", device.hostname, {
            hasHostname,
            hasPlatform,
            hasOsVersion,
            hostname: device.hostname,
            platform: device.platform,
            osVersion: device.osVersion,
          });

          return !hasHostname || !hasPlatform || !hasOsVersion;
        });

        console.log("Invalid data found:", invalidData);

        const validationResult: ValidationResult = {
          existingHostnames,
          duplicateHostnames: [...new Set(duplicateHostnames)], // Remove duplicates from duplicates array
          invalidData,
          totalValid:
            dataToValidate.length -
            invalidData.length -
            duplicateHostnames.length +
            [...new Set(duplicateHostnames)].length,
          totalInvalid: invalidData.length,
          totalDuplicates: [...new Set(duplicateHostnames)].length,
          totalExisting: existingHostnames.length,
        };

        console.log("New validation result:", validationResult);
        setValidationResult(validationResult);
      } catch (error) {
        console.error("Validation error:", error);
        setValidationError("Failed to validate data. Please try again.");
      } finally {
        setIsValidating(false);
      }
    } catch (error) {
      console.error("Validation error:", error);
      setValidationError("Failed to validate data. Please try again.");
      setIsValidating(false);
    }
  };

  const startEditing = (index: number) => {
    setEditingRow(index);
  };

  const saveEdit = () => {
    console.log("Saving edit, current editedData:", editedData);
    setEditingRow(null);
    // Re-validate after edit with the updated editedData
    setTimeout(() => {
      console.log("Re-validating after save edit...");
      validateDataWithData(editedData);
    }, 100);
  };

  const cancelEdit = () => {
    setEditingRow(null);
    // Reset edited data to original and re-validate
    setEditedData([...data]);
    setTimeout(() => {
      validateData();
    }, 100);
  };

  const updateField = (index: number, field: string, value: string) => {
    const newData = [...editedData];
    newData[index] = { ...newData[index], [field]: value };
    console.log(`Updating field ${field} at index ${index} to "${value}"`);
    setEditedData(newData);
  };

  const removeRow = (index: number) => {
    console.log(`Removing row at index ${index}`);
    const newData = editedData.filter((_, i) => i !== index);
    setEditedData(newData);
    // Re-validate after removal with the updated data
    setTimeout(() => {
      console.log("Re-validating after row removal...");
      validateDataWithData(newData);
    }, 100);
  };

  const getProblematicRecords = () => {
    if (!validationResult) return [];

    const problematic: any[] = [];

    // Add invalid records
    validationResult.invalidData.forEach((device) => {
      problematic.push({
        ...device,
        issue: "invalid",
        issueText: getValidationMessage(device),
      });
    });

    // Add duplicate records - check against current editedData
    editedData.forEach((device) => {
      if (
        device.hostname &&
        validationResult.duplicateHostnames.includes(device.hostname)
      ) {
        problematic.push({
          ...device,
          issue: "duplicate",
          issueText: "Duplicate hostname in file",
        });
      }
    });

    // Add existing records - check against current editedData
    editedData.forEach((device) => {
      if (
        device.hostname &&
        validationResult.existingHostnames.includes(device.hostname)
      ) {
        problematic.push({
          ...device,
          issue: "existing",
          issueText: "Hostname already exists in database",
        });
      }
    });

    return problematic;
  };

  const renderEditableCell = (
    device: any,
    index: number,
    field: string,
    label: string
  ) => {
    if (editingRow === index) {
      return (
        <input
          type="text"
          value={device[field] || ""}
          onChange={(e) => updateField(index, field, e.target.value)}
          className="px-2 py-1 w-full text-sm rounded border focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={label}
        />
      );
    }
    return <span className="text-sm">{device[field] || "N/A"}</span>;
  };

  const renderActionButtons = (index: number) => {
    if (editingRow === index) {
      return (
        <div className="flex gap-1">
          <button
            onClick={saveEdit}
            className="p-1 text-green-600 rounded transition-colors hover:bg-green-100"
            title="Save changes"
          >
            <Save size={16} />
          </button>
          <button
            onClick={cancelEdit}
            className="p-1 text-gray-600 rounded transition-colors hover:bg-gray-100"
            title="Cancel edit"
          >
            <X size={16} />
          </button>
        </div>
      );
    }

    return (
      <div className="flex gap-1">
        <button
          onClick={() => startEditing(index)}
          className="p-1 text-blue-600 rounded transition-colors hover:bg-blue-100"
          title="Edit record"
        >
          <Edit3 size={16} />
        </button>
        <button
          onClick={() => removeRow(index)}
          className="p-1 text-red-600 rounded transition-colors hover:bg-red-100"
          title="Remove record"
        >
          <Trash2 size={16} />
        </button>
      </div>
    );
  };

  if (!show) return null;

  return (
    <div className="flex fixed inset-0 z-50 justify-center items-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-9xl max-h-[95vh] relative overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="sticky top-0 z-20 p-6 pb-4 bg-white border-b">
          <h3 className="text-xl font-bold">Confirm Excel Data</h3>
          <p className="mt-1 text-gray-600">
            Review your data and resolve any issues before uploading
          </p>
        </div>

        {/* Content Area */}
        <div className="overflow-y-auto flex-1 p-6">
          {/* Validation Summary */}
          {validationResult && (
            <div className="p-4 mb-6 bg-gray-50 rounded-lg border">
              <div className="flex justify-between items-center mb-3">
                <h4 className="flex gap-2 items-center font-semibold">
                  <Info className="w-5 h-5 text-blue-500" />
                  Data Validation Summary
                </h4>
                <div className="flex gap-2">
                  {validationResult.totalDuplicates > 0 && (
                    <button
                      onClick={autoFixDuplicates}
                      className="flex gap-2 items-center px-3 py-1 text-sm text-yellow-700 bg-yellow-100 rounded transition hover:bg-yellow-200"
                      title="Automatically fix duplicate hostnames with prefixes"
                    >
                      <RefreshCw size={16} />
                      Auto-fix Duplicates
                    </button>
                  )}
                  <button
                    onClick={validateData}
                    disabled={isValidating}
                    className="px-2 py-1 text-sm text-blue-700 bg-blue-100 rounded transition hover:bg-blue-200 disabled:opacity-50"
                  >
                    {isValidating ? "Validating..." : "Refresh"}
                  </button>
                </div>
              </div>

              {/* Prefix Configuration */}
              {validationResult.totalDuplicates > 0 && (
                <div className="p-3 mb-4 bg-yellow-50 rounded-md border border-yellow-200">
                  <div className="flex gap-3 items-center">
                    <label className="text-sm font-medium text-yellow-800">
                      Prefix for duplicate hostnames:
                    </label>
                    <input
                      type="text"
                      value={prefix}
                      onChange={(e) => setPrefix(e.target.value)}
                      className="px-2 py-1 text-sm rounded border border-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      placeholder="ICT-"
                    />
                    <span className="text-xs text-yellow-600">
                      Example: MOLLPP → {prefix}MOLLPP, {prefix}1-MOLLPP,{" "}
                      {prefix}2-MOLLPP
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mb-4 md:grid-cols-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {validationResult.totalValid}
                  </div>
                  <div className="text-sm text-gray-600">Valid Records</div>
                </div>

                {validationResult.totalInvalid > 0 && (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {validationResult.totalInvalid}
                    </div>
                    <div className="text-sm text-gray-600">Invalid Records</div>
                  </div>
                )}

                {validationResult.totalDuplicates > 0 && (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {validationResult.totalDuplicates}
                    </div>
                    <div className="text-sm text-gray-600">
                      Duplicate Hostnames
                    </div>
                  </div>
                )}

                {validationResult.totalExisting > 0 && (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {validationResult.totalExisting}
                    </div>
                    <div className="text-sm text-gray-600">Already Exist</div>
                  </div>
                )}
              </div>

              {/* Status Messages */}
              <div className="space-y-2">
                {canProceed && (
                  <div className="flex gap-2 items-center p-3 text-green-700 bg-green-50 rounded-md">
                    {getStatusIcon("success")}
                    <span className="font-medium">
                      All data is valid and ready for upload!
                    </span>
                  </div>
                )}

                {validationResult.totalInvalid > 0 && (
                  <div className="flex gap-2 items-center p-3 text-red-700 bg-red-50 rounded-md">
                    {getStatusIcon("error")}
                    <span className="font-medium">
                      {validationResult.totalInvalid} record(s) have missing
                      required fields (hostname, platform, or OS version)
                    </span>
                  </div>
                )}

                {validationResult.totalDuplicates > 0 && (
                  <div className="flex gap-2 items-center p-3 text-yellow-700 bg-yellow-50 rounded-md">
                    {getStatusIcon("warning")}
                    <span className="font-medium">
                      {validationResult.totalDuplicates} duplicate hostname(s)
                      found in the Excel file
                    </span>
                  </div>
                )}

                {validationResult.totalExisting > 0 && (
                  <div className="flex gap-2 items-center p-3 text-orange-700 bg-orange-50 rounded-md">
                    {getStatusIcon("warning")}
                    <span className="font-medium">
                      {validationResult.totalExisting} hostname(s) already exist
                      in the database
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Loading State */}
          {isValidating && (
            <div className="p-4 mb-6 bg-blue-50 rounded-lg border">
              <div className="flex gap-2 items-center text-blue-700">
                <div className="w-5 h-5 rounded-full border-b-2 border-blue-700 animate-spin"></div>
                <span>Validating data...</span>
              </div>
            </div>
          )}

          {/* Error State */}
          {validationError && (
            <div className="p-4 mb-6 bg-red-50 rounded-lg border">
              <div className="flex gap-2 items-center text-red-700">
                {getStatusIcon("error")}
                <span>{validationError}</span>
              </div>
              <button
                onClick={validateData}
                className="px-3 py-1 mt-2 text-sm text-red-700 bg-red-100 rounded transition hover:bg-red-200"
              >
                Retry Validation
              </button>
            </div>
          )}

          {/* Problematic Records Tabs */}
          {validationResult &&
            (validationResult.totalInvalid > 0 ||
              validationResult.totalDuplicates > 0 ||
              validationResult.totalExisting > 0) && (
              <div className="mb-6">
                <div className="overflow-x-auto border-b border-gray-200">
                  <nav className="flex -mb-px space-x-4 min-w-max md:space-x-8">
                    <button
                      onClick={() => setActiveTab("summary")}
                      className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                        activeTab === "summary"
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      Summary
                    </button>
                    {validationResult.totalInvalid > 0 && (
                      <button
                        onClick={() => setActiveTab("invalid")}
                        className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                          activeTab === "invalid"
                            ? "border-red-500 text-red-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        Invalid Records ({validationResult.totalInvalid})
                      </button>
                    )}
                    {validationResult.totalDuplicates > 0 && (
                      <button
                        onClick={() => setActiveTab("duplicates")}
                        className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                          activeTab === "duplicates"
                            ? "border-yellow-500 text-yellow-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        Duplicates ({validationResult.totalDuplicates})
                      </button>
                    )}
                    {validationResult.totalExisting > 0 && (
                      <button
                        onClick={() => setActiveTab("existing")}
                        className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                          activeTab === "existing"
                            ? "border-orange-500 text-orange-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        Already Exist ({validationResult.totalExisting})
                      </button>
                    )}
                  </nav>
                </div>

                {/* Tab Content */}
                <div className="mt-4">
                  {activeTab === "summary" && (
                    <div className="text-sm text-gray-600">
                      <p>
                        Use the tabs above to view and resolve specific issues
                        with your data.
                      </p>
                      {validationResult.totalDuplicates > 0 && (
                        <p className="mt-2 text-yellow-700">
                          💡 Use the "Auto-fix Duplicates" button to
                          automatically resolve duplicate hostnames with
                          prefixes.
                        </p>
                      )}
                    </div>
                  )}

                  {(activeTab === "invalid" ||
                    activeTab === "duplicates" ||
                    activeTab === "existing") && (
                    <div className="overflow-x-auto">
                      <table className="min-w-full border-collapse table-auto">
                        <thead className="bg-gray-50">
                          <tr className="border-b">
                            <th className="px-4 py-2 text-sm font-semibold text-left">
                              Issue
                            </th>
                            <th className="px-4 py-2 text-sm font-semibold text-left">
                              Hostname
                            </th>
                            <th className="px-4 py-2 text-sm font-semibold text-left">
                              Platform
                            </th>
                            <th className="px-4 py-2 text-sm font-semibold text-left">
                              OS Version
                            </th>
                            <th className="px-4 py-2 text-sm font-semibold text-left">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {getProblematicRecords()
                            .filter((record) => {
                              if (activeTab === "invalid")
                                return record.issue === "invalid";
                              if (activeTab === "duplicates")
                                return record.issue === "duplicate";
                              if (activeTab === "existing")
                                return record.issue === "existing";
                              return false;
                            })
                            .map((record) => {
                              const originalIndex = editedData.findIndex(
                                (d) => d.hostname === record.hostname
                              );
                              return (
                                <tr
                                  key={`${record.hostname}-${record.issue}`}
                                  className="border-b hover:bg-gray-50"
                                >
                                  <td className="px-4 py-2">
                                    <div
                                      className={`flex items-center gap-2 ${
                                        record.issue === "invalid"
                                          ? "text-red-600"
                                          : record.issue === "duplicate"
                                          ? "text-yellow-600"
                                          : "text-orange-600"
                                      }`}
                                    >
                                      {getStatusIcon(record.issue as any)}
                                      <span className="text-sm">
                                        {record.issueText}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-2">
                                    {renderEditableCell(
                                      record,
                                      originalIndex,
                                      "hostname",
                                      "Hostname"
                                    )}
                                  </td>
                                  <td className="px-4 py-2">
                                    {renderEditableCell(
                                      record,
                                      originalIndex,
                                      "platform",
                                      "Platform"
                                    )}
                                  </td>
                                  <td className="px-4 py-2">
                                    {renderEditableCell(
                                      record,
                                      originalIndex,
                                      "osVersion",
                                      "OS Version"
                                    )}
                                  </td>
                                  <td className="px-4 py-2">
                                    {renderActionButtons(originalIndex)}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

          {/* Scrollable Table Section */}
          <div className="overflow-x-auto rounded-md border">
            <table className="min-w-full border-collapse table-auto">
              <thead className="sticky top-0 z-10 bg-white">
                <tr className="border-b">
                  <th className="px-4 py-2 text-sm font-semibold text-left bg-white">
                    Status
                  </th>
                  {[
                    "Hostname",
                    "Last Seen",
                    "First Seen",
                    "Platform",
                    "OS Version",
                    "OS Build",
                    "OS Product Name",
                    "Model",
                    "Manufacturer",
                    "Type",
                    "Chassis",
                    "Local IP",
                    "Domain",
                    "MAC Address",
                    "CPUID",
                    "Serial Number",
                  ].map((header) => (
                    <th
                      key={header}
                      className="px-4 py-2 text-sm font-semibold text-left whitespace-nowrap bg-white"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {editedData.map((device, index) => {
                  const isDuplicate =
                    validationResult?.duplicateHostnames.includes(
                      device.hostname
                    );
                  const isExisting =
                    validationResult?.existingHostnames.includes(
                      device.hostname
                    );
                  const isInvalid = validationResult?.invalidData.some(
                    (invalid) => invalid.hostname === device.hostname
                  );

                  let status = "valid";
                  let statusText = "Valid";
                  let statusColor = "text-green-600";

                  if (isInvalid) {
                    status = "invalid";
                    statusText = "Invalid";
                    statusColor = "text-red-600";
                  } else if (isDuplicate) {
                    status = "duplicate";
                    statusText = "Duplicate";
                    statusColor = "text-yellow-600";
                  } else if (isExisting) {
                    status = "existing";
                    statusText = "Exists";
                    statusColor = "text-orange-600";
                  }

                  return (
                    <tr
                      key={index}
                      className={`border-b ${
                        status !== "valid" ? "bg-red-50" : ""
                      }`}
                    >
                      <td className="px-4 py-2">
                        <div
                          className={`flex gap-2 items-center ${statusColor}`}
                        >
                          {getStatusIcon(status as any)}
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">
                              {statusText}
                            </span>
                            <span className="text-xs text-gray-500">
                              {getValidationMessage(device)}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {device.hostname || "N/A"}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {device.lastSeen || "N/A"}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {device.firstSeen || "N/A"}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {device.platform || "N/A"}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {device.osVersion || "N/A"}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {device.osBuild || "N/A"}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {device.osProductName || "N/A"}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {device.model || "N/A"}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {device.manufacturer || "N/A"}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {device.type || "N/A"}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {device.chassis || "N/A"}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {device.localIp || "N/A"}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {device.domain || "N/A"}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {device.macAddress || "N/A"}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {device.cpuId || "N/A"}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {device.serialNumber || "N/A"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 p-6 bg-white border-t">
          <div className="flex flex-col gap-4 justify-between items-start sm:flex-row sm:items-center">
            <div className="text-sm text-gray-600">
              {validationResult && (
                <div className="space-y-1">
                  <span>
                    {canProceed
                      ? `Ready to upload ${validationResult.totalValid} valid record(s)`
                      : `Please resolve ${
                          validationResult.totalInvalid +
                          validationResult.totalDuplicates +
                          validationResult.totalExisting
                        } issue(s) before uploading`}
                  </span>
                  {!canProceed && (
                    <div className="text-xs text-gray-500">
                      {validationResult.totalInvalid > 0 && (
                        <div>
                          • {validationResult.totalInvalid} invalid records will
                          be skipped
                        </div>
                      )}
                      {validationResult.totalDuplicates > 0 && (
                        <div>
                          • {validationResult.totalDuplicates} duplicate
                          hostnames will be skipped
                        </div>
                      )}
                      {validationResult.totalExisting > 0 && (
                        <div>
                          • {validationResult.totalExisting} existing hostnames
                          will be skipped
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex space-x-4 w-full sm:w-auto">
              <button
                onClick={onCancel}
                className="flex-1 px-4 py-2 bg-gray-300 rounded transition sm:flex-none hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={() => onConfirm(editedData)}
                disabled={!canProceed || isLoading}
                className={`flex-1 sm:flex-none px-4 py-2 rounded transition ${
                  canProceed && !isLoading
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-400 text-gray-200 cursor-not-allowed"
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

export default ConfirmExcelModal;

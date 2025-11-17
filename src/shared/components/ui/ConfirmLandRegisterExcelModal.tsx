"use client";

import type React from "react";
import { useState, useEffect } from "react";
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
import { API_URL } from "../../config/constants";

interface ConfirmLandRegisterExcelModalProps {
  show: boolean;
  data: any[];
  onConfirm: (data: any[]) => void;
  onCancel: () => void;
  isLoading: boolean;
}

interface ValidationResult {
  existingLRNumbers: string[];
  duplicateLRNumbers: string[];
  invalidData: any[];
  totalValid: number;
  totalInvalid: number;
  totalDuplicates: number;
  totalExisting: number;
}

const ConfirmLandRegisterExcelModal: React.FC<
  ConfirmLandRegisterExcelModalProps
> = ({ show, data, onConfirm, onCancel, isLoading }) => {
  const [validationResult, setValidationResult] =
    useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [editedData, setEditedData] = useState<any[]>([]);
  const [prefix, setPrefix] = useState<string>("LR-");

  useEffect(() => {
    setEditedData([...data]);
  }, [data]);

  useEffect(() => {
    if (show && data.length > 0) {
      console.log("ConfirmLandRegisterExcelModal received data:", data);
      console.log("First land register sample:", data[0]);
      validateData();
    }
  }, [show, data]);

  useEffect(() => {
    if (show && editedData.length > 0 && editedData !== data) {
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
      const lrNumbers = data
        .map((land) => land.lr_certificate_no)
        .filter(Boolean);
      const duplicateLRNumbers = lrNumbers.filter(
        (lr, index) => lrNumbers.indexOf(lr) !== index
      );

      console.log("LR certificate numbers found:", lrNumbers);
      console.log("Duplicate LR numbers detected:", duplicateLRNumbers);

      let response;
      try {
        response = await fetch(`${API_URL}/land-assets/check-lr-numbers`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ lr_numbers: lrNumbers }),
        });

        if (!response.ok) {
          throw new Error(
            `Failed to check LR numbers: ${response.status} ${response.statusText}`
          );
        }

        const result = await response.json();
        const existingLRNumbers = result.existing_lr_numbers || [];

        console.log("Existing LR numbers from database:", existingLRNumbers);

        const invalidData = data.filter((land) => {
          const hasLRNumber =
            land.lr_certificate_no && land.lr_certificate_no.trim() !== "";
          const hasDescription =
            land.description_of_land && land.description_of_land.trim() !== "";
          const hasOwnership =
            land.proprietorship_details &&
            land.proprietorship_details.trim() !== "";

          console.log("Validating land:", land.lr_certificate_no, {
            hasLRNumber,
            hasDescription,
            hasOwnership,
          });

          return !hasLRNumber || !hasDescription || !hasOwnership;
        });

        console.log("Invalid data found:", invalidData);

        const validationResult: ValidationResult = {
          existingLRNumbers,
          duplicateLRNumbers: [...new Set(duplicateLRNumbers)],
          invalidData,
          totalValid:
            data.length -
            invalidData.length -
            duplicateLRNumbers.length +
            [...new Set(duplicateLRNumbers)].length,
          totalInvalid: invalidData.length,
          totalDuplicates: [...new Set(duplicateLRNumbers)].length,
          totalExisting: existingLRNumbers.length,
        };

        console.log("Validation result:", validationResult);
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

  const validateDataWithData = async (dataToValidate: any[]) => {
    if (dataToValidate.length === 0) return;

    console.log("validateDataWithData called with:", dataToValidate);
    setIsValidating(true);
    setValidationError(null);

    try {
      const lrNumbers = dataToValidate
        .map((land) => land.lr_certificate_no)
        .filter(Boolean);
      const duplicateLRNumbers = lrNumbers.filter(
        (lr, index) => lrNumbers.indexOf(lr) !== index
      );

      let response;
      try {
        response = await fetch(`${API_URL}/land-assets/check-lr-numbers`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ lr_numbers: lrNumbers }),
        });

        if (!response.ok) {
          throw new Error(
            `Failed to check LR numbers: ${response.status} ${response.statusText}`
          );
        }

        const result = await response.json();
        const existingLRNumbers = result.existing_lr_numbers || [];

        const invalidData = dataToValidate.filter((land) => {
          const hasLRNumber =
            land.lr_certificate_no && land.lr_certificate_no.trim() !== "";
          const hasDescription =
            land.description_of_land && land.description_of_land.trim() !== "";
          const hasOwnership =
            land.proprietorship_details &&
            land.proprietorship_details.trim() !== "";
          return !hasLRNumber || !hasDescription || !hasOwnership;
        });

        const validationResult: ValidationResult = {
          existingLRNumbers,
          duplicateLRNumbers: [...new Set(duplicateLRNumbers)],
          invalidData,
          totalValid:
            dataToValidate.length -
            invalidData.length -
            duplicateLRNumbers.length +
            [...new Set(duplicateLRNumbers)].length,
          totalInvalid: invalidData.length,
          totalDuplicates: [...new Set(duplicateLRNumbers)].length,
          totalExisting: existingLRNumbers.length,
        };

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

  const getValidationMessage = (land: any) => {
    if (!land.lr_certificate_no || land.lr_certificate_no.trim() === "") {
      return "Missing LR certificate number";
    }
    if (!land.description_of_land || land.description_of_land.trim() === "") {
      return "Missing land description";
    }
    if (
      !land.proprietorship_details ||
      land.proprietorship_details.trim() === ""
    ) {
      return "Missing ownership details";
    }
    if (validationResult?.duplicateLRNumbers.includes(land.lr_certificate_no)) {
      return "Duplicate LR number in file";
    }
    if (validationResult?.existingLRNumbers.includes(land.lr_certificate_no)) {
      return "LR number already exists";
    }
    return "Valid";
  };

  const generateUniqueLRNumber = (
    baseLR: string,
    existingLRs: string[]
  ): string => {
    let counter = 1;
    let newLR = `${prefix}${baseLR}`;

    while (existingLRs.includes(newLR)) {
      newLR = `${prefix}${counter}-${baseLR}`;
      counter++;
    }

    return newLR;
  };

  const autoFixDuplicates = () => {
    if (!validationResult) return;

    console.log("Auto-fixing duplicates...");
    const newData = [...editedData];
    const existingLRs = [
      ...validationResult.existingLRNumbers,
      ...newData.map((d) => d.lr_certificate_no).filter(Boolean),
    ];

    const duplicateGroups = new Map<string, number[]>();
    newData.forEach((land, index) => {
      if (
        land.lr_certificate_no &&
        validationResult.duplicateLRNumbers.includes(land.lr_certificate_no)
      ) {
        if (!duplicateGroups.has(land.lr_certificate_no)) {
          duplicateGroups.set(land.lr_certificate_no, []);
        }
        duplicateGroups.get(land.lr_certificate_no)!.push(index);
      }
    });

    duplicateGroups.forEach((indices, lr) => {
      if (indices.length > 1) {
        indices.slice(1).forEach((index) => {
          const newLR = generateUniqueLRNumber(lr, existingLRs);
          newData[index] = { ...newData[index], lr_certificate_no: newLR };
          existingLRs.push(newLR);
        });
      }
    });

    setEditedData(newData);
    setTimeout(() => {
      validateDataWithData(newData);
    }, 100);
  };

  const startEditing = (index: number) => {
    setEditingRow(index);
  };

  const saveEdit = () => {
    setEditingRow(null);
    setTimeout(() => {
      validateDataWithData(editedData);
    }, 100);
  };

  const cancelEdit = () => {
    setEditingRow(null);
    setEditedData([...data]);
    setTimeout(() => {
      validateData();
    }, 100);
  };

  const updateField = (index: number, field: string, value: string) => {
    const newData = [...editedData];
    newData[index] = { ...newData[index], [field]: value };
    setEditedData(newData);
  };

  const removeRow = (index: number) => {
    const newData = editedData.filter((_, i) => i !== index);
    setEditedData(newData);
    setTimeout(() => {
      validateDataWithData(newData);
    }, 100);
  };

  if (!show) return null;

  return (
    <div className="flex fixed inset-0 z-50 justify-center items-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-9xl max-h-[95vh] relative overflow-hidden flex flex-col">
        <div className="sticky top-0 z-20 p-6 pb-4 bg-white border-b">
          <h3 className="text-xl font-bold">Confirm Excel Data</h3>
          <p className="mt-1 text-gray-600">
            Review your land register data and resolve any issues before
            uploading
          </p>
        </div>

        <div className="overflow-y-auto flex-1 p-6">
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
                      title="Automatically fix duplicate LR numbers with prefixes"
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

              {validationResult.totalDuplicates > 0 && (
                <div className="p-3 mb-4 bg-yellow-50 rounded-md border border-yellow-200">
                  <div className="flex gap-3 items-center">
                    <label className="text-sm font-medium text-yellow-800">
                      Prefix for duplicate LR numbers:
                    </label>
                    <input
                      type="text"
                      value={prefix}
                      onChange={(e) => setPrefix(e.target.value)}
                      className="px-2 py-1 text-sm rounded border border-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      placeholder="LR-"
                    />
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
                      Duplicate LR Numbers
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
                      required fields
                    </span>
                  </div>
                )}

                {validationResult.totalDuplicates > 0 && (
                  <div className="flex gap-2 items-center p-3 text-yellow-700 bg-yellow-50 rounded-md">
                    {getStatusIcon("warning")}
                    <span className="font-medium">
                      {validationResult.totalDuplicates} duplicate LR number(s)
                      found
                    </span>
                  </div>
                )}

                {validationResult.totalExisting > 0 && (
                  <div className="flex gap-2 items-center p-3 text-orange-700 bg-orange-50 rounded-md">
                    {getStatusIcon("warning")}
                    <span className="font-medium">
                      {validationResult.totalExisting} LR number(s) already
                      exist
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {isValidating && (
            <div className="p-4 mb-6 bg-blue-50 rounded-lg border">
              <div className="flex gap-2 items-center text-blue-700">
                <div className="w-5 h-5 rounded-full border-b-2 border-blue-700 animate-spin"></div>
                <span>Validating data...</span>
              </div>
            </div>
          )}

          {validationError && (
            <div className="p-4 mb-6 bg-red-50 rounded-lg border">
              <div className="flex gap-2 items-center text-red-700">
                {getStatusIcon("error")}
                <span>{validationError}</span>
              </div>
            </div>
          )}

          <div className="overflow-x-auto rounded-md border">
            <table className="min-w-full border-collapse table-auto">
              <thead className="sticky top-0 z-10 bg-white">
                <tr className="border-b">
                  <th className="px-4 py-2 text-sm font-semibold text-left bg-white">
                    Status
                  </th>
                  {[
                    "LR Certificate No",
                    "Description",
                    "Ownership Details",
                    "County",
                    "Size (ha)",
                    "Acquisition Date",
                    "Acquisition Amount",
                  ].map((header) => (
                    <th
                      key={header}
                      className="px-4 py-2 text-sm font-semibold text-left whitespace-nowrap bg-white"
                    >
                      {header}
                    </th>
                  ))}
                  <th className="px-4 py-2 text-sm font-semibold text-left bg-white">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {editedData.map((land, index) => {
                  const isDuplicate =
                    validationResult?.duplicateLRNumbers.includes(
                      land.lr_certificate_no
                    );
                  const isExisting =
                    validationResult?.existingLRNumbers.includes(
                      land.lr_certificate_no
                    );
                  const isInvalid = validationResult?.invalidData.some(
                    (invalid) =>
                      invalid.lr_certificate_no === land.lr_certificate_no
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
                              {getValidationMessage(land)}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        {editingRow === index ? (
                          <input
                            type="text"
                            value={land.lr_certificate_no || ""}
                            onChange={(e) =>
                              updateField(
                                index,
                                "lr_certificate_no",
                                e.target.value
                              )
                            }
                            className="px-2 py-1 w-full text-sm rounded border focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="LR Certificate No"
                          />
                        ) : (
                          <span className="text-sm">
                            {land.lr_certificate_no || "N/A"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 max-w-xs">
                        {editingRow === index ? (
                          <input
                            type="text"
                            value={land.description_of_land || ""}
                            onChange={(e) =>
                              updateField(
                                index,
                                "description_of_land",
                                e.target.value
                              )
                            }
                            className="px-2 py-1 w-full text-sm rounded border focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Description"
                          />
                        ) : (
                          <span className="text-sm truncate">
                            {land.description_of_land || "N/A"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 max-w-xs">
                        {editingRow === index ? (
                          <input
                            type="text"
                            value={land.proprietorship_details || ""}
                            onChange={(e) =>
                              updateField(
                                index,
                                "proprietorship_details",
                                e.target.value
                              )
                            }
                            className="px-2 py-1 w-full text-sm rounded border focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Ownership Details"
                          />
                        ) : (
                          <span className="text-sm truncate">
                            {land.proprietorship_details || "N/A"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {land.county || "N/A"}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {land.size_ha || "N/A"}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {land.acquisition_date || "N/A"}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {land.acquisition_amount || "N/A"}
                      </td>
                      <td className="px-4 py-2">
                        {editingRow === index ? (
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
                        ) : (
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
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="sticky bottom-0 p-6 bg-white border-t">
          <div className="flex flex-col gap-4 justify-between items-start sm:flex-row sm:items-center">
            <div className="text-sm text-gray-600">
              {validationResult && (
                <span>
                  {canProceed
                    ? `Ready to upload ${validationResult.totalValid} valid record(s)`
                    : `Please resolve ${
                        validationResult.totalInvalid +
                        validationResult.totalDuplicates +
                        validationResult.totalExisting
                      } issue(s) before uploading`}
                </span>
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
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
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

export default ConfirmLandRegisterExcelModal;

// "use client";

// import type React from "react";
// import { useState, useMemo, useEffect } from "react";
// import {
//   X,
//   AlertTriangle,
//   CheckCircle,
//   Upload,
//   FileSpreadsheet,
//   AlertCircle,
//   Trash2,
//   Edit2,
//   Check,
// } from "lucide-react";
// import Button from "./Button";

// // =============== SCHEMA & KEYWORDS ===============
// const INTERNAL_FIELDS = [
//   { key: "registration_number", label: "Registration No.", required: true },
//   { key: "tag_number", label: "Tag Number", required: true },
//   { key: "financed_by", label: "Financed By", required: false },
//   { key: "make_model", label: "Make/Model", required: false },
//   { key: "year_of_purchase", label: "Year of Purchase", required: false },
//   { key: "engine_number", label: "Engine No.", required: false },
//   { key: "chassis_number", label: "Chassis No.", required: false },
//   { key: "pv_number", label: "PV Number", required: false },
//   { key: "color", label: "Color", required: false },
//   { key: "original_location", label: "Original Location", required: false },
//   { key: "current_location", label: "Current Location", required: false },
//   { key: "amount", label: "Amount", required: false },
//   { key: "depreciation_rate", label: "Depreciation Rate (%)", required: false },
//   { key: "annual_depreciation", label: "Annual Depreciation", required: false },
//   {
//     key: "accumulated_depreciation",
//     label: "Accumulated Depreciation",
//     required: false,
//   },
//   { key: "net_book_value", label: "Net Book Value", required: false },
//   { key: "disposal_value", label: "Disposal Value", required: false },
//   { key: "replacement_date", label: "Replacement Date", required: false },
//   { key: "date_of_disposal", label: "Date of Disposal", required: false },
//   { key: "responsible_officer", label: "Responsible Officer", required: false },
//   { key: "asset_condition", label: "Asset Condition", required: false },
//   { key: "has_logbook", label: "Has Logbook", required: false },
//   { key: "notes", label: "Notes", required: false },
// ];

// const FIELD_KEYWORDS: Record<string, string[]> = {
//   registration_number: [
//     "reg",
//     "registration",
//     "plate",
//     "vehicle id",
//     "vin",
//     "no.",
//     "regno",
//     "reg no",
//   ],
//   tag_number: ["tag", "asset tag", "id", "number", "tag no"],
//   financed_by: ["financed", "lender", "bank", "provider", "funder"],
//   make_model: ["make", "model", "brand", "vehicle type", "car model"],
//   year_of_purchase: ["year", "purchase year", "acquired", "bought"],
//   engine_number: ["engine", "motor", "eng no"],
//   chassis_number: ["chassis", "frame", "chassis no"],
//   pv_number: ["pv", "purchase voucher", "voucher", "pv no"],
//   color: ["color", "colour"],
//   original_location: ["original", "initial location", "home base", "origin"],
//   current_location: [
//     "current",
//     "location",
//     "site",
//     "branch",
//     "present location",
//   ],
//   amount: ["amount", "cost", "price", "value", "purchase price"],
//   depreciation_rate: ["depreciation", "rate", "dep rate", "dep %"],
//   annual_depreciation: ["annual dep", "yearly depreciation", "yearly dep"],
//   accumulated_depreciation: ["accumulated", "total dep", "acc dep"],
//   net_book_value: ["net", "book value", "nbv"],
//   disposal_value: ["disposal", "salvage", "scrap", "resale"],
//   replacement_date: ["replacement", "replace by", "due for replacement"],
//   date_of_disposal: ["disposed", "sold", "retired", "disposal date"],
//   responsible_officer: [
//     "officer",
//     "manager",
//     "custodian",
//     "responsible",
//     "assigned to",
//   ],
//   asset_condition: ["condition", "status", "state", "health"],
//   has_logbook: ["logbook", "log", "document", "log book"],
//   notes: ["note", "comment", "remark", "description"],
// };

// // =============== PROPS ===============
// interface ConfirmVehicleExcelModalProps {
//   show: boolean;
//   data: Record<string, any>[];
//   onConfirm: (data?: any[]) => void;
//   onCancel: () => void;
//   isLoading?: boolean;
// }

// // =============== COMPONENT ===============
// const ConfirmVehicleExcelModal: React.FC<ConfirmVehicleExcelModalProps> = ({
//   show,
//   data,
//   onConfirm,
//   onCancel,
//   isLoading = false,
// }) => {
//   const [isMappingStep, setIsMappingStep] = useState(true);
//   const [rawHeaders, setRawHeaders] = useState<string[]>([]);
//   const [columnMapping, setColumnMapping] = useState<
//     Record<string, string | null>
//   >({});
//   const [mappedData, setMappedData] = useState<any[]>([]);
//   const [editedData, setEditedData] = useState<any[]>([]);
//   const [duplicateIndices, setDuplicateIndices] = useState<number[]>([]);
//   const [editingIndex, setEditingIndex] = useState<number | null>(null);
//   const [editingField, setEditingField] = useState<string | null>(null);
//   const [editValue, setEditValue] = useState<string>("");

//   // Initialize mapping when data changes
//   useEffect(() => {
//     if (!data || data.length === 0) return;

//     const headers = Object.keys(data[0]);
//     setRawHeaders(headers);

//     const initialMapping: Record<string, string | null> = {};
//     INTERNAL_FIELDS.forEach((field) => {
//       initialMapping[field.key] = null;
//     });

//     // Auto-match using keywords
//     headers.forEach((header) => {
//       const normalizedHeader = header.toLowerCase().trim();
//       let bestMatch: string | null = null;
//       let bestScore = 0;

//       INTERNAL_FIELDS.forEach((field) => {
//         const keywords = FIELD_KEYWORDS[field.key] || [];
//         const score = keywords.reduce((acc, kw) => {
//           return normalizedHeader.includes(kw) ? acc + 1 : acc;
//         }, 0);

//         if (score > bestScore) {
//           bestScore = score;
//           bestMatch = field.key;
//         }
//       });

//       // Assign only if not already taken and has a match
//       if (
//         bestMatch &&
//         bestScore > 0 &&
//         !Object.values(initialMapping).includes(header)
//       ) {
//         initialMapping[bestMatch] = header;
//       }
//     });

//     setColumnMapping(initialMapping);
//     setIsMappingStep(true);
//   }, [data]);

//   // Transform data when user proceeds from mapping step
//   const handleProceedToReview = () => {
//     const transformed = data.map((row) => {
//       const mappedRow: Record<string, any> = {};
//       INTERNAL_FIELDS.forEach((field) => {
//         const sourceCol = columnMapping[field.key];
//         mappedRow[field.key] = sourceCol != null ? row[sourceCol] : null;
//       });
//       return mappedRow;
//     });
//     setMappedData(transformed);
//     setEditedData(transformed);
//     setIsMappingStep(false);
//   };

//   // Re-run duplicate detection when editedData changes
//   useEffect(() => {
//     if (isMappingStep) return;

//     const registrationNumbers = editedData.map(
//       (item) => item.registration_number
//     );
//     const duplicates: number[] = [];
//     const seen = new Set<string>();

//     registrationNumbers.forEach((regNum, index) => {
//       if (regNum && seen.has(regNum)) {
//         duplicates.push(index);
//       } else if (regNum) {
//         seen.add(regNum);
//       }
//     });

//     setDuplicateIndices(duplicates);
//   }, [editedData, isMappingStep]);

//   // ===== Editing Logic =====
//   const handleEdit = (index: number, field: string, currentValue: any) => {
//     setEditingIndex(index);
//     setEditingField(field);
//     setEditValue(currentValue?.toString() || "");
//   };

//   const handleSaveEdit = () => {
//     if (editingIndex !== null && editingField !== null) {
//       const updated = [...editedData];
//       updated[editingIndex] = {
//         ...updated[editingIndex],
//         [editingField]: editValue,
//       };
//       setEditedData(updated);
//       setEditingIndex(null);
//       setEditingField(null);
//       setEditValue("");
//     }
//   };

//   const handleRemove = (index: number) => {
//     const updated = editedData.filter((_, i) => i !== index);
//     setEditedData(updated);
//   };

//   const handleAutoFix = () => {
//     const updated = [...editedData];
//     const seen = new Set<string>();

//     updated.forEach((item, index) => {
//       let regNum = item.registration_number;
//       if (regNum == null) return;

//       if (duplicateIndices.includes(index)) {
//         let counter = 1;
//         let newRegNum = regNum;
//         while (seen.has(newRegNum)) {
//           newRegNum = `${regNum}-${counter}`;
//           counter++;
//         }
//         updated[index] = { ...item, registration_number: newRegNum };
//         seen.add(newRegNum);
//       } else {
//         seen.add(regNum);
//       }
//     });

//     setEditedData(updated);
//     setDuplicateIndices([]);
//   };

//   const handleConfirm = () => {
//     onConfirm(editedData);
//   };

//   // ===== Validation =====
//   const requiredFieldsMapped = INTERNAL_FIELDS.every(
//     (field) => !field.required || columnMapping[field.key] !== null
//   );

//   if (!show) return null;

//   const hasDuplicates = duplicateIndices.length > 0;

//   // ===== Editable Cell Component =====
//   const EditableCell = ({
//     value,
//     index,
//     field,
//     isDuplicate = false,
//   }: {
//     value: any;
//     index: number;
//     field: string;
//     isDuplicate?: boolean;
//   }) => {
//     const isEditing = editingIndex === index && editingField === field;

//     if (isEditing) {
//       return (
//         <div className="flex items-center space-x-1">
//           <input
//             type="text"
//             value={editValue}
//             onChange={(e) => setEditValue(e.target.value)}
//             className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
//             autoFocus
//             onKeyDown={(e) => {
//               if (e.key === "Enter") handleSaveEdit();
//               if (e.key === "Escape") {
//                 setEditingIndex(null);
//                 setEditingField(null);
//               }
//             }}
//           />
//           <button
//             onClick={handleSaveEdit}
//             className="text-green-600 hover:text-green-800 p-1 rounded hover:bg-green-50"
//             title="Save"
//           >
//             <Check size={14} />
//           </button>
//         </div>
//       );
//     }

//     return (
//       <div className="flex items-center space-x-2 group">
//         <span
//           className={`${
//             isDuplicate ? "text-red-600 font-medium" : "text-gray-900"
//           }`}
//         >
//           {value != null ? value : "N/A"}
//         </span>
//         {isDuplicate && <AlertCircle className="text-red-500" size={14} />}
//         <button
//           onClick={() => handleEdit(index, field, value)}
//           className="opacity-0 group-hover:opacity-100 text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
//           title="Edit"
//         >
//           <Edit2 size={12} />
//         </button>
//       </div>
//     );
//   };

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
//       <div className="bg-white rounded-lg shadow-xl max-w-[95vw] w-full max-h-[90vh] overflow-hidden flex flex-col">
//         {/* Header */}
//         <div className="flex justify-between items-center p-6 border-b border-gray-200">
//           <div className="flex items-center space-x-3">
//             <div className="p-2 bg-blue-100 rounded-lg">
//               <FileSpreadsheet className="text-blue-600" size={24} />
//             </div>
//             <div>
//               <h2 className="text-xl font-semibold text-gray-900">
//                 {isMappingStep
//                   ? "Map Your Columns"
//                   : "Confirm Vehicle Data Upload"}
//               </h2>
//               <p className="text-sm text-gray-600 mt-1">
//                 {isMappingStep
//                   ? "Match your spreadsheet columns to our fields"
//                   : `Review ${editedData.length} vehicle(s) before uploading`}
//               </p>
//             </div>
//           </div>
//           <button
//             onClick={onCancel}
//             className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
//             disabled={isLoading}
//           >
//             <X size={24} />
//           </button>
//         </div>

//         {/* Mapping Step */}
//         {isMappingStep ? (
//           <div className="p-6 max-h-[60vh] overflow-auto">
//             <p className="text-sm text-gray-600 mb-6">
//               Your file has the following columns. Please map them to our system
//               fields. Required fields are marked with{" "}
//               <span className="text-red-500">*</span>.
//             </p>
//             <div className="space-y-4">
//               {INTERNAL_FIELDS.map((field) => (
//                 <div
//                   key={field.key}
//                   className="flex items-start justify-between gap-4"
//                 >
//                   <div className="flex-1">
//                     <label className="block text-sm font-medium">
//                       {field.label}{" "}
//                       {field.required && (
//                         <span className="text-red-500">*</span>
//                       )}
//                     </label>
//                   </div>
//                   <div className="w-64">
//                     <select
//                       value={columnMapping[field.key] || ""}
//                       onChange={(e) =>
//                         setColumnMapping({
//                           ...columnMapping,
//                           [field.key]: e.target.value || null,
//                         })
//                       }
//                       className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
//                     >
//                       <option value="">-- Select column --</option>
//                       {rawHeaders.map((header) => (
//                         <option key={header} value={header}>
//                           {header}
//                         </option>
//                       ))}
//                     </select>
//                   </div>
//                 </div>
//               ))}
//             </div>
//             <div className="mt-8 flex justify-end space-x-3">
//               <Button variant="secondary" onClick={onCancel}>
//                 Cancel
//               </Button>
//               <Button
//                 variant="primary"
//                 onClick={handleProceedToReview}
//                 disabled={!requiredFieldsMapped}
//               >
//                 Continue to Review
//               </Button>
//             </div>
//           </div>
//         ) : (
//           <>
//             {/* Duplicate Warning */}
//             {hasDuplicates && (
//               <div className="mx-6 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
//                 <div className="flex items-start space-x-3">
//                   <AlertTriangle
//                     className="text-amber-600 flex-shrink-0 mt-0.5"
//                     size={20}
//                   />
//                   <div className="flex-1">
//                     <h3 className="text-sm font-semibold text-amber-900">
//                       Duplicate Registration Numbers Detected
//                     </h3>
//                     <p className="text-sm text-amber-700 mt-1">
//                       {duplicateIndices.length} vehicle(s) have duplicate
//                       registration numbers. Please fix them before uploading.
//                     </p>
//                     <Button
//                       onClick={handleAutoFix}
//                       variant="secondary"
//                       className="mt-2 text-sm bg-amber-100 hover:bg-amber-200 text-amber-900"
//                       leftIcon={<Check size={16} />}
//                     >
//                       Auto-fix Duplicates
//                     </Button>
//                   </div>
//                 </div>
//               </div>
//             )}

//             {/* Data Table */}
//             <div className="flex-1 overflow-auto p-6">
//               <div className="overflow-x-auto">
//                 <table className="min-w-full divide-y divide-gray-200">
//                   <thead className="bg-gray-50 sticky top-0 z-10">
//                     <tr>
//                       <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50">
//                         #
//                       </th>
//                       {INTERNAL_FIELDS.map((field) => (
//                         <th
//                           key={field.key}
//                           className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
//                         >
//                           {field.label}
//                           {field.required && (
//                             <span className="text-red-500 ml-1">*</span>
//                           )}
//                         </th>
//                       ))}
//                       <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky right-0 bg-gray-50">
//                         Actions
//                       </th>
//                     </tr>
//                   </thead>
//                   <tbody className="bg-white divide-y divide-gray-200">
//                     {editedData.map((item, index) => {
//                       const isDuplicate = duplicateIndices.includes(index);
//                       return (
//                         <tr
//                           key={index}
//                           className={`${
//                             isDuplicate ? "bg-red-50" : "hover:bg-gray-50"
//                           } transition-colors`}
//                         >
//                           <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900 font-medium sticky left-0 bg-inherit">
//                             {index + 1}
//                           </td>
//                           {INTERNAL_FIELDS.map((field) => (
//                             <td
//                               key={field.key}
//                               className="px-3 py-3 whitespace-nowrap text-sm min-w-[120px]"
//                             >
//                               <EditableCell
//                                 value={item[field.key]}
//                                 index={index}
//                                 field={field.key}
//                                 isDuplicate={
//                                   isDuplicate &&
//                                   field.key === "registration_number"
//                                 }
//                               />
//                             </td>
//                           ))}
//                           <td className="px-3 py-3 whitespace-nowrap text-sm sticky right-0 bg-inherit">
//                             <button
//                               onClick={() => handleRemove(index)}
//                               className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
//                               title="Remove"
//                             >
//                               <Trash2 size={16} />
//                             </button>
//                           </td>
//                         </tr>
//                       );
//                     })}
//                   </tbody>
//                 </table>
//               </div>
//             </div>

//             {/* Footer */}
//             <div className="flex justify-between items-center p-6 border-t border-gray-200 bg-gray-50">
//               <div className="flex items-center space-x-2 text-sm text-gray-600">
//                 {hasDuplicates ? (
//                   <>
//                     <AlertTriangle className="text-amber-500" size={16} />
//                     <span>
//                       {duplicateIndices.length} duplicate(s) found – please fix
//                       before uploading
//                     </span>
//                   </>
//                 ) : (
//                   <>
//                     <CheckCircle className="text-green-500" size={16} />
//                     <span>All data validated – ready to upload</span>
//                   </>
//                 )}
//               </div>
//               <div className="flex space-x-3">
//                 <Button
//                   onClick={() => setIsMappingStep(true)}
//                   variant="secondary"
//                   disabled={isLoading}
//                 >
//                   Back to Mapping
//                 </Button>
//                 <Button
//                   onClick={onCancel}
//                   variant="secondary"
//                   disabled={isLoading}
//                   leftIcon={<X size={16} />}
//                 >
//                   Cancel
//                 </Button>
//                 <Button
//                   onClick={handleConfirm}
//                   variant="primary"
//                   disabled={hasDuplicates || isLoading}
//                   isLoading={isLoading}
//                   className="bg-blue-600 hover:bg-blue-700"
//                   leftIcon={<Upload size={16} />}
//                 >
//                   {isLoading
//                     ? "Uploading..."
//                     : `Upload ${editedData.length} Vehicle(s)`}
//                 </Button>
//               </div>
//             </div>
//           </>
//         )}
//       </div>
//     </div>
//   );
// };

// export default ConfirmVehicleExcelModal;

"use client";

import type React from "react";
import { useState, useMemo } from "react";
import {
  X,
  AlertTriangle,
  CheckCircle,
  Upload,
  FileSpreadsheet,
  AlertCircle,
  Trash2,
  Edit2,
  Check,
  Info,
} from "lucide-react";
import Button from "./Button";

interface ConfirmVehicleExcelModalProps {
  show: boolean;
  data: any[];
  onConfirm: (data?: any[]) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const ConfirmVehicleExcelModal: React.FC<ConfirmVehicleExcelModalProps> = ({
  show,
  data,
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  const [editedData, setEditedData] = useState<any[]>([]);
  const [duplicateIndices, setDuplicateIndices] = useState<number[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  useMemo(() => {
    const registrationNumbers = data.map((item) => item.registration_number);
    const duplicates: number[] = [];
    const seen = new Set<string>();

    registrationNumbers.forEach((regNum, index) => {
      if (seen.has(regNum)) {
        duplicates.push(index);
      } else {
        seen.add(regNum);
      }
    });

    setDuplicateIndices(duplicates);
    setEditedData(data);
  }, [data]);

  const handleEdit = (index: number, field: string, currentValue: any) => {
    setEditingIndex(index);
    setEditingField(field);
    setEditValue(currentValue?.toString() || "");
  };

  const handleSaveEdit = () => {
    if (editingIndex !== null && editingField !== null) {
      const updated = [...editedData];
      updated[editingIndex] = {
        ...updated[editingIndex],
        [editingField]: editValue,
      };
      setEditedData(updated);
      setEditingIndex(null);
      setEditingField(null);
      setEditValue("");

      if (editingField === "registration_number") {
        const registrationNumbers = updated.map(
          (item) => item.registration_number
        );
        const duplicates: number[] = [];
        const seen = new Set<string>();

        registrationNumbers.forEach((regNum, index) => {
          if (seen.has(regNum)) {
            duplicates.push(index);
          } else {
            seen.add(regNum);
          }
        });

        setDuplicateIndices(duplicates);
      }
    }
  };

  const handleRemove = (index: number) => {
    const updated = editedData.filter((_, i) => i !== index);
    setEditedData(updated);

    const registrationNumbers = updated.map((item) => item.registration_number);
    const duplicates: number[] = [];
    const seen = new Set<string>();

    registrationNumbers.forEach((regNum, idx) => {
      if (seen.has(regNum)) {
        duplicates.push(idx);
      } else {
        seen.add(regNum);
      }
    });

    setDuplicateIndices(duplicates);
  };

  const handleAutoFix = () => {
    const updated = [...editedData];
    const seen = new Set<string>();

    updated.forEach((item, index) => {
      if (duplicateIndices.includes(index)) {
        let newRegNum = item.registration_number;
        let counter = 1;
        while (seen.has(newRegNum)) {
          newRegNum = `${item.registration_number}-${counter}`;
          counter++;
        }
        updated[index] = { ...item, registration_number: newRegNum };
        seen.add(newRegNum);
      } else {
        seen.add(item.registration_number);
      }
    });

    setEditedData(updated);
    setDuplicateIndices([]);
  };

  const handleConfirm = () => {
    onConfirm(editedData);
  };

  if (!show) return null;

  const hasDuplicates = duplicateIndices.length > 0;

  const EditableCell = ({
    value,
    index,
    field,
    isDuplicate = false,
  }: {
    value: any;
    index: number;
    field: string;
    isDuplicate?: boolean;
  }) => {
    const isEditing = editingIndex === index && editingField === field;

    if (isEditing) {
      return (
        <div className="flex items-center space-x-1">
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveEdit();
              if (e.key === "Escape") {
                setEditingIndex(null);
                setEditingField(null);
              }
            }}
          />
          <button
            onClick={handleSaveEdit}
            className="text-green-600 hover:text-green-800 p-1 rounded hover:bg-green-50"
            title="Save"
          >
            <Check size={14} />
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-center space-x-2 group">
        <span
          className={`${
            isDuplicate ? "text-red-600 font-medium" : "text-gray-900"
          }`}
        >
          {value || "N/A"}
        </span>
        {isDuplicate && <AlertCircle className="text-red-500" size={14} />}
        <button
          onClick={() => handleEdit(index, field, value)}
          className="opacity-0 group-hover:opacity-100 text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
          title="Edit"
        >
          <Edit2 size={12} />
        </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-[95vw] w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileSpreadsheet className="text-blue-600" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Confirm Vehicle Data Upload
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Review {editedData.length} vehicle(s) before uploading
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
            disabled={isLoading}
          >
            <X size={24} />
          </button>
        </div>

        <div className="mx-6 mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <Info className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-900">
                Intelligent Column Mapping Active
              </h3>
              <p className="text-sm text-blue-700 mt-1">
                Column headers have been automatically matched to the correct
                fields. Review the data below to ensure accuracy.
              </p>
            </div>
          </div>
        </div>

        {/* Duplicate Warning */}
        {hasDuplicates && (
          <div className="mx-6 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <AlertTriangle
                className="text-amber-600 flex-shrink-0 mt-0.5"
                size={20}
              />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-amber-900">
                  Duplicate Registration Numbers Detected
                </h3>
                <p className="text-sm text-amber-700 mt-1">
                  {duplicateIndices.length} vehicle(s) have duplicate
                  registration numbers. Please fix them before uploading.
                </p>
                <Button
                  onClick={handleAutoFix}
                  variant="secondary"
                  className="mt-2 text-sm bg-amber-100 hover:bg-amber-200 text-amber-900"
                  leftIcon={<Check size={16} />}
                >
                  Auto-fix Duplicates
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50">
                    #
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Registration No. *
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tag Number *
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Financed By
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Make/Model
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Year of Purchase
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Engine No.
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Chassis No.
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    PV Number
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Color
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Original Location
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Location
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Depreciation Rate (%)
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Annual Depreciation
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Accumulated Depreciation
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Net Book Value
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Disposal Value
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Replacement Date
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date of Disposal
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Responsible Officer
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Asset Condition
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Has Logbook
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notes
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky right-0 bg-gray-50">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {editedData.map((item, index) => {
                  const isDuplicate = duplicateIndices.includes(index);

                  return (
                    <tr
                      key={index}
                      className={`${
                        isDuplicate ? "bg-red-50" : "hover:bg-gray-50"
                      } transition-colors`}
                    >
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900 font-medium sticky left-0 bg-inherit">
                        {index + 1}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm min-w-[180px]">
                        <EditableCell
                          value={item.registration_number}
                          index={index}
                          field="registration_number"
                          isDuplicate={isDuplicate}
                        />
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm min-w-[150px]">
                        <EditableCell
                          value={item.tag_number}
                          index={index}
                          field="tag_number"
                        />
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm min-w-[150px]">
                        <EditableCell
                          value={item.financed_by}
                          index={index}
                          field="financed_by"
                        />
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm min-w-[150px]">
                        <EditableCell
                          value={item.make_model}
                          index={index}
                          field="make_model"
                        />
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm min-w-[120px]">
                        <EditableCell
                          value={item.year_of_purchase}
                          index={index}
                          field="year_of_purchase"
                        />
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm min-w-[150px]">
                        <EditableCell
                          value={item.engine_number}
                          index={index}
                          field="engine_number"
                        />
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm min-w-[150px]">
                        <EditableCell
                          value={item.chassis_number}
                          index={index}
                          field="chassis_number"
                        />
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm min-w-[120px]">
                        <EditableCell
                          value={item.pv_number}
                          index={index}
                          field="pv_number"
                        />
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm min-w-[120px]">
                        <EditableCell
                          value={item.color}
                          index={index}
                          field="color"
                        />
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm min-w-[150px]">
                        <EditableCell
                          value={item.original_location}
                          index={index}
                          field="original_location"
                        />
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm min-w-[150px]">
                        <EditableCell
                          value={item.current_location}
                          index={index}
                          field="current_location"
                        />
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm min-w-[120px]">
                        <EditableCell
                          value={
                            item.amount
                              ? `$${Number(item.amount).toLocaleString()}`
                              : ""
                          }
                          index={index}
                          field="amount"
                        />
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm min-w-[140px]">
                        <EditableCell
                          value={item.depreciation_rate}
                          index={index}
                          field="depreciation_rate"
                        />
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm min-w-[150px]">
                        <EditableCell
                          value={item.annual_depreciation}
                          index={index}
                          field="annual_depreciation"
                        />
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm min-w-[180px]">
                        <EditableCell
                          value={item.accumulated_depreciation}
                          index={index}
                          field="accumulated_depreciation"
                        />
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm min-w-[140px]">
                        <EditableCell
                          value={item.net_book_value}
                          index={index}
                          field="net_book_value"
                        />
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm min-w-[130px]">
                        <EditableCell
                          value={item.disposal_value}
                          index={index}
                          field="disposal_value"
                        />
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm min-w-[140px]">
                        <EditableCell
                          value={item.replacement_date}
                          index={index}
                          field="replacement_date"
                        />
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm min-w-[140px]">
                        <EditableCell
                          value={item.date_of_disposal}
                          index={index}
                          field="date_of_disposal"
                        />
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm min-w-[160px]">
                        <EditableCell
                          value={item.responsible_officer}
                          index={index}
                          field="responsible_officer"
                        />
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm min-w-[140px]">
                        <EditableCell
                          value={item.asset_condition}
                          index={index}
                          field="asset_condition"
                        />
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm min-w-[120px]">
                        <EditableCell
                          value={item.has_logbook}
                          index={index}
                          field="has_logbook"
                        />
                      </td>
                      <td className="px-3 py-3 text-sm min-w-[200px]">
                        <EditableCell
                          value={item.notes}
                          index={index}
                          field="notes"
                        />
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm sticky right-0 bg-inherit">
                        <button
                          onClick={() => handleRemove(index)}
                          className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                          title="Remove"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            {hasDuplicates ? (
              <>
                <AlertTriangle className="text-amber-500" size={16} />
                <span>
                  {duplicateIndices.length} duplicate(s) found - please fix
                  before uploading
                </span>
              </>
            ) : (
              <>
                <CheckCircle className="text-green-500" size={16} />
                <span>All data validated - ready to upload</span>
              </>
            )}
          </div>
          <div className="flex space-x-3">
            <Button
              onClick={onCancel}
              variant="secondary"
              disabled={isLoading}
              leftIcon={<X size={16} />}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              variant="primary"
              disabled={hasDuplicates || isLoading}
              isLoading={isLoading}
              className="bg-blue-600 hover:bg-blue-700"
              leftIcon={<Upload size={16} />}
            >
              {isLoading
                ? "Uploading..."
                : `Upload ${editedData.length} Vehicle(s)`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmVehicleExcelModal;

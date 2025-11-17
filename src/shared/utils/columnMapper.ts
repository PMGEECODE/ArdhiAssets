/**
 * Intelligent Column Mapper Utility
 * Handles fuzzy matching and mapping of Excel column headers to expected field names
 */

interface ColumnMapping {
  field: string;
  variations: string[];
  aliases: string[];
}

// Define all possible column variations for each field
const VEHICLE_COLUMN_MAPPINGS: ColumnMapping[] = [
  {
    field: "registration_number",
    variations: [
      "registration_number",
      "registration number",
      "reg number",
      "reg no",
      "regno",
      "registration no",
      "vehicle registration",
      "vehicle reg",
      "plate number",
      "license plate",
    ],
    aliases: ["reg", "registration", "plate"],
  },
  {
    field: "tag_number",
    variations: [
      "tag_number",
      "tag number",
      "tag no",
      "tagno",
      "asset tag",
      "tag",
      "asset number",
    ],
    aliases: ["tag", "asset_tag"],
  },
  {
    field: "financed_by",
    variations: [
      "financed_by",
      "financed by",
      "financing source",
      "source of funds",
      "funded by",
      "finance source",
    ],
    aliases: ["financed", "funding", "source"],
  },
  {
    field: "make_model",
    variations: [
      "make_model",
      "make model",
      "make/model",
      "make & model",
      "make and model",
      "vehicle make",
      "model",
      "make",
    ],
    aliases: ["make", "model", "vehicle"],
  },
  {
    field: "year_of_purchase",
    variations: [
      "year_of_purchase",
      "year of purchase",
      "purchase year",
      "year purchased",
      "acquisition year",
      "year",
    ],
    aliases: ["year", "purchase_year"],
  },
  {
    field: "engine_number",
    variations: [
      "engine_number",
      "engine number",
      "engine no",
      "engineno",
      "engine #",
    ],
    aliases: ["engine", "engine_no"],
  },
  {
    field: "chassis_number",
    variations: [
      "chassis_number",
      "chassis number",
      "chassis no",
      "chassisno",
      "chassis #",
      "vin",
      "vehicle identification number",
    ],
    aliases: ["chassis", "chassis_no", "vin"],
  },
  {
    field: "pv_number",
    variations: ["pv_number", "pv number", "pv no", "pvno", "pv #"],
    aliases: ["pv", "pv_no"],
  },
  {
    field: "color",
    variations: ["color", "colour", "vehicle color", "vehicle colour"],
    aliases: ["color", "colour"],
  },
  {
    field: "original_location",
    variations: [
      "original_location",
      "original location",
      "initial location",
      "starting location",
      "first location",
    ],
    aliases: ["original", "initial_location"],
  },
  {
    field: "current_location",
    variations: [
      "current_location",
      "current location",
      "present location",
      "location",
    ],
    aliases: ["current", "location"],
  },
  {
    field: "amount",
    variations: [
      "amount",
      "purchase amount",
      "cost",
      "purchase cost",
      "price",
      "purchase price",
      "value",
    ],
    aliases: ["amount", "cost", "price"],
  },
  {
    field: "depreciation_rate",
    variations: [
      "depreciation_rate",
      "depreciation rate",
      "depreciation %",
      "depreciation percent",
      "dep rate",
      "rate",
    ],
    aliases: ["depreciation", "rate"],
  },
  {
    field: "annual_depreciation",
    variations: [
      "annual_depreciation",
      "annual depreciation",
      "yearly depreciation",
      "depreciation per year",
    ],
    aliases: ["annual", "yearly_depreciation"],
  },
  {
    field: "accumulated_depreciation",
    variations: [
      "accumulated_depreciation",
      "accumulated depreciation",
      "total depreciation",
      "cumulative depreciation",
    ],
    aliases: ["accumulated", "total_depreciation"],
  },
  {
    field: "net_book_value",
    variations: [
      "net_book_value",
      "net book value",
      "nbv",
      "book value",
      "current value",
    ],
    aliases: ["nbv", "book_value"],
  },
  {
    field: "disposal_value",
    variations: [
      "disposal_value",
      "disposal value",
      "salvage value",
      "residual value",
      "scrap value",
    ],
    aliases: ["disposal", "salvage"],
  },
  {
    field: "replacement_date",
    variations: [
      "replacement_date",
      "replacement date",
      "date of replacement",
      "replace date",
    ],
    aliases: ["replacement", "replace_date"],
  },
  {
    field: "date_of_disposal",
    variations: [
      "date_of_disposal",
      "date of disposal",
      "disposal date",
      "disposed date",
    ],
    aliases: ["disposal_date", "disposed"],
  },
  {
    field: "responsible_officer",
    variations: [
      "responsible_officer",
      "responsible officer",
      "officer",
      "assigned to",
      "assigned officer",
      "custodian",
    ],
    aliases: ["officer", "custodian", "assigned"],
  },
  {
    field: "asset_condition",
    variations: [
      "asset_condition",
      "asset condition",
      "condition",
      "status",
      "state",
    ],
    aliases: ["condition", "status"],
  },
  {
    field: "has_logbook",
    variations: [
      "has_logbook",
      "has logbook",
      "logbook",
      "log book",
      "has log book",
      "logbook available",
    ],
    aliases: ["logbook", "log_book"],
  },
  {
    field: "notes",
    variations: [
      "notes",
      "note",
      "comments",
      "comment",
      "remarks",
      "remark",
      "description",
    ],
    aliases: ["notes", "comments", "remarks"],
  },
];

/**
 * Normalize a string for comparison
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[_\-\s/&]+/g, " ") // Replace separators with space
    .replace(/\s+/g, " ") // Collapse multiple spaces
    .trim();
}

/**
 * Calculate similarity score between two strings (0-1)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = normalizeString(str1);
  const s2 = normalizeString(str2);

  // Exact match
  if (s1 === s2) return 1.0;

  // Check if one contains the other
  if (s1.includes(s2) || s2.includes(s1)) {
    const longer = Math.max(s1.length, s2.length);
    const shorter = Math.min(s1.length, s2.length);
    return shorter / longer;
  }

  // Levenshtein distance for fuzzy matching
  const matrix: number[][] = [];

  for (let i = 0; i <= s1.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= s2.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  const distance = matrix[s1.length][s2.length];
  const maxLength = Math.max(s1.length, s2.length);
  return 1 - distance / maxLength;
}

/**
 * Find the best matching field for a given column header
 */
function findBestMatch(columnHeader: string, threshold = 0.6): string | null {
  let bestMatch: string | null = null;
  let bestScore = 0;

  for (const mapping of VEHICLE_COLUMN_MAPPINGS) {
    // Check exact matches first
    for (const variation of mapping.variations) {
      const score = calculateSimilarity(columnHeader, variation);
      if (score > bestScore && score >= threshold) {
        bestScore = score;
        bestMatch = mapping.field;
      }
    }

    // Check aliases
    for (const alias of mapping.aliases) {
      const score = calculateSimilarity(columnHeader, alias);
      if (score > bestScore && score >= threshold) {
        bestScore = score;
        bestMatch = mapping.field;
      }
    }
  }

  return bestMatch;
}

/**
 * Map Excel column headers to expected field names
 */
export function mapExcelColumns(excelRow: any): Record<string, string> {
  const columnMap: Record<string, string> = {};
  const excelHeaders = Object.keys(excelRow);

  console.log("[v0] Excel headers found:", excelHeaders);

  for (const header of excelHeaders) {
    const matchedField = findBestMatch(header);
    if (matchedField) {
      columnMap[header] = matchedField;
      console.log(`[v0] Mapped "${header}" → "${matchedField}"`);
    } else {
      console.log(`[v0] No match found for "${header}"`);
    }
  }

  return columnMap;
}

/**
 * Transform Excel row data using the column mapping
 */
export function transformExcelRow(
  row: any,
  columnMap: Record<string, string>
): any {
  const transformed: any = {};

  for (const [excelHeader, fieldName] of Object.entries(columnMap)) {
    const value = row[excelHeader];

    // Handle empty values
    if (value === "" || value === null || value === undefined) {
      transformed[fieldName] = undefined;
      continue;
    }

    // Handle numeric fields
    if (
      [
        "amount",
        "depreciation_rate",
        "annual_depreciation",
        "accumulated_depreciation",
        "net_book_value",
        "disposal_value",
      ].includes(fieldName)
    ) {
      const numValue = Number.parseFloat(value);
      transformed[fieldName] = isNaN(numValue) ? undefined : numValue;
      continue;
    }

    // Handle date fields
    if (["replacement_date", "date_of_disposal"].includes(fieldName) && value) {
      // Excel dates might come as numbers or strings
      if (typeof value === "number") {
        // Excel date serial number
        const date = new Date((value - 25569) * 86400 * 1000);
        transformed[fieldName] = date.toISOString().split("T")[0];
      } else {
        transformed[fieldName] = value;
      }
      continue;
    }

    // Default: use value as-is
    transformed[fieldName] = value;
  }

  return transformed;
}

/**
 * Process entire Excel data with intelligent column mapping
 */
export function processExcelData(jsonData: any[]): any[] {
  if (jsonData.length === 0) return [];

  // Get column mapping from first row
  const columnMap = mapExcelColumns(jsonData[0]);

  console.log("[v0] Final column mapping:", columnMap);

  // Transform all rows
  const transformedData = jsonData.map((row) =>
    transformExcelRow(row, columnMap)
  );

  console.log("[v0] Transformed data sample:", transformedData[0]);

  return transformedData;
}

/**
 * Get mapping confidence report
 */
export function getMappingReport(
  excelRow: any
): Array<{ header: string; mappedTo: string | null; confidence: number }> {
  const report: Array<{
    header: string;
    mappedTo: string | null;
    confidence: number;
  }> = [];
  const excelHeaders = Object.keys(excelRow);

  for (const header of excelHeaders) {
    let bestMatch: string | null = null;
    let bestScore = 0;

    for (const mapping of VEHICLE_COLUMN_MAPPINGS) {
      for (const variation of mapping.variations) {
        const score = calculateSimilarity(header, variation);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = mapping.field;
        }
      }
    }

    report.push({
      header,
      mappedTo: bestScore >= 0.6 ? bestMatch : null,
      confidence: bestScore,
    });
  }

  return report;
}

/**
 * Intelligent column mapper that works with any field mapping configuration
 * @param row - The Excel row data
 * @param fieldMappings - Object mapping field names to their possible column name variations
 * @returns Mapped object with standardized field names
 */
export function intelligentColumnMapper(
  row: any,
  fieldMappings: Record<string, string[]>
): Record<string, any> {
  const result: Record<string, any> = {};
  const excelHeaders = Object.keys(row);

  console.log("[v0] intelligentColumnMapper - Excel headers:", excelHeaders);
  console.log(
    "[v0] intelligentColumnMapper - Field mappings:",
    Object.keys(fieldMappings)
  );

  // For each expected field, try to find a matching column in the Excel data
  for (const [fieldName, variations] of Object.entries(fieldMappings)) {
    let bestMatch: string | null = null;
    let bestScore = 0;

    // Try to find the best matching Excel column for this field
    for (const excelHeader of excelHeaders) {
      for (const variation of variations) {
        const score = calculateSimilarity(excelHeader, variation);
        if (score > bestScore && score >= 0.6) {
          bestScore = score;
          bestMatch = excelHeader;
        }
      }
    }

    // If we found a match, use that value
    if (bestMatch) {
      result[fieldName] = row[bestMatch] || "";
      console.log(
        `[v0] Mapped "${bestMatch}" → "${fieldName}" (score: ${bestScore.toFixed(
          2
        )})`
      );
    } else {
      // Try direct field name match as fallback
      if (row[fieldName] !== undefined) {
        result[fieldName] = row[fieldName];
        console.log(`[v0] Direct match for "${fieldName}"`);
      } else {
        result[fieldName] = "";
        console.log(`[v0] No match found for "${fieldName}"`);
      }
    }
  }

  return result;
}

import axios from "axios";
import { API_URL } from "../config/constants";

/**
 * Logs asset category visit to backend audit system
 */
export async function logCategoryVisit(
  categoryType: string,
  categoryName: string,
  additionalData?: Record<string, any>
): Promise<void> {
  try {
    const auditPayload = {
      action: "CATEGORY_VIEW",
      entity_type: "asset_category",
      entity_id: categoryType,
      details: `Visited ${categoryName} category`,
      status: "success",
      event_category: "asset_access",
      new_values: {
        categoryType,
        categoryName,
        timestamp: new Date().toISOString(),
        source: "frontend",
        ...additionalData,
      },
    };

    await axios.post(`${API_URL}/audit-logs`, auditPayload, {
      withCredentials: true,
    });

    console.log(`[v0] Category visit logged: ${categoryName}`);
  } catch (error) {
    // Fail silently - don't interrupt user workflow
    console.warn("[v0] Failed to log category visit:", error);
  }
}

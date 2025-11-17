import axios from "axios";
import { API_URL } from "../../shared/config/constants";

interface ExportLog {
  timestamp: string;
  action: "EXCEL" | "PDF" | "PRINT" | "CSV";
  title: string;
  recordCount: number;
  columnCount: number;
  status: "SUCCESS" | "FAILED" | "STARTED";
  errorMessage?: string;
  duration?: number;
  userId?: string;
  filters?: Record<string, string | undefined>;
}

class ExportLogger {
  private logs: ExportLog[] = [];
  private readonly MAX_LOGS = 100; // Keep last 100 logs in memory

  /**
   * Log an export action to both console and backend
   */
  async logExport(
    action: ExportLog["action"],
    title: string,
    recordCount: number,
    columnCount: number,
    status: ExportLog["status"],
    options?: {
      errorMessage?: string;
      duration?: number;
      userId?: string;
      filters?: Record<string, string | undefined>;
    }
  ): Promise<void> {
    const log: ExportLog = {
      timestamp: new Date().toISOString(),
      action,
      title,
      recordCount,
      columnCount,
      status,
      errorMessage: options?.errorMessage,
      duration: options?.duration,
      userId: options?.userId,
      filters: options?.filters,
    };

    this.logs.push(log);

    // Keep only the last MAX_LOGS entries in memory
    if (this.logs.length > this.MAX_LOGS) {
      this.logs = this.logs.slice(-this.MAX_LOGS);
    }

    // Log to console with formatting
    this.logToConsole(log);

    await this.sendToBackend(log);
  }

  /**
   * Send export log to backend audit system
   */
  private async sendToBackend(log: ExportLog): Promise<void> {
    try {
      // Map export action to audit action
      const auditAction = `EXPORT_${log.action}`;

      // Prepare audit log payload
      const auditPayload = {
        action: auditAction,
        entity_type: "export",
        entity_id: `${log.title}_${log.timestamp}`,
        details: `${log.title} - ${log.recordCount} records, ${log.columnCount} columns`,
        status:
          log.status === "SUCCESS"
            ? "success"
            : log.status === "FAILED"
            ? "failure"
            : "pending",
        event_category: "file_operation",
        new_values: {
          title: log.title,
          recordCount: log.recordCount,
          columnCount: log.columnCount,
          duration: log.duration,
          filters: log.filters,
          errorMessage: log.errorMessage,
        },
      };

      // Send to backend
      await axios.post(`${API_URL}/audit-logs`, auditPayload, {
        withCredentials: true,
      });

      console.log("[v0] Export logged to backend audit system");
    } catch (error) {
      // Fail silently to not interrupt user workflow
      console.warn("[v0] Failed to log export to backend:", error);
    }
  }

  /**
   * Log to console with color coding
   */
  private logToConsole(log: ExportLog): void {
    const actionColors: Record<ExportLog["action"], string> = {
      EXCEL: "#4CAF50",
      PDF: "#FF6B6B",
      PRINT: "#2196F3",
      CSV: "#FF9800",
    };

    const statusColors: Record<ExportLog["status"], string> = {
      SUCCESS: "#4CAF50",
      FAILED: "#FF6B6B",
      STARTED: "#FFC107",
    };

    const color = actionColors[log.action];
    const statusColor = statusColors[log.status];

    console.group(
      `%c[EXPORT] %c${log.action}%c - ${log.title}`,
      "color: #666; font-weight: bold;",
      `color: white; background-color: ${color}; padding: 2px 6px; border-radius: 3px; font-weight: bold;`,
      "color: #333;"
    );

    console.log(
      `%cStatus: %c${log.status}`,
      "font-weight: bold;",
      `color: white; background-color: ${statusColor}; padding: 2px 6px; border-radius: 3px;`
    );
    console.log(
      `%cTimestamp: %c${log.timestamp}`,
      "font-weight: bold;",
      "color: #666;"
    );
    console.log(
      `%cRecords: %c${log.recordCount}`,
      "font-weight: bold;",
      "color: #333;"
    );
    console.log(
      `%cColumns: %c${log.columnCount}`,
      "font-weight: bold;",
      "color: #333;"
    );

    if (log.duration) {
      console.log(
        `%cDuration: %c${log.duration}ms`,
        "font-weight: bold;",
        "color: #666;"
      );
    }

    if (log.filters && Object.keys(log.filters).length > 0) {
      console.log("%cActive Filters:", "font-weight: bold;", log.filters);
    }

    if (log.errorMessage) {
      console.error(
        `%cError: %c${log.errorMessage}`,
        "font-weight: bold;",
        "color: #FF6B6B;"
      );
    }

    console.groupEnd();
  }

  /**
   * Get all logs from memory
   */
  getLogs(): ExportLog[] {
    return [...this.logs];
  }

  /**
   * Clear all logs from memory
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Get export statistics
   */
  getStatistics(): {
    totalExports: number;
    byAction: Record<ExportLog["action"], number>;
    successRate: number;
    totalRecordsExported: number;
  } {
    const allLogs = [...this.logs];
    const successfulLogs = allLogs.filter((log) => log.status === "SUCCESS");

    return {
      totalExports: allLogs.length,
      byAction: {
        EXCEL: allLogs.filter((log) => log.action === "EXCEL").length,
        PDF: allLogs.filter((log) => log.action === "PDF").length,
        PRINT: allLogs.filter((log) => log.action === "PRINT").length,
        CSV: allLogs.filter((log) => log.action === "CSV").length,
      },
      successRate:
        allLogs.length > 0 ? (successfulLogs.length / allLogs.length) * 100 : 0,
      totalRecordsExported: successfulLogs.reduce(
        (sum, log) => sum + log.recordCount,
        0
      ),
    };
  }
}

// Export singleton instance
export const exportLogger = new ExportLogger();
export type { ExportLog };

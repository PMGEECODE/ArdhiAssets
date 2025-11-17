import { jsPDF } from "jspdf";
import type { ExportOptions, ReportSummary } from "../types";
import { GOVERNMENT_REPORT_CONFIG } from "../constants";

interface PDFExportParams {
  categoryLabel: string;
  dateRange: { start: string; end: string };
  filteredData: any[];
  summary: ReportSummary;
  categoryKey: string;
  options: ExportOptions;
}

const addHeader = (doc: jsPDF, categoryLabel: string) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = GOVERNMENT_REPORT_CONFIG.pageMargin;

  // Header background
  doc.setFillColor(0, 51, 102); // Government blue
  doc.rect(0, 0, pageWidth, 40, "F");

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont("Georgia", "bold");
  doc.setFontSize(20);
  doc.text("OFFICIAL ASSET MANAGEMENT REPORT", margin, 20);

  // Subtitle
  doc.setFont("Georgia", "normal");
  doc.setFontSize(12);
  doc.text(categoryLabel, margin, 30);

  // Reset text color
  doc.setTextColor(0, 0, 0);
};

const addFooter = (doc: jsPDF, pageNumber: number) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = GOVERNMENT_REPORT_CONFIG.pageMargin;

  // Footer line
  doc.setDrawColor(0, 51, 102);
  doc.setLineWidth(0.5);
  doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

  // Footer text
  doc.setFont("Arial", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`Page ${pageNumber}`, pageWidth - margin - 20, pageHeight - 8, {
    align: "right",
  });
  doc.text(`Generated: ${new Date().toLocaleString()}`, margin, pageHeight - 8);
};

const addTitlePage = (
  doc: jsPDF,
  categoryLabel: string,
  dateRange: { start: string; end: string }
) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = GOVERNMENT_REPORT_CONFIG.pageMargin;

  // Background
  doc.setFillColor(245, 245, 245);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  // Title
  doc.setFont("Georgia", "bold");
  doc.setFontSize(28);
  doc.setTextColor(0, 51, 102);
  doc.text("ASSET MANAGEMENT REPORT", pageWidth / 2, 80, { align: "center" });

  // Category
  doc.setFontSize(18);
  doc.setTextColor(0, 102, 204);
  doc.text(categoryLabel, pageWidth / 2, 110, { align: "center" });

  // Report details
  doc.setFont("Arial", "normal");
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);

  const detailsY = 150;
  const lineHeight = 10;

  doc.text(
    `Report Period: ${dateRange.start} to ${dateRange.end}`,
    pageWidth / 2,
    detailsY,
    { align: "center" }
  );
  doc.text(
    `Generated: ${new Date().toLocaleDateString()}`,
    pageWidth / 2,
    detailsY + lineHeight,
    { align: "center" }
  );
  doc.text(
    `Time: ${new Date().toLocaleTimeString()}`,
    pageWidth / 2,
    detailsY + lineHeight * 2,
    { align: "center" }
  );

  // Signature section
  doc.setFont("Arial", "normal");
  doc.setFontSize(10);
  const signatureY = pageHeight - 80;

  doc.text("Authorized By:", margin, signatureY);
  doc.line(margin, signatureY + 20, margin + 60, signatureY + 20);
  doc.text("Signature", margin, signatureY + 25);

  doc.text("Date:", pageWidth - margin - 60, signatureY);
  doc.line(
    pageWidth - margin - 60,
    signatureY + 20,
    pageWidth - margin,
    signatureY + 20
  );
  doc.text("Date", pageWidth - margin - 60, signatureY + 25);

  doc.addPage();
};

const addSummarySection = (
  doc: jsPDF,
  summary: ReportSummary,
  yPosition: number
) => {
  const margin = GOVERNMENT_REPORT_CONFIG.pageMargin;
  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = yPosition;

  // Section title
  doc.setFont("Georgia", "bold");
  doc.setFontSize(14);
  doc.setTextColor(0, 51, 102);
  doc.text("SUMMARY", margin, currentY);
  currentY += 8;

  // Summary box
  doc.setDrawColor(0, 102, 204);
  doc.setLineWidth(0.5);
  doc.rect(margin, currentY, pageWidth - margin * 2, 40);

  doc.setFont("Arial", "normal");
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);

  doc.text(
    `Total Records: ${summary.totalRecords.toLocaleString()}`,
    margin + 5,
    currentY + 8
  );

  if (summary.activeCount !== undefined) {
    doc.text(`Active: ${summary.activeCount}`, margin + 5, currentY + 16);
    doc.text(`Inactive: ${summary.inactiveCount}`, margin + 5, currentY + 24);
  }

  if (summary.conditionBreakdown) {
    const conditions = Object.entries(summary.conditionBreakdown)
      .map(([k, v]) => `${k}: ${v}`)
      .join(" | ");
    doc.text(`Conditions: ${conditions}`, margin + 5, currentY + 32);
  }

  return currentY + 50;
};

const addDataTable = (
  doc: jsPDF,
  data: any[],
  categoryKey: string,
  yPosition: number
) => {
  const margin = GOVERNMENT_REPORT_CONFIG.pageMargin;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let currentY = yPosition;

  // Section title
  doc.setFont("Georgia", "bold");
  doc.setFontSize(14);
  doc.setTextColor(0, 51, 102);
  doc.text("DETAILED RECORDS", margin, currentY);
  currentY += 10;

  // Table headers
  doc.setFont("Arial", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.setFillColor(0, 51, 102);

  const tableWidth = pageWidth - margin * 2;
  const colWidth = tableWidth / 4;

  doc.rect(margin, currentY, tableWidth, 8, "F");
  doc.text("ID", margin + 2, currentY + 6);
  doc.text("Description", margin + colWidth + 2, currentY + 6);
  doc.text("Location", margin + colWidth * 2 + 2, currentY + 6);
  doc.text("Status", margin + colWidth * 3 + 2, currentY + 6);

  currentY += 10;

  // Table data
  doc.setFont("Arial", "normal");
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);

  data.slice(0, 50).forEach((item, index) => {
    // Check if we need a new page
    if (currentY > pageHeight - 30) {
      doc.addPage();
      addHeader(doc, "DETAILED RECORDS (Continued)");
      currentY = 50;
    }

    // Alternate row colors
    if (index % 2 === 0) {
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, currentY - 5, tableWidth, 8, "F");
    }

    const id = item.id || "N/A";
    const description =
      item.asset_description ||
      item.description_of_land ||
      item.registration_number ||
      item.hostname ||
      "N/A";
    const location = item.current_location || "N/A";
    const status =
      item.asset_condition || (item.is_active ? "Active" : "Inactive") || "N/A";

    doc.text(String(id).substring(0, 8), margin + 2, currentY);
    doc.text(
      String(description).substring(0, 30),
      margin + colWidth + 2,
      currentY
    );
    doc.text(
      String(location).substring(0, 20),
      margin + colWidth * 2 + 2,
      currentY
    );
    doc.text(
      String(status).substring(0, 15),
      margin + colWidth * 3 + 2,
      currentY
    );

    currentY += 8;
  });

  if (data.length > 50) {
    currentY += 5;
    doc.setFont("Arial", "italic");
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`... and ${data.length - 50} more records`, margin, currentY);
  }

  return currentY;
};

export const generateGovernmentPDF = (params: PDFExportParams) => {
  const { categoryLabel, dateRange, filteredData, summary, options } = params;
  const doc = new jsPDF();
  let pageNumber = 1;

  // Add title page
  addTitlePage(doc, categoryLabel, dateRange);
  pageNumber++;

  // Add header and footer to first content page
  addHeader(doc, categoryLabel);
  let yPosition = 50;

  // Add summary section
  if (options.mode === "summary" || options.mode === "full") {
    yPosition = addSummarySection(doc, summary, yPosition);
  }

  // Add data table
  if (options.mode === "data" || options.mode === "full") {
    if (yPosition > 200) {
      doc.addPage();
      addHeader(doc, categoryLabel);
      yPosition = 50;
      pageNumber++;
    }
    addDataTable(doc, filteredData, params.categoryKey, yPosition);
  }

  // Add footers to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, i);
  }

  // Save PDF
  const filename = `${categoryLabel
    .toLowerCase()
    .replace(/\s+/g, "_")}_report_${dateRange.start}_to_${dateRange.end}.pdf`;
  doc.save(filename);
};

"use client";

import type React from "react";
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
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
  MapPin,
  FileText,
  Calendar,
  Map,
  Info,
  Shield,
  Settings,
  Search,
  X,
} from "lucide-react";
import { toast } from "react-toastify";

import { useLandRegisterStore } from "../../../../shared/store/landRegisterStore";
import type { LandRegister } from "../../../../shared/store/landRegisterStore";
import Button from "../../../../shared/components/ui/Button";
import Card from "../../../../shared/components/ui/Card";
import LandParcelMap from "./LandParcelMap";

import { KshIcon } from "../../../../shared/components/ui/icons/KshIcon";

// Search match tracking interface
interface SearchMatch {
  id: string;
  element: HTMLElement;
  text: string;
  section: string;
}

// Enhanced search utilities
const createSearchableContent = (landRegister: LandRegister) => {
  const content: Record<string, any> = {};

  // Basic fields
  content.description_of_land = landRegister.description_of_land;
  content.lr_certificate_no = landRegister.lr_certificate_no;
  content.category = landRegister.category;
  content.mode_of_acquisition = landRegister.mode_of_acquisition;
  content.size_ha = landRegister.size_ha ? `${landRegister.size_ha} ha` : null;

  // Location fields
  content.county = landRegister.county;
  content.sub_county = landRegister.sub_county;
  content.location = landRegister.location;
  content.nearest_town_location = landRegister.nearest_town_location;
  content.division = landRegister.division;
  content.sub_location = landRegister.sub_location;

  // Legal documentation
  content.document_of_ownership = landRegister.document_of_ownership;
  content.land_tenure = landRegister.land_tenure;
  content.proprietorship_details = landRegister.proprietorship_details;

  // Financial information (formatted)
  content.acquisition_amount = landRegister.acquisition_amount
    ? `Ksh. ${landRegister.acquisition_amount.toLocaleString()}`
    : null;
  content.fair_value = landRegister.fair_value
    ? `Ksh. ${landRegister.fair_value.toLocaleString()}`
    : null;
  content.annual_rental_income = landRegister.annual_rental_income
    ? `Ksh. ${landRegister.annual_rental_income.toLocaleString()}`
    : null;
  content.disposal_value = landRegister.disposal_value
    ? `Ksh. ${landRegister.disposal_value.toLocaleString()}`
    : null;

  // Geographic information
  content.gps_coordinates = landRegister.gps_coordinates;
  content.surveyed = landRegister.surveyed;

  // Polygon points (flatten into searchable text)
  if (landRegister.polygon) {
    Object.entries(landRegister.polygon).forEach(([point, value]) => {
      content[`polygon_point_${point}`] = `${point}: ${value}`;
    });
  }

  // Dates (formatted)
  content.acquisition_date = landRegister.acquisition_date
    ? new Date(landRegister.acquisition_date).toLocaleDateString()
    : null;
  content.registration_date = landRegister.registration_date
    ? new Date(landRegister.registration_date).toLocaleDateString()
    : null;
  content.disposal_date = landRegister.disposal_date
    ? new Date(landRegister.disposal_date).toLocaleDateString()
    : null;

  // Status and conditions
  content.disputed = landRegister.disputed;
  content.planned_unplanned = landRegister.planned_unplanned;
  content.purpose_use_of_land = landRegister.purpose_use_of_land;
  content.encumbrances = landRegister.encumbrances;
  content.remarks = landRegister.remarks;

  // Add section headers and labels for comprehensive search
  content.section_basic_information = "Basic Information";
  content.section_location_details = "Location Details";
  content.section_legal_documentation = "Legal Documentation";
  content.section_financial_information = "Financial Information";
  content.section_geographic_information = "Geographic Information";
  content.section_important_dates = "Important Dates";
  content.section_status_conditions = "Status & Conditions";
  content.section_additional_information = "Additional Information";
  content.section_land_parcel_map = "Land Parcel Map";

  // Add field labels for search
  content.label_description_of_land = "Description of Land";
  content.label_lr_certificate_no = "LR Certificate No.";
  content.label_category = "Category";
  content.label_mode_of_acquisition = "Mode of Acquisition";
  content.label_size_ha = "Size (ha)";
  content.label_county = "County";
  content.label_sub_county = "Sub County";
  content.label_location = "Location";
  content.label_nearest_town = "Nearest Town";
  content.label_division = "Division";
  content.label_sub_location = "Sub Location";
  content.label_document_of_ownership = "Document of Ownership";
  content.label_land_tenure = "Land Tenure";
  content.label_ownership_details = "Ownership Details";
  content.label_acquisition_amount = "Acquisition Amount";
  content.label_fair_value = "Fair Value";
  content.label_annual_rental_income = "Annual Rental Income";
  content.label_disposal_value = "Disposal Value";
  content.label_gps_coordinates = "GPS Coordinates";
  content.label_survey_points = "Survey Points";
  content.label_survey_status = "Survey Status";
  content.label_acquisition_date = "Acquisition Date";
  content.label_registration_date = "Registration Date";
  content.label_disposal_date = "Disposal Date";
  content.label_disputed_status = "Disputed Status";
  content.label_planning_status = "Planning Status";
  content.label_purpose_of_land = "Purpose of Land";
  content.label_encumbrances = "Encumbrances";
  content.label_remarks = "Remarks";

  return content;
};

const searchInContent = (
  content: Record<string, any>,
  query: string
): boolean => {
  if (!query.trim()) return true;

  const searchTerm = query.toLowerCase().trim();

  return Object.values(content).some((value) => {
    if (!value) return false;
    return String(value).toLowerCase().includes(searchTerm);
  });
};

// Enhanced highlighting with scroll target support
const highlightText = (
  text: string | null | undefined,
  query: string
): React.ReactNode => {
  if (!text || !query.trim()) return text || "N/A";

  const searchTerm = query.trim();
  const regex = new RegExp(
    `(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
    "gi"
  );
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (regex.test(part)) {
      return (
        <mark
          key={index}
          className="bg-yellow-200 text-yellow-900 px-0.5 rounded font-medium search-highlight"
          data-search-match="true"
        >
          {part}
        </mark>
      );
    }
    return part;
  });
};

const SearchableField: React.FC<{
  label: string;
  value: any;
  searchQuery: string;
  isEditMode: boolean;
  editComponent?: React.ReactNode;
  formatter?: (value: any) => string;
  fieldId?: string;
}> = ({
  label,
  value,
  searchQuery,
  isEditMode,
  editComponent,
  formatter,
  fieldId,
}) => {
  const displayValue = formatter ? formatter(value) : value;
  const fieldRef = useRef<HTMLDivElement>(null);

  // Check if this field or its label matches the search
  const labelMatches =
    searchQuery.trim() &&
    label.toLowerCase().includes(searchQuery.toLowerCase().trim());
  const valueMatches =
    searchQuery.trim() && searchInContent({ value: displayValue }, searchQuery);

  return (
    <div
      ref={fieldRef}
      data-field-id={fieldId}
      className={labelMatches ? "search-match-field" : ""}
    >
      <label
        className={`block text-xs font-medium mb-1 ${
          labelMatches
            ? "bg-yellow-100 text-yellow-900 px-1 rounded"
            : "text-gray-500"
        }`}
      >
        {highlightText(label, searchQuery)}
      </label>
      {isEditMode ? (
        editComponent
      ) : (
        <p
          className={`text-sm text-gray-900 bg-gray-50 p-2 rounded ${
            valueMatches ? "ring-2 ring-yellow-300" : ""
          }`}
        >
          {highlightText(displayValue, searchQuery)}
        </p>
      )}
    </div>
  );
};

const LandRegisterDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEditMode = searchParams.get("edit") === "true";

  const {
    getLandRegisterById,
    updateLandRegister,
    selectedLandRegister,
    setSelectedLandRegister,
    isLoading,
  } = useLandRegisterStore();

  const [isSaving, setIsSaving] = useState(false);
  const [polygonPoints, setPolygonPoints] = useState<Record<string, string>>({
    A: "",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [searchMatches, setSearchMatches] = useState<SearchMatch[]>([]);
  const contentRef = useRef<HTMLDivElement>(null);

  // Create searchable content and check for matches
  const searchableContent = useMemo(() => {
    return selectedLandRegister
      ? createSearchableContent(selectedLandRegister)
      : {};
  }, [selectedLandRegister]);

  const hasSearchResults = useMemo(() => {
    return searchInContent(searchableContent, searchQuery);
  }, [searchableContent, searchQuery]);

  const searchMatchCount = useMemo(() => {
    if (!searchQuery.trim() || !selectedLandRegister) return 0;

    let count = 0;
    Object.values(searchableContent).forEach((value) => {
      if (!value) return;
      const matches = String(value)
        .toLowerCase()
        .match(new RegExp(searchQuery.toLowerCase().trim(), "g"));
      if (matches) count += matches.length;
    });
    return count;
  }, [searchableContent, searchQuery]);

  // Find and collect all search matches in the DOM
  const findSearchMatches = useCallback(() => {
    if (!searchQuery.trim() || !contentRef.current) {
      setSearchMatches([]);
      setCurrentMatchIndex(0);
      return;
    }

    const matches: SearchMatch[] = [];
    const searchTerm = searchQuery.toLowerCase().trim();

    // Find all highlighted elements
    const highlightedElements = contentRef.current.querySelectorAll(
      '[data-search-match="true"]'
    );
    highlightedElements.forEach((element, index) => {
      const htmlElement = element as HTMLElement;
      const section =
        htmlElement.closest("[data-section]")?.getAttribute("data-section") ||
        "Unknown";
      matches.push({
        id: `match-${index}`,
        element: htmlElement,
        text: htmlElement.textContent || "",
        section,
      });
    });

    // Find section headers that match
    const sectionHeaders = contentRef.current.querySelectorAll(
      "[data-section-header]"
    );
    sectionHeaders.forEach((header, index) => {
      const headerText = header.textContent?.toLowerCase() || "";
      if (headerText.includes(searchTerm)) {
        const htmlElement = header as HTMLElement;
        matches.push({
          id: `header-match-${index}`,
          element: htmlElement,
          text: headerText,
          section: "Section Header",
        });
      }
    });

    // Find field labels that match
    const fieldLabels = contentRef.current.querySelectorAll("label");
    fieldLabels.forEach((label, index) => {
      const labelText = label.textContent?.toLowerCase() || "";
      if (labelText.includes(searchTerm)) {
        const htmlElement = label as HTMLElement;
        const section =
          htmlElement.closest("[data-section]")?.getAttribute("data-section") ||
          "Field Label";
        matches.push({
          id: `label-match-${index}`,
          element: htmlElement,
          text: labelText,
          section,
        });
      }
    });

    setSearchMatches(matches);
    setCurrentMatchIndex(0);

    // Scroll to first match
    if (matches.length > 0) {
      scrollToMatch(matches[0]);
    }
  }, [searchQuery]);

  // Scroll to a specific match
  const scrollToMatch = useCallback((match: SearchMatch) => {
    match.element.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });

    // Add temporary highlight to the matched element
    match.element.classList.add("search-active-match");
    setTimeout(() => {
      match.element.classList.remove("search-active-match");
    }, 2000);
  }, []);

  // Navigate between search matches
  const navigateToMatch = useCallback(
    (direction: "next" | "prev") => {
      if (searchMatches.length === 0) return;

      let newIndex;
      if (direction === "next") {
        newIndex =
          currentMatchIndex < searchMatches.length - 1
            ? currentMatchIndex + 1
            : 0;
      } else {
        newIndex =
          currentMatchIndex > 0
            ? currentMatchIndex - 1
            : searchMatches.length - 1;
      }

      setCurrentMatchIndex(newIndex);
      scrollToMatch(searchMatches[newIndex]);
    },
    [currentMatchIndex, searchMatches, scrollToMatch]
  );

  // Update search matches when query changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      findSearchMatches();
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [findSearchMatches]);

  // Keyboard navigation for search matches
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showSearch || searchMatches.length === 0) return;

      if (
        e.key === "ArrowDown" ||
        (e.key === "Enter" && e.shiftKey === false)
      ) {
        e.preventDefault();
        navigateToMatch("next");
      } else if (
        e.key === "ArrowUp" ||
        (e.key === "Enter" && e.shiftKey === true)
      ) {
        e.preventDefault();
        navigateToMatch("prev");
      }
    };

    if (showSearch) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showSearch, searchMatches.length, navigateToMatch]);

  useEffect(() => {
    const loadLandRegister = async () => {
      if (id && id !== "new") {
        try {
          const landRegister = await getLandRegisterById(id);
          if (landRegister) {
            setSelectedLandRegister(landRegister);
            setPolygonPoints(landRegister.polygon || { A: "" });
          }
        } catch (error) {
          console.error("Error loading land register:", error);
          toast.error("Failed to load land register details");
          navigate("/categories/land-register");
        }
      } else {
        toast.error("Invalid land register ID");
        navigate("/categories/land-register");
      }
    };

    loadLandRegister();

    return () => setSelectedLandRegister(null);
  }, [id, getLandRegisterById, setSelectedLandRegister, navigate]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
    field: keyof LandRegister
  ) => {
    if (selectedLandRegister) {
      let value: any = e.target.value;

      // Handle numeric fields
      if (
        field === "size_ha" ||
        field === "acquisition_amount" ||
        field === "fair_value" ||
        field === "disposal_value" ||
        field === "annual_rental_income"
      ) {
        value = value === "" ? undefined : Number.parseFloat(value);
      }

      setSelectedLandRegister({
        ...selectedLandRegister,
        [field]: value,
      });
    }
  };

  const handleSave = async () => {
    if (!selectedLandRegister) return;

    setIsSaving(true);
    try {
      const updateData = {
        ...selectedLandRegister,
        polygon: polygonPoints,
      };
      await updateLandRegister(selectedLandRegister.id, updateData);
      toast.success("Land register updated successfully");
      navigate(`/categories/land-register/${selectedLandRegister.id}`);
    } catch (error) {
      console.error("Error updating land register:", error);
      toast.error("Failed to update land register");
    } finally {
      setIsSaving(false);
    }
  };

  const updatePolygonPoint = (point: string, value: string) => {
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setPolygonPoints((prev) => ({ ...prev, [point]: value }));
    }
  };

  // Clear search when component unmounts or search is closed
  const handleCloseSearch = () => {
    setShowSearch(false);
    setSearchQuery("");
    setSearchMatches([]);
    setCurrentMatchIndex(0);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="w-6 h-6 rounded-full border-b-2 border-emerald-600 animate-spin"></div>
      </div>
    );
  }

  if (!selectedLandRegister) {
    return (
      <div className="p-4 text-center">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Land register not found
        </h2>
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<ArrowLeft size={14} />}
          onClick={() => navigate("/categories/land-register")}
        >
          Back to Land Register
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
            className="flex items-center whitespace-nowrap hover:text-emerald-600 transition-colors"
          >
            <Home size={12} className="mr-1" />
            Home
          </Link>
          <ChevronRight size={12} />
          <Link
            to="/asset-categories"
            className="whitespace-nowrap hover:text-emerald-600 transition-colors"
          >
            Categories
          </Link>
          <ChevronRight size={12} />
          <Link
            to="/categories/land-register"
            className="whitespace-nowrap hover:text-emerald-600 transition-colors"
          >
            Land Register
          </Link>
          <ChevronRight size={12} />
          <span className="flex items-center font-medium text-gray-900 whitespace-nowrap">
            <MapPin size={12} className="mr-1" />
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
              onClick={() => navigate("/categories/land-register")}
            >
              <ArrowLeft size={16} />
            </Button>
            {!showSearch ? (
              <h1 className="text-lg font-bold text-gray-900 truncate">
                {selectedLandRegister.lr_certificate_no || "Land Record"}
              </h1>
            ) : (
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search everything on this page..."
                    className="w-full pl-8 pr-8 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    autoFocus
                  />
                  <Search
                    size={14}
                    className="absolute left-2.5 top-2 text-gray-400"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-1.5 text-gray-400 hover:text-gray-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              className="p-1.5"
              onClick={() => {
                if (showSearch) {
                  handleCloseSearch();
                } else {
                  setShowSearch(true);
                }
              }}
            >
              {showSearch ? <X size={16} /> : <Search size={16} />}
            </Button>
            {isEditMode && (
              <Button
                variant="primary"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-xs px-2 py-1.5"
                leftIcon={<Save size={14} />}
                onClick={handleSave}
                isLoading={isSaving}
              >
                Save
              </Button>
            )}
          </div>
        </div>

        {/* Enhanced Search Results Info */}
        {searchQuery && (
          <div className="mt-2 flex items-center justify-between text-xs bg-gray-50 p-2 rounded">
            <div className="flex items-center space-x-2">
              {searchMatches.length > 0 ? (
                <span className="text-emerald-600 font-medium flex items-center space-x-2">
                  <span>
                    {searchMatches.length}{" "}
                    {searchMatches.length === 1 ? "match" : "matches"} found
                  </span>
                  {searchMatches.length > 1 && (
                    <span className="text-gray-500">
                      ({currentMatchIndex + 1} of {searchMatches.length})
                    </span>
                  )}
                </span>
              ) : (
                <span className="text-red-600 font-medium">
                  No results found for "{searchQuery}"
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {searchMatches.length > 1 && (
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => navigateToMatch("prev")}
                    className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded"
                    title="Previous match (↑)"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => navigateToMatch("next")}
                    className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded"
                    title="Next match (↓)"
                  >
                    ↓
                  </button>
                </div>
              )}
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-gray-500 hover:text-gray-700 underline"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}

        {/* Search Instructions */}
        {showSearch && !searchQuery && (
          <div className="mt-2 text-xs text-gray-500 bg-blue-50 p-2 rounded">
            💡 Search through all content including section headers, field
            labels, and values. Use ↑/↓ arrows to navigate between matches.
          </div>
        )}
      </div>

      {/* Content with search support */}
      <div ref={contentRef} className="px-3 py-4 space-y-4">
        {/* Basic Information Section */}
        <Card>
          <div className="p-4" data-section="basic-information">
            <div className="flex items-center mb-3">
              <Info size={16} className="text-blue-600 mr-2" />
              <h2
                className="text-sm font-semibold text-gray-800 uppercase tracking-wide"
                data-section-header="true"
              >
                {highlightText("Basic Information", searchQuery)}
              </h2>
            </div>

            <div className="space-y-3">
              {/* Description of Land */}
              <div>
                <label
                  className={`block text-xs font-medium mb-1 ${
                    searchQuery &&
                    "Description of Land"
                      .toLowerCase()
                      .includes(searchQuery.toLowerCase())
                      ? "bg-yellow-100 text-yellow-900 px-1 rounded"
                      : "text-gray-500"
                  }`}
                >
                  {highlightText("Description of Land", searchQuery)}
                </label>
                {isEditMode ? (
                  <textarea
                    value={selectedLandRegister.description_of_land || ""}
                    onChange={(e) => handleChange(e, "description_of_land")}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 focus:border-transparent min-h-[60px]"
                  />
                ) : (
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    {highlightText(
                      selectedLandRegister.description_of_land || "N/A",
                      searchQuery
                    )}
                  </p>
                )}
              </div>

              {/* Basic Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    className={`block text-xs font-medium mb-1 ${
                      searchQuery &&
                      "LR Certificate No."
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase())
                        ? "bg-yellow-100 text-yellow-900 px-1 rounded"
                        : "text-gray-500"
                    }`}
                  >
                    {highlightText("LR Certificate No.", searchQuery)}
                  </label>
                  {isEditMode ? (
                    <input
                      value={selectedLandRegister.lr_certificate_no || ""}
                      onChange={(e) => handleChange(e, "lr_certificate_no")}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                      {highlightText(
                        selectedLandRegister.lr_certificate_no || "N/A",
                        searchQuery
                      )}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    className={`block text-xs font-medium mb-1 ${
                      searchQuery &&
                      "Category"
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase())
                        ? "bg-yellow-100 text-yellow-900 px-1 rounded"
                        : "text-gray-500"
                    }`}
                  >
                    {highlightText("Category", searchQuery)}
                  </label>
                  {isEditMode ? (
                    <select
                      value={selectedLandRegister.category || ""}
                      onChange={(e) => handleChange(e, "category")}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="">Select category</option>
                      <option value="Land">Land</option>
                      <option value="Investment Property">
                        Investment Property
                      </option>
                    </select>
                  ) : (
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                      {highlightText(
                        selectedLandRegister.category || "N/A",
                        searchQuery
                      )}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    className={`block text-xs font-medium mb-1 ${
                      searchQuery &&
                      "Mode of Acquisition"
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase())
                        ? "bg-yellow-100 text-yellow-900 px-1 rounded"
                        : "text-gray-500"
                    }`}
                  >
                    {highlightText("Mode of Acquisition", searchQuery)}
                  </label>
                  {isEditMode ? (
                    <select
                      value={selectedLandRegister.mode_of_acquisition || ""}
                      onChange={(e) => handleChange(e, "mode_of_acquisition")}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="">Select mode</option>
                      <option value="Purchase">Purchase</option>
                      <option value="Transfer">Transfer</option>
                      <option value="Donation">Donation</option>
                      <option value="Inheritance">Inheritance</option>
                      <option value="Government Allocation">
                        Government Allocation
                      </option>
                    </select>
                  ) : (
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                      {highlightText(
                        selectedLandRegister.mode_of_acquisition || "N/A",
                        searchQuery
                      )}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    className={`block text-xs font-medium mb-1 ${
                      searchQuery &&
                      "Size (ha)"
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase())
                        ? "bg-yellow-100 text-yellow-900 px-1 rounded"
                        : "text-gray-500"
                    }`}
                  >
                    {highlightText("Size (ha)", searchQuery)}
                  </label>
                  {isEditMode ? (
                    <input
                      type="number"
                      step="0.0001"
                      value={selectedLandRegister.size_ha || ""}
                      onChange={(e) => handleChange(e, "size_ha")}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                      {highlightText(
                        selectedLandRegister.size_ha
                          ? `${selectedLandRegister.size_ha} ha`
                          : "N/A",
                        searchQuery
                      )}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Location Details Section */}
        <Card>
          <div className="p-4" data-section="location-details">
            <div className="flex items-center mb-3">
              <MapPin size={16} className="text-red-600 mr-2" />
              <h2
                className="text-sm font-semibold text-gray-800 uppercase tracking-wide"
                data-section-header="true"
              >
                {highlightText("Location Details", searchQuery)}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { label: "County", field: "county" },
                { label: "Sub County", field: "sub_county" },
                { label: "Location", field: "location" },
                { label: "Nearest Town", field: "nearest_town_location" },
                { label: "Division", field: "division" },
                { label: "Sub Location", field: "sub_location" },
              ].map(({ label, field }) => (
                <div key={field}>
                  <label
                    className={`block text-xs font-medium mb-1 ${
                      searchQuery &&
                      label.toLowerCase().includes(searchQuery.toLowerCase())
                        ? "bg-yellow-100 text-yellow-900 px-1 rounded"
                        : "text-gray-500"
                    }`}
                  >
                    {highlightText(label, searchQuery)}
                  </label>
                  {isEditMode ? (
                    <input
                      value={(selectedLandRegister as any)[field] || ""}
                      onChange={(e) => handleChange(e, field as any)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                      {highlightText(
                        (selectedLandRegister as any)[field] || "N/A",
                        searchQuery
                      )}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Legal Documentation Section */}
        <Card>
          <div className="p-4" data-section="legal-documentation">
            <div className="flex items-center mb-3">
              <FileText size={16} className="text-purple-600 mr-2" />
              <h2
                className="text-sm font-semibold text-gray-800 uppercase tracking-wide"
                data-section-header="true"
              >
                {highlightText("Legal Documentation", searchQuery)}
              </h2>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    className={`block text-xs font-medium mb-1 ${
                      searchQuery &&
                      "Document of Ownership"
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase())
                        ? "bg-yellow-100 text-yellow-900 px-1 rounded"
                        : "text-gray-500"
                    }`}
                  >
                    {highlightText("Document of Ownership", searchQuery)}
                  </label>
                  {isEditMode ? (
                    <select
                      value={selectedLandRegister.document_of_ownership || ""}
                      onChange={(e) => handleChange(e, "document_of_ownership")}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="">Select document type</option>
                      <option value="Title Deed">Title Deed</option>
                      <option value="Certificate">Certificate</option>
                      <option value="Allotment Letter">Allotment Letter</option>
                      <option value="Other">Other</option>
                    </select>
                  ) : (
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                      {highlightText(
                        selectedLandRegister.document_of_ownership || "N/A",
                        searchQuery
                      )}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    className={`block text-xs font-medium mb-1 ${
                      searchQuery &&
                      "Land Tenure"
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase())
                        ? "bg-yellow-100 text-yellow-900 px-1 rounded"
                        : "text-gray-500"
                    }`}
                  >
                    {highlightText("Land Tenure", searchQuery)}
                  </label>
                  {isEditMode ? (
                    <select
                      value={selectedLandRegister.land_tenure || ""}
                      onChange={(e) => handleChange(e, "land_tenure")}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="">Select tenure</option>
                      <option value="Freehold">Freehold</option>
                      <option value="Leasehold">Leasehold</option>
                    </select>
                  ) : (
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                      {highlightText(
                        selectedLandRegister.land_tenure || "N/A",
                        searchQuery
                      )}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label
                  className={`block text-xs font-medium mb-1 ${
                    searchQuery &&
                    "Ownership Details"
                      .toLowerCase()
                      .includes(searchQuery.toLowerCase())
                      ? "bg-yellow-100 text-yellow-900 px-1 rounded"
                      : "text-gray-500"
                  }`}
                >
                  {highlightText("Ownership Details", searchQuery)}
                </label>
                {isEditMode ? (
                  <textarea
                    value={selectedLandRegister.proprietorship_details || ""}
                    onChange={(e) => handleChange(e, "proprietorship_details")}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 focus:border-transparent min-h-[60px]"
                  />
                ) : (
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    {highlightText(
                      selectedLandRegister.proprietorship_details || "N/A",
                      searchQuery
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Financial Information Section */}
        <Card>
          <div className="p-4" data-section="financial-information">
            <div className="flex items-center mb-3">
              <KshIcon size={16} className="text-green-600 mr-2" />
              <h2
                className="text-sm font-semibold text-gray-800 uppercase tracking-wide"
                data-section-header="true"
              >
                {highlightText("Financial Information", searchQuery)}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: "Acquisition Amount", field: "acquisition_amount" },
                { label: "Fair Value", field: "fair_value" },
                {
                  label: "Annual Rental Income",
                  field: "annual_rental_income",
                },
                { label: "Disposal Value", field: "disposal_value" },
              ].map(({ label, field }) => (
                <div key={field}>
                  <label
                    className={`block text-xs font-medium mb-1 ${
                      searchQuery &&
                      label.toLowerCase().includes(searchQuery.toLowerCase())
                        ? "bg-yellow-100 text-yellow-900 px-1 rounded"
                        : "text-gray-500"
                    }`}
                  >
                    {highlightText(label, searchQuery)}
                  </label>
                  {isEditMode ? (
                    <input
                      type="number"
                      step="0.01"
                      value={(selectedLandRegister as any)[field] || ""}
                      onChange={(e) => handleChange(e, field as any)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                      {highlightText(
                        (selectedLandRegister as any)[field]
                          ? `Ksh. ${(selectedLandRegister as any)[
                              field
                            ].toLocaleString()}`
                          : "N/A",
                        searchQuery
                      )}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Geographic Information Section */}
        <Card>
          <div className="p-4" data-section="geographic-information">
            <div className="flex items-center mb-3">
              <Map size={16} className="text-indigo-600 mr-2" />
              <h2
                className="text-sm font-semibold text-gray-800 uppercase tracking-wide"
                data-section-header="true"
              >
                {highlightText("Geographic Information", searchQuery)}
              </h2>
            </div>

            <div className="space-y-3">
              <div>
                <label
                  className={`block text-xs font-medium mb-1 ${
                    searchQuery &&
                    "GPS Coordinates"
                      .toLowerCase()
                      .includes(searchQuery.toLowerCase())
                      ? "bg-yellow-100 text-yellow-900 px-1 rounded"
                      : "text-gray-500"
                  }`}
                >
                  {highlightText("GPS Coordinates", searchQuery)}
                </label>
                {isEditMode ? (
                  <input
                    value={selectedLandRegister.gps_coordinates || ""}
                    onChange={(e) => handleChange(e, "gps_coordinates")}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    {highlightText(
                      selectedLandRegister.gps_coordinates || "N/A",
                      searchQuery
                    )}
                  </p>
                )}
              </div>

              <div data-field-id="survey_points">
                <label
                  className={`block text-xs font-medium mb-1 ${
                    searchQuery &&
                    "Survey Points"
                      .toLowerCase()
                      .includes(searchQuery.toLowerCase())
                      ? "bg-yellow-100 text-yellow-900 px-1 rounded"
                      : "text-gray-500"
                  }`}
                >
                  {highlightText("Survey Points", searchQuery)}
                </label>
                {isEditMode ? (
                  <div className="space-y-2">
                    {Object.entries(polygonPoints).map(([point, value]) => (
                      <div key={point} className="flex gap-2 items-center">
                        <span className="w-8 text-xs font-medium text-gray-700">
                          {highlightText(point, searchQuery)}:
                        </span>
                        <input
                          value={value}
                          onChange={(e) =>
                            updatePolygonPoint(point, e.target.value)
                          }
                          placeholder="0.22455,0.12547"
                          className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    {Object.entries(selectedLandRegister.polygon || {}).length >
                    0 ? (
                      <div className="space-y-1">
                        {Object.entries(selectedLandRegister.polygon || {}).map(
                          ([point, value]) => (
                            <div key={point} className="text-xs">
                              <span className="font-medium">
                                {highlightText(point, searchQuery)}:
                              </span>{" "}
                              {highlightText(value || "N/A", searchQuery)}
                            </div>
                          )
                        )}
                      </div>
                    ) : (
                      "N/A"
                    )}
                  </div>
                )}
              </div>

              <div>
                <label
                  className={`block text-xs font-medium mb-1 ${
                    searchQuery &&
                    "Survey Status"
                      .toLowerCase()
                      .includes(searchQuery.toLowerCase())
                      ? "bg-yellow-100 text-yellow-900 px-1 rounded"
                      : "text-gray-500"
                  }`}
                >
                  {highlightText("Survey Status", searchQuery)}
                </label>
                {isEditMode ? (
                  <select
                    value={selectedLandRegister.surveyed || ""}
                    onChange={(e) => handleChange(e, "surveyed")}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    <option value="">Select status</option>
                    <option value="Surveyed">Surveyed</option>
                    <option value="Not Surveyed">Not Surveyed</option>
                  </select>
                ) : (
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    {highlightText(
                      selectedLandRegister.surveyed || "N/A",
                      searchQuery
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Important Dates Section */}
        <Card>
          <div className="p-4" data-section="important-dates">
            <div className="flex items-center mb-3">
              <Calendar size={16} className="text-orange-600 mr-2" />
              <h2
                className="text-sm font-semibold text-gray-800 uppercase tracking-wide"
                data-section-header="true"
              >
                {highlightText("Important Dates", searchQuery)}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { label: "Acquisition Date", field: "acquisition_date" },
                { label: "Registration Date", field: "registration_date" },
                { label: "Disposal Date", field: "disposal_date" },
              ].map(({ label, field }) => (
                <div key={field}>
                  <label
                    className={`block text-xs font-medium mb-1 ${
                      searchQuery &&
                      label.toLowerCase().includes(searchQuery.toLowerCase())
                        ? "bg-yellow-100 text-yellow-900 px-1 rounded"
                        : "text-gray-500"
                    }`}
                  >
                    {highlightText(label, searchQuery)}
                  </label>
                  {isEditMode ? (
                    <input
                      type="date"
                      value={
                        (selectedLandRegister as any)[field]
                          ? new Date((selectedLandRegister as any)[field])
                              .toISOString()
                              .split("T")[0]
                          : ""
                      }
                      onChange={(e) => handleChange(e, field as any)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                      {highlightText(
                        (selectedLandRegister as any)[field]
                          ? new Date(
                              (selectedLandRegister as any)[field]
                            ).toLocaleDateString()
                          : "N/A",
                        searchQuery
                      )}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Status & Conditions Section */}
        <Card>
          <div className="p-4" data-section="status-conditions">
            <div className="flex items-center mb-3">
              <Shield size={16} className="text-yellow-600 mr-2" />
              <h2
                className="text-sm font-semibold text-gray-800 uppercase tracking-wide"
                data-section-header="true"
              >
                {highlightText("Status & Conditions", searchQuery)}
              </h2>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    className={`block text-xs font-medium mb-1 ${
                      searchQuery &&
                      "Disputed Status"
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase())
                        ? "bg-yellow-100 text-yellow-900 px-1 rounded"
                        : "text-gray-500"
                    }`}
                  >
                    {highlightText("Disputed Status", searchQuery)}
                  </label>
                  {isEditMode ? (
                    <select
                      value={selectedLandRegister.disputed || ""}
                      onChange={(e) => handleChange(e, "disputed")}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="">Select status</option>
                      <option value="Undisputed">Undisputed</option>
                      <option value="Disputed">Disputed</option>
                    </select>
                  ) : (
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                      {highlightText(
                        selectedLandRegister.disputed || "N/A",
                        searchQuery
                      )}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    className={`block text-xs font-medium mb-1 ${
                      searchQuery &&
                      "Planning Status"
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase())
                        ? "bg-yellow-100 text-yellow-900 px-1 rounded"
                        : "text-gray-500"
                    }`}
                  >
                    {highlightText("Planning Status", searchQuery)}
                  </label>
                  {isEditMode ? (
                    <select
                      value={selectedLandRegister.planned_unplanned || ""}
                      onChange={(e) => handleChange(e, "planned_unplanned")}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="">Select status</option>
                      <option value="Planned">Planned</option>
                      <option value="Unplanned">Unplanned</option>
                    </select>
                  ) : (
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                      {highlightText(
                        selectedLandRegister.planned_unplanned || "N/A",
                        searchQuery
                      )}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label
                  className={`block text-xs font-medium mb-1 ${
                    searchQuery &&
                    "Purpose of Land"
                      .toLowerCase()
                      .includes(searchQuery.toLowerCase())
                      ? "bg-yellow-100 text-yellow-900 px-1 rounded"
                      : "text-gray-500"
                  }`}
                >
                  {highlightText("Purpose of Land", searchQuery)}
                </label>
                {isEditMode ? (
                  <textarea
                    value={selectedLandRegister.purpose_use_of_land || ""}
                    onChange={(e) => handleChange(e, "purpose_use_of_land")}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 focus:border-transparent min-h-[60px]"
                  />
                ) : (
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    {highlightText(
                      selectedLandRegister.purpose_use_of_land || "N/A",
                      searchQuery
                    )}
                  </p>
                )}
              </div>

              <div>
                <label
                  className={`block text-xs font-medium mb-1 ${
                    searchQuery &&
                    "Encumbrances"
                      .toLowerCase()
                      .includes(searchQuery.toLowerCase())
                      ? "bg-yellow-100 text-yellow-900 px-1 rounded"
                      : "text-gray-500"
                  }`}
                >
                  {highlightText("Encumbrances", searchQuery)}
                </label>
                {isEditMode ? (
                  <textarea
                    value={selectedLandRegister.encumbrances || ""}
                    onChange={(e) => handleChange(e, "encumbrances")}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 focus:border-transparent min-h-[60px]"
                  />
                ) : (
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    {highlightText(
                      selectedLandRegister.encumbrances || "N/A",
                      searchQuery
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Additional Information Section */}
        <Card>
          <div className="p-4" data-section="additional-information">
            <div className="flex items-center mb-3">
              <Settings size={16} className="text-gray-600 mr-2" />
              <h2
                className="text-sm font-semibold text-gray-800 uppercase tracking-wide"
                data-section-header="true"
              >
                {highlightText("Additional Information", searchQuery)}
              </h2>
            </div>

            <div>
              <label
                className={`block text-xs font-medium mb-1 ${
                  searchQuery &&
                  "Remarks".toLowerCase().includes(searchQuery.toLowerCase())
                    ? "bg-yellow-100 text-yellow-900 px-1 rounded"
                    : "text-gray-500"
                }`}
              >
                {highlightText("Remarks", searchQuery)}
              </label>
              {isEditMode ? (
                <textarea
                  value={selectedLandRegister.remarks || ""}
                  onChange={(e) => handleChange(e, "remarks")}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 focus:border-transparent min-h-[80px]"
                />
              ) : (
                <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                  {highlightText(
                    selectedLandRegister.remarks || "N/A",
                    searchQuery
                  )}
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* Land Parcel Map Section */}
        {(selectedLandRegister.gps_coordinates ||
          (selectedLandRegister.polygon &&
            Object.keys(selectedLandRegister.polygon).length > 0)) && (
          <Card>
            <div className="p-4" data-section="land-parcel-map">
              <div className="flex items-center mb-3">
                <Map size={16} className="text-emerald-600 mr-2" />
                <h2
                  className="text-sm font-semibold text-gray-800 uppercase tracking-wide"
                  data-section-header="true"
                >
                  {highlightText("Land Parcel Map", searchQuery)}
                </h2>
              </div>

              <div className="mb-3 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                {selectedLandRegister.gps_coordinates &&
                  highlightText(
                    `GPS: ${selectedLandRegister.gps_coordinates}`,
                    searchQuery
                  )}
                {selectedLandRegister.gps_coordinates &&
                  selectedLandRegister.polygon &&
                  Object.keys(selectedLandRegister.polygon).length > 0 &&
                  " | "}
                {selectedLandRegister.polygon &&
                  Object.keys(selectedLandRegister.polygon).length > 0 &&
                  `Survey Points: ${
                    Object.keys(selectedLandRegister.polygon).length
                  }`}
              </div>

              <div className="overflow-hidden h-64 sm:h-80 rounded-lg border border-gray-200">
                <LandParcelMap
                  gpsCoordinates={selectedLandRegister.gps_coordinates || "0,0"}
                  surveyPoints={selectedLandRegister.polygon || {}}
                  landDescription={selectedLandRegister.description_of_land}
                />
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default LandRegisterDetail;

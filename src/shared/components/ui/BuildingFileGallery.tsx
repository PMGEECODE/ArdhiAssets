"use client";

import type React from "react";
import { useState, useCallback } from "react";
import { FileText, ImageIcon, X, AlertCircle, File } from "lucide-react";
import PDFViewer from "./PDFViewer";

type FileType = "image" | "pdf" | "document" | "unknown";

interface BuildingFile {
  url: string;
  name: string;
  type: FileType;
}

interface BuildingFileGalleryProps {
  files: BuildingFile[];
  isOpen: boolean;
  onClose: () => void;
}

const getFileType = (fileName: string, mimeType?: string): FileType => {
  const extension = fileName.split(".").pop()?.toLowerCase() || "";
  const mimeTypeLower = mimeType?.toLowerCase() || "";

  if (
    mimeTypeLower.startsWith("image/") ||
    ["jpg", "jpeg", "png", "gif", "webp", "bmp"].includes(extension)
  ) {
    return "image";
  }
  if (extension === "pdf" || mimeTypeLower === "application/pdf") {
    return "pdf";
  }
  if (
    ["doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv"].includes(
      extension
    ) ||
    mimeTypeLower.includes("document") ||
    mimeTypeLower.includes("spreadsheet") ||
    mimeTypeLower.includes("presentation")
  ) {
    return "document";
  }
  return "unknown";
};

const getFileIcon = (fileType: FileType) => {
  switch (fileType) {
    case "image":
      return <ImageIcon size={20} className="text-blue-400" />;
    case "pdf":
      return <FileText size={20} className="text-red-400" />;
    case "document":
      return <File size={20} className="text-orange-400" />;
    default:
      return <File size={20} className="text-gray-400" />;
  }
};

const getFileTypeLabel = (fileType: FileType): string => {
  switch (fileType) {
    case "image":
      return "Image";
    case "pdf":
      return "PDF Document";
    case "document":
      return "Document";
    default:
      return "File";
  }
};

const FileErrorState: React.FC<{ fileName: string; fileType: FileType }> = ({
  fileName,
  fileType,
}) => (
  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 p-4">
    <AlertCircle size={32} className="text-gray-500 mb-2" />
    <p className="text-sm font-medium text-gray-900 text-center truncate">
      {fileName}
    </p>
    <p className="text-xs text-gray-600 mt-1">
      {fileType === "unknown"
        ? "Unsupported file type"
        : "Cannot preview this file"}
    </p>
  </div>
);

const ImagePreview: React.FC<{ file: BuildingFile; onClick: () => void }> = ({
  file,
  onClick,
}) => {
  const [imageError, setImageError] = useState(false);

  if (imageError) {
    return (
      <button
        onClick={onClick}
        className="relative aspect-square rounded-lg overflow-hidden border-2 border-white/20 hover:border-white transition-all group bg-gray-900"
      >
        <FileErrorState fileName={file.name} fileType="image" />
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="relative aspect-square rounded-lg overflow-hidden border-2 border-white/20 hover:border-white transition-all group"
    >
      <img
        src={file.url || "/placeholder.svg"}
        alt={file.name}
        className="w-full h-full object-cover group-hover:scale-110 transition-transform"
        onError={() => setImageError(true)}
      />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
        <span className="text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
          View
        </span>
      </div>
    </button>
  );
};

const DocumentPreview: React.FC<{
  file: BuildingFile;
  onClick: () => void;
}> = ({ file, onClick }) => {
  const fileType = getFileType(file.name);
  const isViewable = fileType === "pdf";

  return (
    <button
      onClick={onClick}
      disabled={!isViewable}
      className={`flex items-center space-x-3 p-3 rounded-lg border transition-all group ${
        isViewable
          ? "bg-white/10 hover:bg-white/20 border-white/20 hover:border-white cursor-pointer"
          : "bg-white/5 border-white/10 cursor-not-allowed opacity-60"
      }`}
    >
      <div
        className={`flex-shrink-0 w-10 h-10 rounded flex items-center justify-center ${
          fileType === "pdf"
            ? "bg-red-500/20"
            : fileType === "document"
            ? "bg-orange-500/20"
            : "bg-gray-500/20"
        }`}
      >
        {getFileIcon(fileType)}
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className="text-white text-sm font-medium truncate group-hover:text-white/80">
          {file.name}
        </p>
        <p className="text-white/60 text-xs">{getFileTypeLabel(fileType)}</p>
      </div>
      {isViewable && (
        <span className="text-white/60 text-xs flex-shrink-0">View</span>
      )}
      {!isViewable && (
        <span className="text-white/40 text-xs flex-shrink-0">
          Preview unavailable
        </span>
      )}
    </button>
  );
};

const ImageViewerModal: React.FC<{
  imageUrl: string;
  imageName: string;
  onClose: () => void;
}> = ({ imageUrl, imageName, onClose }) => {
  const [imageError, setImageError] = useState(false);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-95"
      onClick={onClose}
    >
      <div
        className="relative w-full h-full max-w-[95vw] max-h-[95vh] p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 text-white bg-black bg-opacity-60 rounded-full hover:bg-opacity-80"
        >
          <X size={20} />
        </button>

        {imageError ? (
          <div className="w-full h-full flex items-center justify-center">
            <FileErrorState fileName={imageName} fileType="image" />
          </div>
        ) : (
          <img
            src={imageUrl || "/placeholder.svg"}
            alt={imageName}
            className="w-full h-full object-contain"
            onError={() => setImageError(true)}
          />
        )}
      </div>
    </div>
  );
};

const BuildingFileGallery: React.FC<BuildingFileGalleryProps> = ({
  files,
  isOpen,
  onClose,
}) => {
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState<string | null>(null);

  const organizeFiles = useCallback(() => {
    const organized = {
      images: [] as BuildingFile[],
      pdfs: [] as BuildingFile[],
      documents: [] as BuildingFile[],
      unsupported: [] as BuildingFile[],
    };

    files.forEach((file) => {
      const fileType = getFileType(file.name);
      switch (fileType) {
        case "image":
          organized.images.push(file);
          break;
        case "pdf":
          organized.pdfs.push(file);
          break;
        case "document":
          organized.documents.push(file);
          break;
        default:
          organized.unsupported.push(file);
      }
    });

    return organized;
  }, [files]);

  if (!isOpen || files.length === 0) return null;

  const organized = organizeFiles();
  const hasAnyFiles = Object.values(organized).some((arr) => arr.length > 0);

  if (!hasAnyFiles) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-95"
        onClick={onClose}
      >
        <div
          className="relative w-full h-full max-w-[95vw] max-h-[95vh] sm:max-w-5xl md:max-w-6xl lg:max-w-7xl xl:max-w-[90vw] p-2 sm:p-4 md:p-6 flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10 p-1.5 sm:p-2 text-white bg-black bg-opacity-60 rounded-full hover:bg-opacity-80 transition-all backdrop-blur-sm"
          >
            <X size={20} className="sm:w-6 sm:h-6" />
          </button>
          <div className="text-center">
            <AlertCircle size={48} className="text-gray-500 mx-auto mb-4" />
            <p className="text-white text-lg">No files available to display</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-95"
        onClick={onClose}
      >
        <div
          className="relative w-full h-full max-w-[95vw] max-h-[95vh] sm:max-w-5xl md:max-w-6xl lg:max-w-7xl xl:max-w-[90vw] p-2 sm:p-4 md:p-6"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10 p-1.5 sm:p-2 text-white bg-black bg-opacity-60 rounded-full hover:bg-opacity-80 transition-all backdrop-blur-sm"
          >
            <X size={20} className="sm:w-6 sm:h-6" />
          </button>

          {/* Content */}
          <div className="h-full overflow-y-auto">
            <div className="space-y-6 pb-6">
              {/* Images Section */}
              {organized.images.length > 0 && (
                <div>
                  <h3 className="text-white text-lg font-semibold mb-4 flex items-center">
                    <ImageIcon size={20} className="mr-2" />
                    Images ({organized.images.length})
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {organized.images.map((file, index) => (
                      <ImagePreview
                        key={`image-${index}`}
                        file={file}
                        onClick={() => setSelectedImageUrl(file.url)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* PDFs Section */}
              {organized.pdfs.length > 0 && (
                <div>
                  <h3 className="text-white text-lg font-semibold mb-4 flex items-center">
                    <FileText size={20} className="mr-2" />
                    PDF Documents ({organized.pdfs.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {organized.pdfs.map((file, index) => (
                      <DocumentPreview
                        key={`pdf-${index}`}
                        file={file}
                        onClick={() => setSelectedPdfUrl(file.url)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Other Documents Section */}
              {organized.documents.length > 0 && (
                <div>
                  <h3 className="text-white text-lg font-semibold mb-4 flex items-center">
                    <File size={20} className="mr-2" />
                    Other Documents ({organized.documents.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {organized.documents.map((file, index) => (
                      <DocumentPreview
                        key={`doc-${index}`}
                        file={file}
                        onClick={() => {
                          // Open in new tab for non-PDF documents
                          window.open(file.url, "_blank");
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Unsupported Files Section */}
              {organized.unsupported.length > 0 && (
                <div>
                  <h3 className="text-white text-lg font-semibold mb-4 flex items-center">
                    <AlertCircle size={20} className="mr-2 text-yellow-400" />
                    Unsupported Files ({organized.unsupported.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {organized.unsupported.map((file, index) => (
                      <div
                        key={`unsupported-${index}`}
                        className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg border border-yellow-500/30"
                      >
                        <div className="flex-shrink-0 w-10 h-10 bg-yellow-500/20 rounded flex items-center justify-center">
                          <AlertCircle size={20} className="text-yellow-400" />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-white text-sm font-medium truncate">
                            {file.name}
                          </p>
                          <p className="text-white/60 text-xs">
                            Preview not available
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Image Viewer Modal */}
      {selectedImageUrl && (
        <ImageViewerModal
          imageUrl={selectedImageUrl}
          imageName={
            files.find((f) => f.url === selectedImageUrl)?.name || "Image"
          }
          onClose={() => setSelectedImageUrl(null)}
        />
      )}

      {/* PDF Viewer Modal */}
      <PDFViewer
        pdfUrl={selectedPdfUrl || ""}
        isOpen={!!selectedPdfUrl}
        onClose={() => setSelectedPdfUrl(null)}
        fileName={
          files.find((f) => f.url === selectedPdfUrl)?.name || "Document"
        }
      />
    </>
  );
};

export default BuildingFileGallery;

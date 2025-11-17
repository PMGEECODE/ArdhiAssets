"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import { X, ZoomIn, ZoomOut, AlertCircle } from "lucide-react";

interface PDFViewerProps {
  pdfUrl: string;
  isOpen: boolean;
  onClose: () => void;
  fileName?: string;
}

const PDFViewer: React.FC<PDFViewerProps> = ({
  pdfUrl,
  isOpen,
  onClose,
  fileName = "Document",
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [scale, setScale] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentPage(1);
      setScale(1);
      setLoading(true);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.2, 3));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.2, 0.5));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  };

  const handlePdfError = () => {
    setLoading(false);
    setError("Failed to load PDF. The file may be corrupted or inaccessible.");
  };

  const handleIframeLoad = () => {
    setLoading(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-95"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div
        className="relative w-full h-full max-w-[95vw] max-h-[95vh] sm:max-w-5xl md:max-w-6xl lg:max-w-7xl xl:max-w-[90vw] p-2 sm:p-4 md:p-6 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4 bg-black bg-opacity-60 p-3 rounded-lg backdrop-blur-sm">
          <div className="flex-1 min-w-0">
            <h3 className="text-white text-sm sm:text-base font-semibold truncate">
              {fileName}
            </h3>
            <p className="text-white/60 text-xs">PDF Document</p>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center space-x-2 ml-4">
            <button
              onClick={handleZoomOut}
              className="p-1.5 text-white bg-black bg-opacity-60 rounded hover:bg-opacity-80 transition-all"
              title="Zoom out"
            >
              <ZoomOut size={18} />
            </button>
            <span className="text-white text-xs w-8 text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-1.5 text-white bg-black bg-opacity-60 rounded hover:bg-opacity-80 transition-all"
              title="Zoom in"
            >
              <ZoomIn size={18} />
            </button>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="ml-4 p-1.5 text-white bg-black bg-opacity-60 rounded-full hover:bg-opacity-80 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* PDF Container or Error State */}
        <div className="flex-1 overflow-auto bg-black rounded-lg flex items-center justify-center relative">
          {error ? (
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="p-4 bg-red-500/20 rounded-lg border border-red-500/50">
                <AlertCircle size={48} className="text-red-400 mx-auto mb-2" />
                <p className="text-red-200 text-center text-sm font-medium">
                  {error}
                </p>
              </div>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors text-sm"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              <iframe
                ref={iframeRef}
                src={`${pdfUrl}#toolbar=1&navpanes=0&scrollbar=1`}
                className="w-full h-full rounded-lg"
                style={{
                  transform: `scale(${scale})`,
                  transformOrigin: "top center",
                  transition: "transform 0.2s ease-out",
                }}
                title={fileName}
                onLoad={handleIframeLoad}
                onError={handlePdfError}
                sandbox="allow-same-origin allow-scripts"
              />
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                </div>
              )}
            </>
          )}
        </div>

        {/* Info text */}
        {!error && (
          <p className="text-white/60 text-xs text-center mt-3">
            Press ESC to close • Use zoom controls to adjust view
          </p>
        )}
      </div>
    </div>
  );
};

export default PDFViewer;

"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface ImageGalleryProps {
  images: string[];
  isOpen: boolean;
  onClose: () => void;
  initialIndex?: number;
}

const ImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  isOpen,
  onClose,
  initialIndex = 0,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Minimum distance required to trigger swipe
  const minSwipeDistance = 50;

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  if (!isOpen || images.length === 0) return null;

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    if (e.key === "ArrowLeft") goToPrevious();
    if (e.key === "ArrowRight") goToNext();
  };

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && images.length > 1) {
      goToNext();
    }
    if (isRightSwipe && images.length > 1) {
      goToPrevious();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-95"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div
        className="relative w-full h-full max-w-[95vw] max-h-[95vh] sm:max-w-5xl md:max-w-6xl lg:max-w-7xl xl:max-w-[90vw] p-2 sm:p-4 md:p-6"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10 p-1.5 sm:p-2 text-white bg-black bg-opacity-60 rounded-full hover:bg-opacity-80 transition-all backdrop-blur-sm"
        >
          <X size={20} className="sm:w-6 sm:h-6" />
        </button>

        {/* Navigation buttons - Hidden on small screens, shown on hover for larger screens */}
        {images.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-2 sm:left-4 top-1/2 transform -translate-y-1/2 z-10 p-1.5 sm:p-2 text-white bg-black bg-opacity-60 rounded-full hover:bg-opacity-80 transition-all backdrop-blur-sm opacity-0 sm:opacity-100 sm:hover:opacity-100"
            >
              <ChevronLeft size={20} className="sm:w-6 sm:h-6" />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-2 sm:right-4 top-1/2 transform -translate-y-1/2 z-10 p-1.5 sm:p-2 text-white bg-black bg-opacity-60 rounded-full hover:bg-opacity-80 transition-all backdrop-blur-sm opacity-0 sm:opacity-100 sm:hover:opacity-100"
            >
              <ChevronRight size={20} className="sm:w-6 sm:h-6" />
            </button>
          </>
        )}

        {/* Main image container */}
        <div className="flex items-center justify-center h-full pb-16 sm:pb-20">
          <img
            src={images[currentIndex] || "/placeholder.svg"}
            alt={`Vehicle image ${currentIndex + 1}`}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            style={{ maxHeight: "calc(100vh - 120px)" }}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = "/placeholder.svg";
            }}
          />
        </div>

        {/* Image counter */}
        {images.length > 1 && (
          <div className="absolute bottom-14 sm:bottom-16 left-1/2 transform -translate-x-1/2 px-3 py-1 text-white bg-black bg-opacity-60 rounded-full text-xs sm:text-sm backdrop-blur-sm">
            {currentIndex + 1} / {images.length}
          </div>
        )}

        {/* Thumbnail navigation */}
        {images.length > 1 && (
          <div className="absolute bottom-2 sm:bottom-4 left-1/2 transform -translate-x-1/2 w-full max-w-full px-2 sm:px-4">
            <div className="flex justify-center space-x-1 sm:space-x-2 overflow-x-auto scrollbar-hide">
              <div className="flex space-x-1 sm:space-x-2 px-2">
                {images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={`flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden border-2 transition-all ${
                      index === currentIndex
                        ? "border-white shadow-lg"
                        : "border-transparent opacity-70 hover:opacity-100 hover:border-white/50"
                    }`}
                  >
                    <img
                      src={image || "/placeholder.svg"}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "/placeholder.svg";
                      }}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Mobile swipe indicator */}
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 text-white/60 text-xs sm:hidden">
          Swipe to navigate
        </div>
      </div>

      <style>
        {`
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
        `}
      </style>
    </div>
  );
};

export default ImageGallery;

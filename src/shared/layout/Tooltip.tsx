"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";

interface TooltipProps {
  content: string;
  children: React.ReactElement;
  disabled?: boolean;
  delay?: number;
}

const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  disabled = false,
  delay = 50, // reduced default delay from 300ms to 50ms for instant display
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleMouseEnter = () => {
    if (disabled) return;

    timeoutRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setPosition({
          top: rect.top + rect.height / 2,
          left: rect.right + 8,
        });
        setIsVisible(true);
      }
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="inline-block"
      >
        {children}
      </div>
      {isVisible && !disabled && (
        <div
          className="fixed z-[9999] px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded shadow-lg whitespace-nowrap pointer-events-none"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            transform: "translateY(-50%)",
          }}
        >
          {content}
        </div>
      )}
    </>
  );
};

export default Tooltip;

"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X } from "lucide-react";
import { clsx } from "clsx";

interface ComboboxOption {
  code: string;
  name: string;
}

interface ComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  error?: boolean;
}

const Combobox: React.FC<ComboboxProps> = ({
  value,
  onChange,
  options,
  placeholder = "Select or type...",
  disabled = false,
  className = "",
  error = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [filteredOptions, setFilteredOptions] =
    useState<ComboboxOption[]>(options);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update input value when value prop changes
  useEffect(() => {
    const selectedOption = options.find((opt) => opt.code === value);
    setInputValue(selectedOption ? selectedOption.name : value || "");
  }, [value, options]);

  // Filter options based on input
  useEffect(() => {
    if (inputValue.trim() === "") {
      setFilteredOptions(options);
    } else {
      const filtered = options.filter((option) =>
        option.name.toLowerCase().includes(inputValue.toLowerCase())
      );
      setFilteredOptions(filtered);
    }
  }, [inputValue, options]);

  useEffect(() => {
    const updatePosition = () => {
      if (containerRef.current && isOpen) {
        const rect = containerRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
        });
      }
    };

    if (isOpen) {
      updatePosition();
      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);

      return () => {
        window.removeEventListener("scroll", updatePosition, true);
        window.removeEventListener("resize", updatePosition);
      };
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        const target = event.target as HTMLElement;
        if (!target.closest("[data-combobox-dropdown]")) {
          setIsOpen(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsOpen(true);

    // If user is typing a custom value, update the parent with the custom value
    onChange(newValue);
  };

  const handleOptionSelect = (option: ComboboxOption, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    console.log("[v0] Combobox option selected:", option);

    setInputValue(option.name);
    onChange(option.code);
    setIsOpen(false);

    // Refocus input after selection
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const handleClear = () => {
    setInputValue("");
    onChange("");
    inputRef.current?.focus();
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const dropdownContent = isOpen && !disabled && (
    <div
      data-combobox-dropdown
      className="fixed z-[9999] bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
      style={{
        top: `${dropdownPosition.top + 4}px`,
        left: `${dropdownPosition.left}px`,
        width: `${dropdownPosition.width}px`,
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {filteredOptions.length > 0 ? (
        <ul className="py-1">
          {filteredOptions.map((option) => (
            <li key={option.code}>
              <button
                type="button"
                onClick={(e) => handleOptionSelect(option, e)}
                onMouseDown={(e) => e.preventDefault()}
                className={clsx(
                  "w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors cursor-pointer",
                  value === option.code && "bg-blue-100 font-medium"
                )}
              >
                {option.name}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="px-3 py-2 text-sm text-gray-500">
          No options found. Press Enter to use "{inputValue}"
        </div>
      )}
    </div>
  );

  return (
    <div ref={containerRef} className={clsx("relative", className)}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={clsx(
            "flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm pr-20",
            "focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
            "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50",
            "hover:border-gray-400",
            error &&
              "border-red-500 focus:border-red-500 focus:ring-red-500/20",
            !error && "border-gray-300"
          )}
        />

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {inputValue && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              tabIndex={-1}
            >
              <X size={14} className="text-gray-500" />
            </button>
          )}
          <button
            type="button"
            onClick={() => !disabled && setIsOpen(!isOpen)}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            tabIndex={-1}
            disabled={disabled}
          >
            <ChevronDown
              size={16}
              className={clsx(
                "text-gray-500 transition-transform",
                isOpen && "rotate-180"
              )}
            />
          </button>
        </div>
      </div>

      {typeof document !== "undefined" &&
        createPortal(dropdownContent, document.body)}
    </div>
  );
};

export default Combobox;

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, X } from "lucide-react";

interface Option {
  label: string;
  value: string;
}

interface CustomSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
  disabled?: boolean;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  options,
  value,
  onChange,
  placeholder,
  className = "",
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const selectRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedOption = options.find((option) => option.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        selectRef.current &&
        !selectRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setIsOpen(false);
    setSearchTerm("");
  };

  return (
    <div className={`relative ${className}`} ref={selectRef}>
      <div
        className={`
          relative w-full px-3 py-3 text-base border border-gray-300 rounded-lg
          bg-white shadow-sm cursor-pointer transition-colors
          ${
            disabled ? "bg-gray-50 cursor-not-allowed" : "hover:border-gray-400"
          }
          ${
            isOpen
              ? "border-purple-500 ring-2 ring-purple-500 ring-opacity-20"
              : ""
          }
          sm:text-sm sm:py-2
        `}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          <span className={selectedOption ? "text-gray-900" : "text-gray-500"}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <div className="flex items-center space-x-1">
            {selectedOption && !disabled && (
              <button
                onClick={handleClear}
                className="p-0.5 hover:bg-gray-100 rounded transition-colors"
                type="button"
              >
                <X className="h-3 w-3 text-gray-400" />
              </button>
            )}
            <ChevronDown
              className={`h-4 w-4 text-gray-400 transition-transform ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          </div>
        </div>
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
          <div className="p-2 border-b border-gray-200">
            <input
              ref={inputRef}
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">
                No options found
              </div>
            ) : (
              filteredOptions.map((option) => (
                <div
                  key={option.value}
                  className={`
                    px-3 py-2 text-sm cursor-pointer flex items-center justify-between
                    hover:bg-gray-50 transition-colors
                    ${
                      value === option.value
                        ? "bg-purple-50 text-purple-700"
                        : "text-gray-900"
                    }
                  `}
                  onClick={() => handleSelect(option.value)}
                >
                  <span>{option.label}</span>
                  {value === option.value && (
                    <Check className="h-4 w-4 text-purple-600" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomSelect;

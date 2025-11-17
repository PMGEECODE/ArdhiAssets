import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  description?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, description, className = "", id, ...props }, ref) => {
    const inputId =
      id || props.name || `input-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className="space-y-1">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-primary-700"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={`w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-2 ${
            error
              ? "border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:ring-accent-500"
          } ${className}`}
          {...props}
        />
        {description && !error && (
          <p className="text-xs text-gray-500">{description}</p>
        )}
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;

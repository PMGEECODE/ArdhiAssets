import type React from "react";
import { type ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "success"
  | "danger"
  | "warning"
  | "ghost"
  | "outline";
type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  children: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      children,
      className = "",
      disabled,
      ...props
    },
    ref
  ) => {
    const baseClasses =
      "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";

    const variantClasses = {
      primary:
        "bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500",
      secondary:
        "bg-primary-50 text-primary-700 hover:bg-primary-200 focus:ring-primary-500",
      success:
        "bg-success-600 text-white hover:bg-success-700 focus:ring-success-500",
      danger: "bg-error-600 text-white hover:bg-error-700 focus:ring-error-500",
      warning:
        "bg-warning-500 text-white hover:bg-warning-600 focus:ring-warning-400",
      ghost:
        "bg-transparent text-primary-600 hover:bg-primary-50 focus:ring-primary-500",
      outline:
        "bg-transparent border border-primary-300 text-primary-600 hover:bg-primary-50 focus:ring-primary-500",
    };

    const sizeClasses = {
      sm: "text-xs px-2.5 py-1.5",
      md: "text-sm px-4 py-2",
      lg: "text-base px-6 py-3",
    };

    const disabledClasses = "opacity-50 cursor-not-allowed";
    const widthClass = fullWidth ? "w-full" : "";

    return (
      <button
        ref={ref}
        className={`
          ${baseClasses}
          ${variantClasses[variant]}
          ${sizeClasses[size]}
          ${disabled || isLoading ? disabledClasses : ""}
          ${widthClass}
          ${className}
        `}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        )}

        {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
        {children}
        {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;

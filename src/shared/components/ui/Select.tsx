import { SelectHTMLAttributes, forwardRef } from "react";
import { clsx } from "clsx";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, children, ...props }, ref) => {
    return (
      <select
        className={clsx(
          // Base styles
          "flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm",
          // Focus styles
          "focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
          // Disabled styles
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50",
          // Hover styles
          "hover:border-gray-400",
          // Error styles
          error && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
          // Custom arrow styles
          "appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0xIDFMNiA2TDExIDEiIHN0cm9rZT0iIzY5NzU5MyIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+Cg==')] bg-[right_0.75rem_center] bg-no-repeat pr-8",
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </select>
    );
  }
);

Select.displayName = "Select";

export default Select;

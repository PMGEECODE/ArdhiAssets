import { TextareaHTMLAttributes, forwardRef } from "react";
import { clsx } from "clsx";

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ className, error, rows = 3, ...props }, ref) => {
    return (
      <textarea
        className={clsx(
          // Base styles
          "flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm",
          // Focus styles
          "focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
          // Disabled styles
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50",
          // Hover styles
          "hover:border-gray-400",
          // Error styles
          error && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
          // Resize styles
          "resize-none",
          // Placeholder styles
          "placeholder:text-gray-400",
          className
        )}
        rows={rows}
        ref={ref}
        {...props}
      />
    );
  }
);

TextArea.displayName = "TextArea";

export default TextArea;

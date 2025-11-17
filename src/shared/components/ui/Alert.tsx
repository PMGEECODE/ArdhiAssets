import type React from "react";

interface AlertProps {
  variant?: "default" | "destructive";
  className?: string;
  children: React.ReactNode;
}

export const Alert: React.FC<AlertProps> = ({
  variant = "default",
  className = "",
  children,
}) => {
  const variantClasses = {
    default: "border border-primary-200 bg-primary-50 text-primary-900",
    destructive: "border border-red-200 bg-red-50 text-red-900",
  };

  return (
    <div
      role="alert"
      className={`rounded-md p-4 flex gap-3 ${variantClasses[variant]} ${className}`}
    >
      {children}
    </div>
  );
};

export const AlertDescription: React.FC<{
  className?: string;
  children: React.ReactNode;
}> = ({ className = "", children }) => {
  return <div className={`text-sm ${className}`}>{children}</div>;
};

import type React from "react";

interface CardProps {
  className?: string;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ className = "", children }) => {
  return (
    <div
      className={`bg-white rounded-lg shadow-card overflow-hidden ${className}`}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<CardProps> = ({
  className = "",
  children,
}) => {
  return (
    <div className={`px-6 py-4 border-b border-primary-100 ${className}`}>
      {children}
    </div>
  );
};

export const CardTitle: React.FC<CardProps> = ({
  className = "",
  children,
}) => {
  return (
    <h3 className={`text-lg font-semibold text-primary-900 ${className}`}>
      {children}
    </h3>
  );
};

export const CardDescription: React.FC<CardProps> = ({
  className = "",
  children,
}) => {
  return (
    <p className={`mt-1 text-sm text-primary-500 ${className}`}>{children}</p>
  );
};

export const CardContent: React.FC<CardProps> = ({
  className = "",
  children,
}) => {
  return <div className={`p-6 ${className}`}>{children}</div>;
};

export default Card;

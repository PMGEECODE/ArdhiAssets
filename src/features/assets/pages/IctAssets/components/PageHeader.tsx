import type React from "react";
import { Link } from "react-router-dom";
import { Settings, ChevronRight, Home, FolderOpen } from "lucide-react";

interface PageHeaderProps {
  isEditing: boolean;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ isEditing }) => {
  return (
    <div className="mb-8">
      {/* Breadcrumb */}
      <nav className="flex items-center space-x-1.5 text-xs text-primary-600 dark:text-primary-400 mb-4">
        <Link
          to="/"
          className="flex items-center hover:text-accent-600 dark:hover:text-accent-400 transition-colors"
        >
          <Home size={14} className="mr-1" />
          Home
        </Link>
        <ChevronRight size={14} className="text-primary-400" />
        <Link
          to="/asset-categories"
          className="flex items-center hover:text-accent-600 dark:hover:text-accent-400 transition-colors"
        >
          <FolderOpen size={14} className="mr-1" />
          Asset Categories
        </Link>
        <ChevronRight size={14} className="text-primary-400" />
        <Link
          to="/categories/ict-assets"
          className="hover:text-accent-600 dark:hover:text-accent-400 transition-colors"
        >
          ICT Assets
        </Link>
        <ChevronRight size={14} className="text-primary-400" />
        <span className="flex items-center font-medium text-primary-900 dark:text-primary-100">
          <Settings size={14} className="mr-1" />
          {isEditing ? "Edit Asset" : "Add Asset"}
        </span>
      </nav>

      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-primary-900 dark:text-primary-50">
          {isEditing ? "Edit ICT Asset" : "Add ICT Asset"}
        </h1>
        <p className="mt-1 text-sm text-primary-600 dark:text-primary-400">
          {isEditing
            ? "Update ICT asset information"
            : "Create a new ICT asset entry"}
        </p>
      </div>
    </div>
  );
};

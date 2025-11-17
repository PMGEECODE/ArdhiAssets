"use client";

import type React from "react";
import { Moon, Sun } from "lucide-react";
import { useThemeStore } from "../../store/themeStore";

interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = "" }) => {
  const { theme, toggleTheme } = useThemeStore();

  const handleThemeToggle = () => {
    toggleTheme();
  };

  return (
    <button
      onClick={handleThemeToggle}
      className={`p-1 rounded-full transition-colors duration-200 ${
        theme === "dark"
          ? "bg-primary-700 text-accent-300 hover:bg-primary-600"
          : "bg-primary-100 text-primary-700 hover:bg-primary-200"
      } ${className}`}
      title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      aria-label={`Toggle ${theme === "light" ? "dark" : "light"} mode`}
    >
      {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
};

export default ThemeToggle;

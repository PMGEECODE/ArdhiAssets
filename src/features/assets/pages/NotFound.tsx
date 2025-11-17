"use client";

import React from "react";
import { useNavigate } from "react-router-dom";
import { Home, ArrowLeft, AlertTriangle } from "lucide-react";
import Button from "../../../shared/components/ui/Button";
import Card from "../../../shared/components/ui/Card";

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-primary-100 to-primary-50 dark:from-primary-900 dark:via-primary-800 dark:to-primary-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-xl">
        {/* Sticky Header */}
        <div className="sticky top-0 bg-primary-50 dark:bg-primary-900 border-b border-primary-200 dark:border-primary-700 p-5 flex items-center space-x-3 rounded-t-xl">
          <div className="p-2 bg-warning-100 dark:bg-warning-900 rounded-full animate-pulse">
            <AlertTriangle className="w-5 h-5 text-warning-600 dark:text-warning-400" />
          </div>
          <h1 className="text-xl font-bold text-primary-900 dark:text-primary-50">
            Page Not Found
          </h1>
        </div>

        <div className="p-8 space-y-8 text-center">
          {/* Animated 404 */}
          <div className="relative">
            <div className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-accent-600 to-accent-500 dark:from-accent-400 dark:to-accent-300 animate-pulse">
              404
            </div>
            <div className="absolute -top-4 -left-4 w-24 h-24 bg-accent-200 dark:bg-accent-800 rounded-full blur-3xl opacity-30 animate-ping"></div>
            <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-warning-200 dark:bg-warning-800 rounded-full blur-3xl opacity-20 animate-ping delay-300"></div>
          </div>

          {/* Message with subtle animation */}
          <div className="space-y-3 animate-fadeIn">
            <p className="text-lg font-medium text-primary-800 dark:text-primary-200">
              Oops! Looks like this page took a wrong turn.
            </p>
            <p className="text-sm text-primary-600 dark:text-primary-400 max-w-xs mx-auto">
              The page might have been moved, deleted, or you followed a broken
              link.
            </p>
          </div>

          {/* Fun Illustration (SVG) */}
          <div className="flex justify-center">
            <svg
              className="w-32 h-32 text-accent-500 dark:text-accent-400"
              viewBox="0 0 200 200"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M100 20 L120 80 L180 80 L130 120 L150 180 L100 140 L50 180 L70 120 L20 80 L80 80 Z"
                fill="currentColor"
                opacity="0.1"
                className="animate-spin-slow"
              />
              <circle
                cx="100"
                cy="100"
                r="40"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
              />
              <circle
                cx="100"
                cy="100"
                r="25"
                fill="currentColor"
                className="animate-pulse"
              />
              <text
                x="100"
                y="110"
                textAnchor="middle"
                className="text-4xl font-bold fill-primary-700 dark:fill-primary-300"
              >
                ?
              </text>
            </svg>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 animate-fadeInUp">
            <Button
              variant="primary"
              fullWidth
              className="bg-accent-600 hover:bg-accent-700 focus:ring-accent-500 flex items-center justify-center space-x-2 transform transition-all hover:scale-105"
              onClick={() => navigate("/dashboard")}
            >
              <Home className="w-4 h-4" />
              <span>Go to Dashboard</span>
            </Button>

            <Button
              variant="secondary"
              fullWidth
              className="flex items-center justify-center space-x-2 transform transition-all hover:scale-105"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Go Back</span>
            </Button>
          </div>

          {/* Subtle footer */}
          <p className="text-xs text-primary-500 dark:text-primary-500 pt-4">
            Need help? Contact{" "}
            <span className="text-accent-600 dark:text-accent-400 font-medium">
              support@yourapp.com
            </span>
          </p>
        </div>
      </Card>
    </div>
  );
};

export default NotFound;

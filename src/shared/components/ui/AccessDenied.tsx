"use client";

import type React from "react";
import { useNavigate } from "react-router-dom";
import { Shield, ArrowLeft, Home } from "lucide-react";
import Button from "./Button";
import Card from "./Card";

interface AccessDeniedProps {
  message?: string;
  showBackButton?: boolean;
}

const AccessDenied: React.FC<AccessDeniedProps> = ({
  message = "You don't have permission to access this resource.",
  showBackButton = true,
}) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="max-w-md w-full text-center">
        <div className="p-8">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
            <Shield className="w-8 h-8 text-red-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Access Denied
          </h1>

          <p className="text-gray-600 mb-8">{message}</p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {showBackButton && (
              <Button
                variant="secondary"
                onClick={() => navigate(-1)}
                className="flex items-center justify-center"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
            )}

            <Button
              variant="primary"
              onClick={() => navigate("/dashboard")}
              className="flex items-center justify-center"
            >
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AccessDenied;

// src/components/auth/ProtectedRoute.tsx

"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useCookieAuthStore } from "../../../shared/store/cookieAuthStore";
import LoadingSpinner from "../../../shared/components/ui/LoadingSpinner";

const getCookie = (name: string): string | null => {
  return (
    document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${name}=`))
      ?.split("=")[1] ?? null
  );
};

const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, initialized } = useCookieAuthStore();
  const location = useLocation();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const verifyAuthentication = async () => {
      if (!initialized) {
        return;
      }

      setAuthChecked(true);
    };

    verifyAuthentication();
  }, [initialized]);

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;

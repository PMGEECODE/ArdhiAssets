// src/layouts/AuthLayout.tsx

import type React from "react";
import { Outlet, Navigate, useLocation } from "react-router-dom";
import { useCookieAuthStore } from "../store/cookieAuthStore";
import CoatOfArms from "../components/ui/CoatOfArms";

const AuthLayout: React.FC = () => {
  const { isAuthenticated } = useCookieAuthStore();
  const location = useLocation();
  if (isAuthenticated) {
    const from = (location.state as any)?.from?.pathname || "/dashboard";
    return <Navigate to={from} replace />;
  }

  return (
    <div className="min-h-screen bg-primary-800 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          {/* <Logo /> */}
          <CoatOfArms className="ml-4" height={64} />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
          Assets Management System
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow rounded-lg sm:px-10">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;

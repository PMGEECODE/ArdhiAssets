import type React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useCookieAuthStore } from "../../../shared/store/cookieAuthStore";

const AdminRoute: React.FC = () => {
  const { isAdmin } = useCookieAuthStore();

  return isAdmin ? <Outlet /> : <Navigate to="/dashboard" replace />;
};

export default AdminRoute;

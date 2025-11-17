import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import { AssetCategoryType } from "./shared/types";

// Layouts
import MainLayout from "./shared/layouts/MainLayout";
import AuthLayout from "./shared/layouts/AuthLayout";

// Pages
import Dashboard from "./features/dashboard/pages/Dashboard";

/*======================== Building =============================*/
import BuildingDetail from "./features/assets/pages/Buildings/BuildingDetail";
import BuildingList from "./features/assets/pages/Buildings/BuildingList";
import BuildingForm from "./features/assets/pages/Buildings/BuildingForm";
/*===============================================================*/

/*======================== Land Register ========================*/
import LandRegisterList from "./features/assets/pages/LandRegister/LandRegisterList";
import LandRegisterForm from "./features/assets/pages/LandRegister/LandRegisterForm";
import LandRegisterDetail from "./features/assets/pages/LandRegister/LandRegisterDetail";
/*===============================================================*/

/*======================== PlantMachinery =======================*/
import PlantMachineryDetails from "./features/assets/pages/PlantMachinery/PlantMachineryDetails";
import PlantMachineryForm from "./features/assets/pages/PlantMachinery/PlantMachineryForm";
import PlantMachineryList from "./features/assets/pages/PlantMachinery/PlantMachineryList";
import PlantMachineryTransfer from "./features/assets/pages/PlantMachinery/PlantMachineryTransfer";
/*===============================================================*/

/*===================== FurnitureEquipement =====================*/
import FurnitureEquipmentDetail from "./features/assets/pages/FurnitureEquipement/FurnitureEquipmentDetail";
import FurnitureEquipmentForm from "./features/assets/pages/FurnitureEquipement/FurnitureEquipmentForm";
import FurnitureEquipmentList from "./features/assets/pages/FurnitureEquipement/FurnitureEquipmentList";
import FurnitureEquipmentTransfer from "./features/assets/pages/FurnitureEquipement/FurnitureEquipmentTransfer";
/*===============================================================*/

/*======================== PortableItems =======================*/
import PortableItemsList from "./features/assets/pages/PortableItems/PortableItemsList";
import PortableItemsForm from "./features/assets/pages/PortableItems/PortableItemsForm";
import PortableItemsDetails from "./features/assets/pages/PortableItems/PortableItemsDetails";
import PortableItemsTransfer from "./features/assets/pages/PortableItems/PortableItemsTransfer";
/*===============================================================*/

/*=========================== Vehicle ===========================*/
import VehicleList from "./features/assets/pages/Vehicle/VehicleList";
import VehicleForm from "./features/assets/pages/Vehicle/VehicleForm";
import VehicleDetails from "./features/assets/pages/Vehicle/VehicleDetails";
/*===============================================================*/

import OfficeEquipmentList from "./features/assets/pages/OfficeEquipments/OfficeEquipmentList";
/*====================== OfficeEquipments =======================*/
import OfficeEquipmentForm from "./features/assets/pages/OfficeEquipments/OfficeEquipmentForm";
import OfficeEquipmentDetails from "./features/assets/pages/OfficeEquipments/OfficeEquipmentDetails";
import OfficeEquipmentTransfer from "./features/assets/pages/OfficeEquipments/OfficeEquipmentTransfer";

/*===============================================================*/
/*========================= ICT Assets ===========================*/
import IctAssetsList from "./features/assets/pages/IctAssets/IctAssetsList";
import IctAssetsForm from "./features/assets/pages/IctAssets/IctAssetsForm";
import IctAssetsDetail from "./features/assets/pages/IctAssets/IctAssetsDetals";
import IctAssetTransferPage from "./features/assets/pages/IctAssets/IctAssetTransfer";
/*===============================================================*/

import Settings from "./features/assets/pages/Settings";
import Profile from "./features/assets/pages/Profile";
import Login from "./features/auth/pages/Login";
import Register from "./features/assets/pages/Register";
import ForgotPassword from "./features/assets/pages/ForgotPassword";
import ResetPassword from "./features/assets/pages/ResetPassword";
import NotFound from "./features/assets/pages/NotFound";
import ChangePassword from "./features/assets/pages/ChangePassword";
import Verify2FA from "./features/assets/pages/Verify2FA";
import TwoFactorAuth from "./features/assets/pages/TwoFactorAuth";
import Notifications from "./features/assets/pages/Notifications";
import AssetCategories from "./features/assets/pages/AssetCategories";
import SecurePasswordChange from "./features/auth/pages/SecurePasswordChange";

// Admin Pages
import UserManagement from "./features/assets/pages/admin/UserManagement";
import AuditLogs from "./features/assets/pages/admin/AuditLogs";
import Reports from "./features/assets/pages/admin/Reports";
import AddUser from "./features/assets/pages/admin/AddUser";
import AdminUserPermissions from "./features/assets/pages/admin/UserPermissions";
import SecurityDashboard from "./features/assets/pages/admin/SecurityDashboard";
import SystemBackups from "./features/assets/pages/admin/SystemBackups";
import SessionMonitor from "./features/assets/pages/admin/SessionMonitor";
import AdminDashboard from "./features/assets/pages/admin/AdminDashboard";

// Route guards
import ProtectedRoute from "./shared/components/guards/ProtectedRoute";
import PublicRoute from "./shared/components/guards/PublicRoute";
import AdminRoute from "./features/auth/adminRoute/AdminRoute";
import PermissionProtectedRoute from "./shared/components/ui/PermissionProtectedRoute";

export const router = createBrowserRouter([
  {
    element: (
      <PublicRoute>
        <Outlet />
      </PublicRoute>
    ),
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: "/login", element: <Login /> },
          { path: "/forgot-password", element: <ForgotPassword /> },
          { path: "/reset-password", element: <ResetPassword /> },
          { path: "/verify-2fa", element: <Verify2FA /> },
          { path: "/2fa", element: <TwoFactorAuth /> },
          {
            path: "/auth/secure-password-change",
            element: <SecurePasswordChange />,
          },
        ],
      },
    ],
  },
  {
    element: (
      <ProtectedRoute>
        <Outlet />
      </ProtectedRoute>
    ),
    children: [
      {
        element: <MainLayout />,
        children: [
          { path: "/", element: <Navigate to="/dashboard" replace /> },
          { path: "/dashboard", element: <Dashboard /> },
          { path: "/settings", element: <Settings /> },
          { path: "/profile", element: <Profile /> },
          { path: "/notifications", element: <Notifications /> },
          { path: "/asset-categories", element: <AssetCategories /> },
          { path: "/change-password", element: <ChangePassword /> },
          { path: "/register", element: <Register /> },

          /*========================= ICT Assets ============================*/
          {
            element: (
              <PermissionProtectedRoute
                requiredCategory={AssetCategoryType.ICT_ASSETS}
              />
            ),
            children: [
              { path: "/categories/ict-assets", element: <IctAssetsList /> },
              {
                path: "/categories/ict-assets/new",
                element: <IctAssetsForm />,
              },
              {
                path: "/categories/ict-assets/:id",
                element: <IctAssetsDetail />,
              },
              {
                path: "/categories/ict-assets/:id/edit",
                element: <IctAssetsForm />,
              },
              {
                path: "/categories/ict-assets/:id/transfer",
                element: <IctAssetTransferPage />,
              },
            ],
          },
          /*=====================================================================*/

          /*========================= Land Register =========================*/
          {
            element: (
              <PermissionProtectedRoute
                requiredCategory={AssetCategoryType.LAND_REGISTER}
              />
            ),
            children: [
              {
                path: "/categories/land-register",
                element: <LandRegisterList />,
              },
              {
                path: "/categories/land-register/new",
                element: <LandRegisterForm />,
              },
              {
                path: "/categories/land-register/:id",
                element: <LandRegisterDetail />,
              },
              {
                path: "/categories/land-register/:id/edit",
                element: <LandRegisterForm />,
              },
            ],
          },
          /*=================================================================*/

          /*============================ Buildings ==============================*/
          {
            element: (
              <PermissionProtectedRoute
                requiredCategory={AssetCategoryType.BUILDINGS_REGISTER}
              />
            ),
            children: [
              { path: "/categories/buildings", element: <BuildingList /> },
              { path: "/categories/buildings/new", element: <BuildingForm /> },
              {
                path: "/categories/buildings/:id",
                element: <BuildingDetail />,
              },
              {
                path: "/categories/buildings/:id/edit",
                element: <BuildingForm />,
              },
            ],
          },
          /*=====================================================================*/

          /*======================== Furniture Equipment ====================*/
          {
            element: (
              <PermissionProtectedRoute
                requiredCategory={
                  AssetCategoryType.FURNITURE_FITTINGS_EQUIPMENT
                }
              />
            ),
            children: [
              {
                path: "/categories/furniture-equipment",
                element: <FurnitureEquipmentList />,
              },
              {
                path: "/categories/furniture-equipment/new",
                element: <FurnitureEquipmentForm />,
              },
              {
                path: "/categories/furniture-equipment/:id",
                element: <FurnitureEquipmentDetail />,
              },
              {
                path: "/categories/furniture-equipment/:id/edit",
                element: <FurnitureEquipmentForm />,
              },
              {
                path: "/categories/furniture-equipment/:id/transfer",
                element: <FurnitureEquipmentTransfer />,
              },
            ],
          },
          /*=================================================================*/

          /*==========================Plant & Machinery==========================*/
          {
            element: (
              <PermissionProtectedRoute
                requiredCategory={AssetCategoryType.PLANT_MACHINERY}
              />
            ),
            children: [
              {
                path: "/categories/plant-machinery",
                element: <PlantMachineryList />,
              },
              {
                path: "/categories/plant-machinery/new",
                element: <PlantMachineryForm />,
              },
              {
                path: "/categories/plant-machinery/:id",
                element: <PlantMachineryDetails />,
              },
              {
                path: "/categories/plant-machinery/:id/edit",
                element: <PlantMachineryForm />,
              },
              {
                path: "/categories/plant-machinery/:id/transfer",
                element: <PlantMachineryTransfer />,
              },
            ],
          },
          /*=================================================================*/

          /*========================== Portable Items =======================*/
          {
            element: (
              <PermissionProtectedRoute
                requiredCategory={AssetCategoryType.PORTABLE_ATTRACTIVE_ITEMS}
              />
            ),
            children: [
              {
                path: "/categories/portable-items",
                element: <PortableItemsList />,
              },
              {
                path: "/categories/portable-items/new",
                element: <PortableItemsForm />,
              },
              {
                path: "/categories/portable-items/:id",
                element: <PortableItemsDetails />,
              },
              {
                path: "/categories/portable-items/:id/edit",
                element: <PortableItemsForm />,
              },
              {
                path: "/categories/portable-items/:id/transfer",
                element: <PortableItemsTransfer />,
              },
            ],
          },
          /*=================================================================*/

          /*=========================== Vehicles ============================*/
          {
            element: (
              <PermissionProtectedRoute
                requiredCategory={AssetCategoryType.MOTOR_VEHICLES_REGISTER}
              />
            ),
            children: [
              { path: "/categories/vehicles", element: <VehicleList /> },
              { path: "/categories/vehicles/new", element: <VehicleForm /> },
              { path: "/categories/vehicles/:id", element: <VehicleDetails /> },
              {
                path: "/categories/vehicles/:id/edit",
                element: <VehicleForm />,
              },
            ],
          },
          /*=================================================================*/

          /*========================= Office Equipment ======================*/
          {
            element: (
              <PermissionProtectedRoute
                requiredCategory={AssetCategoryType.OFFICE_EQUIPMENT}
              />
            ),
            children: [
              {
                path: "/categories/office-equipment",
                element: <OfficeEquipmentList />,
              },
              {
                path: "/categories/office-equipment/new",
                element: <OfficeEquipmentForm />,
              },
              {
                path: "/categories/office-equipment/:id",
                element: <OfficeEquipmentDetails />,
              },
              {
                path: "/categories/office-equipment/:id/edit",
                element: <OfficeEquipmentForm />,
              },
              {
                path: "/categories/office-equipment/:id/transfer",
                element: <OfficeEquipmentTransfer />,
              },
            ],
          },
          /*=================================================================*/

          /*============================= Admin ===========================*/
          {
            element: <AdminRoute />,
            children: [
              { path: "/admin", element: <AdminDashboard /> },
              { path: "/admin/users", element: <UserManagement /> },
              { path: "/admin/permissions", element: <AdminUserPermissions /> },
              { path: "/admin/security", element: <SecurityDashboard /> },
              { path: "/admin/audit-logs", element: <AuditLogs /> },
              { path: "/admin/reports", element: <Reports /> },
              { path: "/admin/users/add", element: <AddUser /> },
              { path: "/admin/backups", element: <SystemBackups /> },
              { path: "/admin/session-monitor", element: <SessionMonitor /> },
            ],
          },
          /*=================================================================*/
        ],
      },
    ],
  },
  { path: "*", element: <NotFound /> },
]);

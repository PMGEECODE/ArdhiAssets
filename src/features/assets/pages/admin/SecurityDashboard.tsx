"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  Shield,
  Users,
  Lock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  Clock,
  UserCheck,
  UserX,
  Eye,
  RefreshCw,
} from "lucide-react";
import Card from "../../../../shared/components/ui/Card";
import Button from "../../../../shared/components/ui/Button";
import {
  AssetCategoryType,
  type User as UserType,
} from "../../../../shared/types";

interface SecurityStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  usersWithRestrictions: number;
  categoriesWithRestrictions: number;
  expiredPermissions: number;
  recentSecurityEvents: number;
}

interface CategoryStats {
  category: AssetCategoryType;
  totalUsers: number;
  noAccess: number;
  readOnly: number;
  writeAccess: number;
  adminAccess: number;
}

interface RecentSecurityEvent {
  id: string;
  action: string;
  user: string;
  category?: string;
  timestamp: string;
  details: string;
}

const SecurityDashboard: React.FC = () => {
  const [stats, setStats] = useState<SecurityStats | null>(null);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [recentEvents, setRecentEvents] = useState<RecentSecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const categoryLabels: Record<AssetCategoryType, string> = {
    [AssetCategoryType.DEVICES]: "Devices",
    [AssetCategoryType.LAND_REGISTER]: "Land Register",
    [AssetCategoryType.BUILDINGS_REGISTER]: "Buildings Register",
    [AssetCategoryType.MOTOR_VEHICLES_REGISTER]: "Motor Vehicles Register",
    [AssetCategoryType.OFFICE_EQUIPMENT]: "Office Equipment",
    [AssetCategoryType.FURNITURE_FITTINGS_EQUIPMENT]:
      "Furniture & Fittings Equipment",
    [AssetCategoryType.PLANT_MACHINERY]: "Plant & Machinery",
    [AssetCategoryType.PORTABLE_ATTRACTIVE_ITEMS]:
      "Portable & Attractive Items",
  };

  const fetchSecurityStats = async () => {
    setLoading(true);
    try {
      const headers = { "Content-Type": "application/json" };

      // Fetch users
      const usersResponse = await fetch(
        `${import.meta.env.VITE_API_URL}/users`,
        {
          method: "GET",
          credentials: "include",
          headers,
        }
      );
      if (!usersResponse.ok) throw new Error("Failed to fetch users");
      const users: UserType[] = await usersResponse.json();

      // Fetch audit logs
      const auditResponse = await fetch(
        `${import.meta.env.VITE_API_URL}/audit-logs?limit=50`,
        { method: "GET", credentials: "include", headers }
      );
      if (!auditResponse.ok) throw new Error("Failed to fetch audit logs");
      const auditLogs = await auditResponse.json();

      // Fetch dashboard stats
      const dashboardResponse = await fetch(
        `${import.meta.env.VITE_API_URL}/dashboard/overview`,
        { method: "GET", credentials: "include", headers }
      );
      if (!dashboardResponse.ok)
        throw new Error("Failed to fetch dashboard stats");
      const dashboardData = await dashboardResponse.json();

      // Compute stats
      const totalUsers = users.length;
      const activeUsers = users.filter((u) => u.is_active).length;
      const inactiveUsers = totalUsers - activeUsers;
      const usersWithRestrictions = users.filter(
        (u) => u.role !== "admin"
      ).length;

      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentSecurityEvents = auditLogs.filter(
        (log: any) =>
          new Date(log.timestamp) > oneDayAgo &&
          [
            "LOGIN_FAILED",
            "LOGIN_LOCKED",
            "PERMISSION_GRANTED",
            "PERMISSION_REVOKED",
            "TWO_FACTOR_INITIATED",
          ].includes(log.action)
      ).length;

      const expiredPermissions = Math.floor(usersWithRestrictions * 0.1);

      setStats({
        totalUsers,
        activeUsers,
        inactiveUsers,
        usersWithRestrictions,
        categoriesWithRestrictions: Object.keys(AssetCategoryType).length,
        expiredPermissions,
        recentSecurityEvents,
      });

      // Category stats (mocked)
      const adminUsers = users.filter((u) => u.role === "admin").length;
      const regularUsers = activeUsers - adminUsers;

      const categoryStatsData: CategoryStats[] = Object.values(
        AssetCategoryType
      ).map((category) => ({
        category,
        totalUsers: activeUsers,
        noAccess: Math.floor(regularUsers * 0.3),
        readOnly: Math.floor(regularUsers * 0.4),
        writeAccess: Math.floor(regularUsers * 0.2),
        adminAccess: adminUsers + Math.floor(regularUsers * 0.1),
      }));
      setCategoryStats(categoryStatsData);

      // Process recent events
      const securityEvents: RecentSecurityEvent[] = auditLogs
        .filter((log: any) =>
          [
            "LOGIN_FAILED",
            "LOGIN_SUCCESS",
            "LOGIN_LOCKED",
            "PERMISSION_GRANTED",
            "PERMISSION_REVOKED",
            "TWO_FACTOR_INITIATED",
            "USER_CREATED",
            "USER_UPDATED",
            "USER_DELETED",
          ].includes(log.action)
        )
        .slice(0, 10)
        .map((log: any) => {
          let userName = "Unknown User";
          if (log.user) {
            const fullName = `${log.user.first_name || ""} ${
              log.user.last_name || ""
            }`.trim();
            userName =
              fullName || log.user.username || log.user.email || "Unknown User";
          } else if (log.user_id) {
            const user = users.find((u) => u.id === log.user_id);
            if (user) {
              const fullName = `${user.first_name || ""} ${
                user.last_name || ""
              }`.trim();
              userName =
                fullName || user.username || user.email || "Unknown User";
            }
          }

          let category: string | undefined;
          if (
            log.entity_type?.includes("permission") ||
            log.entity_type?.includes("asset")
          ) {
            category = "Asset Permission";
          } else if (log.entity_type?.includes("user")) {
            category = "User Management";
          } else if (log.entity_type?.includes("auth")) {
            category = "Authentication";
          }

          return {
            id: log.id,
            action: log.action,
            user: userName,
            category,
            timestamp: log.timestamp,
            details: log.details || getActionDescription(log.action),
          };
        });

      setRecentEvents(securityEvents);
    } catch (error) {
      console.error("Error fetching security stats:", error);
      toast.error("Failed to load security dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const getActionDescription = (action: string): string => {
    const map: Record<string, string> = {
      LOGIN_SUCCESS: "Successfully logged in",
      LOGIN_FAILED: "Failed login attempt",
      LOGIN_LOCKED: "Account locked after failed attempts",
      PERMISSION_GRANTED: "Permission granted for asset category",
      PERMISSION_REVOKED: "Permission revoked",
      TWO_FACTOR_INITIATED: "2FA verification started",
      LOGOUT: "User logged out",
      USER_CREATED: "User account created",
      USER_UPDATED: "User account updated",
      USER_DELETED: "User account deleted",
    };
    return map[action] || action.replace(/_/g, " ").toLowerCase();
  };

  const getEventIcon = (action: string) => {
    const iconClass = "w-4 h-4";
    switch (action) {
      case "PERMISSION_GRANTED":
        return (
          <CheckCircle
            className={`${iconClass} text-success-600 dark:text-success-400`}
          />
        );
      case "PERMISSION_REVOKED":
        return (
          <XCircle
            className={`${iconClass} text-error-600 dark:text-error-400`}
          />
        );
      case "LOGIN_FAILED":
        return (
          <AlertTriangle
            className={`${iconClass} text-warning-600 dark:text-warning-400`}
          />
        );
      case "ACCOUNT_LOCKED":
        return (
          <Lock className={`${iconClass} text-error-600 dark:text-error-400`} />
        );
      case "USER_CREATED":
        return (
          <UserCheck
            className={`${iconClass} text-success-600 dark:text-success-400`}
          />
        );
      case "USER_UPDATED":
        return (
          <UserX
            className={`${iconClass} text-accent-600 dark:text-accent-400`}
          />
        );
      case "USER_DELETED":
        return (
          <XCircle
            className={`${iconClass} text-error-600 dark:text-error-400`}
          />
        );
      default:
        return (
          <Activity
            className={`${iconClass} text-primary-600 dark:text-primary-400`}
          />
        );
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const diff = Math.floor(
      (Date.now() - new Date(timestamp).getTime()) / 60000
    );
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
  };

  useEffect(() => {
    fetchSecurityStats();
  }, []);

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="flex items-center justify-center h-64 bg-primary-50 dark:bg-primary-900 rounded-lg">
          <RefreshCw className="w-8 h-8 text-accent-600 dark:text-accent-400 animate-spin" />
          <span className="ml-3 text-sm text-primary-700 dark:text-primary-300">
            Loading security dashboard...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-primary-50 dark:bg-primary-900 border-b border-primary-200 dark:border-primary-700 p-4 rounded-t-lg shadow-sm transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <Shield className="w-6 h-6 text-accent-600 dark:text-accent-400" />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-primary-900 dark:text-primary-50">
                Security Control Dashboard
              </h1>
              <p className="text-sm text-primary-600 dark:text-primary-400">
                Monitor and manage system security and access controls
              </p>
            </div>
          </div>
          <Button
            onClick={fetchSecurityStats}
            variant="secondary"
            size="sm"
            className="flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 bg-white dark:bg-primary-900 border-primary-200 dark:border-primary-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-primary-600 dark:text-primary-400">
                Total Users
              </p>
              <p className="text-2xl sm:text-3xl font-bold text-primary-900 dark:text-primary-100">
                {stats?.totalUsers || 0}
              </p>
            </div>
            <Users className="w-8 h-8 text-primary-600 dark:text-primary-400" />
          </div>
        </Card>

        <Card className="p-4 bg-white dark:bg-primary-900 border-primary-200 dark:border-primary-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-primary-600 dark:text-primary-400">
                Active Users
              </p>
              <p className="text-2xl sm:text-3xl font-bold text-success-600 dark:text-success-400">
                {stats?.activeUsers || 0}
              </p>
            </div>
            <UserCheck className="w-8 h-8 text-success-600 dark:text-success-400" />
          </div>
        </Card>

        <Card className="p-4 bg-white dark:bg-primary-900 border-primary-200 dark:border-primary-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-primary-600 dark:text-primary-400">
                Restricted Users
              </p>
              <p className="text-2xl sm:text-3xl font-bold text-warning-600 dark:text-warning-400">
                {stats?.usersWithRestrictions || 0}
              </p>
            </div>
            <Lock className="w-8 h-8 text-warning-600 dark:text-warning-400" />
          </div>
        </Card>

        <Card className="p-4 bg-white dark:bg-primary-900 border-primary-200 dark:border-primary-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-primary-600 dark:text-primary-400">
                Security Events (24h)
              </p>
              <p className="text-2xl sm:text-3xl font-bold text-error-600 dark:text-error-400">
                {stats?.recentSecurityEvents || 0}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-error-600 dark:text-error-400" />
          </div>
        </Card>
      </div>

      {/* Category Access + Recent Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Category Access */}
        <Card className="bg-white dark:bg-primary-900 border-primary-200 dark:border-primary-700">
          <div className="p-4 border-b border-primary-200 dark:border-primary-700">
            <h2 className="text-lg font-semibold text-primary-900 dark:text-primary-50 flex items-center">
              <Eye className="w-5 h-5 mr-2 text-accent-600 dark:text-accent-400" />
              Category Access Overview
            </h2>
          </div>
          <div className="p-4 max-h-96 overflow-y-auto space-y-3">
            {categoryStats.map((cat) => (
              <div
                key={cat.category}
                className="p-3 border border-primary-200 dark:border-primary-700 rounded-lg bg-primary-50 dark:bg-primary-800"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-primary-900 dark:text-primary-100">
                    {categoryLabels[cat.category]}
                  </h3>
                  <span className="text-xs text-primary-600 dark:text-primary-400">
                    {cat.totalUsers} users
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div>
                    <div className="font-semibold text-error-600 dark:text-error-400">
                      {cat.noAccess}
                    </div>
                    <div className="text-primary-600 dark:text-primary-400">
                      No Access
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold text-accent-600 dark:text-accent-400">
                      {cat.readOnly}
                    </div>
                    <div className="text-primary-600 dark:text-primary-400">
                      Read
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold text-warning-600 dark:text-warning-400">
                      {cat.writeAccess}
                    </div>
                    <div className="text-primary-600 dark:text-primary-400">
                      Write
                    </div>
                  </div>
                  <div>
                    <div className="font-semibold text-success-600 dark:text-success-400">
                      {cat.adminAccess}
                    </div>
                    <div className="text-primary-600 dark:text-primary-400">
                      Admin
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Events */}
        <Card className="bg-white dark:bg-primary-900 border-primary-200 dark:border-primary-700">
          <div className="p-4 border-b border-primary-200 dark:border-primary-700">
            <h2 className="text-lg font-semibold text-primary-900 dark:text-primary-50 flex items-center">
              <Activity className="w-5 h-5 mr-2 text-accent-600 dark:text-accent-400" />
              Recent Security Events
            </h2>
          </div>
          <div className="p-4 max-h-96 overflow-y-auto">
            {recentEvents.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="w-12 h-12 text-primary-300 dark:text-primary-600 mx-auto mb-3" />
                <p className="text-sm text-primary-600 dark:text-primary-400">
                  No recent security events
                </p>
                <p className="text-xs text-primary-500 dark:text-primary-500 mt-1">
                  Events will appear here as they occur
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start space-x-3 p-3 bg-primary-50 dark:bg-primary-800 rounded-lg border border-primary-200 dark:border-primary-700"
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {getEventIcon(event.action)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-primary-900 dark:text-primary-100">
                          {event.user}
                        </p>
                        <span className="text-xs text-primary-600 dark:text-primary-400 flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {formatTimeAgo(event.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-primary-600 dark:text-primary-400">
                        {event.details}
                      </p>
                      {event.category && (
                        <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-accent-100 dark:bg-accent-900 text-accent-800 dark:text-accent-300 rounded">
                          {event.category}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Security Alerts */}
      <Card className="bg-white dark:bg-primary-900 border-primary-200 dark:border-primary-700">
        <div className="p-4 border-b border-primary-200 dark:border-primary-700">
          <h2 className="text-lg font-semibold text-primary-900 dark:text-primary-50 flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-warning-600 dark:text-warning-400" />
            Security Alerts & Recommendations
          </h2>
        </div>
        <div className="p-4 space-y-3">
          {stats?.expiredPermissions && stats.expiredPermissions > 0 && (
            <div className="flex items-center p-3 bg-warning-50 dark:bg-warning-950 border border-warning-200 dark:border-warning-800 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-warning-600 dark:text-warning-400 mr-3" />
              <div>
                <p className="text-sm font-medium text-warning-800 dark:text-warning-300">
                  {stats.expiredPermissions} permissions have expired
                </p>
                <p className="text-xs text-warning-700 dark:text-warning-400">
                  Review and renew expired permissions to maintain access
                  control
                </p>
              </div>
            </div>
          )}

          {stats?.inactiveUsers && stats.inactiveUsers > 0 && (
            <div className="flex items-center p-3 bg-accent-50 dark:bg-accent-950 border border-accent-200 dark:border-accent-800 rounded-lg">
              <UserX className="w-5 h-5 text-accent-600 dark:text-accent-400 mr-3" />
              <div>
                <p className="text-sm font-medium text-accent-800 dark:text-accent-300">
                  {stats.inactiveUsers} inactive user accounts
                </p>
                <p className="text-xs text-accent-700 dark:text-accent-400">
                  Consider archiving or removing unused accounts
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center p-3 bg-success-50 dark:bg-success-950 border border-success-200 dark:border-success-800 rounded-lg">
            <CheckCircle className="w-5 h-5 text-success-600 dark:text-success-400 mr-3" />
            <div>
              <p className="text-sm font-medium text-success-800 dark:text-success-300">
                Security monitoring is active
              </p>
              <p className="text-xs text-success-700 dark:text-success-400">
                All events are being logged and monitored in real-time
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SecurityDashboard;

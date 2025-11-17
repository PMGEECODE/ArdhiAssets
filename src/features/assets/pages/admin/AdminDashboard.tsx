"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Shield,
  FileText,
  Database,
  Activity,
  AlertTriangle,
  Lock,
  ArrowRight,
  RefreshCw,
  BarChart3,
  Landmark,
} from "lucide-react";
import Card from "../../../../shared/components/ui/Card";
import Button from "../../../../shared/components/ui/Button";
import { useCookieAuthStore } from "../../../../shared/store/cookieAuthStore";
import type { User as UserType } from "../../../../shared/types";

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  recentAuditLogs: number;
  systemBackups: number;
  activeSessions: number;
  pendingApprovals: number;
  securityAlerts: number;
  pageAccessFrequency: Record<string, number>;
  categoriesVisited: Array<{ category: string; count: number; users: number }>;
  topUsers: Array<{ username: string; visits: number }>;
}

interface AdminSection {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  color: string;
  badge?: string;
  badgeColor?: string;
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { username } = useCookieAuthStore();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  const adminSections: AdminSection[] = [
    {
      id: "user-management",
      title: "User Management",
      description: "Create, edit, and manage user accounts and roles",
      icon: <Users className="w-6 h-6" />,
      path: "/admin/users",
      color:
        "bg-accent-50 dark:bg-accent-900 border-accent-200 dark:border-accent-700",
      badge: stats?.totalUsers.toString(),
      badgeColor:
        "bg-accent-100 dark:bg-accent-800 text-accent-900 dark:text-accent-100",
    },
    {
      id: "permissions",
      title: "User Permissions",
      description: "Manage user permissions and asset category access",
      icon: <Lock className="w-6 h-6" />,
      path: "/admin/permissions",
      color:
        "bg-warning-50 dark:bg-warning-900 border-warning-200 dark:border-warning-700",
    },
    {
      id: "security",
      title: "Security Dashboard",
      description: "Monitor security metrics and access controls",
      icon: <Shield className="w-6 h-6" />,
      path: "/admin/security",
      color:
        "bg-success-50 dark:bg-success-900 border-success-200 dark:border-success-700",
      badge: stats?.securityAlerts.toString(),
      badgeColor:
        "bg-success-100 dark:bg-success-800 text-success-900 dark:text-success-100",
    },
    {
      id: "audit-logs",
      title: "Audit Logs",
      description: "View comprehensive system activity and events",
      icon: <FileText className="w-6 h-6" />,
      path: "/admin/audit-logs",
      color:
        "bg-primary-50 dark:bg-primary-800 border-primary-200 dark:border-primary-700",
      badge: stats?.recentAuditLogs.toString(),
      badgeColor:
        "bg-primary-100 dark:bg-primary-700 text-primary-900 dark:text-primary-100",
    },
    {
      id: "reports",
      title: "Reports",
      description: "Generate and view system reports and analytics",
      icon: <FileText className="w-6 h-6" />,
      path: "/admin/reports",
      color:
        "bg-error-50 dark:bg-error-900 border-error-200 dark:border-error-700",
    },
    {
      id: "system-backups",
      title: "System Backups",
      description: "Manage database backups and system recovery",
      icon: <Database className="w-6 h-6" />,
      path: "/admin/backups",
      color:
        "bg-purple-50 dark:bg-purple-900 border-purple-200 dark:border-purple-700",
      badge: stats?.systemBackups.toString(),
      badgeColor:
        "bg-purple-100 dark:bg-purple-800 text-purple-900 dark:text-purple-100",
    },
    {
      id: "session-monitor",
      title: "Session Monitor",
      description: "Track active user sessions and manage logins",
      icon: <Activity className="w-6 h-6" />,
      path: "/admin/session-monitor",
      color: "bg-cyan-50 dark:bg-cyan-900 border-cyan-200 dark:border-cyan-700",
      badge: stats?.activeSessions.toString(),
      badgeColor:
        "bg-cyan-100 dark:bg-cyan-800 text-cyan-900 dark:text-cyan-100",
    },
  ];

  const fetchAdminStats = async () => {
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
      const users: UserType[] = usersResponse.ok
        ? await usersResponse.json()
        : [];

      // Fetch audit logs
      const auditResponse = await fetch(
        `${import.meta.env.VITE_API_URL}/audit-logs?limit=500`,
        {
          method: "GET",
          credentials: "include",
          headers,
        }
      );
      const auditLogs = auditResponse.ok ? await auditResponse.json() : [];

      // Calculate stats
      const totalUsers = users.length;
      const activeUsers = users.filter((u) => u.is_active).length;
      const inactiveUsers = totalUsers - activeUsers;

      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentAuditLogsCount = auditLogs.filter(
        (log: any) => new Date(log.timestamp) > oneDayAgo
      ).length;

      const securityEventsCount = auditLogs.filter(
        (log: any) =>
          new Date(log.timestamp) > oneDayAgo &&
          [
            "LOGIN_FAILED",
            "LOGIN_LOCKED",
            "PERMISSION_GRANTED",
            "PERMISSION_REVOKED",
          ].includes(log.action)
      ).length;

      const pageAccessFrequency: Record<string, number> = {};
      const categoryVisits: Record<
        string,
        { count: number; users: Set<string> }
      > = {};
      const userVisits: Record<string, number> = {};

      auditLogs.forEach((log: any) => {
        if (
          log.entity_type === "asset_category" &&
          log.action === "CATEGORY_VIEW"
        ) {
          const category = log.entity_id;
          if (category) {
            if (!categoryVisits[category]) {
              categoryVisits[category] = { count: 0, users: new Set() };
            }
            categoryVisits[category].count++;
            if (log.username) {
              categoryVisits[category].users.add(log.username);
            }
          }
        }

        if (
          log.username &&
          log.action &&
          !["LOGIN", "LOGOUT"].includes(log.action)
        ) {
          userVisits[log.username] = (userVisits[log.username] || 0) + 1;
        }

        // Count page access frequency
        if (log.action && !["LOGIN", "LOGOUT"].includes(log.action)) {
          pageAccessFrequency[log.action] =
            (pageAccessFrequency[log.action] || 0) + 1;
        }
      });

      const categoriesVisitedArray = Object.entries(categoryVisits)
        .map(([category, data]) => ({
          category,
          count: data.count,
          users: data.users.size,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const topUsersArray = Object.entries(userVisits)
        .map(([username, visits]) => ({ username, visits }))
        .sort((a, b) => b.visits - a.visits)
        .slice(0, 5);

      setStats({
        totalUsers,
        activeUsers,
        inactiveUsers,
        recentAuditLogs: recentAuditLogsCount,
        systemBackups: 5,
        activeSessions: activeUsers,
        pendingApprovals: 2,
        securityAlerts: securityEventsCount,
        pageAccessFrequency,
        categoriesVisited: categoriesVisitedArray,
        topUsers: topUsersArray,
      });
    } catch (error) {
      console.error("Error fetching admin stats:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminStats();
  }, []);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary-900 dark:text-primary-50">
            Admin Dashboard
          </h1>
          <p className="text-sm text-primary-600 dark:text-primary-400 mt-2">
            Welcome back, {username}. Here's an overview of your admin
            functions.
          </p>
        </div>
        <Button
          onClick={fetchAdminStats}
          variant="secondary"
          size="sm"
          className="flex items-center space-x-2"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Quick Stats */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="p-4 bg-white dark:bg-primary-900 border-primary-200 dark:border-primary-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-primary-600 dark:text-primary-400">
                  Total Users
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-primary-900 dark:text-primary-100 mt-1">
                  {stats.totalUsers}
                </p>
                <p className="text-xs text-success-600 dark:text-success-400 mt-2">
                  {stats.activeUsers} active
                </p>
              </div>
              <Users className="w-8 h-8 text-accent-600 dark:text-accent-400" />
            </div>
          </Card>

          <Card className="p-4 bg-white dark:bg-primary-900 border-primary-200 dark:border-primary-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-primary-600 dark:text-primary-400">
                  Active Sessions
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-primary-900 dark:text-primary-100 mt-1">
                  {stats.activeSessions}
                </p>
                <p className="text-xs text-primary-500 dark:text-primary-500 mt-2">
                  Currently online
                </p>
              </div>
              <Activity className="w-8 h-8 text-success-600 dark:text-success-400" />
            </div>
          </Card>

          <Card className="p-4 bg-white dark:bg-primary-900 border-primary-200 dark:border-primary-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-primary-600 dark:text-primary-400">
                  Recent Audit Logs
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-primary-900 dark:text-primary-100 mt-1">
                  {stats.recentAuditLogs}
                </p>
                <p className="text-xs text-primary-500 dark:text-primary-500 mt-2">
                  Last 24 hours
                </p>
              </div>
              <FileText className="w-8 h-8 text-warning-600 dark:text-warning-400" />
            </div>
          </Card>

          <Card className="p-4 bg-white dark:bg-primary-900 border-primary-200 dark:border-primary-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-primary-600 dark:text-primary-400">
                  Security Events
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-primary-900 dark:text-primary-100 mt-1">
                  {stats.securityAlerts}
                </p>
                <p className="text-xs text-error-600 dark:text-error-400 mt-2">
                  Requires attention
                </p>
              </div>
              <Shield className="w-8 h-8 text-error-600 dark:text-error-400" />
            </div>
          </Card>
        </div>
      )}

      {/* Admin Sections Grid */}
      <div>
        <div className="mb-4">
          <h2 className="text-lg sm:text-xl font-semibold text-primary-900 dark:text-primary-50">
            Admin Functions
          </h2>
          <p className="text-sm text-primary-600 dark:text-primary-400 mt-1">
            Access all administrative tools and settings
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {adminSections.map((section) => (
            <Card
              key={section.id}
              className={`p-4 border cursor-pointer transition-all hover:shadow-lg hover:scale-105 dark:hover:shadow-lg ${section.color}`}
              onClick={() => navigate(section.path)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  navigate(section.path);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white dark:bg-primary-800 rounded-lg">
                    {section.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-primary-900 dark:text-primary-100">
                      {section.title}
                    </h3>
                  </div>
                </div>
                {section.badge && (
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${
                      section.badgeColor || "bg-primary-100 text-primary-900"
                    }`}
                  >
                    {section.badge}
                  </span>
                )}
              </div>

              <p className="text-sm text-primary-700 dark:text-primary-300 mb-4">
                {section.description}
              </p>

              <div className="flex items-center text-accent-600 dark:text-accent-400 text-sm font-medium">
                <span>Go to {section.title}</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* User Activity Section */}
      {stats && (
        <Card className="bg-white dark:bg-primary-900 border-primary-200 dark:border-primary-700">
          <div className="p-4 border-b border-primary-200 dark:border-primary-700">
            <h2 className="text-lg font-semibold text-primary-900 dark:text-primary-50 flex items-center">
              <Activity className="w-5 h-5 mr-2 text-accent-600 dark:text-accent-400" />
              User Activity & Access Analytics
            </h2>
            <p className="text-sm text-primary-600 dark:text-primary-400 mt-1">
              Detailed insights into system usage patterns and user engagement
            </p>
          </div>

          <div className="p-4 space-y-6">
            {/* Categories Most Visited */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-base font-semibold text-primary-900 dark:text-primary-100 mb-4 flex items-center">
                  <Landmark className="w-5 h-5 mr-2 text-accent-600 dark:text-accent-400" />
                  Most Visited Categories
                </h3>
                <div className="space-y-3">
                  {stats.categoriesVisited.length > 0 ? (
                    stats.categoriesVisited.map((cat, index) => {
                      const percentage =
                        (cat.count /
                          Math.max(
                            ...stats.categoriesVisited.map((c) => c.count),
                            1
                          )) *
                        100;
                      return (
                        <div
                          key={index}
                          className="flex items-center space-x-3"
                        >
                          <div className="flex-shrink-0">
                            <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-accent-100 dark:bg-accent-900 text-accent-700 dark:text-accent-300 text-sm font-semibold">
                              {index + 1}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-primary-900 dark:text-primary-100 truncate">
                              {cat.category}
                            </p>
                            <div className="mt-1 w-full bg-primary-200 dark:bg-primary-700 rounded-full h-2">
                              <div
                                className="bg-accent-500 h-2 rounded-full transition-all"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                          <div className="flex-shrink-0 text-right">
                            <p className="text-sm font-semibold text-primary-900 dark:text-primary-100">
                              {cat.count}
                            </p>
                            <p className="text-xs text-primary-600 dark:text-primary-400">
                              {cat.users} users
                            </p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-sm text-primary-600 dark:text-primary-400 text-center py-4">
                      No category visit data available
                    </div>
                  )}
                </div>
              </div>

              {/* Most Active Users */}
              <div>
                <h3 className="text-base font-semibold text-primary-900 dark:text-primary-100 mb-4 flex items-center">
                  <Users className="w-5 h-5 mr-2 text-success-600 dark:text-success-400" />
                  Most Active Users
                </h3>
                <div className="space-y-3">
                  {stats.topUsers.length > 0 ? (
                    stats.topUsers.map((user, index) => {
                      const percentage =
                        (user.visits /
                          Math.max(...stats.topUsers.map((u) => u.visits), 1)) *
                        100;
                      return (
                        <div
                          key={index}
                          className="flex items-center space-x-3"
                        >
                          <div className="flex-shrink-0">
                            <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-success-100 dark:bg-success-900 text-success-700 dark:text-success-300 text-sm font-semibold">
                              {index + 1}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-primary-900 dark:text-primary-100 truncate">
                              {user.username}
                            </p>
                            <div className="mt-1 w-full bg-primary-200 dark:bg-primary-700 rounded-full h-2">
                              <div
                                className="bg-success-500 h-2 rounded-full transition-all"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                          <div className="flex-shrink-0 text-right">
                            <p className="text-sm font-semibold text-primary-900 dark:text-primary-100">
                              {user.visits}
                            </p>
                            <p className="text-xs text-primary-600 dark:text-primary-400">
                              actions
                            </p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-sm text-primary-600 dark:text-primary-400 text-center py-4">
                      No user activity data available
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Access Frequency by Action */}
            <div>
              <h3 className="text-base font-semibold text-primary-900 dark:text-primary-100 mb-4 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-warning-600 dark:text-warning-400" />
                Page Access Frequency
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(stats.pageAccessFrequency)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 6)
                  .map(([action, count], index) => (
                    <div
                      key={index}
                      className="p-3 bg-primary-50 dark:bg-primary-800 rounded-lg border border-primary-200 dark:border-primary-700 text-center"
                    >
                      <p className="text-2xl font-bold text-primary-900 dark:text-primary-100">
                        {count}
                      </p>
                      <p className="text-xs text-primary-600 dark:text-primary-400 mt-1 truncate">
                        {action}
                      </p>
                    </div>
                  ))}
              </div>
            </div>

            {/* Summary Stats */}
            <div className="bg-accent-50 dark:bg-accent-950 border border-accent-200 dark:border-accent-800 rounded-lg p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-accent-600 dark:text-accent-400 font-medium">
                    Total Actions
                  </p>
                  <p className="text-2xl font-bold text-accent-900 dark:text-accent-100 mt-1">
                    {Object.values(stats.pageAccessFrequency).reduce(
                      (a, b) => a + b,
                      0
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-accent-600 dark:text-accent-400 font-medium">
                    Categories Accessed
                  </p>
                  <p className="text-2xl font-bold text-accent-900 dark:text-accent-100 mt-1">
                    {stats.categoriesVisited.length}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-accent-600 dark:text-accent-400 font-medium">
                    Avg Actions/User
                  </p>
                  <p className="text-2xl font-bold text-accent-900 dark:text-accent-100 mt-1">
                    {stats.totalUsers > 0
                      ? (
                          Object.values(stats.pageAccessFrequency).reduce(
                            (a, b) => a + b,
                            0
                          ) / stats.totalUsers
                        ).toFixed(1)
                      : 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Alerts Section */}
      {stats && (
        <Card className="bg-white dark:bg-primary-900 border-primary-200 dark:border-primary-700">
          <div className="p-4 border-b border-primary-200 dark:border-primary-700">
            <h2 className="text-lg font-semibold text-primary-900 dark:text-primary-50 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2 text-warning-600 dark:text-warning-400" />
              System Status & Alerts
            </h2>
          </div>
          <div className="p-4 space-y-3">
            {stats.inactiveUsers > 0 && (
              <div className="flex items-center p-3 bg-accent-50 dark:bg-accent-950 border border-accent-200 dark:border-accent-800 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-accent-600 dark:text-accent-400 mr-3 flex-shrink-0" />
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

            {stats.securityAlerts > 5 && (
              <div className="flex items-center p-3 bg-error-50 dark:bg-error-950 border border-error-200 dark:border-error-800 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-error-600 dark:text-error-400 mr-3 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-error-800 dark:text-error-300">
                    {stats.securityAlerts} security events in last 24 hours
                  </p>
                  <p className="text-xs text-error-700 dark:text-error-400">
                    Review audit logs and security dashboard for details
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center p-3 bg-success-50 dark:bg-success-950 border border-success-200 dark:border-success-800 rounded-lg">
              <Shield className="w-5 h-5 text-success-600 dark:text-success-400 mr-3 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-success-800 dark:text-success-300">
                  System is running normally
                </p>
                <p className="text-xs text-success-700 dark:text-success-400">
                  All critical systems operational
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default AdminDashboard;

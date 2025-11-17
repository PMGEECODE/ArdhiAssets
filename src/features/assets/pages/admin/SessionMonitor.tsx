"use client";

import { useState } from "react";
import {
  BarChart2,
  Clock,
  AlertCircle,
  LogOut,
  RefreshCw,
  Globe,
  Activity,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Button from "../../../../shared/components/ui/Button";
import Card from "../../../../shared/components/ui/Card";
import { useSessionMonitorData } from "../../../../shared/hooks/useSessionMonitorData";
import sessionMonitorService, {
  type UserSession,
} from "../../../../shared/services/sessionMonitorService";

export default function SessionMonitor() {
  const { sessions, loading, error, lastRefresh, refetch } =
    useSessionMonitorData({
      autoRefreshInterval: 60000,
    });

  const [terminatingId, setTerminatingId] = useState<string | null>(null);
  const [expandedMobileRow, setExpandedMobileRow] = useState<string | null>(
    null
  );

  const formatTime = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch {
      return dateString;
    }
  };

  const getTimeRemaining = (expiryTime: string): string => {
    try {
      const expiry = new Date(expiryTime).getTime();
      const now = Date.now();
      const remaining = expiry - now;

      if (remaining <= 0) return "Expired";

      const minutes = Math.floor(remaining / 60000);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (days > 0) return `${days}d ${hours % 24}h`;
      if (hours > 0) return `${hours}h ${minutes % 60}m`;
      return `${minutes}m`;
    } catch {
      return "Unknown";
    }
  };

  const getStatusBadge = (session: UserSession) => {
    const timeRemaining = getTimeRemaining(session.expiryTime);
    const isExpiring = timeRemaining === "Expired";

    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${
          isExpiring
            ? "bg-error-50 text-error-800 border border-error-300 dark:bg-error-950 dark:text-error-400 dark:border-error-800"
            : session.status === "active"
            ? "bg-success-50 text-success-800 border border-success-300 dark:bg-success-950 dark:text-success-400 dark:border-success-800"
            : "bg-warning-50 text-warning-800 border border-warning-300 dark:bg-warning-950 dark:text-warning-400 dark:border-warning-800"
        }`}
      >
        <Activity size={12} />
        {session.status === "active" ? "Active" : "Idle"}
      </span>
    );
  };

  const handleTerminateSession = async (sessionId: string) => {
    if (
      !window.confirm(
        "Are you sure you want to terminate this session? The user will be logged out."
      )
    ) {
      return;
    }

    setTerminatingId(sessionId);
    const success = await sessionMonitorService.terminateSession(sessionId);

    if (success) {
      refetch();
    } else {
      alert("Failed to terminate session");
    }

    setTerminatingId(null);
  };

  const toggleMobileRow = (id: string) => {
    setExpandedMobileRow(expandedMobileRow === id ? null : id);
  };

  return (
    <div className="p-0 sm:p-0 space-y-2">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-primary-50 dark:bg-primary-900 border-b border-primary-200 dark:border-primary-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 transition-colors duration-200">
        <div className="flex items-center space-x-2">
          <Globe className="w-5 h-5 text-accent-600 dark:text-accent-400" />
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-primary-900 dark:text-primary-50">
              Session Monitor
            </h1>
            <p className="text-xs sm:text-sm text-primary-600 dark:text-primary-400">
              Monitor all active user sessions in real-time
            </p>
          </div>
        </div>

        <Button
          onClick={() => refetch()}
          variant="secondary"
          className="flex items-center space-x-2"
          size="sm"
          disabled={loading}
        >
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 p-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-primary-600 dark:text-primary-400">
                Active Sessions
              </p>
              <p className="text-3xl font-bold text-primary-900 dark:text-primary-50">
                {sessions.length}
              </p>
            </div>
            <BarChart2
              className="text-accent-600 dark:text-accent-400"
              size={32}
            />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-primary-600 dark:text-primary-400">
                Active Users
              </p>
              <p className="text-3xl font-bold text-primary-900 dark:text-primary-50">
                {new Set(sessions.map((s) => s.userId)).size}
              </p>
            </div>
            <Activity
              className="text-success-600 dark:text-success-400"
              size={32}
            />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-primary-600 dark:text-primary-400">
                Last Refreshed
              </p>
              <p className="text-sm font-mono text-primary-900 dark:text-primary-300">
                {lastRefresh.toLocaleTimeString()}
              </p>
            </div>
            <Clock
              className="text-warning-600 dark:text-warning-400"
              size={32}
            />
          </div>
        </Card>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4">
          <Card className="p-3 bg-error-50 dark:bg-error-950 border border-error-300 dark:border-error-800">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-error-600 dark:text-error-400" />
              <p className="text-sm text-error-800 dark:text-error-300">
                {error}
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* Responsive Table / Cards */}
      <div className="mx-4">
        <Card className="overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="min-w-full divide-y divide-primary-200 dark:divide-primary-700">
              <thead className="bg-primary-100 dark:bg-primary-800">
                <tr>
                  {[
                    "User",
                    "Status",
                    "Login Time",
                    "Time Remaining",
                    "IP Address",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-2 text-left text-xs font-medium text-primary-700 dark:text-primary-300 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-primary-200 dark:divide-primary-700">
                {loading && sessions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center">
                      <div className="flex items-center justify-center gap-2 text-primary-600 dark:text-primary-400">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <p className="text-sm">Loading sessions...</p>
                      </div>
                    </td>
                  </tr>
                ) : sessions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-primary-600 dark:text-primary-400"
                    >
                      No active sessions found
                    </td>
                  </tr>
                ) : (
                  sessions.map((session) => (
                    <tr
                      key={session.id}
                      className="hover:bg-primary-50 dark:hover:bg-primary-800 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm">
                        <div>
                          <p className="font-medium text-primary-900 dark:text-primary-100">
                            {session.username}
                          </p>
                          <p className="text-xs text-primary-600 dark:text-primary-400">
                            {session.email}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {getStatusBadge(session)}
                      </td>
                      <td className="px-4 py-3 text-sm text-primary-700 dark:text-primary-300">
                        {formatTime(session.loginTime)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`font-medium ${
                            getTimeRemaining(session.expiryTime) === "Expired"
                              ? "text-error-600 dark:text-error-400"
                              : "text-success-600 dark:text-success-400"
                          }`}
                        >
                          {getTimeRemaining(session.expiryTime)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-primary-700 dark:text-primary-300">
                        {session.ipAddress}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {!session.isCurrentSession && (
                          <button
                            onClick={() => handleTerminateSession(session.id)}
                            disabled={terminatingId === session.id}
                            className="text-error-600 dark:text-error-400 hover:text-error-700 dark:hover:text-error-300 disabled:opacity-50 flex items-center gap-1 transition-colors"
                          >
                            <LogOut size={16} />
                            {terminatingId === session.id ? "..." : "Logout"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden">
            {loading && sessions.length === 0 ? (
              <div className="p-6 text-center">
                <div className="flex items-center justify-center gap-2 text-primary-600 dark:text-primary-400">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <p className="text-sm">Loading sessions...</p>
                </div>
              </div>
            ) : sessions.length === 0 ? (
              <div className="p-6 text-center text-primary-600 dark:text-primary-400">
                No active sessions found
              </div>
            ) : (
              <div className="divide-y divide-primary-200 dark:divide-primary-700">
                {sessions.map((session) => {
                  const isExpanded = expandedMobileRow === session.id;
                  return (
                    <div
                      key={session.id}
                      className="p-4 hover:bg-primary-50 dark:hover:bg-primary-800 transition-colors"
                    >
                      {/* Header Row */}
                      <div
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => toggleMobileRow(session.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-800 flex items-center justify-center">
                            <Activity
                              size={16}
                              className={
                                session.status === "active"
                                  ? "text-success-600 dark:text-success-400"
                                  : "text-warning-600 dark:text-warning-400"
                              }
                            />
                          </div>
                          <div>
                            <p className="font-medium text-primary-900 dark:text-primary-100">
                              {session.username}
                            </p>
                            <p className="text-xs text-primary-600 dark:text-primary-400">
                              {session.email}
                            </p>
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-primary-500 dark:text-primary-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-primary-500 dark:text-primary-400" />
                        )}
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="mt-4 space-y-3 text-sm border-t border-primary-200 dark:border-primary-700 pt-3">
                          <div className="flex justify-between">
                            <span className="text-primary-600 dark:text-primary-400">
                              Status
                            </span>
                            {getStatusBadge(session)}
                          </div>
                          <div className="flex justify-between">
                            <span className="text-primary-600 dark:text-primary-400">
                              Login Time
                            </span>
                            <span className="text-primary-700 dark:text-primary-300">
                              {formatTime(session.loginTime)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-primary-600 dark:text-primary-400">
                              Time Remaining
                            </span>
                            <span
                              className={`font-medium ${
                                getTimeRemaining(session.expiryTime) ===
                                "Expired"
                                  ? "text-error-600 dark:text-error-400"
                                  : "text-success-600 dark:text-success-400"
                              }`}
                            >
                              {getTimeRemaining(session.expiryTime)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-primary-600 dark:text-primary-400">
                              IP Address
                            </span>
                            <span className="font-mono text-primary-700 dark:text-primary-300">
                              {session.ipAddress}
                            </span>
                          </div>
                          {!session.isCurrentSession && (
                            <div className="pt-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTerminateSession(session.id);
                                }}
                                disabled={terminatingId === session.id}
                                className="w-full text-error-600 dark:text-error-400 hover:text-error-700 dark:hover:text-error-300 disabled:opacity-50 flex items-center justify-center gap-1 transition-colors text-sm font-medium"
                              >
                                <LogOut size={16} />
                                {terminatingId === session.id
                                  ? "Terminating..."
                                  : "Logout User"}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Footer Note */}
      <div className="mx-4 mt-3">
        <Card className="p-3 bg-primary-100 dark:bg-primary-800 border border-primary-200 dark:border-primary-700">
          <p className="text-sm text-primary-700 dark:text-primary-300">
            <strong className="text-primary-900 dark:text-primary-100">
              Note:
            </strong>{" "}
            This page auto-refreshes every 60 seconds. Data is cached for 30
            seconds to minimize server load. You can manually refresh using the
            button above. Session expiry times are controlled by the backend.
          </p>
        </Card>
      </div>
    </div>
  );
}

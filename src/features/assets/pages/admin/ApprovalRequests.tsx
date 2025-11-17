"use client";

import type React from "react";
import { useState, useEffect } from "react";
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  User,
  Calendar,
  DollarSign,
} from "lucide-react";

interface ApprovalRequest {
  id: string;
  requester_name: string;
  device_hostname: string;
  device_model: string;
  requested_assignee: string;
  transfer_location: string;
  transfer_reason: string;
  business_justification?: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  device_value?: number;
  created_at: string;
  approved_at?: string;
  approver_name?: string;
  rejection_reason?: string;
}

const ApprovalRequests: React.FC = () => {
  const [approvalRequests, setApprovalRequests] = useState<ApprovalRequest[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<
    "all" | "pending" | "approved" | "rejected"
  >("pending");
  const [selectedRequest, setSelectedRequest] =
    useState<ApprovalRequest | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchApprovalRequests();
  }, [filter]);

  const fetchApprovalRequests = async () => {
    try {
      const url =
        filter === "all"
          ? `${import.meta.env.VITE_API_URL}/approval-requests`
          : `${
              import.meta.env.VITE_API_URL
            }/approval-requests?status=${filter}`;

      const response = await fetch(url, {
        method: "GET",
        credentials: "include", // ✅ send cookies
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setApprovalRequests(data);
      }
    } catch (error) {
      console.error("Error fetching approval requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprovalAction = async (
    approvalId: string,
    status: "approved" | "rejected",
    rejectionReason?: string
  ) => {
    setActionLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/approval-requests/${approvalId}`,
        {
          method: "PUT",
          credentials: "include", // ✅ send cookies
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status,
            rejection_reason: rejectionReason,
          }),
        }
      );

      if (response.ok) {
        await fetchApprovalRequests();
        setShowModal(false);
        setSelectedRequest(null);
      }
    } catch (error) {
      console.error("Error updating approval request:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case "approved":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "rejected":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800 border-red-200";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "medium":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-12 h-12 rounded-full border-b-2 border-blue-600 animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">
          Approval Requests
        </h1>
        <p className="text-gray-600">
          Review and manage device transfer approval requests
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px space-x-8">
            {[
              {
                key: "pending",
                label: "Pending",
                count: approvalRequests.filter((r) => r.status === "pending")
                  .length,
              },
              {
                key: "approved",
                label: "Approved",
                count: approvalRequests.filter((r) => r.status === "approved")
                  .length,
              },
              {
                key: "rejected",
                label: "Rejected",
                count: approvalRequests.filter((r) => r.status === "rejected")
                  .length,
              },
              { key: "all", label: "All", count: approvalRequests.length },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  filter === tab.key
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Approval Requests List */}
      <div className="bg-white rounded-lg border shadow-sm">
        {approvalRequests.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <AlertTriangle className="mx-auto mb-4 w-12 h-12 text-gray-300" />
            <p className="text-lg font-medium">No approval requests found</p>
            <p className="text-sm">Check back later for new requests</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {approvalRequests.map((request) => (
              <div
                key={request.id}
                className="p-6 transition-colors hover:bg-gray-50"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center mb-2 space-x-3">
                      {getStatusIcon(request.status)}
                      <h3 className="text-lg font-medium text-gray-900">
                        {request.device_hostname}
                      </h3>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(
                          request.priority
                        )}`}
                      >
                        {request.priority.toUpperCase()}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-4 mb-4 md:grid-cols-2">
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <User className="w-4 h-4" />
                        <span>
                          <strong>Requester:</strong> {request.requester_name}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>
                          <strong>Requested:</strong>{" "}
                          {formatDate(request.created_at)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        <strong>Transfer to:</strong>{" "}
                        {request.requested_assignee} at{" "}
                        {request.transfer_location}
                      </div>
                      {request.device_value && (
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <DollarSign className="w-4 h-4" />
                          <span>
                            <strong>Device Value:</strong> $
                            {request.device_value.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>

                    <p className="mb-3 text-sm text-gray-700">
                      <strong>Reason:</strong> {request.transfer_reason}
                    </p>

                    {request.business_justification && (
                      <p className="mb-3 text-sm text-gray-700">
                        <strong>Business Justification:</strong>{" "}
                        {request.business_justification}
                      </p>
                    )}

                    {request.status === "approved" && request.approver_name && (
                      <p className="text-sm text-green-600">
                        <strong>Approved by:</strong> {request.approver_name} on{" "}
                        {formatDate(request.approved_at!)}
                      </p>
                    )}

                    {request.status === "rejected" &&
                      request.rejection_reason && (
                        <p className="text-sm text-red-600">
                          <strong>Rejection Reason:</strong>{" "}
                          {request.rejection_reason}
                        </p>
                      )}
                  </div>

                  <div className="flex items-center ml-4 space-x-2">
                    <button
                      onClick={() => {
                        setSelectedRequest(request);
                        setShowModal(true);
                      }}
                      className="p-2 text-gray-400 rounded-lg transition-colors hover:text-gray-600"
                      title="View details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {request.status === "pending" && (
                      <>
                        <button
                          onClick={() =>
                            handleApprovalAction(request.id, "approved")
                          }
                          disabled={actionLoading}
                          className="px-3 py-1 text-sm font-medium text-white bg-green-600 rounded-md transition-colors hover:bg-green-700 disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => {
                            setSelectedRequest(request);
                            setShowModal(true);
                          }}
                          disabled={actionLoading}
                          className="px-3 py-1 text-sm font-medium text-white bg-red-600 rounded-md transition-colors hover:bg-red-700 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal for rejection or details */}
      {showModal && selectedRequest && (
        <div className="flex fixed inset-0 z-50 justify-center items-center bg-black bg-opacity-50">
          <div className="p-6 w-full max-w-md bg-white rounded-lg">
            <h3 className="mb-4 text-lg font-medium">
              {selectedRequest.status === "pending"
                ? "Reject Request"
                : "Request Details"}
            </h3>

            {selectedRequest.status === "pending" ? (
              <>
                <div className="mb-4">
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    Rejection Reason
                  </label>
                  <textarea
                    id="rejectionReason"
                    rows={3}
                    className="px-3 py-2 w-full rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Please provide a reason for rejection..."
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md transition-colors hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      const reason = (
                        document.getElementById(
                          "rejectionReason"
                        ) as HTMLTextAreaElement
                      ).value;
                      handleApprovalAction(
                        selectedRequest.id,
                        "rejected",
                        reason
                      );
                    }}
                    disabled={actionLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md transition-colors hover:bg-red-700 disabled:opacity-50"
                  >
                    {actionLoading ? "Rejecting..." : "Reject Request"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-4 space-y-3">
                  <div>
                    <strong>Device:</strong> {selectedRequest.device_hostname} (
                    {selectedRequest.device_model})
                  </div>
                  <div>
                    <strong>Requester:</strong> {selectedRequest.requester_name}
                  </div>
                  <div>
                    <strong>Transfer to:</strong>{" "}
                    {selectedRequest.requested_assignee}
                  </div>
                  <div>
                    <strong>Location:</strong>{" "}
                    {selectedRequest.transfer_location}
                  </div>
                  <div>
                    <strong>Reason:</strong> {selectedRequest.transfer_reason}
                  </div>
                  {selectedRequest.business_justification && (
                    <div>
                      <strong>Business Justification:</strong>{" "}
                      {selectedRequest.business_justification}
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md transition-colors hover:bg-gray-200"
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalRequests;

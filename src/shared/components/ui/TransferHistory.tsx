"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { format } from "date-fns"
import { Clock, User, MapPin, Building, FileText, ArrowRight } from "lucide-react"

import Card from "./Card"
import Button from "./Button"
import type { DeviceTransfer } from "../../types"
import { API_URL } from "../../config"

interface TransferHistoryProps {
  deviceId: string
  className?: string
}

const TransferHistory: React.FC<TransferHistoryProps> = ({ deviceId, className = "" }) => {
  const [transfers, setTransfers] = useState<DeviceTransfer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    const fetchTransferHistory = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Get token from localStorage
        const storedAuth = localStorage.getItem("auth-storage")
        const authData = storedAuth ? JSON.parse(storedAuth) : null
        const token = authData?.state?.token

        if (!token) {
          throw new Error("No authentication token found")
        }

        const response = await fetch(`${API_URL}/devices/${deviceId}/transfers`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          throw new Error("Failed to fetch transfer history")
        }

        const transferData = await response.json()
        setTransfers(transferData)
      } catch (err) {
        console.error("Error fetching transfer history:", err)
        setError(err instanceof Error ? err.message : "Failed to load transfer history")
      } finally {
        setIsLoading(false)
      }
    }

    if (deviceId) {
      fetchTransferHistory()
    }
  }, [deviceId])

  const displayedTransfers = showAll ? transfers : transfers.slice(0, 3)

  if (isLoading) {
    return (
      <Card title="Transfer History" className={className}>
        <div className="flex justify-center items-center py-8">
          <div className="w-6 h-6 rounded-full border-b-2 animate-spin border-primary-600"></div>
          <span className="ml-2 text-primary-600">Loading transfer history...</span>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card title="Transfer History" className={className}>
        <div className="py-8 text-center">
          <div className="text-error-600 mb-2">Failed to load transfer history</div>
          <div className="text-sm text-primary-500">{error}</div>
        </div>
      </Card>
    )
  }

  if (transfers.length === 0) {
    return (
      <Card title="Transfer History" className={className}>
        <div className="py-8 text-center">
          <div className="text-primary-500 mb-2">No transfer history found</div>
          <div className="text-sm text-primary-400">This device has not been transferred yet.</div>
        </div>
      </Card>
    )
  }

  return (
    <Card
      title="Transfer History"
      subtitle={`${transfers.length} transfer${transfers.length !== 1 ? "s" : ""} recorded`}
      className={className}
      headerAction={
        transfers.length > 3 && (
          <Button variant="ghost" size="sm" onClick={() => setShowAll(!showAll)}>
            {showAll ? "Show Less" : `Show All (${transfers.length})`}
          </Button>
        )
      }
    >
      <div className="space-y-4">
        {displayedTransfers.map((transfer, index) => (
          <div
            key={transfer.id}
            className={`relative p-4 rounded-lg border transition-colors hover:bg-primary-25 ${
              index === 0 ? "border-primary-200 bg-primary-50" : "border-primary-100"
            }`}
          >
            {/* Transfer Timeline Indicator */}
            <div className="absolute left-0 top-4 w-1 h-full bg-primary-200 rounded-full"></div>
            <div
              className={`absolute left-0 top-4 w-1 h-8 rounded-full ${
                index === 0 ? "bg-primary-500" : "bg-primary-300"
              }`}
            ></div>

            <div className="ml-6">
              {/* Transfer Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Clock size={16} className="text-primary-500" />
                  <span className="text-sm font-medium text-primary-900">
                    {format(new Date(transfer.transfer_date), "MMM dd, yyyy HH:mm")}
                  </span>
                  {index === 0 && (
                    <span className="px-2 py-1 text-xs font-medium bg-primary-100 text-primary-700 rounded-full">
                      Latest
                    </span>
                  )}
                </div>
              </div>

              {/* Transfer Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                {/* Owner Transfer */}
                <div className="flex items-center space-x-3">
                  <User size={16} className="text-primary-400 flex-shrink-0" />
                  <div className="flex items-center space-x-2 min-w-0">
                    {transfer.previous_owner && (
                      <>
                        <span className="text-sm text-primary-600 truncate">{transfer.previous_owner}</span>
                        <ArrowRight size={14} className="text-primary-400 flex-shrink-0" />
                      </>
                    )}
                    <span className="text-sm font-medium text-primary-900 truncate">{transfer.assigned_to}</span>
                  </div>
                </div>

                {/* Location Transfer */}
                {(transfer.location || transfer.transfer_location) && (
                  <div className="flex items-center space-x-3">
                    <MapPin size={16} className="text-primary-400 flex-shrink-0" />
                    <div className="flex items-center space-x-2 min-w-0">
                      {transfer.location && transfer.location !== transfer.transfer_location && (
                        <>
                          <span className="text-sm text-primary-600 truncate">{transfer.location}</span>
                          <ArrowRight size={14} className="text-primary-400 flex-shrink-0" />
                        </>
                      )}
                      <span className="text-sm font-medium text-primary-900 truncate">
                        {transfer.transfer_location}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Additional Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {/* Department */}
                {transfer.transfer_department && (
                  <div className="flex items-center space-x-2">
                    <Building size={14} className="text-primary-400" />
                    <span className="text-primary-600">Department:</span>
                    <span className="text-primary-900 font-medium">{transfer.transfer_department}</span>
                  </div>
                )}

                {/* Room/Floor */}
                {transfer.transfer_room_or_floor && (
                  <div className="flex items-center space-x-2">
                    <MapPin size={14} className="text-primary-400" />
                    <span className="text-primary-600">Room/Floor:</span>
                    <span className="text-primary-900 font-medium">{transfer.transfer_room_or_floor}</span>
                  </div>
                )}
              </div>

              {/* Transfer Reason */}
              {transfer.transfer_reason && (
                <div className="mt-3 p-3 bg-primary-25 rounded-md border border-primary-100">
                  <div className="flex items-start space-x-2">
                    <FileText size={14} className="text-primary-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-sm text-primary-600 font-medium">Reason:</span>
                      <p className="text-sm text-primary-900 mt-1">{transfer.transfer_reason}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Show More/Less Footer */}
      {transfers.length > 3 && (
        <div className="mt-6 pt-4 border-t border-primary-100 text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAll(!showAll)}
            className="text-primary-600 hover:text-primary-700"
          >
            {showAll
              ? "Show Less"
              : `View ${transfers.length - 3} More Transfer${transfers.length - 3 !== 1 ? "s" : ""}`}
          </Button>
        </div>
      )}
    </Card>
  )
}

export default TransferHistory

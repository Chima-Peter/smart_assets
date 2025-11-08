"use client"

import { useEffect, useState, useCallback } from "react"
import DashboardLayout from "@/components/DashboardLayout"
import LoadingSpinner from "@/components/LoadingSpinner"
import { TransferStatus } from "@/lib/prisma/enums"

interface Transfer {
  id: string
  asset: {
    id: string
    name: string
    assetCode: string
    type: string
    location: string | null
    room: string | null
  }
  fromUser: {
    name: string
    email: string
    department: string | null
  }
  toUser: {
    name: string
    email: string
    department: string | null
  }
  status: TransferStatus
  transferType?: string | null
  reason: string | null
  requestedAt: string
  approvedAt: string | null
  completedAt: string | null
  notes: string | null
  receiptNumber?: string | null
  initiatedByUser?: {
    name: string
    email: string
  }
  approvals: Array<{
    status: string
    comments: string | null
    approvedByUser: {
      name: string
      email: string
    }
    approvedAt: string
  }>
}

export default function OfficerTransfersPage() {
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const fetchTransfers = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterStatus !== "all") params.append("status", filterStatus)

    try {
      const res = await fetch(`/api/transfers?${params.toString()}`)
      const data = await res.json()
      setTransfers(data)
    } catch (error) {
      console.error("Error fetching transfers:", error)
      setMessage({ type: "error", text: "Failed to load transfers" })
    } finally {
      setLoading(false)
    }
  }, [filterStatus])

  useEffect(() => {
    fetchTransfers()
  }, [fetchTransfers])

  const getStatusBadge = (status: TransferStatus) => {
    const colors = {
      PENDING: "bg-amber-600 text-white",
      APPROVED: "bg-emerald-700 text-white",
      REJECTED: "bg-red-700 text-white",
      COMPLETED: "bg-blue-700 text-white",
    }
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold ${colors[status] || "bg-gray-700 text-white"}`}>
        {status.replace("_", " ")}
      </span>
    )
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—"
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <DashboardLayout>
      <div>
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Manage Transfers</h1>
          <a
            href="/officer/dashboard"
            className="px-4 py-2 bg-gray-900 text-white hover:bg-gray-800 rounded-lg transition-colors font-bold shadow-lg"
          >
            ← Back to Dashboard
          </a>
        </div>

        {/* Messages */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg border-2 font-bold ${
            message.type === "success" 
              ? "bg-emerald-50 border-emerald-800 text-emerald-900" 
              : "bg-red-50 border-red-800 text-red-900"
          }`}>
            {message.text}
            <button
              onClick={() => setMessage(null)}
              className="ml-4 text-sm font-bold underline text-gray-900"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Filter */}
        <div className="bg-white p-4 rounded-lg shadow mb-6 border border-gray-300">
          <div className="max-w-xs">
            <label className="block text-sm font-bold text-gray-900 mb-2">Filter by Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 bg-white text-gray-900 font-bold shadow-sm"
            >
              <option value="all">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>
        </div>

        {/* Transfers Table */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner size="lg" text="Loading transfers..." />
          </div>
        ) : transfers.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow border border-gray-300 text-center">
            <p className="text-gray-900 font-medium">No transfers found.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow border border-gray-300 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                      Asset
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                      From
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                      To
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                      Reason
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                      Requested At
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-300">
                  {transfers.map((transfer) => (
                    <tr key={transfer.id} className="hover:bg-gray-100">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900">{transfer.asset.name}</div>
                        <div className="text-xs font-mono text-gray-700">{transfer.asset.assetCode}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{transfer.fromUser.name}</div>
                        <div className="text-xs text-gray-700">{transfer.fromUser.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{transfer.toUser.name}</div>
                        <div className="text-xs text-gray-700">{transfer.toUser.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          {getStatusBadge(transfer.status)}
                          {transfer.transferType && (
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              transfer.transferType === "INTRA_DEPARTMENTAL" 
                                ? "bg-blue-100 text-blue-800" 
                                : "bg-purple-100 text-purple-800"
                            } font-bold`}>
                              {transfer.transferType.replace("_", "-")}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{transfer.reason || "—"}</div>
                        {transfer.initiatedByUser && (
                          <div className="text-xs text-gray-600 mt-1">
                            Initiated by: {transfer.initiatedByUser.name}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        {formatDate(transfer.requestedAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex flex-col gap-2">
                          {transfer.receiptNumber && (
                            <div className="text-xs">
                              <div className="font-bold text-gray-900">Receipt:</div>
                              <div className="font-mono text-blue-700">{transfer.receiptNumber}</div>
                              <button
                                onClick={() => window.open(`/api/transfers/${transfer.id}/receipt`, "_blank")}
                                className="mt-1 px-2 py-1 bg-blue-700 text-white rounded text-xs hover:bg-blue-800 font-bold"
                              >
                                View Receipt
                              </button>
                            </div>
                          )}
                          {transfer.approvals.length > 0 && (
                            <div className="space-y-1">
                              {transfer.approvals.map((approval, idx) => (
                                <div key={idx} className="text-xs">
                                  <span className={`font-bold ${approval.status === "APPROVED" ? "text-emerald-700" : "text-red-700"}`}>
                                    {approval.status}
                                  </span>
                                  {" by "}
                                  <span className="text-gray-900 font-medium">{approval.approvedByUser.name}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-gray-100 px-6 py-3 border-t-2 border-gray-300">
              <p className="text-sm font-bold text-gray-900">
                Showing <span className="text-gray-900">{transfers.length}</span> transfer{transfers.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}


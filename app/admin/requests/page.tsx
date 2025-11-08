"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import DashboardLayout from "@/components/DashboardLayout"
import LoadingSpinner from "@/components/LoadingSpinner"
import { RequestStatus } from "@/lib/prisma/enums"

interface Request {
  id: string
  asset: {
    id: string
    name: string
    assetCode: string
    type: string
  }
  requestedByUser: {
    name: string
    email: string
  }
  status: RequestStatus
  purpose: string | null
  requestedAt: string
  approvedAt: string | null
  fulfilledAt: string | null
  returnedAt: string | null
  notes: string | null
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

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [processing, setProcessing] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const fetchRequests = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterStatus !== "all") params.append("status", filterStatus)

    try {
      const res = await fetch(`/api/requests?${params.toString()}`)
      const data = await res.json()
      setRequests(data)
    } catch (error) {
      console.error("Error fetching requests:", error)
      setMessage({ type: "error", text: "Failed to load requests" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [filterStatus])

  const handleApprove = async (requestId: string, status: "APPROVED" | "REJECTED", comments?: string) => {
    setProcessing(requestId)
    setMessage(null)
    try {
      const response = await fetch(`/api/requests/${requestId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, comments }),
      })
      const data = await response.json()
      if (response.ok) {
        setMessage({ type: "success", text: `Request ${status.toLowerCase()} successfully` })
        await fetchRequests()
      } else {
        setMessage({ type: "error", text: data.error || "Failed to update request" })
      }
    } catch (error) {
      console.error("Error updating request:", error)
      setMessage({ type: "error", text: "An error occurred. Please try again." })
    } finally {
      setProcessing(null)
    }
  }

  const getStatusBadge = (status: RequestStatus) => {
    const colors = {
      PENDING: "bg-amber-600 text-white",
      APPROVED: "bg-emerald-700 text-white",
      REJECTED: "bg-red-700 text-white",
      FULFILLED: "bg-blue-700 text-white",
      RETURNED: "bg-slate-700 text-white",
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">All Requests</h1>
          <Link
            href="/admin/dashboard"
            className="w-full sm:w-auto px-4 py-2 bg-gray-800 text-white hover:bg-gray-900 rounded-lg transition-colors font-medium text-center sm:text-left"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* Messages */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg border-2 font-bold ${
            message.type === "success" 
              ? "bg-emerald-100 border-emerald-700 text-emerald-900" 
              : "bg-red-100 border-red-700 text-red-900"
          }`}>
            {message.text}
            <button
              onClick={() => setMessage(null)}
              className="ml-4 text-sm underline"
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
              className="w-full px-3 py-2 border-2 border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 bg-white text-gray-900 font-medium"
            >
              <option value="all">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="FULFILLED">Fulfilled</option>
              <option value="RETURNED">Returned</option>
            </select>
          </div>
        </div>

        {/* Requests Table */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner size="lg" text="Loading requests..." />
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow border border-gray-300 text-center">
            <p className="text-gray-900 font-medium">No requests found.</p>
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
                      Requested By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                      Purpose
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
                  {requests.map((request) => (
                    <tr key={request.id} className="hover:bg-gray-100">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900">{request.asset.name}</div>
                        <div className="text-xs font-mono text-gray-700">{request.asset.assetCode}</div>
                        <div className="text-xs text-gray-600">{request.asset.type}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{request.requestedByUser.name}</div>
                        <div className="text-xs text-gray-700">{request.requestedByUser.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(request.status)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{request.purpose || "—"}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        {formatDate(request.requestedAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex flex-col gap-2">
                          {request.status === "PENDING" && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleApprove(request.id, "APPROVED")}
                                disabled={processing === request.id}
                                className="px-3 py-1 bg-emerald-700 text-white rounded hover:bg-emerald-800 font-bold text-xs disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1 animate-pulse-on-submit"
                              >
                                {processing === request.id ? (
                                  <>
                                    <LoadingSpinner size="sm" />
                                    <span>Processing...</span>
                                  </>
                                ) : (
                                  "Approve"
                                )}
                              </button>
                              <button
                                onClick={() => handleApprove(request.id, "REJECTED")}
                                disabled={processing === request.id}
                                className="px-3 py-1 bg-red-700 text-white rounded hover:bg-red-800 font-bold text-xs disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1 animate-pulse-on-submit"
                              >
                                {processing === request.id ? (
                                  <>
                                    <LoadingSpinner size="sm" />
                                    <span>Processing...</span>
                                  </>
                                ) : (
                                  "Reject"
                                )}
                              </button>
                            </div>
                          )}
                          {request.approvals.length > 0 && (
                            <div className="space-y-1">
                              {request.approvals.map((approval, idx) => (
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
                Showing <span className="text-gray-900">{requests.length}</span> request{requests.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}


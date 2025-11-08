"use client"

import { useEffect, useState, useCallback } from "react"
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
    assetCategory: string | null
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
  issuedBy: string | null
  issuedByUser: {
    name: string
    email: string
  } | null
  issuedAt: string | null
  issuanceCondition: string | null
  issuanceNotes: string | null
  returnCondition: string | null
  returnNotes: string | null
  verifiedBy: string | null
  verifiedByUser: {
    name: string
    email: string
  } | null
  verifiedAt: string | null
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

export default function OfficerRequestsPage() {
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [processing, setProcessing] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [approvalModal, setApprovalModal] = useState<{ open: boolean; requestId: string | null; status: "APPROVED" | "REJECTED" | null }>({
    open: false,
    requestId: null,
    status: null
  })
  const [approvalData, setApprovalData] = useState({
    comments: "",
    issuanceCondition: "FUNCTIONAL" as "FUNCTIONAL" | "DAMAGED" | "GOOD" | "FAIR",
    issuanceNotes: ""
  })
  const [verifyModal, setVerifyModal] = useState<{ open: boolean; requestId: string | null }>({
    open: false,
    requestId: null
  })
  const [verifyData, setVerifyData] = useState({
    verifiedCondition: "FUNCTIONAL" as "FUNCTIONAL" | "DAMAGED" | "LOST" | "NEEDS_REPAIR" | "GOOD" | "FAIR",
    verificationNotes: ""
  })

  const fetchRequests = useCallback(async () => {
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
  }, [filterStatus])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  const openApprovalModal = (requestId: string, status: "APPROVED" | "REJECTED") => {
    setApprovalModal({ open: true, requestId, status })
    setApprovalData({
      comments: "",
      issuanceCondition: "FUNCTIONAL",
      issuanceNotes: ""
    })
  }

  const closeApprovalModal = () => {
    setApprovalModal({ open: false, requestId: null, status: null })
  }

  const handleApprove = async () => {
    if (!approvalModal.requestId || !approvalModal.status) return

    setProcessing(approvalModal.requestId)
    setMessage(null)
    try {
      const body: {
        status: "APPROVED" | "REJECTED"
        comments?: string
        issuanceCondition?: string
        issuanceNotes?: string
      } = {
        status: approvalModal.status,
        comments: approvalData.comments || undefined
      }

      if (approvalModal.status === "APPROVED") {
        body.issuanceCondition = approvalData.issuanceCondition
        body.issuanceNotes = approvalData.issuanceNotes || undefined
      }

      const response = await fetch(`/api/requests/${approvalModal.requestId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await response.json()
      if (response.ok) {
        setMessage({ type: "success", text: `Request ${approvalModal.status.toLowerCase()} successfully` })
        closeApprovalModal()
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

  const openVerifyModal = (requestId: string) => {
    const request = requests.find(r => r.id === requestId)
    setVerifyModal({ open: true, requestId })
    setVerifyData({
      verifiedCondition: (request?.returnCondition as any) || "FUNCTIONAL",
      verificationNotes: request?.returnNotes || ""
    })
  }

  const closeVerifyModal = () => {
    setVerifyModal({ open: false, requestId: null })
  }

  const handleVerifyReturn = async () => {
    if (!verifyModal.requestId) return

    setProcessing(verifyModal.requestId)
    setMessage(null)
    try {
      const response = await fetch(`/api/requests/${verifyModal.requestId}/verify-return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(verifyData),
      })
      const data = await response.json()
      if (response.ok) {
        setMessage({ type: "success", text: "Return verified successfully" })
        closeVerifyModal()
        await fetchRequests()
      } else {
        setMessage({ type: "error", text: data.error || "Failed to verify return" })
      }
    } catch (error) {
      console.error("Error verifying return:", error)
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
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Approve Requests</h1>
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
                                onClick={() => openApprovalModal(request.id, "APPROVED")}
                                disabled={processing === request.id}
                                className="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 font-bold text-xs disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => openApprovalModal(request.id, "REJECTED")}
                                disabled={processing === request.id}
                                className="px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 font-bold text-xs disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                          {request.status === "RETURNED" && !request.verifiedAt && (
                            <button
                              onClick={() => openVerifyModal(request.id)}
                              disabled={processing === request.id}
                              className="px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 font-bold text-xs disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                            >
                              Verify Return
                            </button>
                          )}
                          {request.issuedAt && (
                            <div className="text-xs text-gray-700">
                              <div className="font-bold text-gray-900">Issued:</div>
                              <div>{new Date(request.issuedAt).toLocaleDateString()}</div>
                              {request.issuedByUser && (
                                <div>By: {request.issuedByUser.name}</div>
                              )}
                              {request.issuanceCondition && (
                                <div>Condition: <span className="font-bold">{request.issuanceCondition}</span></div>
                              )}
                            </div>
                          )}
                          {request.returnedAt && (
                            <div className="text-xs text-gray-700">
                              <div className="font-bold text-gray-900">Returned:</div>
                              <div>{new Date(request.returnedAt).toLocaleDateString()}</div>
                              {request.returnCondition && (
                                <div>Condition: <span className="font-bold">{request.returnCondition}</span></div>
                              )}
                              {request.verifiedAt && request.verifiedByUser && (
                                <div className="text-green-700 font-bold">✓ Verified by {request.verifiedByUser.name}</div>
                              )}
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

        {/* Approval Modal */}
        {approvalModal.open && approvalModal.requestId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4 border-2 border-gray-800">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {approvalModal.status === "APPROVED" ? "Approve Request" : "Reject Request"}
              </h3>
              <div className="space-y-4">
                {approvalModal.status === "APPROVED" && (
                  <>
                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2">
                        Issuance Condition *
                      </label>
                      <select
                        value={approvalData.issuanceCondition}
                        onChange={(e) => setApprovalData({ ...approvalData, issuanceCondition: e.target.value as any })}
                        className="w-full px-4 py-2 border-2 border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-gray-900 font-bold"
                      >
                        <option value="FUNCTIONAL">Functional</option>
                        <option value="GOOD">Good</option>
                        <option value="FAIR">Fair</option>
                        <option value="DAMAGED">Damaged</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2">
                        Issuance Notes
                      </label>
                      <textarea
                        value={approvalData.issuanceNotes}
                        onChange={(e) => setApprovalData({ ...approvalData, issuanceNotes: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-2 border-2 border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-gray-900"
                        placeholder="Any notes about the asset condition at issuance..."
                      />
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Comments {approvalModal.status === "REJECTED" && "*"}
                  </label>
                  <textarea
                    value={approvalData.comments}
                    onChange={(e) => setApprovalData({ ...approvalData, comments: e.target.value })}
                    rows={3}
                    required={approvalModal.status === "REJECTED"}
                    className="w-full px-4 py-2 border-2 border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-gray-900"
                    placeholder={approvalModal.status === "APPROVED" ? "Optional comments..." : "Please provide a reason for rejection..."}
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleApprove}
                    disabled={processing === approvalModal.requestId || (approvalModal.status === "REJECTED" && !approvalData.comments)}
                    className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processing === approvalModal.requestId ? "Processing..." : "Confirm"}
                  </button>
                  <button
                    onClick={closeApprovalModal}
                    disabled={processing === approvalModal.requestId}
                    className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-bold disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Verify Return Modal */}
        {verifyModal.open && verifyModal.requestId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4 border-2 border-gray-800">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Verify Return</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Verified Condition *
                  </label>
                  <select
                    value={verifyData.verifiedCondition}
                    onChange={(e) => setVerifyData({ ...verifyData, verifiedCondition: e.target.value as any })}
                    className="w-full px-4 py-2 border-2 border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-gray-900 font-bold"
                  >
                    <option value="FUNCTIONAL">Functional</option>
                    <option value="GOOD">Good</option>
                    <option value="FAIR">Fair</option>
                    <option value="DAMAGED">Damaged</option>
                    <option value="NEEDS_REPAIR">Needs Repair</option>
                    <option value="LOST">Lost</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Verification Notes
                  </label>
                  <textarea
                    value={verifyData.verificationNotes}
                    onChange={(e) => setVerifyData({ ...verifyData, verificationNotes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border-2 border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-gray-900"
                    placeholder="Any notes about the verification..."
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleVerifyReturn}
                    disabled={processing === verifyModal.requestId}
                    className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processing === verifyModal.requestId ? "Processing..." : "Verify"}
                  </button>
                  <button
                    onClick={closeVerifyModal}
                    disabled={processing === verifyModal.requestId}
                    className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-bold disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}


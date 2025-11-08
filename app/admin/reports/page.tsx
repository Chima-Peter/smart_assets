"use client"

import { useEffect, useState } from "react"
import DashboardLayout from "@/components/DashboardLayout"
import LoadingSpinner from "@/components/LoadingSpinner"

interface SummaryData {
  assets?: {
    total: number
    available: number
    allocated: number
  }
  requests?: {
    total: number
    pending: number
  }
  transfers?: {
    total: number
    pending: number
  }
}

interface ReportData extends SummaryData {
  assets?: Array<{
    id: string
    name: string
    assetCode: string
    type: string
    status: string
    registeredByUser: { name: string }
    allocatedToUser: { name: string } | null
  }>
  requests?: Array<{
    id: string
    asset: { name: string; assetCode: string }
    requestedByUser: { name: string; email: string }
    status: string
    requestedAt: string
  }>
  transfers?: Array<{
    id: string
    asset: { name: string; assetCode: string }
    fromUser: { name: string; email: string }
    toUser: { name: string; email: string }
    status: string
    requestedAt: string
  }>
}

export default function AdminReportsPage() {
  const [reportType, setReportType] = useState<string>("summary")
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchReport = async () => {
    if (!reportType) return
    setLoading(true)
    try {
      const res = await fetch(`/api/reports?type=${reportType}`)
      const data = await res.json()
      setData(data)
    } catch (error) {
      console.error("Error fetching report:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReport()
  }, [reportType])

  return (
    <DashboardLayout>
      <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Reports</h1>
          <a
            href="/admin/dashboard"
            className="w-full sm:w-auto px-4 py-2 bg-gray-800 text-white hover:bg-gray-900 rounded-lg transition-colors font-medium text-center sm:text-left"
          >
            ← Back to Dashboard
          </a>
        </div>

        {/* Report Type Selector */}
        <div className="bg-white p-4 rounded-lg shadow mb-6 border border-gray-300">
          <label className="block text-sm font-bold text-gray-900 mb-2">Report Type</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="w-full max-w-xs px-3 py-2 border-2 border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 bg-white text-gray-900 font-medium"
          >
            <option value="summary">Summary</option>
            <option value="assets">All Assets</option>
            <option value="requests">All Requests</option>
            <option value="transfers">All Transfers</option>
          </select>
        </div>

        {/* Report Content */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner size="lg" text="Generating report..." />
          </div>
        ) : reportType === "summary" && data ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow border-2 border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Assets</h3>
              <p className="text-3xl font-bold text-gray-900">
                {typeof data.assets === "object" && "total" in data.assets ? data.assets.total : Array.isArray(data.assets) ? data.assets.length : 0}
              </p>
              <p className="text-sm text-gray-700 mt-2 font-medium">
                {typeof data.assets === "object" && "available" in data.assets ? `${data.assets.available} available, ${data.assets.allocated} allocated` : ""}
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow border-2 border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Requests</h3>
              <p className="text-3xl font-bold text-gray-900">
                {typeof data.requests === "object" && "total" in data.requests ? data.requests.total : Array.isArray(data.requests) ? data.requests.length : 0}
              </p>
              <p className="text-sm text-gray-700 mt-2 font-medium">
                {typeof data.requests === "object" && "pending" in data.requests ? `${data.requests.pending} pending approval` : ""}
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow border-2 border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Transfers</h3>
              <p className="text-3xl font-bold text-gray-900">
                {typeof data.transfers === "object" && "total" in data.transfers ? data.transfers.total : Array.isArray(data.transfers) ? data.transfers.length : 0}
              </p>
              <p className="text-sm text-gray-700 mt-2 font-medium">
                {typeof data.transfers === "object" && "pending" in data.transfers ? `${data.transfers.pending} pending approval` : ""}
              </p>
            </div>
          </div>
        ) : data && (Array.isArray(data.assets) || Array.isArray(data.requests) || Array.isArray(data.transfers)) ? (
          <div className="bg-white rounded-lg shadow border border-gray-300 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-800">
                  <tr>
                    {reportType === "assets" && (
                      <>
                        <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase">Asset Code</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase">Registered By</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase">Allocated To</th>
                      </>
                    )}
                    {reportType === "requests" && (
                      <>
                        <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase">Asset</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase">Requested By</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase">Requested At</th>
                      </>
                    )}
                    {reportType === "transfers" && (
                      <>
                        <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase">Asset</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase">From</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase">To</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase">Requested At</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-300">
                  {reportType === "assets" && data.assets?.map((asset) => (
                    <tr key={asset.id} className="hover:bg-gray-100">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-bold text-gray-900">{asset.assetCode}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{asset.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{asset.type}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{asset.status}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{asset.registeredByUser.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{asset.allocatedToUser?.name || "—"}</td>
                    </tr>
                  ))}
                  {reportType === "requests" && data.requests?.map((request) => (
                    <tr key={request.id} className="hover:bg-gray-100">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900">{request.asset.name}</div>
                        <div className="text-xs font-mono text-gray-700">{request.asset.assetCode}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{request.requestedByUser.name}</div>
                        <div className="text-xs text-gray-700">{request.requestedByUser.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{request.status}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(request.requestedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                  {reportType === "transfers" && data.transfers?.map((transfer) => (
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{transfer.status}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(transfer.requestedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white p-8 rounded-lg shadow border border-gray-300 text-center">
            <p className="text-gray-900 font-medium">No data available.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}


"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import DashboardLayout from "@/components/DashboardLayout"
import LoadingSpinner from "@/components/LoadingSpinner"

type ReportData = {
  assets?: 
    | {
        total: number
        available: number
        allocated: number
      }
    | Array<{
        id: string
        name: string
        assetCode: string
        type: string
        status: string
        registeredByUser: { name: string }
        allocatedToUser: { name: string } | null
      }>
  requests?: 
    | {
        total: number
        pending: number
      }
    | Array<{
        id: string
        asset: { name: string; assetCode: string }
        requestedByUser: { name: string; email: string }
        status: string
        requestedAt: string
      }>
  transfers?: 
    | {
        total: number
        pending: number
      }
    | Array<{
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
      if (!res.ok) {
        throw new Error(`Failed to fetch report: ${res.statusText}`)
      }
      const data = await res.json()
      setData(data)
    } catch (error) {
      console.error("Error fetching report:", error)
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = () => {
    if (!data) return

    let csvContent = ""
    let filename = ""

    if (reportType === "assets" && Array.isArray(data.assets)) {
      filename = `assets-report-${new Date().toISOString().split("T")[0]}.csv`
      csvContent = "Asset Code,Name,Type,Status,Registered By,Allocated To\n"
      data.assets.forEach((asset) => {
        csvContent += `"${asset.assetCode}","${asset.name}","${asset.type}","${asset.status}","${asset.registeredByUser?.name || ""}","${asset.allocatedToUser?.name || ""}"\n`
      })
    } else if (reportType === "requests" && Array.isArray(data.requests)) {
      filename = `requests-report-${new Date().toISOString().split("T")[0]}.csv`
      csvContent = "Asset Name,Asset Code,Requested By,Email,Status,Requested At\n"
      data.requests.forEach((request) => {
        const date = new Date(request.requestedAt).toLocaleDateString()
        csvContent += `"${request.asset.name}","${request.asset.assetCode}","${request.requestedByUser.name}","${request.requestedByUser.email}","${request.status}","${date}"\n`
      })
    } else if (reportType === "transfers" && Array.isArray(data.transfers)) {
      filename = `transfers-report-${new Date().toISOString().split("T")[0]}.csv`
      csvContent = "Asset Name,Asset Code,From,From Email,To,To Email,Status,Requested At\n"
      data.transfers.forEach((transfer) => {
        const date = new Date(transfer.requestedAt).toLocaleDateString()
        csvContent += `"${transfer.asset.name}","${transfer.asset.assetCode}","${transfer.fromUser.name}","${transfer.fromUser.email}","${transfer.toUser.name}","${transfer.toUser.email}","${transfer.status}","${date}"\n`
      })
    } else {
      alert("No data available to export")
      return
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", filename)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  useEffect(() => {
    fetchReport()
  }, [reportType])

  return (
    <DashboardLayout>
      <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Reports</h1>
          <Link
            href="/admin/dashboard"
            className="w-full sm:w-auto px-4 py-2 bg-gray-800 text-white hover:bg-gray-900 rounded-lg transition-colors font-medium text-center sm:text-left"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* Report Type Selector */}
        <div className="bg-white p-4 rounded-lg shadow mb-6 border border-gray-300">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div className="flex-1">
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
            {reportType !== "summary" && data && (Array.isArray(data.assets) || Array.isArray(data.requests) || Array.isArray(data.transfers)) && (
              <button
                onClick={exportToCSV}
                className="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 font-bold transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export CSV
              </button>
            )}
          </div>
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
          <>
            {(reportType === "assets" && (!data.assets || !Array.isArray(data.assets) || data.assets.length === 0)) ||
              (reportType === "requests" && (!data.requests || !Array.isArray(data.requests) || data.requests.length === 0)) ||
              (reportType === "transfers" && (!data.transfers || !Array.isArray(data.transfers) || data.transfers.length === 0)) ? (
              <div className="bg-white p-8 rounded-lg shadow border border-gray-300 text-center">
                <p className="text-gray-900 font-medium">No data available for this report type.</p>
              </div>
            ) : (
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
                      {reportType === "assets" && Array.isArray(data.assets) && data.assets.map((asset) => (
                        <tr key={asset.id} className="hover:bg-gray-100">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-bold text-gray-900">{asset.assetCode}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{asset.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{asset.type}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{asset.status}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{asset.registeredByUser?.name || "—"}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{asset.allocatedToUser?.name || "—"}</td>
                        </tr>
                      ))}
                      {reportType === "requests" && Array.isArray(data.requests) && data.requests.map((request) => (
                        <tr key={request.id} className="hover:bg-gray-100">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-bold text-gray-900">{request.asset?.name || "—"}</div>
                            <div className="text-xs font-mono text-gray-700">{request.asset?.assetCode || "—"}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{request.requestedByUser?.name || "—"}</div>
                            <div className="text-xs text-gray-700">{request.requestedByUser?.email || "—"}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{request.status}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {request.requestedAt ? new Date(request.requestedAt).toLocaleDateString() : "—"}
                          </td>
                        </tr>
                      ))}
                      {reportType === "transfers" && Array.isArray(data.transfers) && data.transfers.map((transfer) => (
                        <tr key={transfer.id} className="hover:bg-gray-100">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-bold text-gray-900">{transfer.asset?.name || "—"}</div>
                            <div className="text-xs font-mono text-gray-700">{transfer.asset?.assetCode || "—"}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{transfer.fromUser?.name || "—"}</div>
                            <div className="text-xs text-gray-700">{transfer.fromUser?.email || "—"}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{transfer.toUser?.name || "—"}</div>
                            <div className="text-xs text-gray-700">{transfer.toUser?.email || "—"}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{transfer.status}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {transfer.requestedAt ? new Date(transfer.requestedAt).toLocaleDateString() : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="bg-gray-100 px-6 py-3 border-t-2 border-gray-300">
                  <p className="text-sm font-bold text-gray-900">
                    Showing{" "}
                    {reportType === "assets" && Array.isArray(data.assets)
                      ? data.assets.length
                      : reportType === "requests" && Array.isArray(data.requests)
                      ? data.requests.length
                      : reportType === "transfers" && Array.isArray(data.transfers)
                      ? data.transfers.length
                      : 0}{" "}
                    {reportType === "assets"
                      ? "asset"
                      : reportType === "requests"
                      ? "request"
                      : "transfer"}
                    {(reportType === "assets" && Array.isArray(data.assets) && data.assets.length !== 1) ||
                    (reportType === "requests" && Array.isArray(data.requests) && data.requests.length !== 1) ||
                    (reportType === "transfers" && Array.isArray(data.transfers) && data.transfers.length !== 1)
                      ? "s"
                      : ""}
                  </p>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white p-8 rounded-lg shadow border border-gray-300 text-center">
            <p className="text-gray-900 font-medium">No data available.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}


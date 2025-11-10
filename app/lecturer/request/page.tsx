"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import DashboardLayout from "@/components/DashboardLayout"
import LoadingSpinner from "@/components/LoadingSpinner"
import { AssetType, AssetStatus } from "@/lib/prisma/enums"

interface Asset {
  id: string
  name: string
  description: string | null
  assetCode: string
  type: AssetType
  status: AssetStatus
  category: string | null
  location: string | null
  quantity: number | null
  allocatedQuantity: number | null
  unit: string | null
}

export default function LecturerRequestPage() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<string>("")
  const [requestedQuantity, setRequestedQuantity] = useState<string>("1")
  const [purpose, setPurpose] = useState("")
  const [notes, setNotes] = useState("")
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [filterType, setFilterType] = useState<string>("all")

  const fetchAssets = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    params.append("status", "AVAILABLE")
    if (filterType !== "all") params.append("type", filterType)

    try {
      const res = await fetch(`/api/assets?${params.toString()}`)
      const data = await res.json()
      setAssets(data)
    } catch (error) {
      console.error("Error fetching assets:", error)
      setMessage({ type: "error", text: "Failed to load available assets" })
    } finally {
      setLoading(false)
    }
  }, [filterType])

  useEffect(() => {
    fetchAssets()
  }, [fetchAssets])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAsset) {
      setMessage({ type: "error", text: "Please select an asset" })
      return
    }

    setSubmitting(true)
    setMessage(null)

    try {
      const response = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: selectedAsset,
          requestedQuantity: parseInt(requestedQuantity) || 1,
          purpose: purpose || undefined,
          notes: notes || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setMessage({ type: "error", text: data.error || "Failed to create request" })
        setSubmitting(false)
        return
      }

      setMessage({ type: "success", text: "Request created successfully!" })
      setSelectedAsset("")
      setRequestedQuantity("1")
      setPurpose("")
      setNotes("")
      await fetchAssets()
    } catch (err) {
      console.error("Error creating request:", err)
      setMessage({ type: "error", text: "An error occurred. Please try again." })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <DashboardLayout>
      <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Request Asset</h1>
          <Link
            href="/lecturer/dashboard"
            className="w-full sm:w-auto px-4 py-2 bg-gray-900 text-white hover:bg-gray-800 rounded-lg transition-colors font-bold shadow-lg text-center sm:text-left"
          >
            ← Back to Dashboard
          </Link>
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Request Form */}
          <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-gray-200">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-gray-200">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-md">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Request Information</h2>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Select Asset *
                </label>
                <select
                  required
                  value={selectedAsset}
                  onChange={(e) => setSelectedAsset(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 bg-white text-gray-900 font-bold shadow-sm"
                >
                  <option value="">-- Select an asset --</option>
                  {assets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.name} ({asset.assetCode}) - {asset.type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Quantity Needed *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={requestedQuantity}
                  onChange={(e) => setRequestedQuantity(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-gray-900 font-medium shadow-sm"
                />
                {selectedAsset && (() => {
                  const asset = assets.find(a => a.id === selectedAsset)
                  if (asset) {
                    const totalQty = asset.quantity ?? 1
                    const allocatedQty = asset.allocatedQuantity ?? 0
                    const availableQty = totalQty - allocatedQty
                    return (
                      <p className="text-xs text-gray-600 mt-1">
                        Available: {availableQty} {asset.unit || "units"}
                      </p>
                    )
                  }
                  return null
                })()}
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Purpose
                </label>
                <textarea
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  rows={3}
                  placeholder="What will you use this asset for?"
                  className="w-full px-4 py-3 border-2 border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-gray-900 font-medium shadow-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Additional Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Any additional information?"
                  className="w-full px-4 py-3 border-2 border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-gray-900 font-medium shadow-sm"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !selectedAsset}
                className="w-full px-6 py-4 bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-xl hover:from-gray-800 hover:to-gray-700 font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 text-lg"
              >
                {submitting ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Submit Request</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Available Assets */}
          <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-gray-200">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-gray-200">
              <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-green-700 rounded-lg flex items-center justify-center shadow-md">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Available Assets</h2>
            </div>

            {/* Filter */}
            <div className="mb-4">
              <label className="block text-sm font-bold text-gray-900 mb-2">Filter by Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 bg-white text-gray-900 font-bold shadow-sm"
              >
                <option value="all">All Types</option>
                <option value="CONSUMABLE">Consumable</option>
                <option value="TEACHING_AID">Teaching Aid</option>
                <option value="EQUIPMENT">Equipment</option>
                <option value="FURNITURE">Furniture</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-12">
                <LoadingSpinner size="lg" text="Loading assets..." />
              </div>
            ) : assets.length === 0 ? (
              <div className="p-8 border-2 border-gray-300 rounded-lg text-center text-gray-700 font-medium">
                <p>No available assets found.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {assets.map((asset) => (
                  <div
                    key={asset.id}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedAsset === asset.id
                        ? "border-gray-900 bg-gray-100"
                        : "border-gray-300 hover:border-gray-700"
                    }`}
                    onClick={() => setSelectedAsset(asset.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900">{asset.name}</h3>
                        <p className="text-sm font-mono text-gray-700 mt-1">{asset.assetCode}</p>
                        <div className="flex gap-2 mt-2">
                          <span className="px-2 py-1 rounded text-xs font-bold bg-gray-800 text-white">
                            {asset.type.replace("_", " ")}
                          </span>
                          {asset.category && (
                            <span className="px-2 py-1 rounded text-xs font-medium bg-gray-200 text-gray-900">
                              {asset.category}
                            </span>
                          )}
                        </div>
                        {asset.description && (
                          <p className="text-sm text-gray-700 mt-2">{asset.description}</p>
                        )}
                        {asset.location && (
                          <p className="text-xs text-gray-600 mt-1">📍 {asset.location}</p>
                        )}
                      </div>
                      {selectedAsset === asset.id && (
                        <div className="ml-2">
                          <svg className="w-6 h-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}


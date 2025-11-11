"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import DashboardLayout from "@/components/DashboardLayout"
import LoadingSpinner from "@/components/LoadingSpinner"
import { AssetType } from "@/lib/prisma/enums"

interface Asset {
  id: string
  name: string
  description: string | null
  assetCode: string
  type: AssetType
  category: string | null
  location: string | null
  quantity: number | null
  allocatedQuantity: number | null
  unit: string | null
  registeredByUser: {
    name: string
    email: string
  }
  createdAt: string
}

export default function CourseRepConsumablesPage() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedAsset, setSelectedAsset] = useState<string>("")
  const [requestedQuantity, setRequestedQuantity] = useState<string>("1")
  const [purpose, setPurpose] = useState("")
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [showRequestForm, setShowRequestForm] = useState(false)

  const fetchAssets = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/assets?type=CONSUMABLE")
      const data = await res.json()
      setAssets(data)
    } catch (error) {
      console.error("Error fetching consumables:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAssets()
  }, [fetchAssets])

  const filteredAssets = assets.filter((asset) =>
    asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.assetCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (asset.description && asset.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (asset.category && asset.category.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const selectedAssetData = assets.find(a => a.id === selectedAsset)

  const handleRequest = async (e: React.FormEvent) => {
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

      setMessage({ type: "success", text: "Request created successfully! It is now pending approval." })
      setSelectedAsset("")
      setRequestedQuantity("1")
      setPurpose("")
      setNotes("")
      setShowRequestForm(false)
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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Available Consumables</h1>
          <Link
            href="/course-rep/dashboard"
            className="w-full sm:w-auto px-4 py-2 bg-gray-900 text-white hover:bg-gray-800 rounded-lg transition-colors font-bold shadow-lg text-center sm:text-left"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg border-2 font-bold ${
              message.type === "success"
                ? "bg-emerald-50 border-emerald-800 text-emerald-900"
                : "bg-red-50 border-red-800 text-red-900"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Request Form */}
        {showRequestForm && (
          <div className="bg-white p-6 rounded-lg shadow mb-6 border-2 border-gray-800">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Request Consumable</h2>
            <form onSubmit={handleRequest} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Select Asset *</label>
                <select
                  value={selectedAsset}
                  onChange={(e) => {
                    setSelectedAsset(e.target.value)
                    const asset = assets.find(a => a.id === e.target.value)
                    if (asset) {
                      const available = (asset.quantity ?? 1) - (asset.allocatedQuantity ?? 0)
                      if (available < parseInt(requestedQuantity)) {
                        setRequestedQuantity(available.toString())
                      }
                    }
                  }}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 bg-white text-gray-900 font-medium"
                >
                  <option value="">-- Select Consumable --</option>
                  {filteredAssets.map((asset) => {
                    const available = (asset.quantity ?? 1) - (asset.allocatedQuantity ?? 0)
                    return (
                      <option key={asset.id} value={asset.id}>
                        {asset.name} ({asset.assetCode}) - Available: {available} {asset.unit || "units"}
                      </option>
                    )
                  })}
                </select>
                {selectedAssetData && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-bold text-gray-900">Available: {(selectedAssetData.quantity ?? 1) - (selectedAssetData.allocatedQuantity ?? 0)} {selectedAssetData.unit || "units"}</p>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Quantity Needed *</label>
                <input
                  type="number"
                  required
                  min="1"
                  max={selectedAssetData ? (selectedAssetData.quantity ?? 1) - (selectedAssetData.allocatedQuantity ?? 0) : undefined}
                  value={requestedQuantity}
                  onChange={(e) => setRequestedQuantity(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 bg-white text-gray-900 font-medium"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Purpose *</label>
                <textarea
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  required
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 bg-white text-gray-900 font-medium"
                  placeholder="Explain why you need this consumable..."
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Additional Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-3 border-2 border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 bg-white text-gray-900 font-medium"
                  placeholder="Any additional information..."
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-gray-900 text-white hover:bg-gray-800 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    "Submit Request"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowRequestForm(false)
                    setSelectedAsset("")
                    setRequestedQuantity("1")
                    setPurpose("")
                    setNotes("")
                    setMessage(null)
                  }}
                  className="px-6 py-2 bg-gray-600 text-white hover:bg-gray-700 rounded-lg font-bold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Search and Request Button */}
        <div className="bg-white p-4 rounded-lg shadow mb-6 border border-gray-300">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, code, description, or category..."
              className="flex-1 px-4 py-3 border-2 border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-gray-900 font-medium shadow-sm"
            />
            <button
              onClick={() => setShowRequestForm(!showRequestForm)}
              className="px-6 py-3 bg-gray-900 text-white hover:bg-gray-800 rounded-lg transition-colors font-bold whitespace-nowrap"
            >
              {showRequestForm ? "Cancel Request" : "+ Request Consumable"}
            </button>
          </div>
        </div>

        {/* Assets Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner size="lg" text="Loading consumables..." />
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow border border-gray-300 text-center">
            <p className="text-gray-900 font-medium">
              {searchTerm ? "No consumables found matching your search." : "No consumables available."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAssets.map((asset) => (
              <div
                key={asset.id}
                className="bg-white p-6 rounded-xl shadow-lg border-2 border-gray-200 hover:border-gray-400 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{asset.name}</h3>
                    <p className="text-sm font-mono text-gray-700">{asset.assetCode}</p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-700 text-white">
                    Consumable
                  </span>
                </div>

                {asset.description && (
                  <p className="text-sm text-gray-700 mb-3">{asset.description}</p>
                )}

                <div className="space-y-2 text-sm">
                  {asset.category && (
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">Category:</span>
                      <span className="text-gray-700">{asset.category}</span>
                    </div>
                  )}
                  {asset.location && (
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-gray-700">{asset.location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">Registered by:</span>
                    <span className="text-gray-700">{asset.registeredByUser.name}</span>
                  </div>
                  {asset.quantity !== null && (
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">Available:</span>
                      <span className="text-gray-700">
                        {(asset.quantity ?? 1) - (asset.allocatedQuantity ?? 0)} {asset.unit || "units"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && filteredAssets.length > 0 && (
          <div className="mt-6 bg-gray-100 px-6 py-3 rounded-lg border-2 border-gray-300">
            <p className="text-sm font-bold text-gray-900">
              Showing <span className="text-gray-900">{filteredAssets.length}</span> of <span className="text-gray-900">{assets.length}</span> consumable{assets.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}


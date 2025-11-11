"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import DashboardLayout from "@/components/DashboardLayout"
import LoadingSpinner from "@/components/LoadingSpinner"
import BarcodeScanner from "@/components/BarcodeScanner"
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
  minStockLevel: number | null
  unit: string | null
  registeredByUser: {
    name: string
    email: string
  }
  allocatedToUser: {
    name: string
    email: string
  } | null
  createdAt: string
}

export default function OfficerAssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterType, setFilterType] = useState<string>("all")
  const [showScanner, setShowScanner] = useState(false)
  const [searchCode, setSearchCode] = useState("")
  const [barcodeScanningEnabled, setBarcodeScanningEnabled] = useState(true)

  const fetchAssets = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterStatus !== "all") params.append("status", filterStatus)
    if (filterType !== "all") params.append("type", filterType)

    try {
      const res = await fetch(`/api/assets?${params.toString()}`)
      const data = await res.json()
      setAssets(data)
    } catch (error) {
      console.error("Error fetching assets:", error)
    } finally {
      setLoading(false)
    }
  }, [filterStatus, filterType])

  useEffect(() => {
    fetchAssets()
  }, [fetchAssets])

  useEffect(() => {
    // Check if barcode scanning is enabled
    fetch("/api/system-config/check?key=feature.barcode.scanning&type=boolean")
      .then((res) => res.json())
      .then((data) => {
        setBarcodeScanningEnabled(data.value === true || data.value === "true")
      })
      .catch(() => {
        // Default to enabled if check fails
        setBarcodeScanningEnabled(true)
      })
  }, [])

  const handleScan = (code: string) => {
    setSearchCode(code)
    setShowScanner(false)
    if (code) {
      const filtered = assets.filter((asset) => 
        asset.assetCode.toLowerCase().includes(code.toLowerCase())
      )
      setAssets(filtered)
    } else {
      fetchAssets()
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchCode) {
      const filtered = assets.filter((asset) => 
        asset.assetCode.toLowerCase().includes(searchCode.toLowerCase())
      )
      setAssets(filtered)
    } else {
      fetchAssets()
    }
  }

  const getStatusBadge = (status: AssetStatus) => {
    const colors = {
      AVAILABLE: "bg-emerald-700 text-white",
      ALLOCATED: "bg-blue-700 text-white",
      MAINTENANCE: "bg-amber-600 text-white",
      RETIRED: "bg-gray-700 text-white",
      TRANSFER_PENDING: "bg-orange-600 text-white",
      PENDING_APPROVAL: "bg-yellow-600 text-white",
    }
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold ${colors[status] || "bg-gray-700 text-white"}`}>
        {status.replace("_", " ")}
      </span>
    )
  }

  const getTypeBadge = (type: AssetType) => {
    return (
      <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-800 text-white">
        {type.replace("_", " ")}
      </span>
    )
  }

  return (
    <DashboardLayout>
      <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Assets</h1>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
            {barcodeScanningEnabled && (
              <button
                onClick={() => setShowScanner(true)}
                className="w-full sm:w-auto px-4 py-2 bg-blue-700 text-white hover:bg-blue-800 rounded-lg transition-colors font-bold shadow-lg text-center"
              >
                📷 Scan Barcode
              </button>
            )}
            <Link
              href="/officer/dashboard"
              className="px-4 py-2 bg-gray-900 text-white hover:bg-gray-800 rounded-lg transition-colors font-bold shadow-lg"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Barcode Search */}
        <div className="bg-white p-4 rounded-lg shadow mb-6 border border-gray-300">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={searchCode}
              onChange={(e) => {
                setSearchCode(e.target.value)
                if (!e.target.value) fetchAssets()
              }}
              placeholder="Search by asset code..."
              className="flex-1 px-4 py-3 border-2 border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-gray-900 font-medium shadow-sm"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-bold shadow-lg"
            >
              Search
            </button>
            {searchCode && (
              <button
                type="button"
                onClick={() => {
                  setSearchCode("")
                  fetchAssets()
                }}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-bold shadow-lg"
              >
                Clear
              </button>
            )}
          </form>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow mb-6 border border-gray-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Filter by Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 bg-white text-gray-900 font-bold shadow-sm"
              >
                <option value="all">All Statuses</option>
                <option value="AVAILABLE">Available</option>
                <option value="ALLOCATED">Allocated</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="RETIRED">Retired</option>
                <option value="TRANSFER_PENDING">Transfer Pending</option>
              </select>
            </div>
            <div>
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
          </div>
        </div>

        {/* Assets Table */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner size="lg" text="Loading assets..." />
          </div>
        ) : assets.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow border border-gray-300 text-center">
            <p className="text-gray-900 font-medium">No assets found.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow border border-gray-300 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                      Asset Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                      Registered By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                      Allocated To
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                      Quantity
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-300">
                  {assets.map((asset) => (
                    <tr key={asset.id} className="hover:bg-gray-100">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-bold text-gray-900">
                        {asset.assetCode}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900">{asset.name}</div>
                        {asset.description && (
                          <div className="text-sm text-gray-700">{asset.description}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getTypeBadge(asset.type)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(asset.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="font-medium">{asset.registeredByUser.name}</div>
                        <div className="text-xs text-gray-700">{asset.registeredByUser.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {asset.allocatedToUser ? (
                          <>
                            <div className="font-medium">{asset.allocatedToUser.name}</div>
                            <div className="text-xs text-gray-700">{asset.allocatedToUser.email}</div>
                          </>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {asset.location || "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {asset.type === "CONSUMABLE" && asset.quantity !== null ? (
                          <div>
                            <div className="font-bold text-gray-900">
                              {asset.quantity} {asset.unit || "units"}
                            </div>
                            {asset.minStockLevel !== null && asset.quantity <= asset.minStockLevel && (
                              <div className="text-xs text-red-700 font-bold">⚠️ Low Stock</div>
                            )}
                            {asset.minStockLevel !== null && (
                              <div className="text-xs text-gray-600">Min: {asset.minStockLevel}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-gray-100 px-6 py-3 border-t-2 border-gray-300">
              <p className="text-sm font-bold text-gray-900">
                Showing <span className="text-gray-900">{assets.length}</span> asset{assets.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        )}

        {/* Barcode Scanner Modal */}
        {showScanner && (
          <BarcodeScanner
            onScan={handleScan}
            onClose={() => setShowScanner(false)}
          />
        )}
      </div>
    </DashboardLayout>
  )
}


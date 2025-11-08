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
  isArchived: boolean
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

export default function AdminAssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterType, setFilterType] = useState<string>("all")
  const [showScanner, setShowScanner] = useState(false)
  const [searchCode, setSearchCode] = useState("")

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

  const handleScan = (code: string) => {
    setSearchCode(code)
    setShowScanner(false)
    // Filter assets by scanned code
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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">All Assets</h1>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
            <button
              onClick={() => setShowScanner(true)}
              className="w-full sm:w-auto px-4 py-2 bg-blue-700 text-white hover:bg-blue-800 rounded-lg transition-colors font-bold text-center"
            >
              📷 Scan Barcode
            </button>
            <Link
              href="/admin/dashboard"
              className="w-full sm:w-auto px-4 py-2 bg-gray-800 text-white hover:bg-gray-900 rounded-lg transition-colors font-medium text-center"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Barcode Search */}
        <div className="bg-white p-4 rounded-lg shadow mb-6 border border-gray-300">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={searchCode}
              onChange={(e) => {
                setSearchCode(e.target.value)
                if (!e.target.value) fetchAssets()
              }}
              placeholder="Search by asset code..."
              className="flex-1 px-3 py-2 border-2 border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-gray-900 font-medium"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 font-bold"
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
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 font-bold"
              >
                Clear
              </button>
            )}
          </form>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow mb-6 border border-gray-300">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Filter by Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 bg-white text-gray-900 font-medium"
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
                className="w-full px-3 py-2 border-2 border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 bg-white text-gray-900 font-medium"
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
                      Actions
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={async () => {
                            if (confirm(`Are you sure you want to ${asset.isArchived ? "unarchive" : "archive"} this asset?`)) {
                              try {
                                const response = await fetch(`/api/assets/${asset.id}/archive`, {
                                  method: asset.isArchived ? "DELETE" : "POST",
                                })
                                if (response.ok) {
                                  fetchAssets()
                                } else {
                                  alert("Failed to update asset")
                                }
                              } catch (error) {
                                console.error("Error archiving asset:", error)
                                alert("An error occurred")
                              }
                            }
                          }}
                          className={`px-3 py-1 rounded font-bold text-sm ${
                            asset.isArchived
                              ? "bg-green-600 text-white hover:bg-green-700"
                              : "bg-gray-600 text-white hover:bg-gray-700"
                          }`}
                        >
                          {asset.isArchived ? "Unarchive" : "Archive"}
                        </button>
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


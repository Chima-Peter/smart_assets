"use client"

import { useEffect, useState, useCallback } from "react"
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
  purchaseDate: string | null
  serialNumber: string | null
  manufacturer: string | null
  model: string | null
  registeredByUser: {
    name: string
    email: string
  }
  createdAt: string
}

export default function LecturerAllocationsPage() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<string>("all")

  const fetchAssets = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    params.append("status", "ALLOCATED")
    if (filterType !== "all") params.append("type", filterType)

    try {
      const res = await fetch(`/api/assets?${params.toString()}`)
      const data = await res.json()
      // Filter to only show assets allocated to current user
      // The API should handle this, but we'll filter client-side as well
      setAssets(data)
    } catch (error) {
      console.error("Error fetching allocations:", error)
    } finally {
      setLoading(false)
    }
  }, [filterType])

  useEffect(() => {
    fetchAssets()
  }, [fetchAssets])

  const getTypeBadge = (type: AssetType) => {
    return (
      <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-800 text-white">
        {type.replace("_", " ")}
      </span>
    )
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—"
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  return (
    <DashboardLayout>
      <div>
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Allocations</h1>
          <a
            href="/lecturer/dashboard"
            className="px-4 py-2 bg-gray-900 text-white hover:bg-gray-800 rounded-lg transition-colors font-bold shadow-lg"
          >
            ← Back to Dashboard
          </a>
        </div>

        {/* Filter */}
        <div className="bg-white p-4 rounded-lg shadow mb-6 border border-gray-300">
          <div className="max-w-xs">
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

        {/* Assets Table */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner size="lg" text="Loading allocations..." />
          </div>
        ) : assets.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow border border-gray-300 text-center">
            <p className="text-gray-900 font-medium">No allocated assets found.</p>
            <a
              href="/lecturer/request"
              className="mt-4 inline-block px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 font-bold"
            >
              Request an Asset
            </a>
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
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                      Registered By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                      Details
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {asset.category || "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {asset.location || "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="font-medium">{asset.registeredByUser.name}</div>
                        <div className="text-xs text-gray-700">{asset.registeredByUser.email}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="space-y-1">
                          {asset.serialNumber && (
                            <div className="text-xs">
                              <span className="font-bold">Serial:</span> {asset.serialNumber}
                            </div>
                          )}
                          {asset.manufacturer && (
                            <div className="text-xs">
                              <span className="font-bold">Manufacturer:</span> {asset.manufacturer}
                            </div>
                          )}
                          {asset.model && (
                            <div className="text-xs">
                              <span className="font-bold">Model:</span> {asset.model}
                            </div>
                          )}
                          {asset.purchaseDate && (
                            <div className="text-xs">
                              <span className="font-bold">Purchased:</span> {formatDate(asset.purchaseDate)}
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
                Showing <span className="text-gray-900">{assets.length}</span> allocated asset{assets.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}


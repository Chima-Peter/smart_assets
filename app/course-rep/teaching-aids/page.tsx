"use client"

import { useEffect, useState, useCallback } from "react"
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
  registeredByUser: {
    name: string
    email: string
  }
  createdAt: string
}

export default function CourseRepTeachingAidsPage() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  const fetchAssets = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/assets?type=TEACHING_AID")
      const data = await res.json()
      setAssets(data)
    } catch (error) {
      console.error("Error fetching teaching aids:", error)
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

  return (
    <DashboardLayout>
      <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Available Teaching Aids</h1>
          <a
            href="/course-rep/dashboard"
            className="w-full sm:w-auto px-4 py-2 bg-gray-900 text-white hover:bg-gray-800 rounded-lg transition-colors font-bold shadow-lg text-center sm:text-left"
          >
            ← Back to Dashboard
          </a>
        </div>

        {/* Search */}
        <div className="bg-white p-4 rounded-lg shadow mb-6 border border-gray-300">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, code, description, or category..."
            className="w-full px-4 py-3 border-2 border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-gray-900 font-medium shadow-sm"
          />
        </div>

        {/* Assets Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner size="lg" text="Loading teaching aids..." />
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow border border-gray-300 text-center">
            <p className="text-gray-900 font-medium">
              {searchTerm ? "No teaching aids found matching your search." : "No teaching aids available."}
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
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-700 text-white">
                    Teaching Aid
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
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && filteredAssets.length > 0 && (
          <div className="mt-6 bg-gray-100 px-6 py-3 rounded-lg border-2 border-gray-300">
            <p className="text-sm font-bold text-gray-900">
              Showing <span className="text-gray-900">{filteredAssets.length}</span> of <span className="text-gray-900">{assets.length}</span> teaching aid{assets.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}


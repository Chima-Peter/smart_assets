"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import DashboardLayout from "@/components/DashboardLayout"
import LoadingSpinner from "@/components/LoadingSpinner"

interface Asset {
  status: string
}

interface DashboardStats {
  totalAssets: number
  availableAssets: number
  pendingRequests: number
}

export default function OfficerDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch("/api/assets").then((res) => res.json()),
      fetch("/api/requests?status=PENDING").then((res) => res.json()),
    ]).then(([assets, requests]: [Asset[], unknown[]]) => {
      if (Array.isArray(assets) && Array.isArray(requests)) {
        setStats({
          totalAssets: assets.length,
          availableAssets: assets.filter((a) => a.status === "AVAILABLE").length,
          pendingRequests: requests.length,
        })
      }
    }).catch((error) => {
      console.error("Error fetching dashboard stats:", error)
    }).finally(() => {
      setLoading(false)
    })
  }, [])

  return (
    <DashboardLayout>
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-gray-900">Departmental Officer Dashboard</h1>
        
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner size="lg" text="Loading dashboard..." />
          </div>
        ) : stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div className="bg-white p-6 rounded-lg shadow border-2 border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Total Assets</h3>
              <p className="text-3xl font-bold text-gray-900">{stats.totalAssets || 0}</p>
              <p className="text-sm text-gray-700 mt-2 font-medium">
                {stats.availableAssets || 0} available
                {stats.totalAssets && stats.availableAssets && stats.totalAssets > stats.availableAssets && (
                  <span className="block text-xs text-gray-600 mt-1">
                    ({stats.totalAssets - stats.availableAssets} in use or other statuses)
                  </span>
                )}
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border-2 border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Pending Requests</h3>
              <p className="text-3xl font-bold text-gray-900">{stats.pendingRequests || 0}</p>
            </div>
          </div>
        )}

        <div className="bg-white p-4 sm:p-6 rounded-lg shadow border border-gray-300">
          <h2 className="text-lg sm:text-xl font-bold mb-4 text-gray-900">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <Link
              href="/officer/register"
              className="p-4 border-2 border-gray-700 rounded-lg hover:border-gray-900 hover:bg-gray-100 transition-colors text-center font-bold text-gray-900"
            >
              Register New Asset
            </Link>
            <Link
              href="/officer/requests"
              className="p-4 border-2 border-gray-700 rounded-lg hover:border-gray-900 hover:bg-gray-100 transition-colors text-center font-bold text-gray-900"
            >
              Approve Requests
            </Link>
            <Link
              href="/officer/transfers"
              className="p-4 border-2 border-gray-700 rounded-lg hover:border-gray-900 hover:bg-gray-100 transition-colors text-center font-bold text-gray-900"
            >
              Manage Transfers
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}


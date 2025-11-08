"use client"

import { useEffect, useState } from "react"
import DashboardLayout from "@/components/DashboardLayout"

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

  useEffect(() => {
    Promise.all([
      fetch("/api/assets").then((res) => res.json()),
      fetch("/api/requests?status=PENDING").then((res) => res.json()),
    ]).then(([assets, requests]: [Asset[], unknown[]]) => {
      setStats({
        totalAssets: assets.length,
        availableAssets: assets.filter((a) => a.status === "AVAILABLE").length,
        pendingRequests: requests.length,
      })
    })
  }, [])

  return (
    <DashboardLayout>
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-gray-900">Departmental Officer Dashboard</h1>
        
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div className="bg-white p-6 rounded-lg shadow border-2 border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Total Assets</h3>
              <p className="text-3xl font-bold text-gray-900">{stats.totalAssets || 0}</p>
              <p className="text-sm text-gray-700 mt-2 font-medium">
                {stats.availableAssets || 0} available
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
            <a
              href="/officer/register"
              className="p-4 border-2 border-gray-700 rounded-lg hover:border-gray-900 hover:bg-gray-100 transition-colors text-center font-bold text-gray-900"
            >
              Register New Asset
            </a>
            <a
              href="/officer/requests"
              className="p-4 border-2 border-gray-700 rounded-lg hover:border-gray-900 hover:bg-gray-100 transition-colors text-center font-bold text-gray-900"
            >
              Approve Requests
            </a>
            <a
              href="/officer/transfers"
              className="p-4 border-2 border-gray-700 rounded-lg hover:border-gray-900 hover:bg-gray-100 transition-colors text-center font-bold text-gray-900"
            >
              Manage Transfers
            </a>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}


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
        <h1 className="text-3xl font-bold mb-8">Departmental Officer Dashboard</h1>
        
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Assets</h3>
              <p className="text-3xl font-bold text-indigo-600">{stats.totalAssets || 0}</p>
              <p className="text-sm text-gray-500 mt-2">
                {stats.availableAssets || 0} available
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Pending Requests</h3>
              <p className="text-3xl font-bold text-orange-600">{stats.pendingRequests || 0}</p>
            </div>
          </div>
        )}

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <a
              href="/officer/register"
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 transition-colors text-center"
            >
              Register New Asset
            </a>
            <a
              href="/officer/requests"
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 transition-colors text-center"
            >
              Approve Requests
            </a>
            <a
              href="/officer/transfers"
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 transition-colors text-center"
            >
              Manage Transfers
            </a>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}


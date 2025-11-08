"use client"

import { useEffect, useState } from "react"
import DashboardLayout from "@/components/DashboardLayout"

interface DashboardStats {
  assets?: {
    total: number
    available: number
    allocated: number
  }
  requests?: {
    total: number
    pending: number
  }
  transfers?: {
    total: number
    pending: number
  }
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)

  useEffect(() => {
    fetch("/api/reports?type=summary")
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch(console.error)
  }, [])

  return (
    <DashboardLayout>
      <div>
        <h1 className="text-3xl font-bold mb-8">Faculty Admin Dashboard</h1>
        
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Assets</h3>
              <p className="text-3xl font-bold text-indigo-600">{stats.assets?.total || 0}</p>
              <p className="text-sm text-gray-500 mt-2">
                {stats.assets?.available || 0} available, {stats.assets?.allocated || 0} allocated
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Requests</h3>
              <p className="text-3xl font-bold text-orange-600">{stats.requests?.total || 0}</p>
              <p className="text-sm text-gray-500 mt-2">
                {stats.requests?.pending || 0} pending approval
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Transfers</h3>
              <p className="text-3xl font-bold text-green-600">{stats.transfers?.total || 0}</p>
              <p className="text-sm text-gray-500 mt-2">
                {stats.transfers?.pending || 0} pending approval
              </p>
            </div>
          </div>
        )}

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <a
              href="/admin/assets"
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 transition-colors text-center"
            >
              View All Assets
            </a>
            <a
              href="/admin/requests"
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 transition-colors text-center"
            >
              Review Requests
            </a>
            <a
              href="/admin/transfers"
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 transition-colors text-center"
            >
              Approve Transfers
            </a>
            <a
              href="/admin/reports"
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 transition-colors text-center"
            >
              Generate Reports
            </a>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}


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
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-gray-900">Faculty Admin Dashboard</h1>
        
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div className="bg-white p-6 rounded-lg shadow border-2 border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Total Assets</h3>
              <p className="text-3xl font-bold text-gray-900">{stats.assets?.total || 0}</p>
              <p className="text-sm text-gray-700 mt-2 font-medium">
                {stats.assets?.available || 0} available, {stats.assets?.allocated || 0} allocated
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border-2 border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Requests</h3>
              <p className="text-3xl font-bold text-gray-900">{stats.requests?.total || 0}</p>
              <p className="text-sm text-gray-700 mt-2 font-medium">
                {stats.requests?.pending || 0} pending approval
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border-2 border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Transfers</h3>
              <p className="text-3xl font-bold text-gray-900">{stats.transfers?.total || 0}</p>
              <p className="text-sm text-gray-700 mt-2 font-medium">
                {stats.transfers?.pending || 0} pending approval
              </p>
            </div>
          </div>
        )}

        <div className="bg-white p-4 sm:p-6 rounded-lg shadow border border-gray-300">
          <h2 className="text-lg sm:text-xl font-bold mb-4 text-gray-900">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <a
              href="/admin/assets"
              className="p-4 border-2 border-gray-700 rounded-lg hover:border-gray-900 hover:bg-gray-100 transition-colors text-center font-bold text-gray-900"
            >
              View All Assets
            </a>
            <a
              href="/admin/requests"
              className="p-4 border-2 border-gray-700 rounded-lg hover:border-gray-900 hover:bg-gray-100 transition-colors text-center font-bold text-gray-900"
            >
              Review Requests
            </a>
            <a
              href="/admin/transfers"
              className="p-4 border-2 border-gray-700 rounded-lg hover:border-gray-900 hover:bg-gray-100 transition-colors text-center font-bold text-gray-900"
            >
              Approve Transfers
            </a>
            <a
              href="/admin/reports"
              className="p-4 border-2 border-gray-700 rounded-lg hover:border-gray-900 hover:bg-gray-100 transition-colors text-center font-bold text-gray-900"
            >
              Generate Reports
            </a>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}


"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
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
                {stats.assets && (stats.assets.total || 0) > ((stats.assets.available || 0) + (stats.assets.allocated || 0)) && (
                  <span className="block text-xs text-gray-600 mt-1">
                    ({(stats.assets.total || 0) - ((stats.assets.available || 0) + (stats.assets.allocated || 0))} in other statuses)
                  </span>
                )}
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border-2 border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Total Requests</h3>
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
            <Link
              href="/admin/assets"
              className="p-4 border-2 border-gray-700 rounded-lg hover:border-gray-900 hover:bg-gray-100 transition-colors text-center font-bold text-gray-900"
            >
              View All Assets
            </Link>
            <Link
              href="/admin/requests"
              className="p-4 border-2 border-gray-700 rounded-lg hover:border-gray-900 hover:bg-gray-100 transition-colors text-center font-bold text-gray-900"
            >
              Review Requests
            </Link>
            <Link
              href="/admin/transfers"
              className="p-4 border-2 border-gray-700 rounded-lg hover:border-gray-900 hover:bg-gray-100 transition-colors text-center font-bold text-gray-900"
            >
              Approve Transfers
            </Link>
            <Link
              href="/admin/users"
              className="p-4 border-2 border-gray-700 rounded-lg hover:border-gray-900 hover:bg-gray-100 transition-colors text-center font-bold text-gray-900"
            >
              Manage Users
            </Link>
            <Link
              href="/admin/reports"
              className="p-4 border-2 border-gray-700 rounded-lg hover:border-gray-900 hover:bg-gray-100 transition-colors text-center font-bold text-gray-900"
            >
              Generate Reports
            </Link>
            <Link
              href="/admin/activity-logs"
              className="p-4 border-2 border-gray-700 rounded-lg hover:border-gray-900 hover:bg-gray-100 transition-colors text-center font-bold text-gray-900"
            >
              Activity Logs
            </Link>
            <Link
              href="/admin/system-config"
              className="p-4 border-2 border-gray-700 rounded-lg hover:border-gray-900 hover:bg-gray-100 transition-colors text-center font-bold text-gray-900"
            >
              System Config
            </Link>
            <Link
              href="/notifications"
              className="p-4 border-2 border-gray-700 rounded-lg hover:border-gray-900 hover:bg-gray-100 transition-colors text-center font-bold text-gray-900"
            >
              Notifications
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}


"use client"

import { useEffect, useState } from "react"
import DashboardLayout from "@/components/DashboardLayout"
import LoadingSpinner from "@/components/LoadingSpinner"

interface Request {
  status: string
}

interface DashboardStats {
  myRequests: number
  myAllocations: number
  pendingRequests: number
}

export default function LecturerDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch("/api/requests").then((res) => res.json()),
      fetch("/api/assets?status=ALLOCATED").then((res) => res.json()),
    ]).then(([requests, assets]: [Request[], unknown[]]) => {
      setStats({
        myRequests: requests.length,
        myAllocations: assets.length,
        pendingRequests: requests.filter((r) => r.status === "PENDING").length,
      })
      setLoading(false)
    }).catch((error) => {
      console.error("Error fetching stats:", error)
      setLoading(false)
    })
  }, [])

  return (
    <DashboardLayout>
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-gray-900">Lecturer Dashboard</h1>
        
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner size="lg" text="Loading dashboard..." />
          </div>
        ) : stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div className="bg-white p-6 rounded-lg shadow border-2 border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 mb-2">My Requests</h3>
              <p className="text-3xl font-bold text-gray-900">{stats.myRequests || 0}</p>
              <p className="text-sm text-gray-700 mt-2 font-medium">
                {stats.pendingRequests || 0} pending
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border-2 border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 mb-2">My Allocations</h3>
              <p className="text-3xl font-bold text-gray-900">{stats.myAllocations || 0}</p>
            </div>
          </div>
        )}

        <div className="bg-white p-4 sm:p-6 rounded-lg shadow border border-gray-300">
          <h2 className="text-lg sm:text-xl font-bold mb-4 text-gray-900">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <a
              href="/lecturer/request"
              className="p-4 border-2 border-gray-700 rounded-lg hover:border-gray-900 hover:bg-gray-100 transition-colors text-center font-bold text-gray-900"
            >
              Request Item
            </a>
            <a
              href="/lecturer/my-requests"
              className="p-4 border-2 border-gray-700 rounded-lg hover:border-gray-900 hover:bg-gray-100 transition-colors text-center font-bold text-gray-900"
            >
              View My Requests
            </a>
            <a
              href="/lecturer/allocations"
              className="p-4 border-2 border-gray-700 rounded-lg hover:border-gray-900 hover:bg-gray-100 transition-colors text-center font-bold text-gray-900"
            >
              My Allocations
            </a>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}


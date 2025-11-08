"use client"

import { useEffect, useState } from "react"
import DashboardLayout from "@/components/DashboardLayout"

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
    })
  }, [])

  return (
    <DashboardLayout>
      <div>
        <h1 className="text-3xl font-bold mb-8">Lecturer Dashboard</h1>
        
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">My Requests</h3>
              <p className="text-3xl font-bold text-indigo-600">{stats.myRequests || 0}</p>
              <p className="text-sm text-gray-500 mt-2">
                {stats.pendingRequests || 0} pending
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">My Allocations</h3>
              <p className="text-3xl font-bold text-green-600">{stats.myAllocations || 0}</p>
            </div>
          </div>
        )}

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="/lecturer/request"
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 transition-colors text-center"
            >
              Request Item
            </a>
            <a
              href="/lecturer/my-requests"
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 transition-colors text-center"
            >
              View My Requests
            </a>
            <a
              href="/lecturer/allocations"
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 transition-colors text-center"
            >
              My Allocations
            </a>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}


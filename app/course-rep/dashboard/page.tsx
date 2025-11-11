"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import DashboardLayout from "@/components/DashboardLayout"
import LoadingSpinner from "@/components/LoadingSpinner"

interface DashboardStats {
  availableConsumables: number
  availableTeachingAids: number
}

export default function CourseRepDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch("/api/assets?type=CONSUMABLE").then((res) => res.json()),
      fetch("/api/assets?type=TEACHING_AID").then((res) => res.json()),
    ]).then(([consumables, teachingAids]) => {
      setStats({
        availableConsumables: consumables.length,
        availableTeachingAids: teachingAids.length,
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
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-gray-900">Course Representative Dashboard</h1>
        
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner size="lg" text="Loading dashboard..." />
          </div>
        ) : stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div className="bg-white p-6 rounded-lg shadow border-2 border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Available Consumables</h3>
              <p className="text-3xl font-bold text-gray-900">{stats.availableConsumables || 0}</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border-2 border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Available Teaching Aids</h3>
              <p className="text-3xl font-bold text-gray-900">{stats.availableTeachingAids || 0}</p>
            </div>
          </div>
        )}

        <div className="bg-white p-4 sm:p-6 rounded-lg shadow border border-gray-300">
          <h2 className="text-lg sm:text-xl font-bold mb-4 text-gray-900">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Link
              href="/course-rep/consumables"
              className="p-4 border-2 border-gray-700 rounded-lg hover:border-gray-900 hover:bg-gray-100 transition-colors text-center font-bold text-gray-900"
            >
              View & Request Consumables
            </Link>
            <Link
              href="/course-rep/teaching-aids"
              className="p-4 border-2 border-gray-700 rounded-lg hover:border-gray-900 hover:bg-gray-100 transition-colors text-center font-bold text-gray-900"
            >
              View Teaching Aids
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


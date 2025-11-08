"use client"

import { useEffect, useState } from "react"
import DashboardLayout from "@/components/DashboardLayout"

interface Asset {
  status: string
}

interface DashboardStats {
  availableConsumables: number
  availableTeachingAids: number
}

export default function CourseRepDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)

  useEffect(() => {
    Promise.all([
      fetch("/api/assets?type=CONSUMABLE").then((res) => res.json()),
      fetch("/api/assets?type=TEACHING_AID").then((res) => res.json()),
    ]).then(([consumables, teachingAids]: [Asset[], Asset[]]) => {
      setStats({
        availableConsumables: consumables.filter((a) => a.status === "AVAILABLE").length,
        availableTeachingAids: teachingAids.filter((a) => a.status === "AVAILABLE").length,
      })
    })
  }, [])

  return (
    <DashboardLayout>
      <div>
        <h1 className="text-3xl font-bold mb-8">Course Representative Dashboard</h1>
        
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Available Consumables</h3>
              <p className="text-3xl font-bold text-indigo-600">{stats.availableConsumables || 0}</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Available Teaching Aids</h3>
              <p className="text-3xl font-bold text-green-600">{stats.availableTeachingAids || 0}</p>
            </div>
          </div>
        )}

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">View Available Items</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href="/course-rep/consumables"
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 transition-colors text-center"
            >
              View Consumables
            </a>
            <a
              href="/course-rep/teaching-aids"
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 transition-colors text-center"
            >
              View Teaching Aids
            </a>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}


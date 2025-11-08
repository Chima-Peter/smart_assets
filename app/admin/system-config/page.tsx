"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import DashboardLayout from "@/components/DashboardLayout"
import LoadingSpinner from "@/components/LoadingSpinner"

interface SystemConfig {
  id: string
  key: string
  value: string
  description: string | null
  category: string | null
  updatedByUser: {
    name: string
    email: string
  } | null
  updatedAt: string
}

export default function AdminSystemConfigPage() {
  const [configs, setConfigs] = useState<SystemConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [filterCategory, setFilterCategory] = useState("")
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const fetchConfigs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterCategory) params.append("category", filterCategory)

      const res = await fetch(`/api/system-config?${params.toString()}`)
      if (!res.ok) throw new Error("Failed to fetch configs")
      const data = await res.json()
      setConfigs(data)
    } catch (error) {
      console.error("Error fetching system configs:", error)
      setMessage({ type: "error", text: "Failed to load configurations" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConfigs()
  }, [filterCategory])

  const handleEdit = (config: SystemConfig) => {
    setEditingKey(config.key)
    setEditValue(config.value)
  }

  const handleSave = async (key: string) => {
    try {
      const config = configs.find((c) => c.key === key)
      if (!config) return

      const res = await fetch("/api/system-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key,
          value: editValue,
          description: config.description,
          category: config.category,
        }),
      })

      if (!res.ok) throw new Error("Failed to update config")
      setMessage({ type: "success", text: "Configuration updated successfully" })
      setEditingKey(null)
      fetchConfigs()
    } catch (error) {
      console.error("Error updating config:", error)
      setMessage({ type: "error", text: "Failed to update configuration" })
    }
  }

  const handleCancel = () => {
    setEditingKey(null)
    setEditValue("")
  }

  const categories = Array.from(new Set(configs.map((c) => c.category).filter(Boolean))) as string[]

  return (
    <DashboardLayout>
      <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">System Configuration</h1>
          <Link
            href="/admin/dashboard"
            className="w-full sm:w-auto px-4 py-2 bg-gray-800 text-white hover:bg-gray-900 rounded-lg transition-colors font-medium text-center sm:text-left"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg border-2 font-bold ${
              message.type === "success"
                ? "bg-emerald-100 border-emerald-700 text-emerald-900"
                : "bg-red-100 border-red-700 text-red-900"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Category Filter */}
        <div className="bg-white p-4 rounded-lg shadow mb-6 border border-gray-300">
          <label className="block text-sm font-bold text-gray-900 mb-2">Filter by Category</label>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full max-w-xs px-3 py-2 border-2 border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 bg-white text-gray-900 font-medium"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Configs List */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner size="lg" text="Loading configurations..." />
          </div>
        ) : configs.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow border border-gray-300 text-center">
            <p className="text-gray-900 font-medium">No configurations found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {configs.map((config) => (
              <div key={config.id} className="bg-white rounded-lg shadow border border-gray-300 p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="text-base sm:text-lg font-bold text-gray-900 font-mono break-all">{config.key}</h3>
                      {config.category && (
                        <span className="px-2 py-1 text-xs font-bold rounded bg-blue-100 text-blue-800 flex-shrink-0">
                          {config.category}
                        </span>
                      )}
                    </div>
                    {config.description && (
                      <p className="text-sm text-gray-700 mb-3 break-words">{config.description}</p>
                    )}
                    {editingKey === config.key ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full px-3 py-2 border-2 border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 bg-white text-gray-900 font-medium"
                        />
                        <div className="flex flex-col sm:flex-row gap-2">
                          <button
                            onClick={() => handleSave(config.key)}
                            className="flex-1 sm:flex-initial px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 font-bold transition-colors"
                          >
                            Save
                          </button>
                          <button
                            onClick={handleCancel}
                            className="flex-1 sm:flex-initial px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-bold transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <span className="text-sm font-bold text-gray-900">Value:</span>
                          <span className="text-sm font-mono text-gray-900 bg-gray-100 px-2 py-1 rounded break-all">
                            {config.value}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 break-words">
                          Last updated: {new Date(config.updatedAt).toLocaleString()}
                          {config.updatedByUser && ` by ${config.updatedByUser.name}`}
                        </div>
                        <button
                          onClick={() => handleEdit(config)}
                          className="mt-2 w-full sm:w-auto px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 font-bold transition-colors text-sm"
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}


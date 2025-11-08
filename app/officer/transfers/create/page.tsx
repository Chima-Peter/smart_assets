"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import DashboardLayout from "@/components/DashboardLayout"
import LoadingSpinner from "@/components/LoadingSpinner"
import { AssetStatus } from "@/lib/prisma/enums"

interface Asset {
  id: string
  name: string
  assetCode: string
  type: string
  allocatedToUser: {
    id: string
    name: string
    email: string
    department: string | null
  } | null
}

interface User {
  id: string
  name: string
  email: string
  department: string | null
}

export default function CreateTransferPage() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [formData, setFormData] = useState({
    assetId: "",
    toUserId: "",
    reason: "",
    notes: "",
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [assetsRes, usersRes] = await Promise.all([
        fetch("/api/assets?status=ALLOCATED"),
        fetch("/api/users"),
      ])

      if (!assetsRes.ok || !usersRes.ok) throw new Error("Failed to fetch data")

      const [assetsData, usersData] = await Promise.all([assetsRes.json(), usersRes.json()])
      setAssets(assetsData)
      setUsers(usersData)
    } catch (error) {
      console.error("Error fetching data:", error)
      setMessage({ type: "error", text: "Failed to load data" })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage(null)

    try {
      const res = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to create transfer")
      }

      setMessage({ type: "success", text: "Transfer created successfully! It is now pending approval." })
      setFormData({ assetId: "", toUserId: "", reason: "", notes: "" })
      setTimeout(() => {
        window.location.href = "/officer/transfers"
      }, 2000)
    } catch (error) {
      console.error("Error creating transfer:", error)
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to create transfer",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const selectedAsset = assets.find((a) => a.id === formData.assetId)

  return (
    <DashboardLayout>
      <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Initiate Transfer</h1>
          <Link
            href="/officer/transfers"
            className="w-full sm:w-auto px-4 py-2 bg-gray-900 text-white hover:bg-gray-800 rounded-lg transition-colors font-bold shadow-lg text-center sm:text-left"
          >
            ← Back to Transfers
          </Link>
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg border-2 font-bold ${
              message.type === "success"
                ? "bg-emerald-50 border-emerald-800 text-emerald-900"
                : "bg-red-50 border-red-800 text-red-900"
            }`}
          >
            {message.text}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner size="lg" text="Loading data..." />
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow border border-gray-300 p-4 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Select Asset to Transfer *
                </label>
                <select
                  value={formData.assetId}
                  onChange={(e) => setFormData({ ...formData, assetId: e.target.value })}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 bg-white text-gray-900 font-medium"
                >
                  <option value="">-- Select Asset --</option>
                  {assets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.assetCode} - {asset.name}
                      {asset.allocatedToUser && ` (Currently with: ${asset.allocatedToUser.name})`}
                    </option>
                  ))}
                </select>
                {selectedAsset && selectedAsset.allocatedToUser && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-bold text-gray-900">Current Holder:</p>
                    <p className="text-sm text-gray-700">
                      {selectedAsset.allocatedToUser.name} ({selectedAsset.allocatedToUser.email})
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Department: {selectedAsset.allocatedToUser.department || "N/A"}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Transfer To (Recipient) *
                </label>
                <select
                  value={formData.toUserId}
                  onChange={(e) => setFormData({ ...formData, toUserId: e.target.value })}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 bg-white text-gray-900 font-medium"
                >
                  <option value="">-- Select Recipient --</option>
                  {users
                    .filter((user) => user.id !== selectedAsset?.allocatedToUser?.id)
                    .map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.email}) - {user.department || "No Department"}
                      </option>
                    ))}
                </select>
                {formData.toUserId && selectedAsset?.allocatedToUser && (
                  <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs font-bold text-amber-900">
                      {users.find((u) => u.id === formData.toUserId)?.department ===
                      selectedAsset.allocatedToUser.department
                        ? "Intra-Departmental Transfer (Officer approval required)"
                        : "Inter-Departmental Transfer (Faculty Admin approval required)"}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Reason for Transfer *</label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  required
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 bg-white text-gray-900 font-medium"
                  placeholder="Explain why this asset is being transferred..."
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Additional Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-3 border-2 border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 bg-white text-gray-900 font-medium"
                  placeholder="Any additional information..."
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Creating Transfer..." : "Initiate Transfer"}
                </button>
                <Link
                  href="/officer/transfers"
                  className="flex-1 sm:flex-initial px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-bold transition-colors text-center"
                >
                  Cancel
                </Link>
              </div>
            </form>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}


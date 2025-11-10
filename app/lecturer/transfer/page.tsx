"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import DashboardLayout from "@/components/DashboardLayout"
import LoadingSpinner from "@/components/LoadingSpinner"
import { AssetType, AssetStatus } from "@/lib/prisma/enums"

interface Asset {
  id: string
  name: string
  description: string | null
  assetCode: string
  type: AssetType
  status: AssetStatus
  quantity: number | null
  allocatedQuantity: number | null
  unit: string | null
}

interface User {
  id: string
  name: string
  email: string
  department: string | null
  role: string
}

export default function LecturerTransferPage() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [formData, setFormData] = useState({
    assetId: "",
    toUserId: "",
    transferQuantity: "1",
    reason: "",
    notes: "",
    transferBackToStock: false,
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    setMessage(null)
    try {
      const [assetsRes, usersRes] = await Promise.all([
        fetch("/api/assets?status=ALLOCATED"), // Only assets allocated to this lecturer
        fetch("/api/users"),
      ])

      if (!assetsRes.ok) {
        const errorData = await assetsRes.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to fetch assets: ${assetsRes.status}`)
      }

      if (!usersRes.ok) {
        const errorData = await usersRes.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to fetch users: ${usersRes.status}`)
      }

      const [assetsData, usersData] = await Promise.all([
        assetsRes.json(),
        usersRes.json(),
      ])
      setAssets(assetsData)
      // Users API already filters to show lecturers, officers, and admins for lecturers
      setUsers(usersData)
    } catch (error) {
      console.error("Error fetching data:", error)
      setMessage({ 
        type: "error", 
        text: error instanceof Error ? error.message : "Failed to load data" 
      })
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
      const transferData = {
        assetId: formData.assetId,
        toUserId: formData.transferBackToStock ? "STOCK" : formData.toUserId,
        transferQuantity: parseInt(formData.transferQuantity) || 1,
        reason: formData.reason || undefined,
        notes: formData.notes || undefined,
      }

      const res = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(transferData),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to create transfer")
      }

      setMessage({ 
        type: "success", 
        text: formData.transferBackToStock 
          ? "Transfer back to stock created successfully! It is now pending approval." 
          : "Transfer created successfully! It is now pending approval." 
      })
      setFormData({ 
        assetId: "", 
        toUserId: "", 
        transferQuantity: "1", 
        reason: "", 
        notes: "",
        transferBackToStock: false,
      })
      await fetchData()
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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Transfer Asset</h1>
          <Link
            href="/lecturer/dashboard"
            className="w-full sm:w-auto px-4 py-2 bg-gray-900 text-white hover:bg-gray-800 rounded-lg transition-colors font-bold shadow-lg text-center sm:text-left"
          >
            ← Back to Dashboard
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
                    </option>
                  ))}
                </select>
                {selectedAsset && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-bold text-gray-900">Asset Details:</p>
                    <p className="text-xs text-gray-600 mt-1">
                      Type: {selectedAsset.type.replace("_", " ")} | 
                      Total: {selectedAsset.quantity ?? 1} {selectedAsset.unit || "units"} | 
                      Allocated: {selectedAsset.allocatedQuantity || 0}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Transfer Quantity *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max={selectedAsset?.allocatedQuantity || 1}
                  value={formData.transferQuantity}
                  onChange={(e) => setFormData({ ...formData, transferQuantity: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 bg-white text-gray-900 font-medium"
                />
                {selectedAsset && (
                  <p className="text-xs text-gray-600 mt-1">
                    You have {selectedAsset.allocatedQuantity || 0} unit(s) allocated
                  </p>
                )}
              </div>

              <div>
                <label className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    checked={formData.transferBackToStock}
                    onChange={(e) => setFormData({ ...formData, transferBackToStock: e.target.checked, toUserId: "" })}
                    className="w-4 h-4 text-gray-900 border-gray-700 rounded focus:ring-gray-900"
                  />
                  <span className="text-sm font-bold text-gray-900">Transfer back to stock (return to officer)</span>
                </label>
              </div>

              {!formData.transferBackToStock && (
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Transfer To (Recipient) *
                  </label>
                  <select
                    value={formData.toUserId}
                    onChange={(e) => setFormData({ ...formData, toUserId: e.target.value })}
                    required={!formData.transferBackToStock}
                    className="w-full px-4 py-3 border-2 border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 bg-white text-gray-900 font-medium"
                  >
                    <option value="">-- Select Recipient --</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.email}) - {user.department || "No Department"} - {user.role}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Reason for Transfer *</label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  required
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 bg-white text-gray-900 font-medium"
                  placeholder={formData.transferBackToStock 
                    ? "Explain why you're returning this asset to stock..." 
                    : "Explain why this asset is being transferred..."}
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
                  disabled={submitting || (!formData.transferBackToStock && !formData.toUserId)}
                  className="flex-1 px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span>Creating Transfer...</span>
                    </>
                  ) : (
                    formData.transferBackToStock ? "Transfer Back to Stock" : "Initiate Transfer"
                  )}
                </button>
                <Link
                  href="/lecturer/dashboard"
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


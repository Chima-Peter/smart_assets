"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import DashboardLayout from "@/components/DashboardLayout"
import BarcodeScanner from "@/components/BarcodeScanner"
import BarcodeGenerator from "@/components/BarcodeGenerator"
import LoadingSpinner from "@/components/LoadingSpinner"
import { AssetType, type AssetType as AssetTypeEnum } from "@/lib/prisma/enums"

interface User {
  id: string
  name: string
  email: string
  role: string
  department: string | null
}

export default function RegisterAssetPage() {
  const [formData, setFormData] = useState<{
    name: string
    description: string
    assetCode: string
    type: AssetTypeEnum
    category: string
    assetCategory: "RETURNABLE" | "CONSUMABLE" | "EXPIRABLE" | ""
    location: string
    room: string
    purchaseDate: string
    purchasePrice: string
    serialNumber: string
    manufacturer: string
    model: string
    expiryDate: string
    allocatedTo: string
    quantity: string
    minStockLevel: string
    unit: string
  }>({
    name: "",
    description: "",
    assetCode: "",
    type: AssetType.EQUIPMENT,
    category: "",
    assetCategory: "",
    location: "",
    room: "",
    purchaseDate: "",
    purchasePrice: "",
    serialNumber: "",
    manufacturer: "",
    model: "",
    expiryDate: "",
    allocatedTo: "",
    quantity: "",
    minStockLevel: "",
    unit: "",
  })
  const [showScanner, setShowScanner] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [documentUrls, setDocumentUrls] = useState<string[]>([])
  const [users, setUsers] = useState<User[]>([])

  useEffect(() => {
    // Fetch users for allocation dropdown (only lecturers and officers)
    fetch("/api/users")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setUsers(data.filter((u: User) => u.role === "LECTURER" || u.role === "DEPARTMENTAL_OFFICER"))
        }
      })
      .catch((err) => console.error("Error fetching users:", err))
  }, [])

  const handleScan = (code: string) => {
    setFormData((prev) => ({ ...prev, assetCode: code }))
    setShowScanner(false)
    setMessage({ type: "success", text: `Scanned barcode: ${code}` })
  }

  const handleFileUpload = async (file: File) => {
    setUploading(true)
    try {
      const uploadFormData = new FormData()
      uploadFormData.append("file", file)

      const response = await fetch("/api/upload", {
        method: "POST",
        body: uploadFormData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to upload file")
      }

      setDocumentUrls((prev) => [...prev, data.url])
      setMessage({ type: "success", text: `File "${file.name}" uploaded successfully` })
    } catch (err) {
      console.error("Error uploading file:", err)
      setMessage({ type: "error", text: `Failed to upload file: ${err instanceof Error ? err.message : "Unknown error"}` })
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveDocument = (index: number) => {
    setDocumentUrls((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
             const response = await fetch("/api/assets", {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({
                 ...formData,
                 purchasePrice: formData.purchasePrice ? parseFloat(formData.purchasePrice) : undefined,
                 assetCategory: formData.assetCategory || undefined,
                 expiryDate: formData.expiryDate || undefined,
                 documentUrls: documentUrls.length > 0 ? documentUrls : undefined,
                 allocatedTo: formData.allocatedTo || undefined,
                 quantity: formData.type === AssetType.CONSUMABLE && formData.quantity ? parseInt(formData.quantity) : undefined,
                 minStockLevel: formData.type === AssetType.CONSUMABLE && formData.minStockLevel ? parseInt(formData.minStockLevel) : undefined,
                 unit: formData.type === AssetType.CONSUMABLE && formData.unit ? formData.unit : undefined,
               }),
             })

      const data = await response.json()

      if (!response.ok) {
        setMessage({ type: "error", text: data.error || "Failed to register asset" })
        setLoading(false)
        return
      }

      setMessage({ type: "success", text: "Asset registered successfully!" })
      setFormData({
        name: "",
        description: "",
        assetCode: "",
        type: AssetType.EQUIPMENT,
        category: "",
        assetCategory: "",
        location: "",
        room: "",
        purchaseDate: "",
        purchasePrice: "",
        serialNumber: "",
        manufacturer: "",
        model: "",
        expiryDate: "",
        allocatedTo: "",
        quantity: "",
        minStockLevel: "",
        unit: "",
      })
      setDocumentUrls([])
    } catch (err) {
      console.error("Error registering asset:", err)
      setMessage({ type: "error", text: "An error occurred. Please try again." })
    } finally {
      setLoading(false)
    }
  }

  const generateAssetCode = () => {
    const prefix = formData.type.substring(0, 3).toUpperCase()
    const timestamp = Date.now().toString().slice(-6)
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0")
    return `${prefix}-${timestamp}-${random}`
  }

  const handleGenerateCode = () => {
    const newCode = generateAssetCode()
    setFormData((prev) => ({ ...prev, assetCode: newCode }))
  }

  return (
    <DashboardLayout>
      <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Register New Asset</h1>
          <Link
            href="/officer/dashboard"
            className="w-full sm:w-auto px-4 py-2 bg-gray-900 text-white hover:bg-gray-800 rounded-lg transition-colors font-bold shadow-lg text-center sm:text-left"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* Messages */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg border-2 font-bold ${
            message.type === "success" 
              ? "bg-emerald-100 border-emerald-700 text-emerald-900" 
              : "bg-red-100 border-red-700 text-red-900"
          }`}>
            {message.text}
            <button
              onClick={() => setMessage(null)}
              className="ml-4 text-sm underline"
            >
              Dismiss
            </button>
          </div>
        )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Form */}
          <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-gray-200">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-gray-200">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-md">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Asset Information</h2>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Asset Code Section */}
              <div className="border-2 border-blue-200 p-5 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 shadow-md">
                <label className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                  </svg>
                  Asset Code *
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    required
                    value={formData.assetCode}
                    onChange={(e) => setFormData({ ...formData, assetCode: e.target.value })}
                    placeholder="Scan or enter asset code"
                    className="flex-1 min-w-0 px-4 py-3 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium shadow-sm"
                  />
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowScanner(true)}
                      className="px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2 whitespace-nowrap"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="hidden sm:inline">Scan</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleGenerateCode}
                      className="px-4 py-3 bg-gradient-to-r from-gray-700 to-gray-800 text-white rounded-lg hover:from-gray-800 hover:to-gray-900 font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2 whitespace-nowrap"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span className="hidden sm:inline">Generate</span>
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Asset Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-gray-900 font-bold shadow-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-gray-900 font-medium shadow-sm"
                />
              </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <div>
                         <label className="block text-sm font-bold text-gray-900 mb-2">
                           Type *
                         </label>
                  <select
                    required
                    value={formData.type}
                    onChange={(e) => {
                      const newType = e.target.value
                      if (Object.values(AssetType).includes(newType as AssetTypeEnum)) {
                        setFormData({ ...formData, type: newType as AssetTypeEnum })
                      }
                    }}
                    className="w-full px-4 py-3 border-2 border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 bg-white text-gray-900 font-bold shadow-sm"
                  >
                    <option value={AssetType.EQUIPMENT}>Equipment</option>
                    <option value={AssetType.CONSUMABLE}>Consumable</option>
                    <option value={AssetType.TEACHING_AID}>Teaching Aid</option>
                    <option value={AssetType.FURNITURE}>Furniture</option>
                    <option value={AssetType.OTHER}>Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Asset Category
                  </label>
                  <select
                    value={formData.assetCategory}
                    onChange={(e) => setFormData({ ...formData, assetCategory: e.target.value as "RETURNABLE" | "CONSUMABLE" | "EXPIRABLE" | "" })}
                    className="w-full px-4 py-3 border-2 border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 bg-white text-gray-900 font-bold shadow-sm"
                  >
                    <option value="">-- Select Category --</option>
                    <option value="RETURNABLE">Returnable (e.g., projectors, lab equipment)</option>
                    <option value="CONSUMABLE">Consumable (e.g., stationery, printer ink)</option>
                    <option value="EXPIRABLE">Expirable (e.g., lab chemicals, licenses)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Category/Subcategory
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g., Laptop, Printer, Desk"
                  className="w-full px-4 py-3 border-2 border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-gray-900 font-medium shadow-sm"
                />
              </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Location/Department
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g., Computer Science, Lab A"
                    className="w-full px-4 py-3 border-2 border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-gray-900 font-medium shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Room
                  </label>
                  <input
                    type="text"
                    value={formData.room}
                    onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                    placeholder="e.g., Room 101, Lab B-205"
                    className="w-full px-4 py-3 border-2 border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-gray-900 font-medium shadow-sm"
                  />
                </div>
              </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Serial Number
                  </label>
                  <input
                    type="text"
                    value={formData.serialNumber}
                    onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-gray-900 font-medium shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Purchase Date
                  </label>
                  <input
                    type="date"
                    value={formData.purchaseDate}
                    onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-gray-900 font-medium shadow-sm"
                  />
                </div>
              </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Manufacturer
                  </label>
                  <input
                    type="text"
                    value={formData.manufacturer}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-gray-900 font-medium shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Model
                  </label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-gray-900 font-medium shadow-sm"
                  />
                </div>
              </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Purchase Price
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.purchasePrice}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-gray-900 font-medium shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-gray-900 font-medium shadow-sm"
                  />
                </div>
              </div>

              {formData.type === AssetType.CONSUMABLE && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">
                      Quantity *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-gray-900 font-medium shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">
                      Min Stock Level
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.minStockLevel}
                      onChange={(e) => setFormData({ ...formData, minStockLevel: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-gray-900 font-medium shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">
                      Unit
                    </label>
                    <input
                      type="text"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      placeholder="e.g., boxes, units, liters"
                      className="w-full px-4 py-3 border-2 border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-gray-900 font-medium shadow-sm"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Assign to Staff Member (Optional)
                </label>
                <select
                  value={formData.allocatedTo}
                  onChange={(e) => setFormData({ ...formData, allocatedTo: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 bg-white text-gray-900 font-bold shadow-sm"
                >
                  <option value="">-- Not Assigned --</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.department || "No Department"}) - {user.role.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Supporting Documents
                </label>
                <div className="border-2 border-gray-700 rounded-lg p-4 bg-gray-50">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || [])
                      files.forEach((file) => handleFileUpload(file))
                    }}
                    disabled={uploading}
                    className="w-full px-4 py-3 border-2 border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-gray-900 font-medium shadow-sm disabled:opacity-50"
                  />
                  {uploading && (
                    <div className="mt-2 flex items-center gap-2">
                      <LoadingSpinner size="sm" />
                      <span className="text-sm text-gray-700 font-medium">Uploading...</span>
                    </div>
                  )}
                  {documentUrls.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-sm font-bold text-gray-900">Uploaded Documents:</p>
                      {documentUrls.map((url, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-white rounded border border-gray-300">
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-700 hover:underline font-medium"
                          >
                            {url.split("/").pop()}
                          </a>
                          <button
                            type="button"
                            onClick={() => handleRemoveDocument(index)}
                            className="text-red-700 hover:text-red-900 font-bold text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-4 bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-xl hover:from-gray-800 hover:to-gray-700 font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 text-lg"
              >
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>Registering...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Register Asset
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Barcode Preview */}
          <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-gray-200">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-gray-200">
              <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-green-700 rounded-lg flex items-center justify-center shadow-md">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Barcode Preview</h2>
            </div>
            {formData.assetCode ? (
              <div>
                <BarcodeGenerator value={formData.assetCode} />
                <div className="mt-4 p-3 bg-gray-100 rounded-lg">
                  <p className="text-sm font-bold text-gray-900">Asset Code:</p>
                  <p className="text-lg font-mono text-gray-900">{formData.assetCode}</p>
                </div>
                <button
                  onClick={() => {
                    const printWindow = window.open("", "_blank")
                    if (printWindow) {
                      printWindow.document.write(`
                        <html>
                          <head><title>Barcode - ${formData.assetCode}</title></head>
                          <body style="text-align:center; padding:20px;">
                            <h2>${formData.name || "Asset"}</h2>
                            <div id="barcode"></div>
                            <p>${formData.assetCode}</p>
                            <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
                            <script>
                              JsBarcode("#barcode", "${formData.assetCode}", {
                                format: "CODE128",
                                width: 2,
                                height: 100,
                                displayValue: true
                              });
                              window.onload = () => window.print();
                            </script>
                          </body>
                        </html>
                      `)
                      printWindow.document.close()
                    }
                  }}
                  className="mt-4 w-full px-6 py-3 bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-xl hover:from-gray-900 hover:to-gray-800 font-bold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print Barcode
                </button>
              </div>
            ) : (
              <div className="p-8 border-2 border-gray-300 rounded-lg text-center text-gray-500">
                <p>Generate or scan an asset code to see the barcode</p>
              </div>
            )}
          </div>
        </div>

        {/* Barcode Scanner Modal */}
        {showScanner && (
          <BarcodeScanner
            onScan={handleScan}
            onError={(error) => {
              setMessage({ type: "error", text: error })
            }}
            onClose={() => setShowScanner(false)}
          />
        )}
      </div>
    </DashboardLayout>
  )
}


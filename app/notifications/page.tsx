"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import DashboardLayout from "@/components/DashboardLayout"
import LoadingSpinner from "@/components/LoadingSpinner"
import { useSession } from "next-auth/react"

interface Notification {
  id: string
  type: string
  title: string
  message: string
  read: boolean
  createdAt: string
  relatedRequest?: {
    asset: {
      name: string
      assetCode: string
    }
  }
}

export default function NotificationsPage() {
  const { data: session } = useSession()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const params = showUnreadOnly ? "?unreadOnly=true" : ""
      const res = await fetch(`/api/notifications${params}`)
      if (!res.ok) throw new Error("Failed to fetch notifications")
      const data = await res.json()
      setNotifications(data)
    } catch (error) {
      console.error("Error fetching notifications:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
    // Refresh every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [showUnreadOnly])

  const markAsRead = async (notificationIds: string[]) => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationIds }),
      })
      if (res.ok) {
        fetchNotifications()
      }
    } catch (error) {
      console.error("Error marking notifications as read:", error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllAsRead: true }),
      })
      if (res.ok) {
        fetchNotifications()
      }
    } catch (error) {
      console.error("Error marking all as read:", error)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "REQUEST_APPROVED":
        return "✅"
      case "REQUEST_REJECTED":
        return "❌"
      case "REQUEST_FULFILLED":
        return "📦"
      case "ASSET_RETURNED":
        return "🔄"
      case "TRANSFER_APPROVED":
        return "✅"
      case "TRANSFER_REJECTED":
        return "❌"
      case "MAINTENANCE_DUE":
        return "🔧"
      case "EXPIRY_ALERT":
        return "⚠️"
      case "STOCK_LOW":
        return "📉"
      default:
        return "🔔"
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "REQUEST_APPROVED":
      case "TRANSFER_APPROVED":
        return "bg-emerald-100 text-emerald-800 border-emerald-300"
      case "REQUEST_REJECTED":
      case "TRANSFER_REJECTED":
        return "bg-red-100 text-red-800 border-red-300"
      case "MAINTENANCE_DUE":
      case "EXPIRY_ALERT":
      case "STOCK_LOW":
        return "bg-yellow-100 text-yellow-800 border-yellow-300"
      default:
        return "bg-blue-100 text-blue-800 border-blue-300"
    }
  }

  const getDashboardLink = () => {
    if (!session?.user) return "/auth/signin"
    switch (session.user.role) {
      case "FACULTY_ADMIN":
        return "/admin/dashboard"
      case "DEPARTMENTAL_OFFICER":
        return "/officer/dashboard"
      case "LECTURER":
        return "/lecturer/dashboard"
      case "COURSE_REP":
        return "/course-rep/dashboard"
      default:
        return "/auth/signin"
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <DashboardLayout>
      <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-sm text-gray-700 mt-1 font-medium">
                {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
              </p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="w-full sm:w-auto px-4 py-2 bg-blue-700 text-white hover:bg-blue-800 rounded-lg transition-colors font-bold"
              >
                Mark All as Read
              </button>
            )}
            <Link
              href={getDashboardLink()}
              className="w-full sm:w-auto px-4 py-2 bg-gray-900 text-white hover:bg-gray-800 rounded-lg transition-colors font-bold shadow-lg text-center sm:text-left"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Filter */}
        <div className="bg-white p-4 rounded-lg shadow mb-6 border border-gray-300">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showUnreadOnly}
              onChange={(e) => setShowUnreadOnly(e.target.checked)}
              className="w-4 h-4 text-gray-900 border-gray-600 rounded focus:ring-gray-900"
            />
            <span className="text-sm font-bold text-gray-900">Show unread only</span>
          </label>
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner size="lg" text="Loading notifications..." />
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow border border-gray-300 text-center">
            <p className="text-gray-900 font-medium">
              {showUnreadOnly ? "No unread notifications." : "No notifications found."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`bg-white rounded-lg shadow border-2 p-4 sm:p-6 ${
                  notification.read ? "border-gray-300" : "border-blue-500 bg-blue-50"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="text-2xl">{getNotificationIcon(notification.type)}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold text-gray-900">{notification.title}</h3>
                        <span
                          className={`px-2 py-1 text-xs font-bold rounded border ${getNotificationColor(
                            notification.type
                          )}`}
                        >
                          {notification.type.replace("_", " ")}
                        </span>
                        {!notification.read && (
                          <span className="px-2 py-1 text-xs font-bold rounded bg-blue-600 text-white">
                            NEW
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{notification.message}</p>
                      {notification.relatedRequest && (
                        <p className="text-xs text-gray-600 font-medium">
                          Asset: {notification.relatedRequest.asset.name} ({notification.relatedRequest.asset.assetCode})
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {!notification.read && (
                    <button
                      onClick={() => markAsRead([notification.id])}
                      className="px-3 py-1 text-xs font-bold bg-gray-200 text-gray-800 hover:bg-gray-300 rounded transition-colors"
                    >
                      Mark Read
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}


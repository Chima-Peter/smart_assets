"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { UserRole } from "@/lib/prisma/enums"

interface SidebarProps {
  role: UserRole
  userName: string
  onClose?: () => void
}

export default function Sidebar({ role, userName, onClose }: SidebarProps) {
  const pathname = usePathname()

  const isActive = (path: string) => pathname === path

  const handleLinkClick = () => {
    if (onClose) {
      onClose()
    }
  }

  const facultyAdminLinks = [
    { href: "/admin/dashboard", label: "Dashboard", icon: "📊" },
    { href: "/admin/assets", label: "All Assets", icon: "📦" },
    { href: "/admin/requests", label: "Requests", icon: "📋" },
    { href: "/admin/transfers", label: "Transfers", icon: "🔄" },
    { href: "/admin/reports", label: "Reports", icon: "📈" },
    { href: "/admin/users", label: "Users", icon: "👥" },
    { href: "/admin/activity-logs", label: "Activity Logs", icon: "📝" },
    { href: "/admin/system-config", label: "System Config", icon: "⚙️" },
    { href: "/notifications", label: "Notifications", icon: "🔔" },
  ]

  const officerLinks = [
    { href: "/officer/dashboard", label: "Dashboard", icon: "📊" },
    { href: "/officer/assets", label: "Assets", icon: "📦" },
    { href: "/officer/register", label: "Register Asset", icon: "➕" },
    { href: "/officer/requests", label: "Approve Requests", icon: "✅" },
    { href: "/officer/transfers", label: "Manage Transfers", icon: "🔄" },
    { href: "/officer/activity-logs", label: "Activity Logs", icon: "📝" },
    { href: "/notifications", label: "Notifications", icon: "🔔" },
  ]

  const lecturerLinks = [
    { href: "/lecturer/dashboard", label: "Dashboard", icon: "📊" },
    { href: "/lecturer/request", label: "Request Item", icon: "📝" },
    { href: "/lecturer/my-requests", label: "My Requests", icon: "📋" },
    { href: "/lecturer/allocations", label: "My Allocations", icon: "📦" },
    { href: "/lecturer/activity-logs", label: "My Activity", icon: "📝" },
    { href: "/notifications", label: "Notifications", icon: "🔔" },
  ]

  const courseRepLinks = [
    { href: "/course-rep/dashboard", label: "Dashboard", icon: "📊" },
    { href: "/course-rep/consumables", label: "Consumables", icon: "📦" },
    { href: "/course-rep/teaching-aids", label: "Teaching Aids", icon: "🎓" },
    { href: "/notifications", label: "Notifications", icon: "🔔" },
  ]

  const getLinks = () => {
    switch (role) {
      case UserRole.FACULTY_ADMIN:
        return facultyAdminLinks
      case UserRole.DEPARTMENTAL_OFFICER:
        return officerLinks
      case UserRole.LECTURER:
        return lecturerLinks
      case UserRole.COURSE_REP:
        return courseRepLinks
      default:
        return []
    }
  }

  const links = getLinks()

  return (
    <div className="w-64 bg-gray-900 text-white h-full flex flex-col">
      {/* Mobile close button */}
      <div className="lg:hidden flex justify-end p-4">
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
          aria-label="Close menu"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <div className="p-6 flex-shrink-0">
        <h1 className="text-xl sm:text-2xl font-bold mb-2 text-white">Asset Manager</h1>
        <p className="text-gray-200 text-sm font-medium truncate">{userName}</p>
        <p className="text-gray-300 text-xs mt-1 capitalize font-medium">{role.toLowerCase().replace("_", " ")}</p>
      </div>
      <nav className="flex-1 overflow-y-auto">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={handleLinkClick}
            className={`flex items-center px-6 py-3 text-gray-200 hover:bg-gray-800 hover:text-white transition-colors font-medium ${
              isActive(link.href) ? "bg-gray-800 text-white border-r-4 border-white" : ""
            }`}
          >
            <span className="mr-3 text-lg">{link.icon}</span>
            <span className="text-sm sm:text-base">{link.label}</span>
          </Link>
        ))}
      </nav>
      <div className="p-6 border-t border-gray-800 flex-shrink-0">
        <button
          onClick={() => {
            handleLinkClick()
            signOut({ callbackUrl: "/auth/signin" })
          }}
          className="w-full flex items-center justify-center px-4 py-2 text-gray-200 hover:bg-gray-800 hover:text-white rounded transition-colors font-bold border-2 border-gray-700 hover:border-white"
        >
          <span className="mr-3">🚪</span>
          <span className="text-sm sm:text-base">Sign Out</span>
        </button>
      </div>
    </div>
  )
}


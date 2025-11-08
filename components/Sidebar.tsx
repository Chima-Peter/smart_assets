"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { UserRole } from "@/lib/prisma/enums"

interface SidebarProps {
  role: UserRole
  userName: string
}

export default function Sidebar({ role, userName }: SidebarProps) {
  const pathname = usePathname()

  const isActive = (path: string) => pathname === path

  const facultyAdminLinks = [
    { href: "/admin/dashboard", label: "Dashboard", icon: "📊" },
    { href: "/admin/assets", label: "All Assets", icon: "📦" },
    { href: "/admin/requests", label: "Requests", icon: "📋" },
    { href: "/admin/transfers", label: "Transfers", icon: "🔄" },
    { href: "/admin/reports", label: "Reports", icon: "📈" },
    { href: "/admin/users", label: "Users", icon: "👥" },
  ]

  const officerLinks = [
    { href: "/officer/dashboard", label: "Dashboard", icon: "📊" },
    { href: "/officer/assets", label: "Assets", icon: "📦" },
    { href: "/officer/register", label: "Register Asset", icon: "➕" },
    { href: "/officer/requests", label: "Approve Requests", icon: "✅" },
    { href: "/officer/transfers", label: "Manage Transfers", icon: "🔄" },
  ]

  const lecturerLinks = [
    { href: "/lecturer/dashboard", label: "Dashboard", icon: "📊" },
    { href: "/lecturer/request", label: "Request Item", icon: "📝" },
    { href: "/lecturer/my-requests", label: "My Requests", icon: "📋" },
    { href: "/lecturer/allocations", label: "My Allocations", icon: "📦" },
  ]

  const courseRepLinks = [
    { href: "/course-rep/dashboard", label: "Dashboard", icon: "📊" },
    { href: "/course-rep/consumables", label: "Consumables", icon: "📦" },
    { href: "/course-rep/teaching-aids", label: "Teaching Aids", icon: "🎓" },
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
    <div className="w-64 bg-gray-900 text-white min-h-screen">
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-2 text-white">Asset Manager</h1>
        <p className="text-gray-200 text-sm font-medium">{userName}</p>
        <p className="text-gray-300 text-xs mt-1 capitalize font-medium">{role.toLowerCase().replace("_", " ")}</p>
      </div>
      <nav className="mt-8">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center px-6 py-3 text-gray-200 hover:bg-gray-800 hover:text-white transition-colors font-medium ${
              isActive(link.href) ? "bg-gray-800 text-white border-r-4 border-white" : ""
            }`}
          >
            <span className="mr-3">{link.icon}</span>
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="absolute bottom-0 w-64 p-6">
        <button
          onClick={() => signOut({ callbackUrl: "/auth/signin" })}
          className="w-full flex items-center px-4 py-2 text-gray-200 hover:bg-gray-800 hover:text-white rounded transition-colors font-bold border-2 border-gray-700 hover:border-white"
        >
          <span className="mr-3">🚪</span>
          Sign Out
        </button>
      </div>
    </div>
  )
}


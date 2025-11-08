"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import DashboardLayout from "@/components/DashboardLayout"
import LoadingSpinner from "@/components/LoadingSpinner"
import { UserRole } from "@/lib/prisma/enums"

interface User {
  id: string
  email: string
  name: string
  role: UserRole
  department: string | null
  employeeId: string | null
  createdAt: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState<{
    email: string
    password: string
    name: string
    role: UserRole
    department: string
    employeeId: string
  }>({
    email: "",
    password: "",
    name: "",
    role: UserRole.LECTURER,
    department: "",
    employeeId: "",
  })
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/users")
      const data = await res.json()
      setUsers(data)
    } catch (error) {
      console.error("Error fetching users:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          department: formData.department || undefined,
          employeeId: formData.employeeId || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to create user")
        return
      }

      setSuccess("User created successfully!")
      setShowCreateForm(false)
      setFormData({
        email: "",
        password: "",
        name: "",
        role: UserRole.LECTURER,
        department: "",
        employeeId: "",
      })
      fetchUsers()
    } catch (error) {
      setError("An error occurred. Please try again.")
    }
  }

  const getRoleBadge = (role: UserRole) => {
    const colors = {
      FACULTY_ADMIN: "bg-purple-700 text-white",
      DEPARTMENTAL_OFFICER: "bg-blue-700 text-white",
      LECTURER: "bg-emerald-700 text-white",
      COURSE_REP: "bg-amber-700 text-white",
    }
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold ${colors[role] || "bg-gray-700 text-white"}`}>
        {role.replace("_", " ")}
      </span>
    )
  }

  return (
    <DashboardLayout>
      <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">User Management</h1>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-4 py-2 bg-gray-800 text-white hover:bg-gray-900 rounded-lg transition-colors font-bold"
            >
              {showCreateForm ? "Cancel" : "+ Create User"}
            </button>
            <Link
              href="/admin/dashboard"
              className="px-4 py-2 bg-gray-600 text-white hover:bg-gray-700 rounded-lg transition-colors font-bold"
            >
              ← Back
            </Link>
          </div>
        </div>

        {/* Create User Form */}
        {showCreateForm && (
          <div className="bg-white p-6 rounded-lg shadow mb-6 border-2 border-gray-800">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Create New User</h2>
            {error && (
              <div className="mb-4 p-3 bg-red-100 border-2 border-red-700 text-red-900 rounded font-medium">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 p-3 bg-emerald-100 border-2 border-emerald-700 text-emerald-900 rounded font-medium">
                {success}
              </div>
            )}
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-gray-900 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-gray-900 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Password *</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-gray-900 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Role *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                    className="w-full px-3 py-2 border-2 border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 bg-white text-gray-900 font-medium"
                  >
                    <option value={UserRole.LECTURER}>Lecturer</option>
                    <option value={UserRole.DEPARTMENTAL_OFFICER}>Departmental Officer</option>
                    <option value={UserRole.COURSE_REP}>Course Rep</option>
                    <option value={UserRole.FACULTY_ADMIN}>Faculty Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Department</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-gray-900 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Employee ID</label>
                  <input
                    type="text"
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 text-gray-900 font-medium"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="px-6 py-2 bg-gray-900 text-white hover:bg-gray-800 rounded-lg font-bold"
              >
                Create User
              </button>
            </form>
          </div>
        )}

        {/* Users Table */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner size="lg" text="Loading users..." />
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow border border-gray-300 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                      Employee ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                      Created At
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-300">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-100">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                        {user.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getRoleBadge(user.role)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.department || "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {user.employeeId || "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-gray-100 px-6 py-3 border-t-2 border-gray-300">
              <p className="text-sm font-bold text-gray-900">
                Total: <span className="text-gray-900">{users.length}</span> user{users.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}


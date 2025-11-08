"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { UserRole } from "@/lib/prisma/enums"
import LoadingSpinner from "@/components/LoadingSpinner"

export default function DashboardRedirect() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "loading") return

    if (!session?.user) {
      router.push("/auth/signin")
      return
    }

    // Redirect based on role
    switch (session.user.role) {
      case UserRole.FACULTY_ADMIN:
        router.push("/admin/dashboard")
        break
      case UserRole.DEPARTMENTAL_OFFICER:
        router.push("/officer/dashboard")
        break
      case UserRole.LECTURER:
        router.push("/lecturer/dashboard")
        break
      case UserRole.COURSE_REP:
        router.push("/course-rep/dashboard")
        break
      default:
        router.push("/auth/signin")
    }
  }, [session, status, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <LoadingSpinner size="lg" text="Redirecting..." />
    </div>
  )
}


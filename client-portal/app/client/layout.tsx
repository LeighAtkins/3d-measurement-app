'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()

  useEffect(() => {
    // Simple token check for MVP
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }

    // Check if user is a client (simple role check)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      if (payload.role !== 'CLIENT') {
        router.push('/unauthorized')
        return
      }

      // Check token expiry
      if (payload.exp * 1000 <= Date.now()) {
        localStorage.removeItem('token')
        router.push('/login')
        return
      }
    } catch (error) {
      localStorage.removeItem('token')
      router.push('/login')
    }
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Client Portal
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <nav className="flex space-x-4">
                <a
                  href="/client/orders"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  My Orders
                </a>
              </nav>
              <button
                onClick={() => {
                  localStorage.removeItem('token')
                  window.location.href = '/login'
                }}
                className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}
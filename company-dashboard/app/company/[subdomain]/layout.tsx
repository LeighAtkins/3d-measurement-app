'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

interface User {
  id: string
  email: string
  role: string
  company?: {
    subdomain: string
    name: string
  }
}

export default function CompanyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const params = useParams()
  const subdomain = params.subdomain as string
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simple token check for MVP
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      
      // Check if user is company role
      if (!payload.role?.startsWith('COMPANY_')) {
        router.push('/unauthorized')
        return
      }

      // Check subdomain match
      if (payload.company?.subdomain !== subdomain) {
        router.push('/unauthorized')
        return
      }

      // Check token expiry
      if (payload.exp * 1000 <= Date.now()) {
        localStorage.removeItem('token')
        router.push('/login')
        return
      }

      setUser({
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        company: payload.company
      })
    } catch (error) {
      localStorage.removeItem('token')
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }, [router, subdomain])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                {user.company?.name || 'Company Dashboard'}
              </h1>
              <span className="ml-2 text-sm text-gray-500">
                ({subdomain})
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              <nav className="flex space-x-4">
                <Link
                  href={`/company/${subdomain}/orders`}
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Orders
                </Link>
                <Link
                  href={`/company/${subdomain}/clients`}
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Clients
                </Link>
              </nav>
              
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">{user.email}</span>
                <button
                  onClick={() => {
                    localStorage.removeItem('token')
                    router.push('/login')
                  }}
                  className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      <main>{children}</main>
    </div>
  )
}
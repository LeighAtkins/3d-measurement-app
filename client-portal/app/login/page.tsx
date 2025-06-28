'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ApiClient } from '@3d-measurement-app/api-client'

export default function ClientLoginPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const apiClient = new ApiClient()
      const response = await apiClient.login(formData.email, formData.password)
      
      // Check if user is client role
      const token = response.token
      const payload = JSON.parse(atob(token.split('.')[1]))
      
      if (payload.role !== 'CLIENT') {
        throw new Error('Access denied. Client account required.')
      }

      // Redirect to client orders
      router.push('/client/orders')
      
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Client Login
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to input measurements for assigned orders
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="mt-1 relative block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10"
                placeholder="Enter your email"
                required
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                className="mt-1 relative block w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10"
                placeholder="Enter your password"
                required
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Signing in...
                </div>
              ) : (
                'Sign in'
              )}
            </button>
          </div>
          
          <div className="text-center">
            <div className="text-sm text-gray-600">
              <p className="mb-2">Demo credentials:</p>
              <div className="bg-gray-100 rounded-md p-3 text-left">
                <p><strong>Email:</strong> client1@example.com</p>
                <p><strong>Password:</strong> client123</p>
              </div>
              <div className="mt-4">
                <a
                  href="/demo"
                  className="text-blue-600 hover:text-blue-500"
                >
                  Try 3D Demo (No Login Required)
                </a>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

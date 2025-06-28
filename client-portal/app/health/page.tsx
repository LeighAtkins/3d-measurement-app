'use client'

import { useState, useEffect } from 'react'

interface HealthStatus {
  api: 'loading' | 'online' | 'offline'
  frontend: 'online'
  models: 'loading' | 'available' | 'unavailable'
}

export default function HealthPage() {
  const [status, setStatus] = useState<HealthStatus>({
    api: 'loading',
    frontend: 'online',
    models: 'loading'
  })

  useEffect(() => {
    checkHealth()
  }, [])

  const checkHealth = async () => {
    // Check API
    try {
      const response = await fetch('http://localhost:8000/health')
      if (response.ok) {
        setStatus(prev => ({ ...prev, api: 'online' }))
      } else {
        setStatus(prev => ({ ...prev, api: 'offline' }))
      }
    } catch (error) {
      setStatus(prev => ({ ...prev, api: 'offline' }))
    }

    // Check 3D models
    try {
      const response = await fetch('/sample-models/cube.glb')
      if (response.ok) {
        setStatus(prev => ({ ...prev, models: 'available' }))
      } else {
        setStatus(prev => ({ ...prev, models: 'unavailable' }))
      }
    } catch (error) {
      setStatus(prev => ({ ...prev, models: 'unavailable' }))
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
      case 'available':
        return 'text-green-600 bg-green-100'
      case 'offline':
      case 'unavailable':
        return 'text-red-600 bg-red-100'
      case 'loading':
        return 'text-yellow-600 bg-yellow-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">System Health</h1>
          <p className="mt-2 text-gray-600">3D Measurement App Status</p>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Frontend Application</h3>
                <p className="text-sm text-gray-500">Client Portal (Next.js)</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(status.frontend)}`}>
                {status.frontend}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium text-gray-900">API Server</h3>
                <p className="text-sm text-gray-500">Backend REST API (Express.js)</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(status.api)}`}>
                {status.api}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium text-gray-900">3D Models</h3>
                <p className="text-sm text-gray-500">Sample GLB files</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(status.models)}`}>
                {status.models}
              </span>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Client Portal</h4>
                <p className="text-xs text-gray-500">localhost:3000</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900">Company Dashboard</h4>
                <p className="text-xs text-gray-500">localhost:3001</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900">API Server</h4>
                <p className="text-xs text-gray-500">localhost:8000</p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-center">
            <button
              onClick={checkHealth}
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
            >
              Refresh Status
            </button>
          </div>
        </div>

        <div className="mt-8 text-center">
          <a
            href="/"
            className="text-blue-600 hover:text-blue-500 text-sm font-medium"
          >
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  )
}
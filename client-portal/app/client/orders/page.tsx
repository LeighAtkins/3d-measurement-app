'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ApiClient } from '@3d-measurement-app/api-client'

interface Order {
  id: string
  title: string
  status: string
  assignedAt: string
  description?: string
  modelUrl?: string
}

export default function ClientOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const apiClient = new ApiClient()
        const data = await apiClient.getOrders()
        setOrders(data)
      } catch (err: any) {
        setError(err.message || 'Failed to load orders')
      } finally {
        setLoading(false)
      }
    }

    loadOrders()
  }, [])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">Error: {error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
        <p className="mt-2 text-gray-600">
          Orders assigned to you for measurement input
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No orders assigned</h3>
          <p className="mt-1 text-sm text-gray-500">
            You don't have any orders assigned for measurement input yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white overflow-hidden shadow rounded-lg"
            >
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900 truncate">
                    {order.title}
                  </h3>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      order.status === 'PENDING_MEASUREMENTS'
                        ? 'bg-yellow-100 text-yellow-800'
                        : order.status === 'COMPLETED'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {order.status.replace('_', ' ')}
                  </span>
                </div>

                {order.description && (
                  <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                    {order.description}
                  </p>
                )}

                <div className="mt-4">
                  <p className="text-sm text-gray-500">
                    Assigned: {new Date(order.assignedAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="mt-6 flex justify-between items-center">
                  <div className="flex items-center text-sm text-gray-500">
                    {order.modelUrl ? (
                      <span className="text-green-600">✓ 3D Model Available</span>
                    ) : (
                      <span className="text-gray-400">No 3D Model</span>
                    )}
                  </div>

                  <Link
                    href={`/client/orders/${order.id}/measurements`}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Input Measurements
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
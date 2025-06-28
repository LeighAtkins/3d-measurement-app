'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { ModelViewer } from '@3d-measurement-app/3d-tools'
import { ApiClient } from '@3d-measurement-app/api-client'
import * as THREE from 'three'

interface Order {
  id: string
  title: string
  status: string
  createdAt: string
  updatedAt: string
  description?: string
  modelUrl?: string
  assignedClient?: {
    id: string
    email: string
  }
  photos?: string[]
}

interface Measurement {
  id: string
  label: string
  value: number
  unit: string
  startPoint: { x: number; y: number; z: number }
  endPoint: { x: number; y: number; z: number }
  notes?: string
  createdBy?: {
    email: string
    role: string
  }
}

interface Client {
  id: string
  email: string
  name?: string
}

export default function CompanyOrderDetailPage() {
  const params = useParams()
  const subdomain = params.subdomain as string
  const orderId = params.id as string

  const [order, setOrder] = useState<Order | null>(null)
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPoints, setSelectedPoints] = useState<THREE.Vector3[]>([])
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState('')

  useEffect(() => {
    loadData()
  }, [orderId])

  const loadData = async () => {
    try {
      const apiClient = new ApiClient()
      const [orderData, measurementsData] = await Promise.all([
        apiClient.getOrder(orderId),
        apiClient.getMeasurements(orderId)
      ])
      
      setOrder(orderData)
      setMeasurements(measurementsData)
      
      // Load clients for assignment (mock data for MVP)
      setClients([
        { id: '1', email: 'client1@example.com', name: 'John Doe' },
        { id: '2', email: 'client2@example.com', name: 'Jane Smith' },
        { id: '3', email: 'client3@example.com', name: 'Bob Johnson' }
      ])
    } catch (err: any) {
      setError(err.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handlePointClick = (point: THREE.Vector3) => {
    setSelectedPoints(prev => {
      if (prev.length >= 2) {
        return [point] // Start new measurement
      }
      return [...prev, point]
    })
  }

  const handleAssignClient = async () => {
    if (!selectedClientId) return
    
    try {
      const apiClient = new ApiClient()
      await apiClient.updateOrder(orderId, {
        assignedClientId: selectedClientId,
        status: 'PENDING_MEASUREMENTS'
      })
      
      setShowAssignModal(false)
      loadData() // Refresh data
    } catch (err: any) {
      alert(`Failed to assign client: ${err.message}`)
    }
  }

  const handleGenerateFromPhotos = async () => {
    // Placeholder for 3D generation
    alert('3D generation from photos would be implemented here')
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">Error: {error || 'Order not found'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{order.title}</h1>
            <p className="mt-2 text-gray-600">{order.description}</p>
            <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
              <span>Created: {new Date(order.createdAt).toLocaleDateString()}</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                order.status === 'PENDING_MEASUREMENTS' ? 'bg-blue-100 text-blue-800' :
                order.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {order.status.replace('_', ' ')}
              </span>
            </div>
          </div>
          
          <div className="flex space-x-3">
            {order.status === 'PENDING' && (
              <button
                onClick={() => setShowAssignModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700"
              >
                Assign to Client
              </button>
            )}
            
            {order.photos && order.photos.length > 0 && !order.modelUrl && (
              <button
                onClick={handleGenerateFromPhotos}
                className="bg-green-600 text-white px-4 py-2 rounded-md font-medium hover:bg-green-700"
              >
                Generate 3D Model
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Assignment Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Assign Order to Client</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Select Client</label>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a client...</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name} ({client.email})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignClient}
                  disabled={!selectedClientId}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300"
                >
                  Assign Order
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 3D Model Viewer */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">3D Model</h2>
              {order.assignedClient && (
                <span className="text-sm text-gray-600">
                  Assigned to: {order.assignedClient.email}
                </span>
              )}
            </div>
            
            {order.modelUrl ? (
              <>
                <ModelViewer
                  modelUrl={order.modelUrl}
                  className="w-full h-96 rounded-lg border border-gray-200"
                  onPointClick={handlePointClick}
                  showDimensions={true}
                />
                
                {selectedPoints.length > 0 && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-md">
                    <h3 className="text-sm font-medium text-blue-900">Selected Points:</h3>
                    {selectedPoints.map((point, index) => (
                      <p key={index} className="text-sm text-blue-700">
                        Point {index + 1}: ({point.x.toFixed(3)}, {point.y.toFixed(3)}, {point.z.toFixed(3)})
                      </p>
                    ))}
                    {selectedPoints.length === 2 && (
                      <p className="text-sm text-green-700 mt-2">
                        Distance: {selectedPoints[0].distanceTo(selectedPoints[1]).toFixed(3)} units
                      </p>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg h-96 flex items-center justify-center">
                <div className="text-center">
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
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No 3D model</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Upload photos to generate a 3D model
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Order Details & Measurements */}
        <div className="lg:col-span-1 space-y-6">
          {/* Order Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Details</h2>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Status:</span>
                <span className="font-medium">{order.status.replace('_', ' ')}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-500">Created:</span>
                <span>{new Date(order.createdAt).toLocaleDateString()}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-500">Updated:</span>
                <span>{new Date(order.updatedAt).toLocaleDateString()}</span>
              </div>
              
              {order.assignedClient && (
                <div className="border-t pt-3">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Assigned to:</span>
                    <span className="font-medium text-blue-600">{order.assignedClient.email}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Measurements */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Measurements ({measurements.length})
            </h2>
            
            {measurements.length === 0 ? (
              <p className="text-gray-500 text-sm">No measurements yet</p>
            ) : (
              <div className="space-y-3">
                {measurements.map((measurement) => (
                  <div key={measurement.id} className="border border-gray-200 rounded-md p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900">{measurement.label}</h3>
                        <p className="text-sm text-gray-600">
                          {measurement.value} {measurement.unit}
                        </p>
                        {measurement.notes && (
                          <p className="text-xs text-gray-500 mt-1">{measurement.notes}</p>
                        )}
                        {measurement.createdBy && (
                          <p className="text-xs text-gray-400 mt-1">
                            By: {measurement.createdBy.email}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
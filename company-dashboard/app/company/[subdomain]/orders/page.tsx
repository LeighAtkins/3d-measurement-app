'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ApiClient } from '@3d-measurement-app/api-client'
import PhotoUploader from '../../../../components/PhotoUploader'

interface Order {
  id: string
  title: string
  status: string
  createdAt: string
  updatedAt: string
  description?: string
  model_url?: string
  assignedClient?: {
    id: string
    email: string
  }
  photos?: string[]
  measurementCount?: number
}

const statusColors = {
  'PENDING': 'bg-yellow-100 text-yellow-800',
  'PENDING_MEASUREMENTS': 'bg-blue-100 text-blue-800',
  'COMPLETED': 'bg-green-100 text-green-800',
  'CANCELLED': 'bg-red-100 text-red-800'
}

export default function CompanyOrdersPage() {
  const params = useParams()
  const subdomain = params.subdomain as string
  
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newOrder, setNewOrder] = useState({
    title: '',
    description: '',
    modelUrl: '/sample-models/cube.glb',
    furnitureType: '',
    usePhotos: false
  })
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([])
  
  const furnitureTypes = [
    { value: 'sofa', label: 'Sofa' },
    { value: 'armchair', label: 'Armchair' },
    { value: 'cushion', label: 'Cushion' },
    { value: 'ottoman', label: 'Ottoman' },
    { value: 'coffee-table', label: 'Coffee Table' }
  ]

  useEffect(() => {
    loadOrders()
  }, [])

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

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const apiClient = new ApiClient()
      
      // Create the order first
      const orderData = {
        ...newOrder,
        status: 'PENDING',
        furniture_type: newOrder.furnitureType,
        generation_status: newOrder.usePhotos ? 'pending' : 'not_applicable'
      }
      
      const createdOrder = await apiClient.createOrder(orderData)
      
      // If using photos, upload them
      if (newOrder.usePhotos && selectedPhotos.length > 0) {
        console.log('Starting photo upload for order:', createdOrder.id)
        console.log('Furniture type:', newOrder.furnitureType)
        console.log('Selected photos:', selectedPhotos.length)
        
        const formData = new FormData()
        
        // Add furnitureType field that API expects
        formData.append('furnitureType', newOrder.furnitureType)
        
        // Add photos
        selectedPhotos.forEach((photo, index) => {
          console.log(`Adding photo ${index + 1}:`, photo.name, photo.type, photo.size)
          formData.append('photos', photo)
        })
        
        // Debug FormData contents
        for (let pair of formData.entries()) {
          console.log('FormData entry:', pair[0], typeof pair[1] === 'object' ? 'File object' : pair[1])
        }
        
        try {
          console.log('Sending request to:', `http://localhost:8000/api/furniture/upload-photos/${createdOrder.id}`)
          console.log('Auth token:', apiClient.getToken() ? 'Present' : 'Missing')
          
          const response = await fetch(`http://localhost:8000/api/furniture/upload-photos/${createdOrder.id}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiClient.getToken()}`
            },
            body: formData
          })
          
          console.log('Upload response status:', response.status)
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
            console.error('Photo upload failed:', response.status, errorData)
            
            let errorMessage = errorData.error || 'Unknown error'
            if (errorMessage.includes('Invalid or corrupted image file')) {
              errorMessage = 'Photo format not supported. Please use JPEG, PNG, or WebP files only.'
            } else if (errorMessage.includes('Unsupported image format')) {
              errorMessage = 'Photo format not supported. Please use JPEG (.jpg), PNG (.png), or WebP (.webp) files only.'
            } else if (errorMessage.includes('Image too small')) {
              errorMessage = 'Photo is too small. Please use images that are at least 512x512 pixels for best 3D generation quality.'
            }
            
            alert(`Photo upload failed: ${errorMessage}\n\nOrder was created successfully, but photos need to be uploaded separately.\n\nSupported formats: JPEG, PNG, WebP`)
          } else {
            const result = await response.json()
            console.log('Photos uploaded successfully:', result)
            alert('Order and photos uploaded successfully!')
          }
        } catch (photoErr) {
          console.error('Photo upload network error:', photoErr)
          alert('Photo upload failed due to network error. Order was created but photos need to be uploaded separately.')
        }
      }
      
      setShowCreateForm(false)
      setNewOrder({ title: '', description: '', modelUrl: '/sample-models/cube.glb', furnitureType: '', usePhotos: false })
      setSelectedPhotos([])
      loadOrders() // Refresh the list
    } catch (err: any) {
      alert(`Failed to create order: ${err.message}`)
    }
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
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order Management</h1>
          <p className="mt-2 text-gray-600">
            Manage orders, assign to clients, and track progress
          </p>
        </div>
        
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700"
        >
          Create New Order
        </button>
      </div>

      {/* Create Order Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Create New Order</h2>
            
            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  value={newOrder.title}
                  onChange={(e) => setNewOrder(prev => ({ ...prev, title: e.target.value }))}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={newOrder.description}
                  onChange={(e) => setNewOrder(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                />
              </div>
              
              {/* Furniture Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Furniture Type</label>
                <select
                  value={newOrder.furnitureType}
                  onChange={(e) => setNewOrder(prev => ({ ...prev, furnitureType: e.target.value }))}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  required
                >
                  <option value="">Select furniture type</option>
                  {furnitureTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              {/* Photo vs 3D Model Toggle */}
              <div>
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="usePhotos"
                    checked={newOrder.usePhotos}
                    onChange={(e) => setNewOrder(prev => ({ ...prev, usePhotos: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="usePhotos" className="text-sm font-medium text-gray-700">
                    Generate 3D model from photos (TRELLIS)
                  </label>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Upload photos to automatically generate a 3D model, or use a pre-made model below
                </p>
              </div>

              {/* Photo Upload Section */}
              {newOrder.usePhotos && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Photos ({selectedPhotos.length}/5)
                  </label>
                  <PhotoUploader
                    onPhotosSelected={setSelectedPhotos}
                    furnitureType={newOrder.furnitureType}
                    maxFiles={5}
                  />
                  {selectedPhotos.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-600">
                        Selected: {selectedPhotos.map(f => f.name).join(', ')}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* 3D Model Selection (only if not using photos) */}
              {!newOrder.usePhotos && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Pre-made 3D Model</label>
                  <select
                    value={newOrder.modelUrl}
                    onChange={(e) => setNewOrder(prev => ({ ...prev, modelUrl: e.target.value }))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  >
                    <option value="/sample-models/cube.glb">Cube (Demo)</option>
                    <option value="/sample-models/room.glb">Room (Demo)</option>
                    <option value="/sample-models/cabinet.glb">Cabinet (Demo)</option>
                  </select>
                </div>
              )}
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Create Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Orders Grid */}
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
          <h3 className="mt-2 text-sm font-medium text-gray-900">No orders yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating your first order.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900 truncate">
                    {order.title}
                  </h3>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      statusColors[order.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {order.status.replace('_', ' ')}
                  </span>
                </div>

                {order.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {order.description}
                  </p>
                )}

                <div className="space-y-2 text-sm text-gray-500">
                  <div className="flex justify-between">
                    <span>Created:</span>
                    <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                  </div>
                  
                  {order.assignedClient && (
                    <div className="flex justify-between">
                      <span>Assigned to:</span>
                      <span className="text-blue-600">{order.assignedClient.email}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <span>3D Model:</span>
                    <span className={order.model_url ? 'text-green-600' : 'text-gray-400'}>
                      {order.model_url ? '✓ Available' : 'Not set'}
                    </span>
                  </div>
                  
                  {order.measurementCount !== undefined && (
                    <div className="flex justify-between">
                      <span>Measurements:</span>
                      <span>{order.measurementCount}</span>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-between items-center">
                  <div className="flex space-x-2">
                    {order.status === 'PENDING' && (
                      <button className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        Assign Client
                      </button>
                    )}
                  </div>
                  
                  <Link
                    href={`/company/${subdomain}/orders/${order.id}`}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    View Details
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
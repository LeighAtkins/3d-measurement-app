'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { ModelViewer, CustomMeasurement } from '@3d-measurement-app/3d-tools'
import { ApiClient } from '@3d-measurement-app/api-client'
import * as THREE from 'three'
import PhotoGallery from '../../../../../components/PhotoGallery'
import VersionManager from '../../../../../components/VersionManager'
import EditMeasurementModal from '../../../../../components/EditMeasurementModal'

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
  furniture_type?: string
  generation_status?: string
  generation_attempts?: number
}

interface Photo {
  id: string
  filename: string
  file_path: string
  file_size: number
  mime_type: string
  created_at: string
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
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedPoints, setSelectedPoints] = useState<THREE.Vector3[]>([])
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState('')
  const [generateLoading, setGenerateLoading] = useState(false)
  const [currentModelUrl, setCurrentModelUrl] = useState<string | null>(null)
  
  // Measurement system state
  const [customMeasurements, setCustomMeasurements] = useState<CustomMeasurement[]>([])
  const [measurementMode, setMeasurementMode] = useState(false)
  const [temporaryMeasurement, setTemporaryMeasurement] = useState<{ start: THREE.Vector3, end?: THREE.Vector3 } | null>(null)
  const [showMeasurementModal, setShowMeasurementModal] = useState(false)
  const [pendingMeasurement, setPendingMeasurement] = useState<{ start: THREE.Vector3, end: THREE.Vector3 } | null>(null)
  
  // Edit measurement state
  const [editingMeasurement, setEditingMeasurement] = useState<CustomMeasurement | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedMeasurementId, setSelectedMeasurementId] = useState<string | undefined>(undefined)
  const [hoveredMeasurementId, setHoveredMeasurementId] = useState<string | undefined>(undefined)

  useEffect(() => {
    console.log('useEffect triggered:', { orderId, loading })
    if (orderId) {
      loadData()
    }
  }, [orderId])

  const loadPhotos = async (apiClient: ApiClient) => {
    try {
      return await apiClient.getOrderPhotos(orderId)
    } catch (err) {
      console.warn('Failed to load photos:', err)
      return []
    }
  }

  const handleGenerate3D = async () => {
    setGenerateLoading(true)
    try {
      const apiClient = new ApiClient()
      const response = await fetch('http://localhost:8000/api/furniture/generate-3d', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiClient.getToken()}`
        },
        body: JSON.stringify({ orderId })
      })

      if (response.ok) {
        const result = await response.json()
        alert('3D generation started! This may take several minutes.')
        // Refresh order data to show updated status
        loadData()
      } else {
        const error = await response.json()
        alert(`Generation failed: ${error.error}`)
      }
    } catch (err: any) {
      alert(`Generation failed: ${err.message}`)
    } finally {
      setGenerateLoading(false)
    }
  }

  const loadData = async () => {
    console.log('loadData called, current loading state:', loading)
    if (loading) {
      console.log('Already loading, skipping...')
      return
    }
    
    setLoading(true)
    setError(null)
    console.log('Starting data load...')
    
    try {
      const apiClient = new ApiClient()
      
      console.log('Loading order data...')
      const orderData = await apiClient.getOrder(orderId)
      console.log('Order data loaded:', orderData)
      setOrder(orderData)
      
      // Set initial model URL
      setCurrentModelUrl(orderData.model_url || null)
      
      console.log('Loading measurements...')
      const measurementsData = await apiClient.getMeasurements(orderId)
      console.log('Measurements loaded:', measurementsData)
      setMeasurements(measurementsData)
      
      // Convert measurements to CustomMeasurement format for 3D viewer
      const customMeasurementsData = measurementsData
        .filter((m: any) => m.start_point && m.end_point) // Only measurements with 3D points
        .map((m: any) => ({
          id: m.id,
          label: m.label,
          start_point: new THREE.Vector3(m.start_point.x, m.start_point.y, m.start_point.z),
          end_point: new THREE.Vector3(m.end_point.x, m.end_point.y, m.end_point.z),
          distance: m.value,
          unit: m.unit,
          notes: m.notes,
          color: 'green',
          visible: true
        } as CustomMeasurement))
      
      setCustomMeasurements(customMeasurementsData)
      
      console.log('Loading photos...')
      const photosData = await loadPhotos(apiClient)
      console.log('Photos loaded:', photosData)
      setPhotos(photosData || [])
      
      // Load clients for assignment (mock data for MVP)
      setClients([
        { id: '550e8400-e29b-41d4-a716-446655440002', email: 'client1@example.com', name: 'John Doe' },
        { id: '550e8400-e29b-41d4-a716-446655440003', email: 'client2@example.com', name: 'Jane Smith' },
        { id: '550e8400-e29b-41d4-a716-446655440004', email: 'client3@example.com', name: 'Bob Johnson' }
      ])
      
      console.log('All data loaded successfully')
    } catch (err: any) {
      console.error('Failed to load order data:', err)
      setError(err.message || 'Failed to load data')
    } finally {
      console.log('Setting loading to false')
      setLoading(false)
    }
  }

  const handlePointClick = (point: THREE.Vector3) => {
    if (measurementMode) {
      // New measurement system
      if (!temporaryMeasurement) {
        // First point selected
        setTemporaryMeasurement({ start: point })
      } else if (!temporaryMeasurement.end) {
        // Second point selected - complete the measurement
        const completedMeasurement = { start: temporaryMeasurement.start, end: point }
        setPendingMeasurement(completedMeasurement)
        setTemporaryMeasurement(null)
        setShowMeasurementModal(true)
      }
    } else {
      // Legacy point selection for old system
      setSelectedPoints(prev => {
        if (prev.length >= 2) {
          return [point] // Start new measurement
        }
        return [...prev, point]
      })
    }
  }

  const handleAssignClient = async () => {
    if (!selectedClientId || !order) return
    
    try {
      const apiClient = new ApiClient()
      const updateData: any = {
        title: order.title,
        description: order.description || '',
        status: 'PENDING_MEASUREMENTS',
        assigned_client_id: selectedClientId
      }
      
      // Always preserve the existing model_url if it exists
      if (order.model_url) {
        updateData.model_url = order.model_url
      }
      
      await apiClient.updateOrder(orderId, updateData)
      
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

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('Are you sure you want to delete this photo?')) {
      return
    }

    try {
      const apiClient = new ApiClient()
      await apiClient.deletePhoto(photoId)
      
      // Remove photo from local state
      setPhotos(prev => prev.filter(photo => photo.id !== photoId))
      
      // Show success message
      alert('Photo deleted successfully')
    } catch (error) {
      console.error('Failed to delete photo:', error)
      alert('Failed to delete photo. Please try again.')
    }
  }

  const handleUploadMorePhotos = async (files: File[]) => {
    try {
      setLoading(true)
      
      const apiClient = new ApiClient()
      const result = await apiClient.addPhotosToOrder(orderId, files)
      
      // Add new photos to local state
      setPhotos(prev => [...prev, ...result.photos])
      
      // Show success message
      alert(`${result.photos.length} photos uploaded successfully`)
    } catch (error) {
      console.error('Failed to upload photos:', error)
      alert('Failed to upload photos. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleBulkDeletePhotos = async (photoIds: string[]) => {
    try {
      const apiClient = new ApiClient()
      await apiClient.bulkDeletePhotos(orderId, photoIds)
      
      // Remove deleted photos from local state
      setPhotos(prev => prev.filter(photo => !photoIds.includes(photo.id)))
      
      // Show success message
      alert(`${photoIds.length} photo${photoIds.length > 1 ? 's' : ''} deleted successfully`)
    } catch (error) {
      console.error('Failed to delete photos:', error)
      alert('Failed to delete photos. Please try again.')
    }
  }

  const handleRegenerateWithPhotos = async (photoIds: string[]) => {
    try {
      setGenerateLoading(true)
      
      const apiClient = new ApiClient()
      const photoSetName = `Custom Set ${new Date().toLocaleString()}`
      
      const result = await apiClient.regenerateWithPhotos(orderId, photoIds, photoSetName)
      
      // Show success message and refresh data
      alert(`3D regeneration started with ${photoIds.length} selected photos. This may take several minutes.`)
      loadData() // Refresh order data to show updated status
    } catch (error) {
      console.error('Failed to start regeneration:', error)
      alert('Failed to start regeneration. Please try again.')
    } finally {
      setGenerateLoading(false)
    }
  }

  // Measurement system handlers
  const toggleMeasurementMode = () => {
    setMeasurementMode(!measurementMode)
    setTemporaryMeasurement(null)
    setSelectedPoints([]) // Clear legacy points when switching modes
  }

  const handleSaveMeasurement = async (label: string, unit: string, notes?: string) => {
    if (!pendingMeasurement) return

    try {
      const distance = pendingMeasurement.start.distanceTo(pendingMeasurement.end)
      
      // Create measurement data for API
      const measurementData = {
        label,
        value: distance,
        unit,
        start_point: {
          x: pendingMeasurement.start.x,
          y: pendingMeasurement.start.y,
          z: pendingMeasurement.start.z
        },
        end_point: {
          x: pendingMeasurement.end.x,
          y: pendingMeasurement.end.y,
          z: pendingMeasurement.end.z
        },
        notes: notes || ''
      }

      // Save to database via API
      const apiClient = new ApiClient()
      const savedMeasurement = await apiClient.request(`/api/orders/${orderId}/measurements`, {
        method: 'POST',
        body: JSON.stringify(measurementData)
      })

      // Convert to CustomMeasurement format and add to local state
      const newMeasurement: CustomMeasurement = {
        id: savedMeasurement.id,
        label: savedMeasurement.label,
        start_point: new THREE.Vector3(
          savedMeasurement.start_point.x,
          savedMeasurement.start_point.y,
          savedMeasurement.start_point.z
        ),
        end_point: new THREE.Vector3(
          savedMeasurement.end_point.x,
          savedMeasurement.end_point.y,
          savedMeasurement.end_point.z
        ),
        distance: savedMeasurement.value,
        unit: savedMeasurement.unit,
        notes: savedMeasurement.notes,
        color: 'green',
        visible: true
      }

      setCustomMeasurements(prev => [...prev, newMeasurement])
      
      // Close modal and reset state
      setShowMeasurementModal(false)
      setPendingMeasurement(null)
      
    } catch (error) {
      console.error('Failed to save measurement:', error)
      alert('Failed to save measurement. Please try again.')
    }
  }

  const handleCancelMeasurement = () => {
    setShowMeasurementModal(false)
    setPendingMeasurement(null)
    setTemporaryMeasurement(null)
  }

  const handleDeleteMeasurement = async (measurementId: string) => {
    if (!confirm('Are you sure you want to delete this measurement?')) {
      return
    }

    try {
      // Delete from database via API
      const apiClient = new ApiClient()
      await apiClient.request(`/api/measurements/${measurementId}`, {
        method: 'DELETE'
      })

      // Remove from local state
      setCustomMeasurements(prev => prev.filter(m => m.id !== measurementId))
    } catch (error) {
      console.error('Failed to delete measurement:', error)
      alert('Failed to delete measurement. Please try again.')
    }
  }

  const handleEditMeasurement = async (id: string, updates: Partial<CustomMeasurement>) => {
    try {
      const apiClient = new ApiClient()
      const response = await apiClient.request(`/api/measurements/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      
      if (!response || typeof response !== 'object') {
        throw new Error('Invalid response from server')
      }
      
      // Update local state with the response data
      setCustomMeasurements(prev => 
        prev.map(m => m.id === id ? {
          ...m,
          label: updates.label || m.label,
          unit: updates.unit || m.unit,
          notes: updates.notes !== undefined ? updates.notes : m.notes
        } : m)
      )
      
      alert('Measurement updated successfully')
    } catch (error) {
      console.error('Error updating measurement:', error)
      alert('Failed to update measurement. Please try again.')
      throw error
    }
  }

  const openEditModal = (measurement: CustomMeasurement) => {
    setEditingMeasurement(measurement)
    setIsEditModalOpen(true)
    setSelectedMeasurementId(measurement.id)
  }

  const closeEditModal = () => {
    setIsEditModalOpen(false)
    setEditingMeasurement(null)
    setSelectedMeasurementId(undefined)
  }

  const handleMeasurementSelect = (measurement: CustomMeasurement) => {
    setSelectedMeasurementId(measurement.id)
    // Optionally open edit modal on double-click or specific action
  }

  const handleMeasurementHover = (measurementId: string, hovered: boolean) => {
    setHoveredMeasurementId(hovered ? measurementId : undefined)
  }

  // Keyboard handlers
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (measurementMode) {
          setTemporaryMeasurement(null)
          if (showMeasurementModal) {
            handleCancelMeasurement()
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [measurementMode, showMeasurementModal])

  if (loading || !order) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading order details...</span>
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
              {order.furniture_type && (
                <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
                  {order.furniture_type}
                </span>
              )}
              {order.generation_status && (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  order.generation_status === 'completed' ? 'bg-green-100 text-green-800' :
                  order.generation_status === 'processing' ? 'bg-blue-100 text-blue-800' :
                  order.generation_status === 'photos_uploaded' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {order.generation_status.replace('_', ' ')}
                </span>
              )}
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
            
            {photos.length > 0 && order.generation_status === 'photos_uploaded' && (
              <button
                onClick={handleGenerate3D}
                disabled={generateLoading}
                className="bg-green-600 text-white px-4 py-2 rounded-md font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {generateLoading ? 'Generating...' : 'Generate 3D Model'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Photo Gallery and Generation Controls */}
      {photos.length > 0 && (
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Uploaded Photos</h2>
              <span className="text-sm text-gray-500">{photos.length} photo(s)</span>
            </div>
            
            <PhotoGallery 
              photos={photos} 
              canDelete={true}
              canUploadMore={true}
              canBulkDelete={true}
              canRegenerate={true}
              maxPhotos={20}
              onDeletePhoto={handleDeletePhoto}
              onUploadMore={handleUploadMorePhotos}
              onDeleteSelected={handleBulkDeletePhotos}
              onRegenerateWithSelected={handleRegenerateWithPhotos}
            />
            
            {order.generation_status === 'photos_uploaded' && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-yellow-800">Ready for 3D Generation</h3>
                    <p className="text-sm text-yellow-700 mt-1">
                      Photos have been uploaded and validated. Click to generate a 3D model using TRELLIS.
                    </p>
                  </div>
                  <button
                    onClick={handleGenerate3D}
                    disabled={generateLoading}
                    className="bg-yellow-600 text-white px-4 py-2 rounded-md font-medium hover:bg-yellow-700 disabled:opacity-50"
                  >
                    {generateLoading ? 'Generating...' : 'Start Generation'}
                  </button>
                </div>
              </div>
            )}
            
            {order.generation_status === 'processing' && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
                  <div>
                    <h3 className="text-sm font-medium text-blue-800">Processing 3D Model</h3>
                    <p className="text-sm text-blue-700 mt-1">
                      Your 3D model is being generated. This process may take several minutes.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
            
            {(currentModelUrl || order.model_url) ? (
              <>
                <ModelViewer
                  modelUrl={currentModelUrl || `http://localhost:8000/api/orders/${orderId}/model`}
                  className="w-full h-96 rounded-lg border border-gray-200"
                  onPointClick={handlePointClick}
                  showDimensions={!measurementMode} // Hide auto dimensions in measurement mode
                  customMeasurements={customMeasurements}
                  temporaryMeasurement={temporaryMeasurement}
                  measurementMode={measurementMode}
                  onMeasurementSelect={handleMeasurementSelect}
                  onMeasurementHover={handleMeasurementHover}
                  selectedMeasurementId={selectedMeasurementId}
                  hoveredMeasurementId={hoveredMeasurementId}
                />
                
                {/* Measurement Controls */}
                <div className="mt-4 flex items-center justify-between">
                  <button
                    onClick={toggleMeasurementMode}
                    className={`px-4 py-2 rounded-md font-medium ${
                      measurementMode 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {measurementMode ? 'Exit Measurement Mode' : 'Start Measuring'}
                  </button>
                  
                  {measurementMode && (
                    <div className="text-sm text-gray-600">
                      {!temporaryMeasurement 
                        ? 'Click on the model to select the first point'
                        : !temporaryMeasurement.end 
                        ? 'Click on the model to select the second point'
                        : 'Measurement complete'
                      }
                    </div>
                  )}
                  
                  {customMeasurements.length > 0 && (
                    <span className="text-sm text-gray-500">
                      {customMeasurements.length} measurement{customMeasurements.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                
                {/* Legacy point display - only show when not in measurement mode */}
                {!measurementMode && selectedPoints.length > 0 && (
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

          {/* Custom Measurements List */}
          {customMeasurements.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Custom Measurements ({customMeasurements.length})
              </h2>
              <div className="space-y-3">
                {customMeasurements.map((measurement) => (
                  <div 
                    key={measurement.id} 
                    className={`border rounded-md p-3 transition-colors ${
                      selectedMeasurementId === measurement.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : hoveredMeasurementId === measurement.id
                        ? 'border-yellow-400 bg-yellow-50'
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900">{measurement.label}</h3>
                        <p className="text-sm text-gray-600">
                          {measurement.distance.toFixed(3)} {measurement.unit}
                        </p>
                        {measurement.notes && (
                          <p className="text-xs text-gray-500 mt-1">{measurement.notes}</p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEditModal(measurement)}
                          className="text-blue-500 hover:text-blue-700 p-1 rounded hover:bg-blue-100"
                          title="Edit measurement"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteMeasurement(measurement.id)}
                          className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-100"
                          title="Delete measurement"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Version Manager */}
          {order.model_url && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                3D Model Versions
              </h2>
              <VersionManager 
                orderId={orderId}
                onVersionSelected={(version) => {
                  console.log('Version selected:', version)
                  // Update the current model URL to show the selected version
                  if (version.glb_url) {
                    const proxyUrl = `http://localhost:8000/api/models/proxy?url=${encodeURIComponent(version.glb_url)}`
                    setCurrentModelUrl(proxyUrl)
                  } else {
                    // If no model URL, fall back to order's default model or show placeholder
                    setCurrentModelUrl(order?.model_url || null)
                  }
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Measurement Input Modal */}
      {showMeasurementModal && pendingMeasurement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Save Measurement</h3>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.target as HTMLFormElement)
              const label = formData.get('label') as string
              const unit = formData.get('unit') as string
              const notes = formData.get('notes') as string
              
              if (label.trim()) {
                handleSaveMeasurement(label.trim(), unit, notes || undefined)
              }
            }}>
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Measurement Label *
                  </label>
                  <input
                    type="text"
                    name="label"
                    required
                    placeholder="e.g., Seat Width, Arm Height"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    autoFocus
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Unit
                  </label>
                  <select
                    name="unit"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="cm">Centimeters (cm)</option>
                    <option value="inches">Inches (in)</option>
                    <option value="mm">Millimeters (mm)</option>
                    <option value="m">Meters (m)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (optional)
                  </label>
                  <textarea
                    name="notes"
                    rows={2}
                    placeholder="Additional details about this measurement"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div className="bg-gray-50 p-3 rounded-md">
                  <div className="text-sm text-gray-600">
                    <p><strong>Distance:</strong> {pendingMeasurement.start.distanceTo(pendingMeasurement.end).toFixed(3)} units</p>
                    <p><strong>From:</strong> ({pendingMeasurement.start.x.toFixed(2)}, {pendingMeasurement.start.y.toFixed(2)}, {pendingMeasurement.start.z.toFixed(2)})</p>
                    <p><strong>To:</strong> ({pendingMeasurement.end.x.toFixed(2)}, {pendingMeasurement.end.y.toFixed(2)}, {pendingMeasurement.end.z.toFixed(2)})</p>
                  </div>
                </div>
              </div>
              
              <div className="px-6 py-4 border-t flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleCancelMeasurement}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Save Measurement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Measurement Modal */}
      <EditMeasurementModal
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        measurement={editingMeasurement}
        onSave={handleEditMeasurement}
      />
    </div>
  )
}
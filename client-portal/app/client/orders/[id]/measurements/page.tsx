'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { ModelViewer } from '@3d-measurement-app/3d-tools'
import { ApiClient } from '@3d-measurement-app/api-client'
import * as THREE from 'three'

interface Order {
  id: string
  title: string
  description?: string
  modelUrl?: string
  status: string
}

interface Measurement {
  id: string
  label: string
  value: number
  unit: string
  startPoint: { x: number; y: number; z: number }
  endPoint: { x: number; y: number; z: number }
  notes?: string
}

export default function ClientMeasurementsPage() {
  const params = useParams()
  const orderId = params.id as string

  const [order, setOrder] = useState<Order | null>(null)
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPoints, setSelectedPoints] = useState<THREE.Vector3[]>([])
  const [newMeasurement, setNewMeasurement] = useState({
    label: '',
    value: 0,
    unit: 'cm',
    notes: ''
  })

  useEffect(() => {
    const loadData = async () => {
      try {
        const apiClient = new ApiClient()
        const [orderData, measurementsData] = await Promise.all([
          apiClient.getOrder(orderId),
          apiClient.getMeasurements(orderId)
        ])
        setOrder(orderData)
        setMeasurements(measurementsData)
      } catch (err: any) {
        setError(err.message || 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    if (orderId) {
      loadData()
    }
  }, [orderId])

  const handlePointClick = (point: THREE.Vector3) => {
    setSelectedPoints(prev => {
      if (prev.length >= 2) {
        return [point] // Start new measurement
      }
      return [...prev, point]
    })
  }

  const handleDimensionClick = (dimension: { label: string, start_point: THREE.Vector3, end_point: THREE.Vector3, value: number }) => {
    // Set the selected points to the dimension's start and end points
    setSelectedPoints([dimension.start_point, dimension.end_point])
    
    // Pre-fill the measurement form with the dimension data
    setNewMeasurement({
      label: dimension.label,
      value: dimension.value,
      unit: 'cm',
      notes: `Auto-generated ${dimension.label.toLowerCase()} measurement`
    })
  }

  const handleSaveMeasurement = async () => {
    if (selectedPoints.length !== 2) {
      alert('Please select two points to create a measurement')
      return
    }

    if (!newMeasurement.label.trim()) {
      alert('Please enter a label for the measurement')
      return
    }

    try {
      const apiClient = new ApiClient()
      const measurementData = {
        ...newMeasurement,
        start_point: {
          x: selectedPoints[0].x,
          y: selectedPoints[0].y,
          z: selectedPoints[0].z
        },
        end_point: {
          x: selectedPoints[1].x,
          y: selectedPoints[1].y,
          z: selectedPoints[1].z
        }
      }

      const savedMeasurement = await apiClient.createMeasurement(orderId, measurementData)
      setMeasurements(prev => [...prev, savedMeasurement])
      setSelectedPoints([])
      setNewMeasurement({ label: '', value: 0, unit: 'cm', notes: '' })
    } catch (err: any) {
      alert(`Failed to save measurement: ${err.message}`)
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

  if (!order) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <p className="text-gray-500">Order not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{order.title}</h1>
        <p className="mt-2 text-gray-600">Input measurements for this order</p>
        {order.description && (
          <p className="mt-1 text-sm text-gray-500">{order.description}</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 3D Viewer */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              3D Model - Click Points or Dimension Labels
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Click on the model to select points for custom measurements, or click on the dimension labels (Width, Height, Depth) to use automatic measurements.
            </p>
            <ModelViewer
              modelUrl={order.modelUrl || '/sample-models/cube.glb'}
              className="w-full h-96 rounded-lg border border-gray-200"
              onPointClick={handlePointClick}
              onDimensionClick={handleDimensionClick}
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
          </div>
        </div>

        {/* Measurement Input & List */}
        <div className="lg:col-span-1 space-y-6">
          {/* New Measurement Form */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              New Measurement
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Label
                </label>
                <input
                  type="text"
                  value={newMeasurement.label}
                  onChange={(e) => setNewMeasurement(prev => ({ ...prev, label: e.target.value }))}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  placeholder="e.g., Width, Height, Depth"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Value
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newMeasurement.value}
                    onChange={(e) => setNewMeasurement(prev => ({ ...prev, value: parseFloat(e.target.value) || 0 }))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Unit
                  </label>
                  <select
                    value={newMeasurement.unit}
                    onChange={(e) => setNewMeasurement(prev => ({ ...prev, unit: e.target.value }))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  >
                    <option value="cm">cm</option>
                    <option value="m">m</option>
                    <option value="mm">mm</option>
                    <option value="in">in</option>
                    <option value="ft">ft</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Notes
                </label>
                <textarea
                  value={newMeasurement.notes}
                  onChange={(e) => setNewMeasurement(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  placeholder="Optional notes..."
                />
              </div>
              
              <button
                onClick={handleSaveMeasurement}
                disabled={selectedPoints.length !== 2 || !newMeasurement.label.trim()}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Save Measurement
              </button>
            </div>
          </div>

          {/* Existing Measurements */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Saved Measurements ({measurements.length})
            </h2>
            
            {measurements.length === 0 ? (
              <p className="text-gray-500 text-sm">No measurements saved yet</p>
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
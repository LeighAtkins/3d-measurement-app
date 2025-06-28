'use client'

import { useState } from 'react'
import { ModelViewer } from '@3d-measurement-app/3d-tools'
import * as THREE from 'three'

export default function DemoPage() {
  const [selectedPoint, setSelectedPoint] = useState<THREE.Vector3 | null>(null)
  const [showDimensions, setShowDimensions] = useState(true)

  const handlePointClick = (point: THREE.Vector3) => {
    setSelectedPoint(point)
    console.log('Point clicked:', point)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            3D Measurement Demo
          </h1>
          <p className="text-gray-600">
            IKEA-style 3D measurements with smart camera-responsive positioning
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* 3D Viewer */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800">
                  3D Model Viewer
                </h2>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={showDimensions}
                    onChange={(e) => setShowDimensions(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Show Dimensions</span>
                </label>
              </div>
              
              <ModelViewer
                className="w-full h-96 rounded-lg border border-gray-200"
                onPointClick={handlePointClick}
                showDimensions={showDimensions}
              />
            </div>
          </div>

          {/* Control Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Controls & Info
              </h3>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Features:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• IKEA-style external dimensions</li>
                    <li>• Smart camera-responsive positioning</li>
                    <li>• 3D arrow heads with proper rotation</li>
                    <li>• Width, Height, Depth measurements</li>
                    <li>• Interactive 3D controls</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Controls:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Left click + drag: Rotate</li>
                    <li>• Right click + drag: Pan</li>
                    <li>• Scroll: Zoom in/out</li>
                    <li>• Click object: Select point</li>
                  </ul>
                </div>

                {selectedPoint && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium text-gray-700 mb-2">Selected Point:</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>X: {selectedPoint.x.toFixed(3)}</div>
                      <div>Y: {selectedPoint.y.toFixed(3)}</div>
                      <div>Z: {selectedPoint.z.toFixed(3)}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Smart Positioning
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Measurements automatically switch to the closest visible edges based on camera position:
              </p>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>
                  <strong>Width:</strong> Top/bottom + front/back edges
                </li>
                <li>
                  <strong>Height:</strong> Left/right + front/back edges
                </li>
                <li>
                  <strong>Depth:</strong> Left/right + top/bottom edges
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            Try It Out!
          </h3>
          <p className="text-blue-800">
            Rotate the camera around the cube to see how the measurements automatically 
            reposition themselves to stay visible and close to the camera. The system 
            uses smart edge detection to avoid measurements appearing behind the object.
          </p>
        </div>
      </div>
    </div>
  )
}
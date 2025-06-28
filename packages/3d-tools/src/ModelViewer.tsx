'use client'

import { Suspense, useRef, useState, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, useGLTF, Html, Center, Line } from '@react-three/drei'
import * as THREE from 'three'

interface ModelProps {
  url?: string
  onPointClick?: (point: THREE.Vector3) => void
  onDimensionClick?: (dimension: { label: string, start_point: THREE.Vector3, end_point: THREE.Vector3, value: number }) => void
  showDimensions?: boolean
}

function Model({ url, onPointClick, onDimensionClick, showDimensions = true }: ModelProps) {
  const { scene } = useGLTF(url || '/models/default.glb')
  const meshRef = useRef<THREE.Group>(null)

  const handleClick = (event: any) => {
    if (onPointClick && event.intersections && event.intersections[0]) {
      const point = event.intersections[0].point
      onPointClick(point)
    }
  }

  return (
    <group>
      <primitive 
        ref={meshRef}
        object={scene} 
        onClick={handleClick}
        scale={1}
      />
      {showDimensions && <IkeaStyleDimensions object={scene} onDimensionClick={onDimensionClick} />}
    </group>
  )
}

function FallbackModel({ onPointClick, onDimensionClick, showDimensions = true }: ModelProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const groupRef = useRef<THREE.Group>(null)

  const handleClick = (event: any) => {
    if (onPointClick && event.intersections && event.intersections[0]) {
      const point = event.intersections[0].point
      onPointClick(point)
    }
  }

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef} onClick={handleClick}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#10b981" transparent opacity={0.8} />
      </mesh>
      {showDimensions && groupRef.current && (
        <IkeaStyleDimensions object={groupRef.current} onDimensionClick={onDimensionClick} />
      )}
    </group>
  )
}

interface IkeaStyleDimensionsProps {
  object: THREE.Object3D
  onDimensionClick?: (dimension: { label: string, start_point: THREE.Vector3, end_point: THREE.Vector3, value: number }) => void
}

function IkeaStyleDimensions({ object, onDimensionClick }: IkeaStyleDimensionsProps) {
  const { camera } = useThree()
  const [bbox, setBbox] = useState<THREE.Box3 | null>(null)
  const [cameraPosition, setCameraPosition] = useState(new THREE.Vector3())

  useFrame(() => {
    setCameraPosition(camera.position.clone())
  })

  useEffect(() => {
    if (object) {
      const box = new THREE.Box3().setFromObject(object)
      setBbox(box)
    }
  }, [object])

  if (!bbox) return null

  const min = bbox.min
  const max = bbox.max
  const center = new THREE.Vector3().addVectors(min, max).multiplyScalar(0.5)
  const size = new THREE.Vector3().subVectors(max, min)

  // Choose edges based on camera position (front-facing bias)
  const useTopEdge = cameraPosition.y > center.y     // Camera is above center
  const useRightEdge = cameraPosition.x > center.x   // Camera is to the right of center
  const useFrontZ = cameraPosition.z > center.z      // Camera is in front

  // Define the outer prism edges (closer to cube - 50% of original distance)
  const gap = 0.075 // Distance from cube surface to dimension line (reduced by 50%)
  const outerMin = new THREE.Vector3(min.x - gap, min.y - gap, min.z - gap)
  const outerMax = new THREE.Vector3(max.x + gap, max.y + gap, max.z + gap)

  return (
    <group>
      {/* WIDTH MEASUREMENT - Use closest Y edge to camera */}
      <SurfaceDimensionLine
        startSurface={new THREE.Vector3(
          outerMin.x + gap, 
          useTopEdge ? outerMax.y : outerMin.y, 
          useFrontZ ? outerMin.z : outerMax.z
        )}
        endSurface={new THREE.Vector3(
          outerMax.x - gap, 
          useTopEdge ? outerMax.y : outerMin.y, 
          useFrontZ ? outerMin.z : outerMax.z
        )}
        label="Width"
        value={parseFloat(size.x.toFixed(1))}
        unit="units"
        side="front"
        onDimensionClick={onDimensionClick}
      />
      
      {/* HEIGHT MEASUREMENT - Switch left/right based on camera X */}
      <SurfaceDimensionLine
        startSurface={new THREE.Vector3(
          useRightEdge ? outerMax.x : outerMin.x, 
          outerMin.y + gap, 
          useFrontZ ? outerMin.z : outerMax.z
        )}
        endSurface={new THREE.Vector3(
          useRightEdge ? outerMax.x : outerMin.x, 
          outerMax.y - gap, 
          useFrontZ ? outerMin.z : outerMax.z
        )}
        label="Height"
        value={parseFloat(size.y.toFixed(1))}
        unit="units"
        side={useRightEdge ? "right" : "left"}
        onDimensionClick={onDimensionClick}
      />
      
      {/* DEPTH MEASUREMENT - Use closest X edge to camera */}
      <SurfaceDimensionLine
        startSurface={new THREE.Vector3(
          useRightEdge ? outerMax.x : outerMin.x, 
          useTopEdge ? outerMax.y : outerMin.y, 
          outerMin.z + gap
        )}
        endSurface={new THREE.Vector3(
          useRightEdge ? outerMax.x : outerMin.x, 
          useTopEdge ? outerMax.y : outerMin.y, 
          outerMax.z - gap
        )}
        label="Depth"
        value={parseFloat(size.z.toFixed(1))}
        unit="units"
        side={useTopEdge ? "top" : "bottom"}
        onDimensionClick={onDimensionClick}
      />
    </group>
  )
}

interface SurfaceDimensionLineProps {
  startSurface: THREE.Vector3
  endSurface: THREE.Vector3
  label: string
  value: number
  unit: string
  side: string
  onDimensionClick?: (dimension: { label: string, start_point: THREE.Vector3, end_point: THREE.Vector3, value: number }) => void
}

function SurfaceDimensionLine({ 
  startSurface, 
  endSurface, 
  label, 
  value, 
  unit, 
  side,
  onDimensionClick
}: SurfaceDimensionLineProps) {
  const lineRef = useRef<THREE.Group>(null)
  
  const direction = new THREE.Vector3().subVectors(endSurface, startSurface).normalize()
  const distance = startSurface.distanceTo(endSurface)
  const midPoint = new THREE.Vector3().addVectors(startSurface, endSurface).multiplyScalar(0.5)
  
  const displayValue = `${value} ${unit}`
  
  const handleClick = () => {
    if (onDimensionClick) {
      onDimensionClick({
        label,
        start_point: startSurface.clone(),
        end_point: endSurface.clone(),
        value
      })
    }
  }
  
  // Create arrow quaternions for proper rotation
  const upVector = new THREE.Vector3(0, 1, 0)
  const quaternion1 = new THREE.Quaternion().setFromUnitVectors(upVector, direction.clone().multiplyScalar(-1))
  const quaternion2 = new THREE.Quaternion().setFromUnitVectors(upVector, direction.clone())
  
  return (
    <group ref={lineRef}>
      {/* Main dimension line */}
      <Line 
        points={[startSurface, endSurface]} 
        color="#ef4444" 
        lineWidth={2} 
      />
      
      {/* Arrow heads using cones with quaternion rotation */}
      <mesh position={startSurface} quaternion={quaternion1}>
        <coneGeometry args={[0.02, 0.06, 8]} />
        <meshBasicMaterial color="#ef4444" />
      </mesh>
      
      <mesh position={endSurface} quaternion={quaternion2}>
        <coneGeometry args={[0.02, 0.06, 8]} />
        <meshBasicMaterial color="#ef4444" />
      </mesh>
      
      {/* HTML Label */}
      <Html 
        position={midPoint}
        center
        transform={false}
        sprite
        style={{ pointerEvents: onDimensionClick ? 'auto' : 'none' }}
      >
        <div 
          className="bg-white px-2 py-1 rounded shadow border border-gray-300"
          style={{
            fontSize: '11px',
            lineHeight: '1.3',
            minWidth: 'max-content',
            whiteSpace: 'nowrap',
            transform: 'scale(0.75)',
            transformOrigin: 'center',
            cursor: onDimensionClick ? 'pointer' : 'default'
          }}
          onClick={onDimensionClick ? handleClick : undefined}
        >
          <div className="font-semibold text-gray-800" style={{ margin: '0', padding: '0' }}>
            {label}
          </div>
          <div className="text-red-600" style={{ margin: '0', padding: '0' }}>
            {displayValue}
          </div>
        </div>
      </Html>
    </group>
  )
}

function LoadingFallback() {
  return (
    <Html center>
      <div className="bg-white px-4 py-2 rounded shadow">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
        <p className="text-sm text-gray-600">Loading 3D model...</p>
      </div>
    </Html>
  )
}

function ErrorFallback({ error }: { error: string }) {
  return (
    <Html center>
      <div className="bg-red-50 border border-red-200 px-4 py-2 rounded shadow">
        <p className="text-sm text-red-800">Failed to load 3D model</p>
        <p className="text-xs text-red-600">{error}</p>
      </div>
    </Html>
  )
}

export interface ModelViewerProps {
  modelUrl?: string
  className?: string
  onPointClick?: (point: THREE.Vector3) => void
  onDimensionClick?: (dimension: { label: string, start_point: THREE.Vector3, end_point: THREE.Vector3, value: number }) => void
  showDimensions?: boolean
}

export default function ModelViewer({ 
  modelUrl, 
  className = "w-full h-96", 
  onPointClick,
  onDimensionClick,
  showDimensions = true 
}: ModelViewerProps) {
  const [error, setError] = useState<string | null>(null)

  return (
    <div className={className}>
      <Canvas
        camera={{ position: [2, 2, 2], fov: 50 }}
        style={{ background: '#fafafa' }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 5]} intensity={0.8} />
        <directionalLight position={[-10, -10, -5]} intensity={0.3} />
        
        <Suspense fallback={<LoadingFallback />}>
          <Center>
            {error ? (
              <ErrorFallback error={error} />
            ) : modelUrl ? (
              <Model 
                url={modelUrl} 
                onPointClick={onPointClick}
                onDimensionClick={onDimensionClick}
                showDimensions={showDimensions}
              />
            ) : (
              <FallbackModel 
                onPointClick={onPointClick}
                onDimensionClick={onDimensionClick}
                showDimensions={showDimensions}
              />
            )}
          </Center>
        </Suspense>
        
        <OrbitControls 
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          maxPolarAngle={Math.PI}
        />
      </Canvas>
    </div>
  )
}
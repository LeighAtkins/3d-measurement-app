'use client'

import { Suspense, useRef, useState, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, useGLTF, Html, Center, Line, Sphere, Text } from '@react-three/drei'
import * as THREE from 'three'

export interface CustomMeasurement {
  id: string
  label: string
  start_point: THREE.Vector3
  end_point: THREE.Vector3
  distance: number
  unit: string
  color?: string
  notes?: string
  visible?: boolean
}

interface ModelProps {
  url?: string
  onPointClick?: (point: THREE.Vector3) => void
  onDimensionClick?: (dimension: { label: string, start_point: THREE.Vector3, end_point: THREE.Vector3, value: number }) => void
  showDimensions?: boolean
  customMeasurements?: CustomMeasurement[]
  temporaryMeasurement?: { start: THREE.Vector3, end?: THREE.Vector3 } | null
  measurementMode?: boolean
  onMeasurementSelect?: (measurement: CustomMeasurement) => void
  onMeasurementHover?: (measurementId: string, hovered: boolean) => void
  selectedMeasurementId?: string
  hoveredMeasurementId?: string
}

// MeasurementLine Component - Updated to match SurfaceDimensionLine styling
interface MeasurementLineProps {
  start: THREE.Vector3
  end: THREE.Vector3
  label: string
  unit?: string
  color?: string
  visible?: boolean
  isHighlighted?: boolean
  onHover?: (hovered: boolean) => void
  onClick?: () => void
}

function MeasurementLine({ 
  start, 
  end, 
  label, 
  unit = 'cm',
  color = '#ef4444', // Match dimension red
  visible = true,
  isHighlighted = false,
  onHover,
  onClick
}: MeasurementLineProps) {
  const lineRef = useRef<THREE.Group>(null)
  
  if (!visible) return null
  
  const direction = new THREE.Vector3().subVectors(end, start).normalize()
  const distance = start.distanceTo(end)
  const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)
  
  const displayValue = `${distance.toFixed(1)} ${unit}`
  const displayColor = isHighlighted ? '#fbbf24' : color // Amber when highlighted
  
  // Create arrow quaternions for proper rotation - matching SurfaceDimensionLine
  const upVector = new THREE.Vector3(0, 1, 0)
  const quaternion1 = new THREE.Quaternion().setFromUnitVectors(upVector, direction.clone().multiplyScalar(-1))
  const quaternion2 = new THREE.Quaternion().setFromUnitVectors(upVector, direction.clone())

  return (
    <group 
      ref={lineRef}
      onPointerOver={() => onHover?.(true)}
      onPointerOut={() => onHover?.(false)}
      onClick={onClick}
    >
      {/* Main dimension line - exact match to SurfaceDimensionLine */}
      <Line 
        points={[start, end]} 
        color={displayColor} 
        lineWidth={2} 
        transparent
        opacity={isHighlighted ? 1 : 0.8}
      />
      
      {/* Arrow heads using cones with quaternion rotation - exact match */}
      <mesh position={start} quaternion={quaternion1}>
        <coneGeometry args={[0.02, 0.06, 8]} />
        <meshBasicMaterial color={displayColor} />
      </mesh>
      
      <mesh position={end} quaternion={quaternion2}>
        <coneGeometry args={[0.02, 0.06, 8]} />
        <meshBasicMaterial color={displayColor} />
      </mesh>
      
      {/* HTML Label - exact match to SurfaceDimensionLine styling */}
      <Html 
        position={midPoint}
        center
        transform={false}
        sprite
        style={{ 
          pointerEvents: onClick ? 'auto' : 'none',
          transition: 'all 0.2s ease',
          opacity: isHighlighted ? 1 : 0.9
        }}
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
            cursor: onClick ? 'pointer' : 'default'
          }}
          onClick={onClick}
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

// MeasurementMarker Component - Updated for standardized appearance
interface MeasurementMarkerProps {
  position: THREE.Vector3
  type?: 'start' | 'end' | 'point'
  size?: number
  visible?: boolean
  onHover?: (hovered: boolean) => void
  onClick?: () => void
}

function MeasurementMarker({ 
  position, 
  type = 'point',
  size = 0.05,
  visible = true,
  onHover,
  onClick
}: MeasurementMarkerProps) {
  const [hovered, setHovered] = useState(false)
  
  if (!visible) return null
  
  const colors = {
    start: '#10b981', // Green
    end: '#ef4444',   // Red (matches dimension color)
    point: '#3b82f6'  // Blue
  }
  
  const color = colors[type] || colors.point
  const scale = hovered ? 1.2 : 1
  
  return (
    <Sphere
      args={[size, 16, 16]}
      position={position}
      scale={scale}
      onPointerOver={() => {
        setHovered(true)
        onHover?.(true)
      }}
      onPointerOut={() => {
        setHovered(false)
        onHover?.(false)
      }}
      onClick={onClick}
    >
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={hovered ? 0.6 : 0.3}
        roughness={0.4}
        metalness={0.6}
        transparent
        opacity={hovered ? 1 : 0.8}
      />
    </Sphere>
  )
}

// MeasurementOverlay Component - Updated with unified components and interactions
interface MeasurementOverlayProps {
  customMeasurements?: CustomMeasurement[]
  temporaryMeasurement?: { start: THREE.Vector3, end?: THREE.Vector3 } | null
  onMeasurementSelect?: (measurement: CustomMeasurement) => void
  onMeasurementHover?: (measurementId: string, hovered: boolean) => void
  selectedMeasurementId?: string
  hoveredMeasurementId?: string
}

function MeasurementOverlay({ 
  customMeasurements = [], 
  temporaryMeasurement,
  onMeasurementSelect,
  onMeasurementHover,
  selectedMeasurementId,
  hoveredMeasurementId
}: MeasurementOverlayProps) {
  return (
    <group>
      {/* Render saved measurements */}
      {customMeasurements.map((measurement) => (
        measurement.visible !== false && (
          <group key={measurement.id}>
            <MeasurementLine
              start={measurement.start_point}
              end={measurement.end_point}
              label={measurement.label}
              unit={measurement.unit}
              visible={measurement.visible}
              isHighlighted={hoveredMeasurementId === measurement.id || selectedMeasurementId === measurement.id}
              onHover={(hovered) => onMeasurementHover?.(measurement.id, hovered)}
              onClick={() => onMeasurementSelect?.(measurement)}
            />
            <MeasurementMarker
              position={measurement.start_point}
              type="start"
              visible={measurement.visible}
              onHover={(hovered) => onMeasurementHover?.(measurement.id, hovered)}
              onClick={() => onMeasurementSelect?.(measurement)}
            />
            <MeasurementMarker
              position={measurement.end_point}
              type="end"
              visible={measurement.visible}
              onHover={(hovered) => onMeasurementHover?.(measurement.id, hovered)}
              onClick={() => onMeasurementSelect?.(measurement)}
            />
          </group>
        )
      ))}
      
      {/* Render temporary measurement (while selecting) */}
      {temporaryMeasurement && (
        <group>
          <MeasurementMarker
            position={temporaryMeasurement.start}
            type="start"
          />
          {temporaryMeasurement.end && (
            <>
              <MeasurementLine
                start={temporaryMeasurement.start}
                end={temporaryMeasurement.end}
                label="Measuring..."
                color="#fbbf24" // Amber for temporary measurements
              />
              <MeasurementMarker
                position={temporaryMeasurement.end}
                type="end"
              />
            </>
          )}
        </group>
      )}
    </group>
  )
}

function Model({ 
  url, 
  onPointClick, 
  onDimensionClick, 
  showDimensions = true, 
  customMeasurements, 
  temporaryMeasurement,
  measurementMode,
  onMeasurementSelect,
  onMeasurementHover,
  selectedMeasurementId,
  hoveredMeasurementId
}: ModelProps) {
  const { scene } = useGLTF(url || '/sample-models/cube.glb')
  const meshRef = useRef<THREE.Group>(null)

  // Debug: Log the loaded scene to check textures
  useEffect(() => {
    if (scene) {
      console.log('Loaded 3D scene:', scene)
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          console.log('Mesh found:', child.name, 'Material:', child.material)
          if (child.material && 'map' in child.material) {
            const material = child.material as THREE.MeshStandardMaterial
            console.log('Texture map:', material.map)
            console.log('Texture loaded:', material.map?.image)
            console.log('Material properties:', {
              metalness: material.metalness,
              roughness: material.roughness,
              color: material.color,
              opacity: material.opacity
            })
            
            // Fix material properties to show texture properly
            if (material.map) {
              material.map.flipY = false
              material.map.needsUpdate = true
              
              // Reduce metalness so texture is visible (not pure metal reflection)
              material.metalness = 0.1
              
              // Adjust roughness for better texture visibility
              material.roughness = 0.8
              
              // Ensure color doesn't interfere with texture
              material.color.setHex(0xffffff)
              
              material.needsUpdate = true
              
              console.log('Fixed material properties:', {
                metalness: material.metalness,
                roughness: material.roughness,
                color: material.color
              })
            }
          }
        }
      })
    }
  }, [scene])

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
      {showDimensions && <IkeaStyleDimensions object={scene} onDimensionClick={onDimensionClick} measurementMode={measurementMode} />}
      <MeasurementOverlay 
        customMeasurements={customMeasurements}
        temporaryMeasurement={temporaryMeasurement}
        onMeasurementSelect={onMeasurementSelect}
        onMeasurementHover={onMeasurementHover}
        selectedMeasurementId={selectedMeasurementId}
        hoveredMeasurementId={hoveredMeasurementId}
      />
    </group>
  )
}

function FallbackModel({ 
  onPointClick, 
  onDimensionClick, 
  showDimensions = true, 
  customMeasurements, 
  temporaryMeasurement,
  measurementMode,
  onMeasurementSelect,
  onMeasurementHover,
  selectedMeasurementId,
  hoveredMeasurementId
}: ModelProps) {
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
        <IkeaStyleDimensions object={groupRef.current} onDimensionClick={onDimensionClick} measurementMode={measurementMode} />
      )}
      <MeasurementOverlay 
        customMeasurements={customMeasurements}
        temporaryMeasurement={temporaryMeasurement}
        onMeasurementSelect={onMeasurementSelect}
        onMeasurementHover={onMeasurementHover}
        selectedMeasurementId={selectedMeasurementId}
        hoveredMeasurementId={hoveredMeasurementId}
      />
    </group>
  )
}

interface IkeaStyleDimensionsProps {
  object: THREE.Object3D
  onDimensionClick?: (dimension: { label: string, start_point: THREE.Vector3, end_point: THREE.Vector3, value: number }) => void
  measurementMode?: boolean
}

interface DimensionData {
  bbox: THREE.Box3
  cameraPosition: THREE.Vector3
  useTopEdge: boolean
  useRightEdge: boolean
  useFrontZ: boolean
}

function IkeaStyleDimensions({ object, onDimensionClick, measurementMode = false }: IkeaStyleDimensionsProps) {
  const { camera } = useThree()
  const [bbox, setBbox] = useState<THREE.Box3 | null>(null)
  const [cameraPosition, setCameraPosition] = useState(new THREE.Vector3())
  
  // Cache dimension data when entering measurement mode
  const cachedDimensionData = useRef<DimensionData | null>(null)
  const previousMeasurementMode = useRef(measurementMode)

  useFrame(() => {
    // Only update camera position if not in measurement mode or no cached data exists
    if (!measurementMode || !cachedDimensionData.current) {
      setCameraPosition(camera.position.clone())
    }
  })

  useEffect(() => {
    if (object) {
      const box = new THREE.Box3().setFromObject(object)
      setBbox(box)
    }
  }, [object])

  // Cache dimension state when entering measurement mode
  useEffect(() => {
    if (measurementMode && !previousMeasurementMode.current && bbox) {
      // Entering measurement mode - cache current state
      const center = new THREE.Vector3().addVectors(bbox.min, bbox.max).multiplyScalar(0.5)
      cachedDimensionData.current = {
        bbox: bbox.clone(),
        cameraPosition: cameraPosition.clone(),
        useTopEdge: cameraPosition.y > center.y,
        useRightEdge: cameraPosition.x > center.x,
        useFrontZ: cameraPosition.z > center.z
      }
    } else if (!measurementMode && previousMeasurementMode.current) {
      // Exiting measurement mode - clear cache
      cachedDimensionData.current = null
    }
    previousMeasurementMode.current = measurementMode
  }, [measurementMode, bbox, cameraPosition])

  if (!bbox) return null

  // Use cached data if in measurement mode, otherwise use current data
  const activeData = measurementMode && cachedDimensionData.current 
    ? cachedDimensionData.current 
    : {
        bbox,
        cameraPosition,
        useTopEdge: false,
        useRightEdge: false,
        useFrontZ: false
      }

  // Calculate values from active data
  const min = activeData.bbox.min
  const max = activeData.bbox.max
  const center = new THREE.Vector3().addVectors(min, max).multiplyScalar(0.5)
  const size = new THREE.Vector3().subVectors(max, min)

  // Choose edges based on active camera position or cached values
  let useTopEdge: boolean, useRightEdge: boolean, useFrontZ: boolean
  
  if (measurementMode && cachedDimensionData.current) {
    // Use cached edge calculations
    useTopEdge = cachedDimensionData.current.useTopEdge
    useRightEdge = cachedDimensionData.current.useRightEdge
    useFrontZ = cachedDimensionData.current.useFrontZ
  } else {
    // Calculate edges based on current camera position
    useTopEdge = cameraPosition.y > center.y     // Camera is above center
    useRightEdge = cameraPosition.x > center.x   // Camera is to the right of center
    useFrontZ = cameraPosition.z > center.z      // Camera is in front
  }

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
  customMeasurements?: CustomMeasurement[]
  temporaryMeasurement?: { start: THREE.Vector3, end?: THREE.Vector3 } | null
  measurementMode?: boolean
  onMeasurementSelect?: (measurement: CustomMeasurement) => void
  onMeasurementHover?: (measurementId: string, hovered: boolean) => void
  selectedMeasurementId?: string
  hoveredMeasurementId?: string
}

export default function ModelViewer({ 
  modelUrl, 
  className = "w-full h-96", 
  onPointClick,
  onDimensionClick,
  showDimensions = true,
  customMeasurements,
  temporaryMeasurement,
  measurementMode,
  onMeasurementSelect,
  onMeasurementHover,
  selectedMeasurementId,
  hoveredMeasurementId
}: ModelViewerProps) {
  const [error, setError] = useState<string | null>(null)

  return (
    <div className={className}>
      <Canvas
        camera={{ position: [2, 2, 2], fov: 50 }}
        style={{ background: '#fafafa' }}
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[10, 10, 5]} intensity={1.0} />
        <directionalLight position={[-10, -10, -5]} intensity={0.4} />
        <pointLight position={[0, 10, 0]} intensity={0.5} />
        
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
                customMeasurements={customMeasurements}
                temporaryMeasurement={temporaryMeasurement}
                measurementMode={measurementMode}
                onMeasurementSelect={onMeasurementSelect}
                onMeasurementHover={onMeasurementHover}
                selectedMeasurementId={selectedMeasurementId}
                hoveredMeasurementId={hoveredMeasurementId}
              />
            ) : (
              <FallbackModel 
                onPointClick={onPointClick}
                onDimensionClick={onDimensionClick}
                showDimensions={showDimensions}
                customMeasurements={customMeasurements}
                temporaryMeasurement={temporaryMeasurement}
                measurementMode={measurementMode}
                onMeasurementSelect={onMeasurementSelect}
                onMeasurementHover={onMeasurementHover}
                selectedMeasurementId={selectedMeasurementId}
                hoveredMeasurementId={hoveredMeasurementId}
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
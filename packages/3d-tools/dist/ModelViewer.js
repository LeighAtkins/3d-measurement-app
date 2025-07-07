'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Suspense, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF, Html, Center, Line, Sphere } from '@react-three/drei';
import * as THREE from 'three';
function MeasurementLine({ start, end, label, unit = 'cm', color = '#ef4444', // Match dimension red
visible = true, isHighlighted = false, onHover, onClick }) {
    const lineRef = useRef(null);
    if (!visible)
        return null;
    const direction = new THREE.Vector3().subVectors(end, start).normalize();
    const distance = start.distanceTo(end);
    const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    const displayValue = `${distance.toFixed(1)} ${unit}`;
    const displayColor = isHighlighted ? '#fbbf24' : color; // Amber when highlighted
    // Create arrow quaternions for proper rotation - matching SurfaceDimensionLine
    const upVector = new THREE.Vector3(0, 1, 0);
    const quaternion1 = new THREE.Quaternion().setFromUnitVectors(upVector, direction.clone().multiplyScalar(-1));
    const quaternion2 = new THREE.Quaternion().setFromUnitVectors(upVector, direction.clone());
    return (_jsxs("group", { ref: lineRef, onPointerOver: () => onHover?.(true), onPointerOut: () => onHover?.(false), onClick: onClick, children: [_jsx(Line, { points: [start, end], color: displayColor, lineWidth: 2, transparent: true, opacity: isHighlighted ? 1 : 0.8 }), _jsxs("mesh", { position: start, quaternion: quaternion1, children: [_jsx("coneGeometry", { args: [0.02, 0.06, 8] }), _jsx("meshBasicMaterial", { color: displayColor })] }), _jsxs("mesh", { position: end, quaternion: quaternion2, children: [_jsx("coneGeometry", { args: [0.02, 0.06, 8] }), _jsx("meshBasicMaterial", { color: displayColor })] }), _jsx(Html, { position: midPoint, center: true, transform: false, sprite: true, style: {
                    pointerEvents: onClick ? 'auto' : 'none',
                    transition: 'all 0.2s ease',
                    opacity: isHighlighted ? 1 : 0.9
                }, children: _jsxs("div", { className: "bg-white px-2 py-1 rounded shadow border border-gray-300", style: {
                        fontSize: '11px',
                        lineHeight: '1.3',
                        minWidth: 'max-content',
                        whiteSpace: 'nowrap',
                        transform: 'scale(0.75)',
                        transformOrigin: 'center',
                        cursor: onClick ? 'pointer' : 'default'
                    }, onClick: onClick, children: [_jsx("div", { className: "font-semibold text-gray-800", style: { margin: '0', padding: '0' }, children: label }), _jsx("div", { className: "text-red-600", style: { margin: '0', padding: '0' }, children: displayValue })] }) })] }));
}
function MeasurementMarker({ position, type = 'point', size = 0.05, visible = true, onHover, onClick }) {
    const [hovered, setHovered] = useState(false);
    if (!visible)
        return null;
    const colors = {
        start: '#10b981', // Green
        end: '#ef4444', // Red (matches dimension color)
        point: '#3b82f6' // Blue
    };
    const color = colors[type] || colors.point;
    const scale = hovered ? 1.2 : 1;
    return (_jsx(Sphere, { args: [size, 16, 16], position: position, scale: scale, onPointerOver: () => {
            setHovered(true);
            onHover?.(true);
        }, onPointerOut: () => {
            setHovered(false);
            onHover?.(false);
        }, onClick: onClick, children: _jsx("meshStandardMaterial", { color: color, emissive: color, emissiveIntensity: hovered ? 0.6 : 0.3, roughness: 0.4, metalness: 0.6, transparent: true, opacity: hovered ? 1 : 0.8 }) }));
}
function MeasurementOverlay({ customMeasurements = [], temporaryMeasurement, onMeasurementSelect, onMeasurementHover, selectedMeasurementId, hoveredMeasurementId }) {
    return (_jsxs("group", { children: [customMeasurements.map((measurement) => (measurement.visible !== false && (_jsxs("group", { children: [_jsx(MeasurementLine, { start: measurement.start_point, end: measurement.end_point, label: measurement.label, unit: measurement.unit, visible: measurement.visible, isHighlighted: hoveredMeasurementId === measurement.id || selectedMeasurementId === measurement.id, onHover: (hovered) => onMeasurementHover?.(measurement.id, hovered), onClick: () => onMeasurementSelect?.(measurement) }), _jsx(MeasurementMarker, { position: measurement.start_point, type: "start", visible: measurement.visible, onHover: (hovered) => onMeasurementHover?.(measurement.id, hovered), onClick: () => onMeasurementSelect?.(measurement) }), _jsx(MeasurementMarker, { position: measurement.end_point, type: "end", visible: measurement.visible, onHover: (hovered) => onMeasurementHover?.(measurement.id, hovered), onClick: () => onMeasurementSelect?.(measurement) })] }, measurement.id)))), temporaryMeasurement && (_jsxs("group", { children: [_jsx(MeasurementMarker, { position: temporaryMeasurement.start, type: "start" }), temporaryMeasurement.end && (_jsxs(_Fragment, { children: [_jsx(MeasurementLine, { start: temporaryMeasurement.start, end: temporaryMeasurement.end, label: "Measuring...", color: "#fbbf24" // Amber for temporary measurements
                             }), _jsx(MeasurementMarker, { position: temporaryMeasurement.end, type: "end" })] }))] }))] }));
}
function Model({ url, onPointClick, onDimensionClick, showDimensions = true, customMeasurements, temporaryMeasurement, measurementMode, onMeasurementSelect, onMeasurementHover, selectedMeasurementId, hoveredMeasurementId }) {
    const { scene } = useGLTF(url || '/sample-models/cube.glb');
    const meshRef = useRef(null);
    // Debug: Log the loaded scene to check textures
    useEffect(() => {
        if (scene) {
            console.log('Loaded 3D scene:', scene);
            scene.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    console.log('Mesh found:', child.name, 'Material:', child.material);
                    if (child.material && 'map' in child.material) {
                        const material = child.material;
                        console.log('Texture map:', material.map);
                        console.log('Texture loaded:', material.map?.image);
                        console.log('Material properties:', {
                            metalness: material.metalness,
                            roughness: material.roughness,
                            color: material.color,
                            opacity: material.opacity
                        });
                        // Fix material properties to show texture properly
                        if (material.map) {
                            material.map.flipY = false;
                            material.map.needsUpdate = true;
                            // Reduce metalness so texture is visible (not pure metal reflection)
                            material.metalness = 0.1;
                            // Adjust roughness for better texture visibility
                            material.roughness = 0.8;
                            // Ensure color doesn't interfere with texture
                            material.color.setHex(0xffffff);
                            material.needsUpdate = true;
                            console.log('Fixed material properties:', {
                                metalness: material.metalness,
                                roughness: material.roughness,
                                color: material.color
                            });
                        }
                    }
                }
            });
        }
    }, [scene]);
    const handleClick = (event) => {
        if (onPointClick && event.intersections && event.intersections[0]) {
            const point = event.intersections[0].point;
            onPointClick(point);
        }
    };
    return (_jsxs("group", { children: [_jsx("primitive", { ref: meshRef, object: scene, onClick: handleClick, scale: 1 }), showDimensions && _jsx(IkeaStyleDimensions, { object: scene, onDimensionClick: onDimensionClick, measurementMode: measurementMode }), _jsx(MeasurementOverlay, { customMeasurements: customMeasurements, temporaryMeasurement: temporaryMeasurement, onMeasurementSelect: onMeasurementSelect, onMeasurementHover: onMeasurementHover, selectedMeasurementId: selectedMeasurementId, hoveredMeasurementId: hoveredMeasurementId })] }));
}
function FallbackModel({ onPointClick, onDimensionClick, showDimensions = true, customMeasurements, temporaryMeasurement, measurementMode, onMeasurementSelect, onMeasurementHover, selectedMeasurementId, hoveredMeasurementId }) {
    const meshRef = useRef(null);
    const groupRef = useRef(null);
    const handleClick = (event) => {
        if (onPointClick && event.intersections && event.intersections[0]) {
            const point = event.intersections[0].point;
            onPointClick(point);
        }
    };
    return (_jsxs("group", { ref: groupRef, children: [_jsxs("mesh", { ref: meshRef, onClick: handleClick, children: [_jsx("boxGeometry", { args: [1, 1, 1] }), _jsx("meshStandardMaterial", { color: "#10b981", transparent: true, opacity: 0.8 })] }), showDimensions && groupRef.current && (_jsx(IkeaStyleDimensions, { object: groupRef.current, onDimensionClick: onDimensionClick, measurementMode: measurementMode })), _jsx(MeasurementOverlay, { customMeasurements: customMeasurements, temporaryMeasurement: temporaryMeasurement, onMeasurementSelect: onMeasurementSelect, onMeasurementHover: onMeasurementHover, selectedMeasurementId: selectedMeasurementId, hoveredMeasurementId: hoveredMeasurementId })] }));
}
function IkeaStyleDimensions({ object, onDimensionClick, measurementMode = false }) {
    const { camera } = useThree();
    const [bbox, setBbox] = useState(null);
    const [cameraPosition, setCameraPosition] = useState(new THREE.Vector3());
    // Cache dimension data when entering measurement mode
    const cachedDimensionData = useRef(null);
    const previousMeasurementMode = useRef(measurementMode);
    useFrame(() => {
        // Only update camera position if not in measurement mode or no cached data exists
        if (!measurementMode || !cachedDimensionData.current) {
            setCameraPosition(camera.position.clone());
        }
    });
    useEffect(() => {
        if (object) {
            const box = new THREE.Box3().setFromObject(object);
            setBbox(box);
        }
    }, [object]);
    // Cache dimension state when entering measurement mode
    useEffect(() => {
        if (measurementMode && !previousMeasurementMode.current && bbox) {
            // Entering measurement mode - cache current state
            const center = new THREE.Vector3().addVectors(bbox.min, bbox.max).multiplyScalar(0.5);
            cachedDimensionData.current = {
                bbox: bbox.clone(),
                cameraPosition: cameraPosition.clone(),
                useTopEdge: cameraPosition.y > center.y,
                useRightEdge: cameraPosition.x > center.x,
                useFrontZ: cameraPosition.z > center.z
            };
        }
        else if (!measurementMode && previousMeasurementMode.current) {
            // Exiting measurement mode - clear cache
            cachedDimensionData.current = null;
        }
        previousMeasurementMode.current = measurementMode;
    }, [measurementMode, bbox, cameraPosition]);
    if (!bbox)
        return null;
    // Use cached data if in measurement mode, otherwise use current data
    const activeData = measurementMode && cachedDimensionData.current
        ? cachedDimensionData.current
        : {
            bbox,
            cameraPosition,
            useTopEdge: false,
            useRightEdge: false,
            useFrontZ: false
        };
    // Calculate values from active data
    const min = activeData.bbox.min;
    const max = activeData.bbox.max;
    const center = new THREE.Vector3().addVectors(min, max).multiplyScalar(0.5);
    const size = new THREE.Vector3().subVectors(max, min);
    // Choose edges based on active camera position or cached values
    let useTopEdge, useRightEdge, useFrontZ;
    if (measurementMode && cachedDimensionData.current) {
        // Use cached edge calculations
        useTopEdge = cachedDimensionData.current.useTopEdge;
        useRightEdge = cachedDimensionData.current.useRightEdge;
        useFrontZ = cachedDimensionData.current.useFrontZ;
    }
    else {
        // Calculate edges based on current camera position
        useTopEdge = cameraPosition.y > center.y; // Camera is above center
        useRightEdge = cameraPosition.x > center.x; // Camera is to the right of center
        useFrontZ = cameraPosition.z > center.z; // Camera is in front
    }
    // Define the outer prism edges (closer to cube - 50% of original distance)
    const gap = 0.075; // Distance from cube surface to dimension line (reduced by 50%)
    const outerMin = new THREE.Vector3(min.x - gap, min.y - gap, min.z - gap);
    const outerMax = new THREE.Vector3(max.x + gap, max.y + gap, max.z + gap);
    return (_jsxs("group", { children: [_jsx(SurfaceDimensionLine, { startSurface: new THREE.Vector3(outerMin.x + gap, useTopEdge ? outerMax.y : outerMin.y, useFrontZ ? outerMin.z : outerMax.z), endSurface: new THREE.Vector3(outerMax.x - gap, useTopEdge ? outerMax.y : outerMin.y, useFrontZ ? outerMin.z : outerMax.z), label: "Width", value: parseFloat(size.x.toFixed(1)), unit: "units", side: "front", onDimensionClick: onDimensionClick }), _jsx(SurfaceDimensionLine, { startSurface: new THREE.Vector3(useRightEdge ? outerMax.x : outerMin.x, outerMin.y + gap, useFrontZ ? outerMin.z : outerMax.z), endSurface: new THREE.Vector3(useRightEdge ? outerMax.x : outerMin.x, outerMax.y - gap, useFrontZ ? outerMin.z : outerMax.z), label: "Height", value: parseFloat(size.y.toFixed(1)), unit: "units", side: useRightEdge ? "right" : "left", onDimensionClick: onDimensionClick }), _jsx(SurfaceDimensionLine, { startSurface: new THREE.Vector3(useRightEdge ? outerMax.x : outerMin.x, useTopEdge ? outerMax.y : outerMin.y, outerMin.z + gap), endSurface: new THREE.Vector3(useRightEdge ? outerMax.x : outerMin.x, useTopEdge ? outerMax.y : outerMin.y, outerMax.z - gap), label: "Depth", value: parseFloat(size.z.toFixed(1)), unit: "units", side: useTopEdge ? "top" : "bottom", onDimensionClick: onDimensionClick })] }));
}
function SurfaceDimensionLine({ startSurface, endSurface, label, value, unit, side, onDimensionClick }) {
    const lineRef = useRef(null);
    const direction = new THREE.Vector3().subVectors(endSurface, startSurface).normalize();
    const distance = startSurface.distanceTo(endSurface);
    const midPoint = new THREE.Vector3().addVectors(startSurface, endSurface).multiplyScalar(0.5);
    const displayValue = `${value} ${unit}`;
    const handleClick = () => {
        if (onDimensionClick) {
            onDimensionClick({
                label,
                start_point: startSurface.clone(),
                end_point: endSurface.clone(),
                value
            });
        }
    };
    // Create arrow quaternions for proper rotation
    const upVector = new THREE.Vector3(0, 1, 0);
    const quaternion1 = new THREE.Quaternion().setFromUnitVectors(upVector, direction.clone().multiplyScalar(-1));
    const quaternion2 = new THREE.Quaternion().setFromUnitVectors(upVector, direction.clone());
    return (_jsxs("group", { ref: lineRef, children: [_jsx(Line, { points: [startSurface, endSurface], color: "#ef4444", lineWidth: 2 }), _jsxs("mesh", { position: startSurface, quaternion: quaternion1, children: [_jsx("coneGeometry", { args: [0.02, 0.06, 8] }), _jsx("meshBasicMaterial", { color: "#ef4444" })] }), _jsxs("mesh", { position: endSurface, quaternion: quaternion2, children: [_jsx("coneGeometry", { args: [0.02, 0.06, 8] }), _jsx("meshBasicMaterial", { color: "#ef4444" })] }), _jsx(Html, { position: midPoint, center: true, transform: false, sprite: true, style: { pointerEvents: onDimensionClick ? 'auto' : 'none' }, children: _jsxs("div", { className: "bg-white px-2 py-1 rounded shadow border border-gray-300", style: {
                        fontSize: '11px',
                        lineHeight: '1.3',
                        minWidth: 'max-content',
                        whiteSpace: 'nowrap',
                        transform: 'scale(0.75)',
                        transformOrigin: 'center',
                        cursor: onDimensionClick ? 'pointer' : 'default'
                    }, onClick: onDimensionClick ? handleClick : undefined, children: [_jsx("div", { className: "font-semibold text-gray-800", style: { margin: '0', padding: '0' }, children: label }), _jsx("div", { className: "text-red-600", style: { margin: '0', padding: '0' }, children: displayValue })] }) })] }));
}
function LoadingFallback() {
    return (_jsx(Html, { center: true, children: _jsxs("div", { className: "bg-white px-4 py-2 rounded shadow", children: [_jsx("div", { className: "animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2" }), _jsx("p", { className: "text-sm text-gray-600", children: "Loading 3D model..." })] }) }));
}
function ErrorFallback({ error }) {
    return (_jsx(Html, { center: true, children: _jsxs("div", { className: "bg-red-50 border border-red-200 px-4 py-2 rounded shadow", children: [_jsx("p", { className: "text-sm text-red-800", children: "Failed to load 3D model" }), _jsx("p", { className: "text-xs text-red-600", children: error })] }) }));
}
export default function ModelViewer({ modelUrl, className = "w-full h-96", onPointClick, onDimensionClick, showDimensions = true, customMeasurements, temporaryMeasurement, measurementMode, onMeasurementSelect, onMeasurementHover, selectedMeasurementId, hoveredMeasurementId }) {
    const [error, setError] = useState(null);
    return (_jsx("div", { className: className, children: _jsxs(Canvas, { camera: { position: [2, 2, 2], fov: 50 }, style: { background: '#fafafa' }, children: [_jsx("ambientLight", { intensity: 0.8 }), _jsx("directionalLight", { position: [10, 10, 5], intensity: 1.0 }), _jsx("directionalLight", { position: [-10, -10, -5], intensity: 0.4 }), _jsx("pointLight", { position: [0, 10, 0], intensity: 0.5 }), _jsx(Suspense, { fallback: _jsx(LoadingFallback, {}), children: _jsx(Center, { children: error ? (_jsx(ErrorFallback, { error: error })) : modelUrl ? (_jsx(Model, { url: modelUrl, onPointClick: onPointClick, onDimensionClick: onDimensionClick, showDimensions: showDimensions, customMeasurements: customMeasurements, temporaryMeasurement: temporaryMeasurement, measurementMode: measurementMode, onMeasurementSelect: onMeasurementSelect, onMeasurementHover: onMeasurementHover, selectedMeasurementId: selectedMeasurementId, hoveredMeasurementId: hoveredMeasurementId })) : (_jsx(FallbackModel, { onPointClick: onPointClick, onDimensionClick: onDimensionClick, showDimensions: showDimensions, customMeasurements: customMeasurements, temporaryMeasurement: temporaryMeasurement, measurementMode: measurementMode, onMeasurementSelect: onMeasurementSelect, onMeasurementHover: onMeasurementHover, selectedMeasurementId: selectedMeasurementId, hoveredMeasurementId: hoveredMeasurementId })) }) }), _jsx(OrbitControls, { enablePan: true, enableZoom: true, enableRotate: true, maxPolarAngle: Math.PI })] }) }));
}

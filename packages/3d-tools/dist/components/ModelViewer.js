import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Suspense, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF, Html, Center, Line } from '@react-three/drei';
import * as THREE from 'three';
function Model({ url, onPointClick, showDimensions = true }) {
    const { scene } = useGLTF(url);
    const meshRef = useRef(null);
    const handleClick = (event) => {
        if (onPointClick && event.intersections && event.intersections[0]) {
            const point = event.intersections[0].point;
            onPointClick(point);
        }
    };
    return (_jsxs("group", { children: [_jsx("primitive", { ref: meshRef, object: scene, onClick: handleClick, scale: 1 }), showDimensions && _jsx(IkeaStyleDimensions, { object: scene })] }));
}
function FallbackModel({ onPointClick, showDimensions = true }) {
    const meshRef = useRef(null);
    const groupRef = useRef(null);
    const handleClick = (event) => {
        if (onPointClick && event.intersections && event.intersections[0]) {
            const point = event.intersections[0].point;
            onPointClick(point);
        }
    };
    return (_jsxs("group", { ref: groupRef, children: [_jsxs("mesh", { ref: meshRef, onClick: handleClick, children: [_jsx("boxGeometry", { args: [1, 1, 1] }), _jsx("meshStandardMaterial", { color: "#10b981", transparent: true, opacity: 0.8 })] }), showDimensions && groupRef.current && _jsx(IkeaStyleDimensions, { object: groupRef.current })] }));
}
function ExteriorDimensionLine({ start, end, label, value, unit, axis }) {
    const lineRef = useRef(null);
    const direction = new THREE.Vector3().subVectors(end, start).normalize();
    const distance = start.distanceTo(end);
    const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    // Calculate offset for dimension line based on axis
    let offset = new THREE.Vector3();
    if (axis === 'x') {
        offset = new THREE.Vector3(0, -0.05, 0); // Offset below for width
    }
    else if (axis === 'y') {
        offset = new THREE.Vector3(-0.05, 0, 0); // Offset left for height
    }
    else if (axis === 'z') {
        offset = new THREE.Vector3(0, -0.05, 0); // Offset below for depth
    }
    const offsetStart = new THREE.Vector3().addVectors(start, offset);
    const offsetEnd = new THREE.Vector3().addVectors(end, offset);
    const offsetMid = new THREE.Vector3().addVectors(midPoint, offset);
    const displayValue = value ? `${value} ${unit || 'cm'}` : `${distance.toFixed(1)} units`;
    return (_jsxs("group", { ref: lineRef, children: [_jsx(Line, { points: [offsetStart, offsetEnd], color: "#ef4444", lineWidth: 2 }), _jsx(Line, { points: [start, offsetStart], color: "#ef4444", lineWidth: 1 }), _jsx(Line, { points: [end, offsetEnd], color: "#ef4444", lineWidth: 1 }), _jsxs("mesh", { position: offsetStart, children: [_jsx("sphereGeometry", { args: [0.01] }), _jsx("meshBasicMaterial", { color: "#ef4444" })] }), _jsxs("mesh", { position: offsetEnd, children: [_jsx("sphereGeometry", { args: [0.01] }), _jsx("meshBasicMaterial", { color: "#ef4444" })] }), _jsx(Html, { position: offsetMid, center: true, transform: false, sprite: true, style: {
                    pointerEvents: 'none',
                }, children: _jsxs("div", { className: "bg-white px-1 py-0.5 rounded shadow border border-gray-300", style: {
                        fontSize: '10px',
                        lineHeight: '1.3',
                        minWidth: 'max-content',
                        whiteSpace: 'nowrap',
                        transform: 'scale(0.65)',
                        transformOrigin: 'center'
                    }, children: [_jsx("div", { className: "font-medium text-gray-800", style: { margin: '0', padding: '0' }, children: label }), _jsx("div", { className: "text-red-600", style: { margin: '0', padding: '0' }, children: displayValue })] }) }), _jsxs("mesh", { position: offsetStart, rotation: [0, 0, Math.atan2(direction.y, direction.x)], children: [_jsx("coneGeometry", { args: [0.01, 0.03, 4] }), _jsx("meshBasicMaterial", { color: "#ef4444" })] }), _jsxs("mesh", { position: offsetEnd, rotation: [0, 0, Math.atan2(-direction.y, -direction.x)], children: [_jsx("coneGeometry", { args: [0.01, 0.03, 4] }), _jsx("meshBasicMaterial", { color: "#ef4444" })] })] }));
}
function DimensionLine({ start, end, label, value, unit }) {
    const lineRef = useRef(null);
    const direction = new THREE.Vector3().subVectors(end, start).normalize();
    const distance = start.distanceTo(end);
    const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    // Calculate offset for dimension line (perpendicular to the measurement)
    const offset = new THREE.Vector3(0, 0.08, 0);
    const offsetStart = new THREE.Vector3().addVectors(start, offset);
    const offsetEnd = new THREE.Vector3().addVectors(end, offset);
    const offsetMid = new THREE.Vector3().addVectors(midPoint, offset);
    const displayValue = value ? `${value} ${unit || 'cm'}` : `${distance.toFixed(1)} units`;
    return (_jsxs("group", { ref: lineRef, children: [_jsx(Line, { points: [start, end], color: "#2563eb", lineWidth: 3 }), _jsx(Line, { points: [offsetStart, offsetEnd], color: "#dc2626", lineWidth: 2 }), _jsx(Line, { points: [start, offsetStart], color: "#dc2626", lineWidth: 1 }), _jsx(Line, { points: [end, offsetEnd], color: "#dc2626", lineWidth: 1 }), _jsxs("mesh", { position: start, children: [_jsx("sphereGeometry", { args: [0.015] }), _jsx("meshBasicMaterial", { color: "#2563eb" })] }), _jsxs("mesh", { position: end, children: [_jsx("sphereGeometry", { args: [0.015] }), _jsx("meshBasicMaterial", { color: "#2563eb" })] }), _jsx(Html, { position: offsetMid, center: true, transform: false, sprite: true, style: {
                    pointerEvents: 'none',
                }, children: _jsxs("div", { className: "bg-white px-1 py-0.5 rounded shadow border border-gray-300", style: {
                        fontSize: '10px',
                        lineHeight: '1.3',
                        minWidth: 'max-content',
                        whiteSpace: 'nowrap',
                        transform: 'scale(0.7)',
                        transformOrigin: 'center'
                    }, children: [_jsx("div", { className: "font-medium text-gray-800", style: { margin: '0', padding: '0' }, children: label }), _jsx("div", { className: "text-blue-600", style: { margin: '0', padding: '0' }, children: displayValue })] }) }), _jsxs("mesh", { position: offsetStart, rotation: [0, 0, Math.atan2(direction.y, direction.x)], children: [_jsx("coneGeometry", { args: [0.015, 0.04, 4] }), _jsx("meshBasicMaterial", { color: "#dc2626" })] }), _jsxs("mesh", { position: offsetEnd, rotation: [0, 0, Math.atan2(-direction.y, -direction.x)], children: [_jsx("coneGeometry", { args: [0.015, 0.04, 4] }), _jsx("meshBasicMaterial", { color: "#dc2626" })] })] }));
}
function IkeaStyleDimensions({ object }) {
    const { camera } = useThree();
    const [bbox, setBbox] = useState(null);
    const [cameraPosition, setCameraPosition] = useState(new THREE.Vector3());
    useFrame(() => {
        setCameraPosition(camera.position.clone());
    });
    useEffect(() => {
        if (object) {
            const box = new THREE.Box3().setFromObject(object);
            setBbox(box);
        }
    }, [object]);
    if (!bbox)
        return null;
    const min = bbox.min;
    const max = bbox.max;
    const center = new THREE.Vector3().addVectors(min, max).multiplyScalar(0.5);
    const size = new THREE.Vector3().subVectors(max, min);
    // Calculate camera direction relative to object center
    const cameraDir = new THREE.Vector3().subVectors(cameraPosition, center).normalize();
    // Surface edge points - actual cube edges
    const frontBottomLeft = new THREE.Vector3(min.x, min.y, min.z);
    const frontBottomRight = new THREE.Vector3(max.x, min.y, min.z);
    const frontTopLeft = new THREE.Vector3(min.x, max.y, min.z);
    const frontTopRight = new THREE.Vector3(max.x, max.y, min.z);
    const backBottomLeft = new THREE.Vector3(min.x, min.y, max.z);
    const backBottomRight = new THREE.Vector3(max.x, min.y, max.z);
    const backTopLeft = new THREE.Vector3(min.x, max.y, max.z);
    const backTopRight = new THREE.Vector3(max.x, max.y, max.z);
    // Determine optimal sides for dimensions based on camera angle
    const showFront = cameraDir.z > 0.1; // Front face more visible
    const showBack = cameraDir.z < -0.1; // Back face more visible
    const showLeft = cameraDir.x < -0.1; // Left face more visible
    const showRight = cameraDir.x > 0.1; // Right face more visible
    const showBottom = cameraDir.y < -0.1; // Bottom face more visible
    const showTop = cameraDir.y > 0.1; // Top face more visible
    return (_jsxs("group", { children: [(showFront || (!showFront && !showBack)) && (_jsx(SurfaceDimensionLine
            // Measure actual cube width: left edge to right edge on front face
            , { 
                // Measure actual cube width: left edge to right edge on front face
                startSurface: frontBottomLeft, endSurface: frontBottomRight, label: "Width", value: parseFloat(size.x.toFixed(1)), unit: "units", side: "front" })), showBack && !showFront && (_jsx(SurfaceDimensionLine
            // Same width measurement but shown on back face when front is hidden
            , { 
                // Same width measurement but shown on back face when front is hidden
                startSurface: backBottomLeft, endSurface: backBottomRight, label: "Width", value: parseFloat(size.x.toFixed(1)), unit: "units", side: "back" })), (showLeft || (!showLeft && !showRight)) && (_jsx(SurfaceDimensionLine
            // Measure actual cube height: bottom edge to top edge on left face
            , { 
                // Measure actual cube height: bottom edge to top edge on left face
                startSurface: frontBottomLeft, endSurface: frontTopLeft, label: "Height", value: parseFloat(size.y.toFixed(1)), unit: "units", side: "left" })), showRight && !showLeft && (_jsx(SurfaceDimensionLine
            // Same height measurement but shown on right face when left is hidden
            , { 
                // Same height measurement but shown on right face when left is hidden
                startSurface: frontBottomRight, endSurface: frontTopRight, label: "Height", value: parseFloat(size.y.toFixed(1)), unit: "units", side: "right" })), (showBottom || (!showBottom && !showTop)) && (_jsx(SurfaceDimensionLine
            // Measure actual cube depth: front edge to back edge on bottom face
            , { 
                // Measure actual cube depth: front edge to back edge on bottom face
                startSurface: frontBottomLeft, endSurface: backBottomLeft, label: "Depth", value: parseFloat(size.z.toFixed(1)), unit: "units", side: "bottom" })), showTop && !showBottom && (_jsx(SurfaceDimensionLine
            // Same depth measurement but shown on top face when bottom is hidden
            , { 
                // Same depth measurement but shown on top face when bottom is hidden
                startSurface: frontTopLeft, endSurface: backTopLeft, label: "Depth", value: parseFloat(size.z.toFixed(1)), unit: "units", side: "top" }))] }));
}
function SurfaceDimensionLine({ startSurface, endSurface, label, value, unit, side }) {
    const lineRef = useRef(null);
    const direction = new THREE.Vector3().subVectors(endSurface, startSurface).normalize();
    const distance = startSurface.distanceTo(endSurface);
    const midPoint = new THREE.Vector3().addVectors(startSurface, endSurface).multiplyScalar(0.5);
    // Calculate extension offset based on which side we're showing the dimension
    let extensionOffset = new THREE.Vector3();
    const offsetDistance = 0.2; // Distance to extend outside the object
    switch (side) {
        case 'front':
            extensionOffset = new THREE.Vector3(0, -offsetDistance, 0); // Extend below
            break;
        case 'back':
            extensionOffset = new THREE.Vector3(0, -offsetDistance, 0); // Extend below
            break;
        case 'left':
            extensionOffset = new THREE.Vector3(-offsetDistance, 0, 0); // Extend left
            break;
        case 'right':
            extensionOffset = new THREE.Vector3(offsetDistance, 0, 0); // Extend right
            break;
        case 'bottom':
            extensionOffset = new THREE.Vector3(-offsetDistance, 0, 0); // Extend left
            break;
        case 'top':
            extensionOffset = new THREE.Vector3(-offsetDistance, 0, 0); // Extend left
            break;
    }
    // Surface edge points remain on the actual object surface
    const surfaceStart = startSurface.clone();
    const surfaceEnd = endSurface.clone();
    // Dimension line extends outside the object
    const dimStart = new THREE.Vector3().addVectors(surfaceStart, extensionOffset);
    const dimEnd = new THREE.Vector3().addVectors(surfaceEnd, extensionOffset);
    const dimMid = new THREE.Vector3().addVectors(midPoint, extensionOffset);
    const displayValue = value ? `${value} ${unit || 'units'}` : `${distance.toFixed(1)} units`;
    return (_jsxs("group", { ref: lineRef, children: [_jsxs("mesh", { position: surfaceStart, children: [_jsx("sphereGeometry", { args: [0.01] }), _jsx("meshBasicMaterial", { color: "#ef4444" })] }), _jsxs("mesh", { position: surfaceEnd, children: [_jsx("sphereGeometry", { args: [0.01] }), _jsx("meshBasicMaterial", { color: "#ef4444" })] }), _jsx(Line, { points: [surfaceStart, dimStart], color: "#ef4444", lineWidth: 1 }), _jsx(Line, { points: [surfaceEnd, dimEnd], color: "#ef4444", lineWidth: 1 }), _jsx(Line, { points: [dimStart, dimEnd], color: "#ef4444", lineWidth: 2 }), _jsxs("mesh", { position: dimStart, children: [_jsx("sphereGeometry", { args: [0.015] }), _jsx("meshBasicMaterial", { color: "#ef4444" })] }), _jsxs("mesh", { position: dimEnd, children: [_jsx("sphereGeometry", { args: [0.015] }), _jsx("meshBasicMaterial", { color: "#ef4444" })] }), _jsx(Html, { position: dimMid, center: true, transform: false, sprite: true, style: {
                    pointerEvents: 'none',
                }, children: _jsxs("div", { className: "bg-white px-2 py-1 rounded shadow border border-gray-300", style: {
                        fontSize: '11px',
                        lineHeight: '1.3',
                        minWidth: 'max-content',
                        whiteSpace: 'nowrap',
                        transform: 'scale(0.75)',
                        transformOrigin: 'center'
                    }, children: [_jsx("div", { className: "font-semibold text-gray-800", style: { margin: '0', padding: '0' }, children: label }), _jsx("div", { className: "text-red-600", style: { margin: '0', padding: '0' }, children: displayValue })] }) }), _jsxs("mesh", { position: dimStart, rotation: [0, 0, Math.atan2(direction.y, direction.x)], scale: [0.8, 0.8, 0.8], children: [_jsx("coneGeometry", { args: [0.02, 0.05, 4] }), _jsx("meshBasicMaterial", { color: "#ef4444" })] }), _jsxs("mesh", { position: dimEnd, rotation: [0, 0, Math.atan2(-direction.y, -direction.x)], scale: [0.8, 0.8, 0.8], children: [_jsx("coneGeometry", { args: [0.02, 0.05, 4] }), _jsx("meshBasicMaterial", { color: "#ef4444" })] })] }));
}
function MeasurementVisualization({ measurements }) {
    return (_jsx(_Fragment, { children: measurements.map((measurement) => (_jsx(DimensionLine, { start: measurement.start, end: measurement.end, label: measurement.label, value: measurement.value, unit: measurement.unit }, measurement.id))) }));
}
function LoadingFallback() {
    return (_jsx(Html, { center: true, children: _jsxs("div", { className: "bg-white px-4 py-2 rounded shadow", children: [_jsx("div", { className: "animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2" }), _jsx("p", { className: "text-sm text-gray-600", children: "Loading 3D model..." })] }) }));
}
function ErrorFallback({ error }) {
    return (_jsx(Html, { center: true, children: _jsxs("div", { className: "bg-red-50 border border-red-200 px-4 py-2 rounded shadow", children: [_jsx("p", { className: "text-sm text-red-800", children: "Failed to load 3D model" }), _jsx("p", { className: "text-xs text-red-600", children: error })] }) }));
}
export const ModelViewer = ({ modelUrl, onPointClick, measurements = [], className = '', showDimensions = true }) => {
    const [error, setError] = useState('');
    return (_jsx("div", { className: `w-full h-96 bg-gray-100 rounded-lg overflow-hidden ${className}`, children: _jsxs(Canvas, { camera: { position: [2.5, 2.5, 2.5], fov: 50 }, style: { background: '#f8fafc' }, children: [_jsx("ambientLight", { intensity: 0.5 }), _jsx("directionalLight", { position: [10, 10, 5], intensity: 0.8, castShadow: true, "shadow-mapSize-width": 1024, "shadow-mapSize-height": 1024 }), _jsx("directionalLight", { position: [-5, 5, 5], intensity: 0.3 }), _jsx(OrbitControls, { enablePan: true, enableZoom: true, enableRotate: true, minDistance: 1, maxDistance: 15 }), _jsx(Center, { children: _jsx(Suspense, { fallback: _jsx(LoadingFallback, {}), children: modelUrl ? (_jsx(Model, { url: modelUrl, onPointClick: onPointClick, showDimensions: showDimensions })) : (_jsx(FallbackModel, { onPointClick: onPointClick, showDimensions: showDimensions })) }) }), _jsx(MeasurementVisualization, { measurements: measurements }), error && _jsx(ErrorFallback, { error: error }), _jsx("gridHelper", { args: [3, 15, '#e2e8f0', '#f1f5f9'] })] }) }));
};

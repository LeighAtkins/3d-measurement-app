'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Suspense, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF, Html, Center, Line } from '@react-three/drei';
import * as THREE from 'three';
function Model({ url, onPointClick, onDimensionClick, showDimensions = true }) {
    const { scene } = useGLTF(url || '/models/default.glb');
    const meshRef = useRef(null);
    const handleClick = (event) => {
        if (onPointClick && event.intersections && event.intersections[0]) {
            const point = event.intersections[0].point;
            onPointClick(point);
        }
    };
    return (_jsxs("group", { children: [_jsx("primitive", { ref: meshRef, object: scene, onClick: handleClick, scale: 1 }), showDimensions && _jsx(IkeaStyleDimensions, { object: scene, onDimensionClick: onDimensionClick })] }));
}
function FallbackModel({ onPointClick, onDimensionClick, showDimensions = true }) {
    const meshRef = useRef(null);
    const groupRef = useRef(null);
    const handleClick = (event) => {
        if (onPointClick && event.intersections && event.intersections[0]) {
            const point = event.intersections[0].point;
            onPointClick(point);
        }
    };
    return (_jsxs("group", { ref: groupRef, children: [_jsxs("mesh", { ref: meshRef, onClick: handleClick, children: [_jsx("boxGeometry", { args: [1, 1, 1] }), _jsx("meshStandardMaterial", { color: "#10b981", transparent: true, opacity: 0.8 })] }), showDimensions && groupRef.current && (_jsx(IkeaStyleDimensions, { object: groupRef.current, onDimensionClick: onDimensionClick }))] }));
}
function IkeaStyleDimensions({ object, onDimensionClick }) {
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
    // Choose edges based on camera position (front-facing bias)
    const useTopEdge = cameraPosition.y > center.y; // Camera is above center
    const useRightEdge = cameraPosition.x > center.x; // Camera is to the right of center
    const useFrontZ = cameraPosition.z > center.z; // Camera is in front
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
export default function ModelViewer({ modelUrl, className = "w-full h-96", onPointClick, onDimensionClick, showDimensions = true }) {
    const [error, setError] = useState(null);
    return (_jsx("div", { className: className, children: _jsxs(Canvas, { camera: { position: [2, 2, 2], fov: 50 }, style: { background: '#fafafa' }, children: [_jsx("ambientLight", { intensity: 0.6 }), _jsx("directionalLight", { position: [10, 10, 5], intensity: 0.8 }), _jsx("directionalLight", { position: [-10, -10, -5], intensity: 0.3 }), _jsx(Suspense, { fallback: _jsx(LoadingFallback, {}), children: _jsx(Center, { children: error ? (_jsx(ErrorFallback, { error: error })) : modelUrl ? (_jsx(Model, { url: modelUrl, onPointClick: onPointClick, onDimensionClick: onDimensionClick, showDimensions: showDimensions })) : (_jsx(FallbackModel, { onPointClick: onPointClick, onDimensionClick: onDimensionClick, showDimensions: showDimensions })) }) }), _jsx(OrbitControls, { enablePan: true, enableZoom: true, enableRotate: true, maxPolarAngle: Math.PI })] }) }));
}

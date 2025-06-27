import * as THREE from 'three';
/**
 * Convert 3D coordinates to the standardized coordinate system
 * used by the backend (Y-up, Z-forward, normalized unit cube)
 */
export const toStandardCoordinates = (point) => {
    return {
        x: point.x,
        y: point.y,
        z: point.z
    };
};
/**
 * Convert from standardized coordinates to Three.js Vector3
 */
export const fromStandardCoordinates = (coords) => {
    return new THREE.Vector3(coords.x, coords.y, coords.z);
};
/**
 * Calculate real-world distance from 3D points
 * Assumes the model is normalized to a unit cube
 */
export const calculateDistance = (start, end, scaleFactor = 100 // Default: 100cm for unit cube
) => {
    const distance3D = start.distanceTo(end);
    return distance3D * scaleFactor;
};
/**
 * Validate that coordinates are within the normalized bounds
 */
export const validateCoordinates = (point) => {
    const bounds = 0.5; // [-0.5, 0.5] unit cube
    return (Math.abs(point.x) <= bounds &&
        Math.abs(point.y) <= bounds &&
        Math.abs(point.z) <= bounds);
};
/**
 * Snap point to the nearest surface or grid intersection
 */
export const snapToSurface = (point, snapDistance = 0.05) => {
    const snapped = point.clone();
    // Snap to grid intervals
    const gridSize = 0.1;
    snapped.x = Math.round(snapped.x / gridSize) * gridSize;
    snapped.y = Math.round(snapped.y / gridSize) * gridSize;
    snapped.z = Math.round(snapped.z / gridSize) * gridSize;
    return snapped;
};
/**
 * Format coordinates for display
 */
export const formatCoordinates = (point, precision = 3) => {
    return `(${point.x.toFixed(precision)}, ${point.y.toFixed(precision)}, ${point.z.toFixed(precision)})`;
};
/**
 * Calculate the center point between two coordinates
 */
export const getCenterPoint = (start, end) => {
    return new THREE.Vector3((start.x + end.x) / 2, (start.y + end.y) / 2, (start.z + end.z) / 2);
};

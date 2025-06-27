import * as THREE from 'three';
/**
 * Convert 3D coordinates to the standardized coordinate system
 * used by the backend (Y-up, Z-forward, normalized unit cube)
 */
export declare const toStandardCoordinates: (point: THREE.Vector3) => {
    x: number;
    y: number;
    z: number;
};
/**
 * Convert from standardized coordinates to Three.js Vector3
 */
export declare const fromStandardCoordinates: (coords: {
    x: number;
    y: number;
    z: number;
}) => THREE.Vector3;
/**
 * Calculate real-world distance from 3D points
 * Assumes the model is normalized to a unit cube
 */
export declare const calculateDistance: (start: THREE.Vector3, end: THREE.Vector3, scaleFactor?: number) => number;
/**
 * Validate that coordinates are within the normalized bounds
 */
export declare const validateCoordinates: (point: THREE.Vector3) => boolean;
/**
 * Snap point to the nearest surface or grid intersection
 */
export declare const snapToSurface: (point: THREE.Vector3, snapDistance?: number) => THREE.Vector3;
/**
 * Format coordinates for display
 */
export declare const formatCoordinates: (point: THREE.Vector3, precision?: number) => string;
/**
 * Calculate the center point between two coordinates
 */
export declare const getCenterPoint: (start: THREE.Vector3, end: THREE.Vector3) => THREE.Vector3;

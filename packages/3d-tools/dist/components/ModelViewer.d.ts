import React from 'react';
import * as THREE from 'three';
interface ModelViewerProps {
    modelUrl?: string;
    onPointClick?: (point: THREE.Vector3) => void;
    measurements?: MeasurementPoint[];
    className?: string;
    showDimensions?: boolean;
}
interface MeasurementPoint {
    id: string;
    start: THREE.Vector3;
    end: THREE.Vector3;
    label: string;
    value?: number;
    unit?: string;
}
export declare const ModelViewer: React.FC<ModelViewerProps>;
export type { MeasurementPoint };

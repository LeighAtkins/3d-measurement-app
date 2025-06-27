import * as THREE from 'three';
export interface MeasurementMode {
    isActive: boolean;
    firstPoint: THREE.Vector3 | null;
    previewPoint: THREE.Vector3 | null;
}
export declare const useMeasurementMode: () => {
    mode: MeasurementMode;
    startMeasurement: () => void;
    handlePointClick: (point: THREE.Vector3) => {
        start: THREE.Vector3;
        end: THREE.Vector3;
    } | null;
    updatePreview: (point: THREE.Vector3) => void;
    cancelMeasurement: () => void;
};

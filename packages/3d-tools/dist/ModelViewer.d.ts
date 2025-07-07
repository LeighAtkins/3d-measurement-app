import * as THREE from 'three';
export interface CustomMeasurement {
    id: string;
    label: string;
    start_point: THREE.Vector3;
    end_point: THREE.Vector3;
    distance: number;
    unit: string;
    color?: string;
    notes?: string;
    visible?: boolean;
}
export interface ModelViewerProps {
    modelUrl?: string;
    className?: string;
    onPointClick?: (point: THREE.Vector3) => void;
    onDimensionClick?: (dimension: {
        label: string;
        start_point: THREE.Vector3;
        end_point: THREE.Vector3;
        value: number;
    }) => void;
    showDimensions?: boolean;
    customMeasurements?: CustomMeasurement[];
    temporaryMeasurement?: {
        start: THREE.Vector3;
        end?: THREE.Vector3;
    } | null;
    measurementMode?: boolean;
    onMeasurementSelect?: (measurement: CustomMeasurement) => void;
    onMeasurementHover?: (measurementId: string, hovered: boolean) => void;
    selectedMeasurementId?: string;
    hoveredMeasurementId?: string;
}
export default function ModelViewer({ modelUrl, className, onPointClick, onDimensionClick, showDimensions, customMeasurements, temporaryMeasurement, measurementMode, onMeasurementSelect, onMeasurementHover, selectedMeasurementId, hoveredMeasurementId }: ModelViewerProps): import("react/jsx-runtime").JSX.Element;

import * as THREE from 'three';
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
}
export default function ModelViewer({ modelUrl, className, onPointClick, onDimensionClick, showDimensions }: ModelViewerProps): import("react/jsx-runtime").JSX.Element;

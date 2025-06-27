import React from 'react';
import * as THREE from 'three';
import { MeasurementType } from '@3d-measurement-app/api-client';
interface MeasurementToolProps {
    onMeasurementCreate: (measurement: MeasurementData) => void;
    disabled?: boolean;
}
export interface MeasurementData {
    type: MeasurementType;
    label: string;
    start: THREE.Vector3;
    end: THREE.Vector3;
    unit: string;
}
export declare const MeasurementTool: React.FC<MeasurementToolProps>;
export {};

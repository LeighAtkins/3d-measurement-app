import { Measurement, CreateMeasurementRequest, UpdateMeasurementRequest } from './types';
export declare class MeasurementsAPI {
    private client;
    constructor(client?: import("./client").ApiClient);
    create(subdomain: string, orderId: string, data: CreateMeasurementRequest): Promise<{
        measurement: Measurement;
    }>;
    update(subdomain: string, orderId: string, measurementId: string, data: UpdateMeasurementRequest): Promise<{
        measurement: Measurement;
    }>;
    updateValue(orderId: string, measurementId: string, data: UpdateMeasurementRequest): Promise<{
        measurement: Measurement;
    }>;
}
export declare const measurementsAPI: MeasurementsAPI;

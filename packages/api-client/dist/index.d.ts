export declare class ApiClient {
    private baseUrl;
    private token;
    constructor(baseUrl?: string);
    setToken(token: string): void;
    clearToken(): void;
    private makeRequest;
    request(url: string, options?: RequestInit): Promise<any>;
    login(email: string, password: string): Promise<any>;
    logout(): Promise<void>;
    getOrders(): Promise<any>;
    getOrder(id: string): Promise<any>;
    createOrder(data: any): Promise<any>;
    updateOrder(id: string, data: any): Promise<any>;
    getMeasurements(orderId: string): Promise<any>;
    createMeasurement(orderId: string, data: any): Promise<any>;
    updateMeasurement(orderId: string, measurementId: string, data: any): Promise<any>;
    deleteMeasurement(orderId: string, measurementId: string): Promise<any>;
}
export declare function checkTokenExpiry(): boolean;
export default ApiClient;

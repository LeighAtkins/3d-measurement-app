export interface User {
    id: string;
    email: string;
    name: string | null;
    role: 'CLIENT' | 'COMPANY_USER' | 'COMPANY_ADMIN' | 'ADMIN';
    companyId: string | null;
    company?: {
        id: string;
        name: string;
        subdomain: string;
    };
}
export interface AuthResponse {
    token: string;
    user: User;
}
export interface MagicLinkRequest {
    email: string;
}
export interface MagicLinkResponse {
    message: string;
    email: string;
    devToken?: string;
    verifyUrl?: string;
}
export type OrderStatus = 'SUBMITTED' | 'PROCESSING' | 'MODELING_FAILED' | 'READY_FOR_MEASUREMENT' | 'MEASUREMENTS_DRAWN' | 'CLIENT_INPUT_NEEDED' | 'COMPLETED' | 'CANCELLED';
export type Priority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export interface Order {
    id: string;
    orderNumber: string;
    clientId: string;
    status: OrderStatus;
    model3dUrl: string | null;
    priority: Priority;
    dueDate: string | null;
    notes: string | null;
    assignedCompanyId: string | null;
    createdAt: string;
    updatedAt: string;
    client?: {
        id: string;
        email: string;
        name: string | null;
    };
    assignedCompany?: {
        id: string;
        name: string;
        subdomain: string;
    };
    photos?: Photo[];
    measurements?: Measurement[];
}
export interface OrdersResponse {
    orders: Order[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}
export type MeasurementType = 'LENGTH' | 'WIDTH' | 'HEIGHT' | 'DIAMETER' | 'CIRCUMFERENCE' | 'ANGLE' | 'CUSTOM';
export interface Measurement {
    id: string;
    orderId: string;
    type: MeasurementType;
    label: string;
    startPointX: number;
    startPointY: number;
    startPointZ: number;
    endPointX: number;
    endPointY: number;
    endPointZ: number;
    value: number | null;
    unit: string;
    verified: boolean;
    notes: string | null;
    version: number;
    createdAt: string;
    updatedAt: string;
}
export interface CreateMeasurementRequest {
    type: MeasurementType;
    label: string;
    startPointX: number;
    startPointY: number;
    startPointZ: number;
    endPointX: number;
    endPointY: number;
    endPointZ: number;
    unit?: string;
}
export interface UpdateMeasurementRequest {
    value?: number;
    notes?: string;
}
export interface Photo {
    id: string;
    orderId: string;
    url: string;
    thumbnailUrl: string | null;
    name: string;
    size: number;
    mimeType: string;
    createdAt: string;
}
export interface ApiError {
    error: string;
    message?: string;
    details?: any;
    status?: number;
}
export interface ApiResponse<T = any> {
    data?: T;
    error?: ApiError;
}

import { Order, OrdersResponse } from './types';
export interface OrdersListParams {
    page?: number;
    limit?: number;
    status?: string;
}
export declare class OrdersAPI {
    private client;
    constructor(client?: import("./client").ApiClient);
    list(subdomain: string, params?: OrdersListParams): Promise<OrdersResponse>;
    get(subdomain: string, orderId: string): Promise<{
        order: Order;
    }>;
    listClientOrders(params?: OrdersListParams): Promise<OrdersResponse>;
    getClientOrder(orderId: string): Promise<{
        order: Order;
    }>;
}
export declare const ordersAPI: OrdersAPI;

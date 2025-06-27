import { apiClient } from './client';
export class OrdersAPI {
    constructor(client = apiClient) {
        this.client = client;
    }
    async list(subdomain, params = {}) {
        const searchParams = new URLSearchParams();
        if (params.page)
            searchParams.append('page', params.page.toString());
        if (params.limit)
            searchParams.append('limit', params.limit.toString());
        if (params.status)
            searchParams.append('status', params.status);
        const query = searchParams.toString();
        const url = `/api/company/${subdomain}/orders${query ? `?${query}` : ''}`;
        return this.client.get(url);
    }
    async get(subdomain, orderId) {
        return this.client.get(`/api/company/${subdomain}/orders/${orderId}`);
    }
    // For client users - list their assigned orders
    async listClientOrders(params = {}) {
        const searchParams = new URLSearchParams();
        if (params.page)
            searchParams.append('page', params.page.toString());
        if (params.limit)
            searchParams.append('limit', params.limit.toString());
        if (params.status)
            searchParams.append('status', params.status);
        const query = searchParams.toString();
        const url = `/api/orders${query ? `?${query}` : ''}`;
        return this.client.get(url);
    }
    async getClientOrder(orderId) {
        return this.client.get(`/api/orders/${orderId}`);
    }
}
export const ordersAPI = new OrdersAPI();

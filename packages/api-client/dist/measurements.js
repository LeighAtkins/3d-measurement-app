import { apiClient } from './client';
export class MeasurementsAPI {
    constructor(client = apiClient) {
        this.client = client;
    }
    async create(subdomain, orderId, data) {
        return this.client.post(`/api/company/${subdomain}/orders/${orderId}/measurements`, data);
    }
    async update(subdomain, orderId, measurementId, data) {
        return this.client.put(`/api/company/${subdomain}/orders/${orderId}/measurements/${measurementId}`, data);
    }
    // For client users - update measurement values
    async updateValue(orderId, measurementId, data) {
        return this.client.put(`/api/orders/${orderId}/measurements/${measurementId}`, data);
    }
}
export const measurementsAPI = new MeasurementsAPI();

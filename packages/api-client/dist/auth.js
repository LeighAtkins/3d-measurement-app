import { apiClient } from './client';
export class AuthAPI {
    constructor(client = apiClient) {
        this.client = client;
    }
    async signin(email) {
        const request = { email };
        return this.client.post('/api/auth/signin', request);
    }
    async verify(token, email) {
        const url = `/api/auth/verify?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
        const response = await this.client.get(url);
        // Store the JWT token
        if (response.token) {
            this.client.setToken(response.token);
        }
        return response;
    }
    logout() {
        this.client.setToken(null);
        if (typeof window !== 'undefined') {
            window.location.href = '/login';
        }
    }
    getCurrentUser() {
        const token = this.client.getToken();
        if (!token)
            return null;
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return {
                id: payload.userId,
                email: payload.email,
                role: payload.role,
                companyId: payload.companyId,
            };
        }
        catch {
            return null;
        }
    }
    isAuthenticated() {
        return this.client.getToken() !== null;
    }
}
export const authAPI = new AuthAPI();

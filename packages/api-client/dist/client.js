import axios from 'axios';
export class ApiClient {
    constructor(baseURL = 'http://localhost:8000') {
        this.token = null;
        this.client = axios.create({
            baseURL,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
            },
        });
        // Request interceptor to add auth token
        this.client.interceptors.request.use((config) => {
            if (this.token) {
                config.headers.Authorization = `Bearer ${this.token}`;
            }
            return config;
        });
        // Response interceptor for error handling
        this.client.interceptors.response.use((response) => response, (error) => {
            if (error.response?.status === 401) {
                this.handleUnauthorized();
            }
            throw this.transformError(error);
        });
    }
    setToken(token) {
        this.token = token;
        if (typeof window !== 'undefined') {
            if (token) {
                localStorage.setItem('auth_token', token);
            }
            else {
                localStorage.removeItem('auth_token');
            }
        }
    }
    getToken() {
        if (this.token)
            return this.token;
        if (typeof window !== 'undefined') {
            const storedToken = localStorage.getItem('auth_token');
            if (storedToken && this.isTokenValid(storedToken)) {
                this.token = storedToken;
                return storedToken;
            }
        }
        return null;
    }
    isTokenValid(token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.exp * 1000 > Date.now();
        }
        catch {
            return false;
        }
    }
    handleUnauthorized() {
        this.setToken(null);
        if (typeof window !== 'undefined') {
            window.location.href = '/login';
        }
    }
    transformError(error) {
        const apiError = {
            error: 'Unknown error',
            status: error.response?.status || 500,
        };
        if (error.response?.data) {
            apiError.error = error.response.data.error || error.response.data.message || error.message;
            apiError.message = error.response.data.message;
            apiError.details = error.response.data.details;
        }
        else if (error.message) {
            apiError.error = error.message;
        }
        return apiError;
    }
    async get(url, config) {
        const response = await this.client.get(url, config);
        return response.data;
    }
    async post(url, data, config) {
        const response = await this.client.post(url, data, config);
        return response.data;
    }
    async put(url, data, config) {
        const response = await this.client.put(url, data, config);
        return response.data;
    }
    async delete(url, config) {
        const response = await this.client.delete(url, config);
        return response.data;
    }
}
// Create default instance
export const apiClient = new ApiClient();

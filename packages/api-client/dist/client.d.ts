import { AxiosRequestConfig } from 'axios';
export declare class ApiClient {
    private client;
    private token;
    constructor(baseURL?: string);
    setToken(token: string | null): void;
    getToken(): string | null;
    private isTokenValid;
    private handleUnauthorized;
    private transformError;
    get<T>(url: string, config?: AxiosRequestConfig): Promise<T>;
    post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>;
    put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>;
    delete<T>(url: string, config?: AxiosRequestConfig): Promise<T>;
}
export declare const apiClient: ApiClient;

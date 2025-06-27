import { AuthResponse, MagicLinkResponse } from './types';
export declare class AuthAPI {
    private client;
    constructor(client?: import("./client").ApiClient);
    signin(email: string): Promise<MagicLinkResponse>;
    verify(token: string, email: string): Promise<AuthResponse>;
    logout(): void;
    getCurrentUser(): {
        id: any;
        email: any;
        role: any;
        companyId: any;
    } | null;
    isAuthenticated(): boolean;
}
export declare const authAPI: AuthAPI;

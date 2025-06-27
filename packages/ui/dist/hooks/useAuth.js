import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useEffect, useState } from 'react';
import { authAPI } from '@3d-measurement-app/api-client';
const AuthContext = createContext(undefined);
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        // Check for existing token on mount
        const currentUser = authAPI.getCurrentUser();
        if (currentUser) {
            setUser(currentUser);
        }
        setLoading(false);
    }, []);
    const login = (token, userData) => {
        authAPI.client.setToken(token);
        setUser(userData);
    };
    const logout = () => {
        authAPI.logout();
        setUser(null);
    };
    const value = {
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
    };
    return (_jsx(AuthContext.Provider, { value: value, children: children }));
};
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

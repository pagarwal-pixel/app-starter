import axios from 'axios';

export const USER_STORAGE_KEY = 'user';
export const USER_CHANGE_EVENT = 'auth-user-changed';

const notifyUserChanged = () => {
    window.dispatchEvent(new Event(USER_CHANGE_EVENT));
};

// User type for RBAC
export interface User {
    id: number;
    username: string;
    email: string;
    role: 'admin' | 'internal' | 'external';
    is_active?: boolean;
    created_at?: string;
    last_login?: string;
}

// PLACEHOLDER domain entity - rename to your real entity per project
export interface ResourceRecord {
    id: number;
    name: string;
    description?: string;
    created_at?: string;
    last_updated?: string;
}

// Use dynamic base URL; allow override for split frontend/backend hosts
const getBaseUrl = () => {
    const envBase = import.meta.env.VITE_API_BASE_URL?.trim();
    if (envBase) return `${envBase.replace(/\/$/, '')}/api`;

    // Default: relative /api path
    // - In Vite dev mode: proxied to the backend via vite.config.ts
    // - In production: served from the same origin
    return '/api';
};

const api = axios.create({
    baseURL: getBaseUrl(),
    withCredentials: true,
});

// Handle 401 errors (token expired, etc.) by returning to login
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem(USER_STORAGE_KEY);
            notifyUserChanged();
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

// Auth functions
export const login = async (username: string, password: string) => {
    const res = await api.post('/login', { username, password });

    const userData = JSON.stringify(res.data.user);
    localStorage.setItem(USER_STORAGE_KEY, userData);
    notifyUserChanged();

    return res.data;
};

export const getCurrentUser = (): User | null => {
    const userStr = localStorage.getItem(USER_STORAGE_KEY);
    if (userStr) {
        try {
            return JSON.parse(userStr);
        } catch {
            localStorage.removeItem(USER_STORAGE_KEY);
            return null;
        }
    }
    return null;
};

export const fetchCurrentUser = async (): Promise<User> => {
    const res = await api.get('/me');
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(res.data.user));
    notifyUserChanged();
    return res.data.user;
};

export const logout = () => {
    localStorage.removeItem(USER_STORAGE_KEY);
    notifyUserChanged();
    api.post('/logout').catch(() => { /* ignore */ });
    window.location.href = '/login';
};

// User management functions (Admin only)
export const getUsers = async () => {
    const res = await api.get('/users');
    return res.data;
};

export const createUser = async (data: { email: string; username: string; password: string; role: string }) => {
    const res = await api.post('/users', data);
    return res.data;
};

export const updateUser = async (id: number, data: { email?: string; username?: string; password?: string; role?: string; is_active?: boolean }) => {
    const res = await api.put(`/users/${id}`, data);
    return res.data;
};

export const deleteUser = async (id: number) => {
    const res = await api.delete(`/users/${id}`);
    return res.data;
};

// Resource access grants (Admin only) - rename alongside your domain entity
export const getUserAccess = async (userId: number) => {
    const res = await api.get(`/users/${userId}/access`);
    return res.data; // { access, allResources, user }
};

export const grantResourceAccess = async (userId: number, resourceId: number) => {
    const res = await api.post(`/users/${userId}/access`, { resourceId });
    return res.data;
};

export const revokeResourceAccess = async (userId: number, resourceId: number) => {
    const res = await api.delete(`/users/${userId}/access/${resourceId}`);
    return res.data;
};

// Password management
export const changePassword = async (currentPassword: string, newPassword: string) => {
    const res = await api.post('/change-password', { currentPassword, newPassword });
    return res.data;
};

export const forgotPassword = async (email: string) => {
    const res = await api.post('/forgot-password', { email });
    return res.data;
};

export const resetPassword = async (token: string, password: string) => {
    const res = await api.post('/reset-password', { token, password });
    return res.data;
};

// Audit log (Admin only)
export const getAuditLog = async (limit = 100, offset = 0) => {
    const res = await api.get('/audit-log', { params: { limit, offset } });
    return res.data;
};

// PLACEHOLDER domain API - replace with your real endpoints
export const getResources = async (): Promise<ResourceRecord[]> => {
    const res = await api.get('/resources');
    return res.data.resources;
};

export const createResource = async (data: { name: string; description?: string }) => {
    const res = await api.post('/resources', data);
    return res.data;
};

export const deleteResource = async (id: number) => {
    const res = await api.delete(`/resources/${id}`);
    return res.data;
};

export default api;

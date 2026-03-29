import axios, { type AxiosError } from 'axios';
import useAuthStore from '../store/useAuthStore';

// ─── Axios instance ────────────────────────────────────────────────────────────
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true,
    xsrfCookieName: 'csrf_token',
    xsrfHeaderName: 'X-CSRF-Token',
});

// ─── Helper: fire toast events consumed by ToastContainer ─────────────────────
export function fireToast(message: string, type: 'error' | 'warning' | 'info' = 'error') {
    window.dispatchEvent(new CustomEvent('diagnoai:toast', { detail: { message, type } }));
}

// ─── Friendly HTTP error messages ─────────────────────────────────────────────
const HTTP_MESSAGES: Record<number, string> = {
    400: 'Invalid request. Please check your input.',
    401: 'Your session has expired. Please log in again.',
    403: 'You do not have permission to perform this action.',
    404: 'The requested resource was not found.',
    409: 'A conflict occurred. The resource may already exist.',
    413: 'The file is too large to upload.',
    422: 'Validation failed. Please check your input.',
    429: 'Too many requests. Please slow down and try again.',
    500: 'A server error occurred. Please try again shortly.',
    502: 'Service temporarily unavailable. Please retry.',
    503: 'Service is under maintenance. Please check back later.',
};

function getCookie(name: string) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
}

// ─── Request interceptor: attach JWT + CSRF token ─────────────────────────────
api.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if (token) config.headers.Authorization = `Bearer ${token}`;

    const csrfToken = getCookie('csrf_token');
    if (csrfToken) config.headers['X-CSRF-Token'] = csrfToken;

    return config;
}, (error) => Promise.reject(error));

// ─── Response interceptor: centralized error handling ─────────────────────────
api.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        // Skip toast for cancelled requests
        if (axios.isCancel(error)) return Promise.reject(error);

        const status = error.response?.status;

        // Extract backend detail message if available
        const backendDetail = (error.response?.data as { detail?: string })?.detail;
        const friendlyMessage =
            backendDetail ||
            (status ? HTTP_MESSAGES[status] : null) ||
            'An unexpected error occurred. Please try again.';

        // Auto-logout on 401
        if (status === 401) {
            useAuthStore.getState().logout?.();
        }

        // Fire toast — skip 401 on auth endpoints to avoid clashing with login error UX
        const isAuthEndpoint = error.config?.url?.includes('/auth/');
        if (!(status === 401 && isAuthEndpoint)) {
            fireToast(friendlyMessage, status && status >= 500 ? 'error' : 'warning');
        }

        return Promise.reject(error);
    }
);

export default api;


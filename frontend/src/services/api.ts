import axios from 'axios';

import useAuthStore from '../store/useAuthStore';

const api = axios.create({
    baseURL: 'http://localhost:8000/api', // FastAPI default
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
    xsrfCookieName: 'csrf_token',
    xsrfHeaderName: 'X-CSRF-Token',
});

function getCookie(name: string) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
}

api.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Manually add CSRF token for cross-origin requests
    const csrfToken = getCookie('csrf_token');
    if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
    }
    
    return config;
}, (error) => {
    return Promise.reject(error);
});

export default api;

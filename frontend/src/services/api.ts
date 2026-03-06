import axios from 'axios';

import useAuthStore from '../store/useAuthStore';

const api = axios.create({
    baseURL: 'http://127.0.0.1:8000/api', // FastAPI default
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

export default api;

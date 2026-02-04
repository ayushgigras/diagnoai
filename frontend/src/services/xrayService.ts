import api from './api';
import type { XRayResult } from '../types';


export const analyzeXRay = async (file: File, type: string): Promise<XRayResult> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('xray_type', type);

    const response = await api.post<XRayResult>('/xray/analyze', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });

    return response.data;
};

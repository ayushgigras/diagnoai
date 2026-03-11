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
        // AI inference can take up to 3 minutes on first load (model download)
        timeout: 180000,
    });

    return response.data;
};

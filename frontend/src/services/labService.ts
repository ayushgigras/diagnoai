import api from './api';
import type { LabResult, OCRResult } from '../types';


export const analyzeLabManual = async (values: Record<string, string | number>[]): Promise<LabResult> => {
    const response = await api.post<LabResult>('/lab/analyze-manual', {
        values,
    });
    return response.data;
};

export const uploadLabFile = async (file: File): Promise<OCRResult> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<OCRResult>('/lab/upload-file', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

export const analyzeLabFile = async (file: File): Promise<LabResult> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<LabResult>('/lab/analyze-from-file', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

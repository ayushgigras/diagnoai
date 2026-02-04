import api from './api';
import type { LabResult, OCRResult } from '../types';


export const analyzeLabManual = async (testType: string, values: Record<string, number>): Promise<LabResult> => {
    const response = await api.post<LabResult>('/lab/analyze-manual', {
        test_type: testType,
        values,
    });
    return response.data;
};

export const uploadLabFile = async (file: File, testType: string): Promise<OCRResult> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('test_type', testType);

    const response = await api.post<OCRResult>('/lab/upload-file', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

export const analyzeLabFile = async (file: File, testType: string): Promise<LabResult> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('test_type', testType);

    const response = await api.post<LabResult>('/lab/analyze-from-file', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

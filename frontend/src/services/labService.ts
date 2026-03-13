import api from './api';
import type { LabResult, OCRResult, PatientDetails } from '../types';

export interface TaskResponse {
    message: string;
    task_id: string;
    report_id: number;
}
export const analyzeLabManual = async (
    values: Record<string, string | number>[],
    patient?: PatientDetails,
): Promise<LabResult> => {
    const response = await api.post<LabResult>('/lab/analyze-manual', {
        values,
        patient,
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

export const analyzeLabFile = async (file: File, patient?: PatientDetails): Promise<TaskResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    if (patient) {
        formData.append('patient_first_name', patient.first_name);
        formData.append('patient_last_name', patient.last_name);
        if (patient.date_of_birth) formData.append('patient_date_of_birth', patient.date_of_birth);
        if (patient.gender) formData.append('patient_gender', patient.gender);
        if (patient.contact_number) formData.append('patient_contact_number', patient.contact_number);
        if (patient.address) formData.append('patient_address', patient.address);
    }

    const response = await api.post<TaskResponse>('/lab/analyze-from-file', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

export const checkTaskStatus = async (taskId: string) => {
    const response = await api.get(`/tasks/status/${taskId}`);
    return response.data;
};

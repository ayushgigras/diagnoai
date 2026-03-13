import api from './api';
import type { PatientDetails, XRayResult } from '../types';

export const analyzeXRay = async (
    file: File,
    type: string,
    patient?: PatientDetails,
): Promise<XRayResult> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('xray_type', type);

    if (patient) {
        formData.append('patient_first_name', patient.first_name);
        formData.append('patient_last_name', patient.last_name);
        if (patient.date_of_birth) formData.append('patient_date_of_birth', patient.date_of_birth);
        if (patient.gender) formData.append('patient_gender', patient.gender);
        if (patient.contact_number) formData.append('patient_contact_number', patient.contact_number);
        if (patient.address) formData.append('patient_address', patient.address);
    }

    const response = await api.post<XRayResult>('/xray/analyze', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
        // AI inference can take up to 3 minutes on first load (model download)
        timeout: 180000,
    });

    return response.data;
};

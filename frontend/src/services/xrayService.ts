import api from './api';


export interface TaskResponse {
    message: string;
    task_id: string;
    report_id: number;
}

export const analyzeXRay = async (file: File, type: string): Promise<TaskResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('xray_type', type);

    const response = await api.post<TaskResponse>('/xray/analyze', formData, {
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

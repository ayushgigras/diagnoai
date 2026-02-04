export interface APIResponse<T> {
    data: T;
    status: number;
}

export interface XRayResult {
    prediction: string;
    confidence: number;
    probabilities: Record<string, number>;
    heatmap_base64?: string;
    explanation?: string;
    key_findings?: string[];
}

export interface LabParameter {
    name: string;
    value: number;
    unit?: string;
    reference_range: string;
    status: 'normal' | 'abnormal' | 'critical' | 'unknown';
    percentage: number;
}

export interface LabResult {
    assessment: string;
    confidence: number;
    parameters: LabParameter[];
    interpretation?: string;
    recommendations?: string[];
}

export interface OCRResult {
    extracted_data: Record<string, any>;
    confidence: number;
    ocr_text: string;
    status: string;
}

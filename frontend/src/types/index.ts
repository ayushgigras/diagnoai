export interface APIResponse<T> {
    data: T;
    status: number;
}

export interface PatientDetails {
    first_name: string;
    last_name: string;
    date_of_birth?: string;
    gender?: string;
    contact_number?: string;
    address?: string;
}

export interface ReportPatientDetails {
    patient_name?: string;
    patient_first_name?: string;
    patient_last_name?: string;
    patient_date_of_birth?: string;
    patient_gender?: string;
    patient_contact_number?: string;
    patient_address?: string;
}

export interface XAIDetail {
    radiological_finding: string;
    visual_pattern: string;
    visual_evidence: string;
    clinical_context: string;
    recommendation: string;
    severity: 'normal' | 'low' | 'moderate' | 'high' | 'critical';
    region: string;
    confidence_pct: number;
}

export interface XRayFinding {
    condition: string;
    score: number;
    severity: 'normal' | 'low' | 'moderate' | 'high' | 'critical';
}

export interface XRayResult {
    prediction: string;
    confidence: number;
    probabilities: Record<string, number>;
    heatmap_b64?: string;
    heatmap_base64?: string; // backward compat
    region?: string;
    findings?: XRayFinding[];
    xai_details?: Record<string, XAIDetail>;
    explanation?: string;
    key_findings?: string[];
    model_info?: {
        name: string;
        trained_on: string;
        pathologies_count: number;
        xai_method: string;
    };
}

export interface LabParameter {
    name: string;
    value: number;
    unit?: string;
    reference_range: string;
    status: 'normal' | 'abnormal' | 'critical' | 'unknown';
    percentage: number;
    flag?: string;
}

export interface LabResult {
    assessment: string;
    confidence: number;
    parameters: LabParameter[];
    interpretation?: string;
    recommendations?: string[];
}

export interface OCRResult {
    extracted_data: Record<string, string | number>[];
    confidence: number;
    ocr_text: string;
    status: string;
}

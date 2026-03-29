import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { analyzeXRay } from '../services/xrayService';
import type { PatientDetails, XRayResult } from '../types';
import useAuthStore from '../store/useAuthStore';

import XRayTypeSelector from '../components/xray/XRayTypeSelector';
import ImageUploader from '../components/xray/ImageUploader';
import AnalysisResults from '../components/xray/AnalysisResults';
import PatientDetailsForm from '../components/common/PatientDetailsForm';
import Button from '../components/common/Button';
import { RefreshCw, ArrowLeft, Download } from 'lucide-react';
import { downloadReportPdf } from '../utils/reportPdf';

const XRayAnalysis = () => {
    const [selectedType, setSelectedType] = useState('chest');
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState<XRayResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const user = useAuthStore((state) => state.user);
    const isDoctor = user?.role === 'doctor';
    const [patientDetails, setPatientDetails] = useState<PatientDetails>({
        first_name: '',
        last_name: '',
        date_of_birth: '',
        gender: '',
        contact_number: '',
        address: '',
    });
    const [patientReady, setPatientReady] = useState(!isDoctor);

    const handleFileSelect = (uploadedFile: File) => {
        setFile(uploadedFile);
        setPreview(URL.createObjectURL(uploadedFile));
        setResult(null);
        setError(null);
    };

    const handleAnalyze = async () => {
        if (!file) return;

        setIsAnalyzing(true);
        setError(null);

        try {
            // Run analysis directly — backend processes synchronously and returns result
            const result = await analyzeXRay(file, selectedType, isDoctor ? patientDetails : undefined);
            setResult(result);
        } catch (err: any) {
            const detail = err?.response?.data?.detail;
            setError(detail || "Analysis failed. Please check your connection and try again.");
            console.error(err);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const resetAnalysis = () => {
        setFile(null);
        setPreview(null);
        setResult(null);
        setError(null);
        setPatientReady(!isDoctor);
    };

    const handlePatientContinue = () => {
        if (!patientDetails.first_name.trim() || !patientDetails.last_name.trim()) {
            setError('Patient first name and last name are required.');
            return;
        }
        setError(null);
        setPatientReady(true);
    };

    const downloadReport = () => {
        if (!result) return;
        downloadReportPdf({
            fileName: `diagnoai-xray-report-${Date.now()}`,
            reportType: 'xray',
            status: 'completed',
            analyzedAt: new Date().toISOString(),
            analyzedBy: user?.full_name || 'Doctor',
            patient: isDoctor ? {
                patient_name: `${patientDetails.first_name} ${patientDetails.last_name}`.trim(),
                patient_first_name: patientDetails.first_name,
                patient_last_name: patientDetails.last_name,
                patient_date_of_birth: patientDetails.date_of_birth,
                patient_gender: patientDetails.gender,
                patient_contact_number: patientDetails.contact_number,
                patient_address: patientDetails.address,
            } : null,
            result,
        });
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">X-Ray Analysis</h1>
                <p className="text-slate-500 mt-2">Upload medical imaging for AI-powered diagnostic insights.</p>
            </div>

            <AnimatePresence mode="wait">
                {!result ? (
                    <motion.div
                        key="upload"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-8"
                    >
                        {isDoctor && !patientReady && (
                            <PatientDetailsForm
                                value={patientDetails}
                                onChange={setPatientDetails}
                                onContinue={handlePatientContinue}
                                isSubmitting={isAnalyzing}
                            />
                        )}

                        {(isDoctor && !patientReady) ? null : (
                            <>
                        {/* Step 1: Type Selection */}
                        <div>
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <span className="bg-primary/10 text-primary w-6 h-6 rounded-full flex items-center justify-center text-xs">{isDoctor ? '2' : '1'}</span>
                                Select X-Ray Type
                            </h2>
                            <XRayTypeSelector selected={selectedType} onSelect={setSelectedType} />
                        </div>

                        {/* Step 2: Upload */}
                        <div>
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <span className="bg-primary/10 text-primary w-6 h-6 rounded-full flex items-center justify-center text-xs">{isDoctor ? '3' : '2'}</span>
                                Upload Image
                            </h2>

                            {!file ? (
                                <ImageUploader onUpload={handleFileSelect} />
                            ) : (
                                <div className="space-y-4">
                                    <div className="relative rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-w-xl mx-auto">
                                        <img src={preview!} alt="Preview" className="w-full h-auto max-h-[500px] object-contain" />
                                        <button
                                            onClick={resetAnalysis}
                                            className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                                        >
                                            <RefreshCw className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div className="flex justify-center gap-4">
                                        <Button
                                            variant="outline"
                                            onClick={resetAnalysis}
                                            disabled={isAnalyzing}
                                        >
                                            Change Image
                                        </Button>
                                        <Button
                                            size="lg"
                                            className="px-8 shadow-primary/25 shadow-lg"
                                            onClick={handleAnalyze}
                                            isLoading={isAnalyzing}
                                        >
                                            {isAnalyzing ? "Analyzing using AI Model..." : "Analyze X-Ray"}
                                        </Button>
                                    </div>

                                    {isAnalyzing && (
                                        <div className="text-center text-slate-500 text-sm mt-2 animate-pulse">
                                            Running DenseNet121 inference — this may take 30–60 seconds on first use while the model loads.
                                        </div>
                                    )}

                                    {error && (
                                        <div className="text-center text-red-500 text-sm mt-2 font-medium">
                                            {error}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                            </>
                        )}

                        {error && !file && (
                            <div className="text-center text-red-500 text-sm mt-2 font-medium">
                                {error}
                            </div>
                        )}
                    </motion.div>
                ) : (
                    <motion.div
                        key="results"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-6"
                    >
                        <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm sticky top-20 z-10 opacity-95 backdrop-blur">
                            <Button variant="ghost" size="sm" onClick={resetAnalysis} className="gap-2">
                                <ArrowLeft className="w-4 h-4" /> Analyze Another
                            </Button>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={downloadReport}
                                    className="text-sm text-primary hover:text-primary/80 font-medium inline-flex items-center gap-1"
                                >
                                    <Download className="w-4 h-4" /> Download Report
                                </button>
                                <div className="text-sm font-medium text-slate-500">
                                    Analyzed: {file?.name} ({selectedType.toUpperCase()})
                                </div>
                            </div>
                        </div>

                        {isDoctor && (
                            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-4">
                                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Patient Details</div>
                                <div className="text-sm font-semibold text-slate-900 dark:text-white mt-1">
                                    {patientDetails.first_name} {patientDetails.last_name}
                                </div>
                                <div className="text-xs text-slate-500 mt-1">
                                    {patientDetails.date_of_birth ? `DOB: ${patientDetails.date_of_birth}` : 'DOB: N/A'}
                                    {' | '}
                                    {patientDetails.gender ? `Gender: ${patientDetails.gender}` : 'Gender: N/A'}
                                </div>
                                {patientDetails.contact_number && (
                                    <div className="text-xs text-slate-500">Contact: {patientDetails.contact_number}</div>
                                )}
                            </div>
                        )}

                        <AnalysisResults result={result} imagePreview={preview!} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default XRayAnalysis;

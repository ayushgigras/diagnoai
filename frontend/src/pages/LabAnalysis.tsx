import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { analyzeLabManual, uploadLabFile, analyzeLabFile } from '../services/labService';
import type { LabResult, OCRResult } from '../types';

import TestTypeSelector from '../components/lab/TestTypeSelector';
import InputMethodSelector from '../components/lab/InputMethodSelector';
import ManualInputForm from '../components/lab/ManualInputForm';
import FileUploader from '../components/lab/FileUploader';
import ExtractedDataPreview from '../components/lab/ExtractedDataPreview';
import LabResults from '../components/lab/LabResults';
import Button from '../components/common/Button';
import { ArrowLeft } from 'lucide-react';

const LabAnalysis = () => {
    const [step, setStep] = useState(1); // 1: Type/Input, 2: Review (OCR), 3: Results
    const [selectedType, setSelectedType] = useState('cbc');
    const [inputMethod, setInputMethod] = useState<'manual' | 'upload'>('manual');

    const [file, setFile] = useState<File | null>(null);
    const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
    const [analysisResult, setAnalysisResult] = useState<LabResult | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Handlers
    const handleTypeSelect = (type: string) => {
        setSelectedType(type);
        setError(null);
    };

    const handleManualSubmit = async (values: Record<string, number>) => {
        setIsProcessing(true);
        setError(null);
        try {
            const result = await analyzeLabManual(selectedType, values);
            setAnalysisResult(result);
            setStep(3);
        } catch (err) {
            console.error(err);
            setError("Analysis failed. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleFileUpload = async (uploadedFile: File) => {
        setFile(uploadedFile);
        setIsProcessing(true);
        setError(null);
        try {
            const result = await uploadLabFile(uploadedFile, selectedType);
            setOcrResult(result);
            setStep(2); // Go to review step
        } catch (err) {
            console.error(err);
            setError("File processing failed. Please try again.");
            setFile(null);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReviewConfirm = async (values: Record<string, number>) => {
        // User confirmed extracted values (or edited them). Now analyze.
        handleManualSubmit(values);
    };

    const resetAnalysis = () => {
        setStep(1);
        setFile(null);
        setOcrResult(null);
        setAnalysisResult(null);
        setError(null);
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Lab Report Analysis</h1>
                <p className="text-slate-500 mt-2">Analyze blood work and lab tests using AI interpretation.</p>
            </div>

            <AnimatePresence mode="wait">
                {step === 1 && (
                    <motion.div
                        key="step1"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-8"
                    >
                        {/* Type Selection */}
                        <div>
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <span className="bg-secondary/10 text-secondary w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
                                Select Test Type
                            </h2>
                            <TestTypeSelector selected={selectedType} onSelect={handleTypeSelect} />
                        </div>

                        {/* Input Method */}
                        <div>
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <span className="bg-secondary/10 text-secondary w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
                                Choose Input Method
                            </h2>
                            <InputMethodSelector method={inputMethod} onChange={setInputMethod} />

                            <div className="mt-8 max-w-2xl mx-auto">
                                {inputMethod === 'manual' ? (
                                    <ManualInputForm
                                        testType={selectedType}
                                        onSubmit={handleManualSubmit}
                                        isLoading={isProcessing}
                                    />
                                ) : (
                                    <FileUploader onUpload={handleFileUpload} />
                                )}

                                {isProcessing && inputMethod === 'upload' && (
                                    <div className="text-center mt-4 text-slate-500 animate-pulse">
                                        Processing document... extraction may take a moment.
                                    </div>
                                )}
                                {error && (
                                    <div className="text-center text-red-500 mt-4">{error}</div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}

                {step === 2 && ocrResult && (
                    <motion.div
                        key="step2"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                    >
                        <div className="mb-6 flex items-center gap-4">
                            <Button variant="ghost" onClick={resetAnalysis}>
                                <ArrowLeft className="w-4 h-4 mr-2" /> Back
                            </Button>
                            <h2 className="text-xl font-semibold">Review Extracted Data</h2>
                        </div>

                        <ExtractedDataPreview
                            ocrResult={ocrResult}
                            testType={selectedType}
                            originalFile={file}
                            onConfirm={handleReviewConfirm}
                            onRetake={resetAnalysis}
                            isLoading={isProcessing}
                        />
                    </motion.div>
                )}

                {step === 3 && analysisResult && (
                    <motion.div
                        key="step3"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                    >
                        <div className="mb-6 flex items-center justify-between">
                            <Button variant="ghost" onClick={resetAnalysis}>
                                <ArrowLeft className="w-4 h-4 mr-2" /> Analyze Another Report
                            </Button>
                            <button onClick={() => window.print()} className="text-sm text-primary hover:underline">
                                Print Report
                            </button>
                        </div>

                        <LabResults result={analysisResult} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default LabAnalysis;

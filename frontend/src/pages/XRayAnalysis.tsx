import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { analyzeXRay } from '../services/xrayService';
import type { XRayResult } from '../types';

import XRayTypeSelector from '../components/xray/XRayTypeSelector';
import ImageUploader from '../components/xray/ImageUploader';
import AnalysisResults from '../components/xray/AnalysisResults';
import Button from '../components/common/Button';
import { RefreshCw, ArrowLeft } from 'lucide-react';

const XRayAnalysis = () => {
    const [selectedType, setSelectedType] = useState('chest');
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState<XRayResult | null>(null);
    const [error, setError] = useState<string | null>(null);

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
            const data = await analyzeXRay(file, selectedType);
            setResult(data);
        } catch (err) {
            setError("Analysis failed. Please try again.");
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
                        {/* Step 1: Type Selection */}
                        <div>
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <span className="bg-primary/10 text-primary w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
                                Select X-Ray Type
                            </h2>
                            <XRayTypeSelector selected={selectedType} onSelect={setSelectedType} />
                        </div>

                        {/* Step 2: Upload */}
                        <div>
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <span className="bg-primary/10 text-primary w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
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

                                    {error && (
                                        <div className="text-center text-red-500 text-sm mt-2 font-medium animate-pulse">
                                            {error}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
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
                            <div className="text-sm font-medium text-slate-500">
                                Analyzed: {file?.name} ({selectedType.toUpperCase()})
                            </div>
                        </div>

                        <AnalysisResults result={result} imagePreview={preview!} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default XRayAnalysis;

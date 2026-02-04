import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';
import ManualInputForm from './ManualInputForm';
import type { OCRResult } from '../../types';

import { FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils';
import Button from '../common/Button';

interface ExtractedDataPreviewProps {
    ocrResult: OCRResult;
    testType: string;
    originalFile?: File | null;
    onConfirm: (values: Record<string, number>) => void;
    onRetake: () => void;
    isLoading?: boolean;
}

const ExtractedDataPreview = ({ ocrResult, testType, originalFile, onConfirm, onRetake, isLoading }: ExtractedDataPreviewProps) => {
    const fileUrl = originalFile ? URL.createObjectURL(originalFile) : null;
    const isPdf = originalFile?.type === 'application/pdf';

    return (
        <div className="grid lg:grid-cols-2 gap-8 animate-in slide-in-from-bottom-5 fade-in duration-500">

            {/* Left: Original Document Preview */}
            <div className="space-y-4">
                <Card className="h-[600px] flex flex-col">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <FileText className="w-5 h-5" />
                            Original Document
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-hidden bg-slate-100 dark:bg-slate-900 rounded-b-xl relative p-0">
                        {fileUrl ? (
                            isPdf ? (
                                <iframe src={fileUrl} className="w-full h-full border-none" title="PDF Preview" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center overflow-auto p-4">
                                    <img src={fileUrl} alt="Report" className="max-w-full max-h-full object-contain shadow-sm" />
                                </div>
                            )
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-400">
                                No preview available
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="flex justify-between items-center text-sm text-slate-500 px-2">
                    <span>OCR Confidence: {(ocrResult.confidence * 100).toFixed(0)}%</span>
                    <Button variant="ghost" size="sm" onClick={onRetake}>
                        Upload Different File
                    </Button>
                </div>
            </div>

            {/* Right: Extracted Data Form */}
            <div className="space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            {ocrResult.confidence > 0.8 ? (
                                <CheckCircle className="w-5 h-5 text-green-500" />
                            ) : (
                                <AlertTriangle className="w-5 h-5 text-amber-500" />
                            )}
                            Review Extracted Data
                        </CardTitle>
                        <p className="text-sm text-slate-500">
                            Please review and correct any values before analysis.
                        </p>
                    </CardHeader>
                    <CardContent>
                        <ManualInputForm
                            testType={testType}
                            onSubmit={onConfirm}
                            isLoading={isLoading}
                            initialValues={ocrResult.extracted_data}
                        />
                    </CardContent>
                </Card>

                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-900/50">
                    <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">OCR Text Snippet</h4>
                    <p className="text-xs text-blue-700 dark:text-blue-300 font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
                        {ocrResult.ocr_text.slice(0, 300)}...
                    </p>
                </div>
            </div>

        </div>
    );
};

export default ExtractedDataPreview;

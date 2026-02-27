import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';
import type { OCRResult } from '../../types';

import { FileText, CheckCircle, AlertTriangle, Edit2 } from 'lucide-react';
import Button from '../common/Button';

interface ExtractedDataPreviewProps {
    ocrResult: OCRResult;
    originalFile?: File | null;
    onConfirm: (values: Record<string, string | number>[]) => void;
    onRetake: () => void;
    isLoading?: boolean;
}

const ExtractedDataPreview = ({ ocrResult, originalFile, onConfirm, onRetake, isLoading }: ExtractedDataPreviewProps) => {
    const fileUrl = originalFile ? URL.createObjectURL(originalFile) : null;
    const isPdf = originalFile?.type === 'application/pdf';

    const [rows, setRows] = useState<Record<string, string | number>[]>([]);

    useEffect(() => {
        if (ocrResult?.extracted_data && Array.isArray(ocrResult.extracted_data)) {
            setRows(ocrResult.extracted_data);
        }
    }, [ocrResult]);

    const handleValueChange = (index: number, newValue: string) => {
        setRows(prev => {
            const newRows = [...prev];
            newRows[index] = {
                ...newRows[index],
                result_value: newValue === '' ? 0 : parseFloat(newValue)
            };
            return newRows;
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm(rows);
    };

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
                    <span>AI Confidence: {(ocrResult.confidence * 100).toFixed(0)}%</span>
                    <Button variant="ghost" size="sm" onClick={onRetake}>
                        Upload Different File
                    </Button>
                </div>
            </div>

            {/* Right: Extracted Data Table Form */}
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
                            Please review the dynamically extracted parameters below. You can correct any misread values.
                        </p>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {rows.length === 0 ? (
                                <p className="text-slate-500 italic text-sm">No parameters were automatically extracted. Please try another image.</p>
                            ) : (
                                <div className="max-h-[350px] overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-800 dark:text-slate-400 sticky top-0 shadow-sm">
                                            <tr>
                                                <th className="px-4 py-3">Parameter</th>
                                                <th className="px-4 py-3 w-32">Result</th>
                                                <th className="px-4 py-3">Unit</th>
                                                <th className="px-4 py-3 min-w-[120px]">Reference</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rows.map((row, index) => (
                                                <tr key={index} className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                                                        {row.parameter_name}
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <div className="relative">
                                                            <input
                                                                type="number"
                                                                step="any"
                                                                value={row.result_value}
                                                                onChange={(e) => handleValueChange(index, e.target.value)}
                                                                className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm z-10 relative pr-7"
                                                                required
                                                            />
                                                            <Edit2 className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 z-20 pointer-events-none" />
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-500">
                                                        {row.unit}
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-500">
                                                        {row.reference_range}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="w-full mt-4"
                                isLoading={isLoading}
                                disabled={rows.length === 0}
                            >
                                Confirm & Analyze All Parameters
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-900/50">
                    <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">Extraction Summary</h4>
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                        {ocrResult.ocr_text}
                    </p>
                </div>
            </div>

        </div>
    );
};

export default ExtractedDataPreview;

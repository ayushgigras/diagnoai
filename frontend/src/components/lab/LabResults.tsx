import React from 'react';
import type { LabResult, LabParameter } from '../../types';

import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';
import { CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion } from 'framer-motion';

interface LabResultsProps {
    result: LabResult;
}

const ParameterRow = ({ param }: { param: LabParameter }) => {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'normal': return 'bg-green-500';
            case 'abnormal': return 'bg-red-500';
            case 'critical': return 'bg-red-700';
            default: return 'bg-slate-500';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'normal': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
            case 'abnormal': return <AlertCircle className="w-4 h-4 text-red-500" />;
            default: return <HelpCircle className="w-4 h-4 text-slate-500" />;
        }
    };

    return (
        <div className="py-4 border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors px-4 -mx-4">
            <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                    {getStatusIcon(param.status)}
                    <span className="font-medium text-slate-900 dark:text-white uppercase text-sm">{param.name}</span>
                </div>
                <div className="text-right">
                    <span className="text-lg font-bold text-slate-900 dark:text-white">{param.value}</span>
                    <span className="text-xs text-slate-500 ml-1">{param.unit || ''}</span>
                </div>
            </div>

            {/* Visual Bar */}
            <div className="relative h-2 bg-slate-100 dark:bg-slate-800 rounded-full w-full mt-2">
                {/* Reference Range Indicator (Approximate middle 50% usually normal) */}
                <div
                    className="absolute top-0 bottom-0 left-[25%] right-[25%] bg-green-500/10 dark:bg-green-500/20 rounded-sm"
                    title={`Reference: ${param.reference_range}`}
                />

                {/* Value Marker */}
                <div
                    className={cn("absolute top-0 bottom-0 w-2 rounded-full transition-all duration-700", getStatusColor(param.status))}
                    style={{ left: `${Math.min(100, Math.max(0, param.percentage))}%`, transform: 'translateX(-50%)' }}
                />
            </div>

            <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>Low</span>
                <span>Normal: {param.reference_range}</span>
                <span>High</span>
            </div>
        </div>
    );
};

const LabResults = ({ result }: LabResultsProps) => {
    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-5 fade-in duration-500">

            {/* Overall Assessment */}
            <Card className={cn(
                "border-l-4",
                result.assessment === 'Normal' ? "border-l-green-500" : "border-l-amber-500"
            )}>
                <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                Overall Status:
                                <span className={result.assessment === 'Normal' ? "text-green-600" : "text-amber-600"}>
                                    {result.assessment}
                                </span>
                            </h3>
                            <p className="text-slate-500 text-sm mt-1">
                                Confidence: {(result.confidence * 100).toFixed(1)}% based on analyzed parameters.
                            </p>
                        </div>
                        <div className="bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded text-xs font-mono">
                            AI Analysis
                        </div>
                    </div>

                    {result.interpretation && (
                        <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg text-sm text-slate-700 dark:text-slate-300 italic border border-slate-100 dark:border-slate-800">
                            "{result.interpretation}"
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Parameter Details */}
                <div className="lg:col-span-2 space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Detailed Parameter Analysis</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {result.parameters.map((param, idx) => (
                                <ParameterRow key={idx} param={param} />
                            ))}
                        </CardContent>
                    </Card>
                </div>

                {/* Recommendations */}
                <div>
                    <Card className="sticky top-24">
                        <CardHeader>
                            <CardTitle className="text-lg">Recommendations</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-4">
                                {result.recommendations?.map((rec, idx) => (
                                    <li key={idx} className="flex gap-3 text-sm text-slate-600 dark:text-slate-300">
                                        <CheckCircle2 className="w-5 h-5 text-secondary shrink-0" />
                                        {rec}
                                    </li>
                                ))}
                                {!result.recommendations?.length && (
                                    <li className="text-slate-500 italic">No specific recommendations available.</li>
                                )}
                            </ul>

                            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                                <p className="text-xs text-slate-400">
                                    Disclaimer: This AI analysis is for informational purposes only and does not replace professional medical advice.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default LabResults;

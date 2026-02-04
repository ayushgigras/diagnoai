import React from 'react';
import type { XRayResult } from '../../types';

import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';
import { AlertCircle, FileText, CheckCircle2 } from 'lucide-react';

interface AnalysisResultsProps {
    result: XRayResult;
    imagePreview: string; // URL for the original image
}

const AnalysisResults = ({ result, imagePreview }: AnalysisResultsProps) => {
    // Sort probabilities for display
    const sortedProbs = Object.entries(result.probabilities)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 4); // Top 4

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-5 fade-in duration-500">

            <div className="grid md:grid-cols-2 gap-6">
                {/* Images */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Original Image</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="aspect-square bg-slate-950 rounded-lg overflow-hidden flex items-center justify-center">
                            <img src={imagePreview} alt="Original X-Ray" className="max-h-full max-w-full object-contain" />
                        </div>
                    </CardContent>
                </Card>

                {/* Heatmap (Mocked visual or if backend sends it) */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Heatmap Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="aspect-square bg-slate-950 rounded-lg overflow-hidden flex items-center justify-center relative">
                            <img src={imagePreview} alt="Heatmap Base" className="max-h-full max-w-full object-contain opacity-50" />
                            {/* Overlay mock heatmap gradient if actual heatmap missing */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-red-500/20 to-yellow-500/20 mix-blend-overlay pointer-events-none" />
                            <div className="absolute bottom-4 right-4 bg-black/60 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
                                AI Attention Map
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Diagnosis & Stats */}
            <div className="grid md:grid-cols-3 gap-6">
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary" />
                            Diagnosis Report
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div>
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-sm font-medium text-slate-500">Primary Diagnosis</span>
                                <span className="text-2xl font-bold text-slate-900 dark:text-white">{result.prediction}</span>
                            </div>
                            <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary transition-all duration-1000"
                                    style={{ width: `${result.confidence * 100}%` }}
                                />
                            </div>
                            <div className="mt-1 text-right text-sm text-slate-500">
                                Confidence: {(result.confidence * 100).toFixed(1)}%
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h4 className="font-medium text-slate-900 dark:text-white">Probability Distribution</h4>
                            {sortedProbs.map(([condition, prob]) => (
                                <div key={condition} className="flex items-center gap-4 text-sm">
                                    <span className="w-24 truncate text-slate-600 dark:text-slate-400 capitalize">{condition}</span>
                                    <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-slate-400 dark:bg-slate-600"
                                            style={{ width: `${prob * 100}%` }}
                                        />
                                    </div>
                                    <span className="w-12 text-right text-slate-500">{(prob * 100).toFixed(1)}%</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-amber-500" />
                            Explanation
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                            {result.explanation || "The model analyzes textures and patterns in the X-Ray image to identify anomalies."}
                        </p>

                        {result.key_findings && (
                            <div className="mt-4">
                                <h5 className="font-medium text-sm mb-2">Key Findings:</h5>
                                <ul className="space-y-1">
                                    {result.key_findings.map((finding, idx) => (
                                        <li key={idx} className="text-xs text-slate-500 flex gap-2">
                                            <CheckCircle2 className="w-3 h-3 text-secondary shrink-0 mt-0.5" />
                                            {finding}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

        </div>
    );
};

export default AnalysisResults;

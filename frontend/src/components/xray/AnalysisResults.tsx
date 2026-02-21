import React, { useState } from 'react';
import type { XRayResult, XAIDetail } from '../../types';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';
import {
    AlertCircle, FileText, Activity, MapPin,
    Brain, Microscope, Stethoscope, ChevronDown, ChevronUp,
    Info, AlertTriangle, CheckCircle2, Zap
} from 'lucide-react';

interface AnalysisResultsProps {
    result: XRayResult;
    imagePreview: string;
}

const SEVERITY_CONFIG = {
    normal: { label: 'Normal', color: 'text-emerald-500', bg: 'bg-emerald-500/10', bar: 'bg-emerald-500', border: 'border-emerald-500/30' },
    low: { label: 'Low', color: 'text-blue-400', bg: 'bg-blue-400/10', bar: 'bg-blue-400', border: 'border-blue-400/30' },
    moderate: { label: 'Moderate', color: 'text-amber-400', bg: 'bg-amber-400/10', bar: 'bg-amber-400', border: 'border-amber-400/30' },
    high: { label: 'High', color: 'text-orange-500', bg: 'bg-orange-500/10', bar: 'bg-orange-500', border: 'border-orange-500/30' },
    critical: { label: 'Critical', color: 'text-red-500', bg: 'bg-red-500/10', bar: 'bg-red-500', border: 'border-red-500/30' },
};

function SeverityBadge({ severity }: { severity: string }) {
    const cfg = SEVERITY_CONFIG[severity as keyof typeof SEVERITY_CONFIG] ?? SEVERITY_CONFIG.moderate;
    return (
        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.color} ${cfg.bg} border ${cfg.border}`}>
            {severity === 'critical' && <AlertTriangle className="w-3 h-3" />}
            {severity === 'normal' && <CheckCircle2 className="w-3 h-3" />}
            {cfg.label}
        </span>
    );
}

function XAICard({ condition, detail }: { condition: string; detail: XAIDetail }) {
    const [expanded, setExpanded] = useState(false);
    const cfg = SEVERITY_CONFIG[detail.severity] ?? SEVERITY_CONFIG.moderate;

    return (
        <div className={`rounded-xl border ${cfg.border} ${cfg.bg} overflow-hidden`}>
            <button
                className="w-full flex items-center justify-between p-4 text-left"
                onClick={() => setExpanded(e => !e)}
            >
                <div className="flex items-center gap-3">
                    <Brain className={`w-5 h-5 ${cfg.color} shrink-0`} />
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 dark:text-white">{condition}</span>
                            <SeverityBadge severity={detail.severity} />
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                            {detail.confidence_pct.toFixed(1)}% confidence · {detail.region}
                        </div>
                    </div>
                </div>
                <div className="shrink-0 ml-2">
                    {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
            </button>

            {expanded && (
                <div className="px-4 pb-4 space-y-3 border-t border-slate-200/20 pt-3">
                    {/* Radiological Finding */}
                    <div className="flex gap-3">
                        <Microscope className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                        <div>
                            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Radiological Finding</div>
                            <p className="text-sm text-slate-700 dark:text-slate-300">{detail.radiological_finding}</p>
                        </div>
                    </div>

                    {/* Visual Evidence (Grad-CAM explanation) */}
                    <div className="flex gap-3">
                        <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Why This Result? (Visual Evidence)</div>
                            <p className="text-sm text-slate-700 dark:text-slate-300">{detail.visual_evidence}</p>
                        </div>
                    </div>

                    {/* Visual Pattern */}
                    <div className="flex gap-3">
                        <Activity className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                        <div>
                            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Visual Pattern</div>
                            <p className="text-sm text-slate-700 dark:text-slate-300">{detail.visual_pattern}</p>
                        </div>
                    </div>

                    {/* Clinical Context */}
                    <div className="flex gap-3">
                        <Stethoscope className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Clinical Context</div>
                            <p className="text-sm text-slate-700 dark:text-slate-300">{detail.clinical_context}</p>
                        </div>
                    </div>

                    {/* Recommendation */}
                    <div className={`rounded-lg p-3 ${cfg.bg} border ${cfg.border}`}>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{detail.recommendation}</p>
                    </div>
                </div>
            )}
        </div>
    );
}

const AnalysisResults = ({ result, imagePreview }: AnalysisResultsProps) => {
    const heatmapSrc = result.heatmap_b64
        ? `data:image/png;base64,${result.heatmap_b64}`
        : result.heatmap_base64
            ? `data:image/png;base64,${result.heatmap_base64}`
            : null;

    const primarySeverity = result.findings?.[0]?.severity ?? 'moderate';
    const cfg = SEVERITY_CONFIG[primarySeverity] ?? SEVERITY_CONFIG.moderate;
    const isNormal = result.prediction === 'Normal';

    const xaiEntries = result.xai_details ? Object.entries(result.xai_details) : [];
    const findingsList = result.findings ?? [];

    // Top 8 pathology probabilities for the distribution chart
    const sortedProbs = Object.entries(result.probabilities ?? {})
        .sort(([, a], [, b]) => b - a)
        .slice(0, 8);

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-5 fade-in duration-500">

            {/* ── Top Summary Banner ─────────────────────────────────────── */}
            <div className={`rounded-2xl p-5 border ${cfg.border} ${cfg.bg} flex flex-wrap items-center gap-4`}>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        {isNormal
                            ? <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                            : <AlertCircle className={`w-6 h-6 ${cfg.color}`} />
                        }
                        <h2 className={`text-2xl font-bold ${cfg.color}`}>{result.prediction}</h2>
                        <SeverityBadge severity={primarySeverity} />
                    </div>
                    <p className="text-sm text-slate-500">
                        Confidence: <strong>{(result.confidence * 100).toFixed(1)}%</strong>
                        {result.region && (
                            <> · <MapPin className="inline w-3 h-3 mx-1" />{result.region}</>
                        )}
                    </p>
                    {result.model_info && (
                        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                            <Info className="w-3 h-3" />
                            {result.model_info.name} · {result.model_info.xai_method}
                        </p>
                    )}
                </div>
            </div>

            {/* ── Images Row: Original + Grad-CAM Spectrum Heatmap ──────── */}
            <div className="grid md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <FileText className="w-4 h-4" /> Original X-Ray
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="aspect-square bg-slate-950 rounded-lg overflow-hidden flex items-center justify-center">
                            <img src={imagePreview} alt="Original X-Ray" className="max-h-full max-w-full object-contain" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Activity className="w-4 h-4 text-red-400" />
                            Grad-CAM Spectrum Heatmap
                            <span className="ml-auto text-xs font-normal text-slate-400">Blue → Red = Low → High Activation</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="aspect-square bg-slate-950 rounded-lg overflow-hidden flex items-center justify-center relative">
                            {heatmapSrc ? (
                                <img src={heatmapSrc} alt="Grad-CAM Heatmap" className="max-h-full max-w-full object-contain" />
                            ) : (
                                <>
                                    <img src={imagePreview} alt="Heatmap Base" className="max-h-full max-w-full object-contain opacity-50" />
                                    <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 via-green-500/20 via-yellow-500/20 to-red-500/30 mix-blend-overlay pointer-events-none" />
                                    <div className="absolute bottom-4 right-4 bg-black/60 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
                                        Generating…
                                    </div>
                                </>
                            )}
                            {result.region && (
                                <div className="absolute top-3 left-3 bg-black/70 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm flex items-center gap-1">
                                    <MapPin className="w-3 h-3 text-red-400" /> {result.region}
                                </div>
                            )}
                        </div>
                        {/* Spectrum Legend */}
                        <div className="mt-2 flex items-center gap-2">
                            <span className="text-xs text-slate-400">Low</span>
                            <div className="flex-1 h-2 rounded-full" style={{ background: 'linear-gradient(to right, #00008B, #0000FF, #00FFFF, #00FF00, #FFFF00, #FF8000, #FF0000)' }} />
                            <span className="text-xs text-slate-400">High</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ── Findings Table ──────────────────────────────────────────── */}
            {findingsList.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Microscope className="w-5 h-5 text-primary" />
                            All Detected Findings
                            <span className="ml-auto text-xs font-normal text-slate-400">
                                {findingsList.filter(f => f.condition !== 'Normal').length} patholog{findingsList.filter(f => f.condition !== 'Normal').length === 1 ? 'y' : 'ies'} detected
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {findingsList.map(({ condition, score, severity }) => {
                                const scfg = SEVERITY_CONFIG[severity] ?? SEVERITY_CONFIG.moderate;
                                return (
                                    <div key={condition} className="flex items-center gap-3 text-sm">
                                        <span className={`w-28 text-xs font-medium shrink-0 ${scfg.color}`}>{condition}</span>
                                        <div className="flex-1 h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${scfg.bar} rounded-full transition-all duration-700`}
                                                style={{ width: `${Math.min(score * 100, 100)}%` }}
                                            />
                                        </div>
                                        <span className="w-12 text-right text-slate-500 text-xs shrink-0">{(score * 100).toFixed(1)}%</span>
                                        <SeverityBadge severity={severity} />
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ── XAI Explanation Cards ──────────────────────────────────── */}
            {xaiEntries.length > 0 && (
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <Brain className="w-5 h-5 text-violet-500" />
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                            Explainability — Why This Result?
                        </h3>
                        <span className="ml-2 text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                            Grad-CAM + Clinical Knowledge Base
                        </span>
                    </div>
                    <p className="text-sm text-slate-500 mb-4">
                        Each card below explains what visual pattern the AI detected, where it focused (from the heatmap), and the clinical interpretation. Click any card to expand it.
                    </p>
                    <div className="space-y-3">
                        {xaiEntries.map(([condition, detail]) => (
                            <XAICard key={condition} condition={condition} detail={detail} />
                        ))}
                    </div>
                </div>
            )}

            {/* ── Full Probability Distribution ─────────────────────────── */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Activity className="w-4 h-4" /> Probability Distribution (All 18 Pathologies)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2">
                        {sortedProbs.map(([condition, prob]) => (
                            <div key={condition} className="flex items-center gap-2 text-xs">
                                <span className="w-36 truncate text-slate-600 dark:text-slate-400">{condition}</span>
                                <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary/70 rounded-full"
                                        style={{ width: `${prob * 100}%` }}
                                    />
                                </div>
                                <span className="w-10 text-right text-slate-400">{(prob * 100).toFixed(1)}%</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* ── Model Info Footer ─────────────────────────────────────── */}
            {result.model_info && (
                <div className="rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 text-xs text-slate-400 space-y-1">
                    <div className="font-semibold text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                        <Info className="w-3.5 h-3.5" /> Model & XAI Information
                    </div>
                    <div>🧠 <strong>Model:</strong> {result.model_info.name}</div>
                    <div>📂 <strong>Training Data:</strong> {result.model_info.trained_on}</div>
                    <div>🔬 <strong>Pathologies:</strong> {result.model_info.pathologies_count} conditions</div>
                    <div>🎯 <strong>XAI Method:</strong> {result.model_info.xai_method}</div>
                    <div className="pt-1 text-slate-500 italic">
                        ⚠ This tool is for educational/research use only. Not a substitute for professional radiological review.
                    </div>
                </div>
            )}

        </div>
    );
};

export default AnalysisResults;

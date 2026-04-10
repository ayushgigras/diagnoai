import { useState, useEffect } from 'react';
import type { XRayResult, XAIDetail } from '../../types';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';
import {
    AlertCircle, FileText, Activity, MapPin,
    Brain, Microscope, Stethoscope, ChevronDown, ChevronUp,
    Info, AlertTriangle, CheckCircle2, Zap, Shield, Target, TrendingUp
} from 'lucide-react';
import FeedbackForm from '../common/FeedbackForm';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import useChatStore from '../../store/useChatStore';

interface AnalysisResultsProps {
    result: XRayResult;
    imagePreview: string;
}

const SEVERITY_CONFIG = {
    normal: { label: 'Normal', color: 'text-emerald-500', bg: 'bg-emerald-500/10', bar: 'bg-emerald-500', border: 'border-emerald-500/30', glow: 'shadow-emerald-500/20', hex: '#10b981' },
    low: { label: 'Low', color: 'text-blue-400', bg: 'bg-blue-400/10', bar: 'bg-blue-400', border: 'border-blue-400/30', glow: 'shadow-blue-400/20', hex: '#60a5fa' },
    moderate: { label: 'Moderate', color: 'text-amber-400', bg: 'bg-amber-400/10', bar: 'bg-amber-400', border: 'border-amber-400/30', glow: 'shadow-amber-400/20', hex: '#fbbf24' },
    high: { label: 'High', color: 'text-orange-500', bg: 'bg-orange-500/10', bar: 'bg-orange-500', border: 'border-orange-500/30', glow: 'shadow-orange-500/20', hex: '#f97316' },
    critical: { label: 'Critical', color: 'text-red-500', bg: 'bg-red-500/10', bar: 'bg-red-500', border: 'border-red-500/30', glow: 'shadow-red-500/20', hex: '#ef4444' },
};

/* ─── Severity Badge ──────────────────────────────────────────────────── */
function SeverityBadge({ severity }: { severity: string }) {
    const cfg = SEVERITY_CONFIG[severity as keyof typeof SEVERITY_CONFIG] ?? SEVERITY_CONFIG.moderate;
    return (
        <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${cfg.color} ${cfg.bg} border ${cfg.border} uppercase tracking-wider`}>
            {severity === 'critical' && <AlertTriangle className="w-3 h-3" />}
            {severity === 'normal' && <CheckCircle2 className="w-3 h-3" />}
            {cfg.label}
        </span>
    );
}

/* ─── Confidence Ring (SVG donut) ─────────────────────────────────────── */
function ConfidenceRing({ value, color }: { value: number; color: string }) {
    const pct = Math.round(value * 100);
    const r = 40;
    const circ = 2 * Math.PI * r;
    const offset = circ - (circ * pct) / 100;

    return (
        <div className="relative w-24 h-24 shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor"
                    className="text-slate-200 dark:text-slate-800" strokeWidth="8" />
                <circle cx="50" cy="50" r={r} fill="none"
                    stroke="currentColor" className={color}
                    strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={circ} strokeDashoffset={offset}
                    style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-black text-slate-900 dark:text-white">{pct}%</span>
                <span className="text-[10px] text-slate-400 font-medium">confidence</span>
            </div>
        </div>
    );
}

/* ─── XAI Explanation Card ────────────────────────────────────────────── */
function XAICard({ condition, detail, defaultOpen = false }: {
    condition: string; detail: XAIDetail; defaultOpen?: boolean;
}) {
    const [expanded, setExpanded] = useState(defaultOpen);
    const cfg = SEVERITY_CONFIG[detail.severity] ?? SEVERITY_CONFIG.moderate;

    const sections = [
        { icon: Microscope, iconColor: 'text-violet-400', label: 'Radiological Finding', value: detail.radiological_finding },
        { icon: Zap, iconColor: 'text-amber-400', label: 'Why This Result? (Visual Evidence)', value: detail.visual_evidence },
        { icon: Activity, iconColor: 'text-sky-400', label: 'Visual Pattern', value: detail.visual_pattern },
        { icon: Stethoscope, iconColor: 'text-emerald-400', label: 'Clinical Context', value: detail.clinical_context },
    ];

    return (
        <div className={`rounded-xl border-l-4 ${cfg.border} bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow`}
            style={{ borderLeftColor: cfg.hex }}>
            <button
                className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                onClick={() => setExpanded(e => !e)}
            >
                <div className="flex items-center gap-4">
                    <div className={`w-9 h-9 rounded-full ${cfg.bg} flex items-center justify-center ${cfg.border} border shrink-0`}>
                        <Brain className={`w-4 h-4 ${cfg.color}`} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 dark:text-white text-base">{condition}</span>
                            <SeverityBadge severity={detail.severity} />
                        </div>
                        <div className="text-sm text-slate-500 mt-1 flex items-center gap-3">
                            <span className="flex items-center gap-1">
                                <Target className="w-3.5 h-3.5" />
                                {detail.confidence_pct.toFixed(1)}% confidence
                            </span>
                            <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" />
                                {detail.region}
                            </span>
                        </div>
                    </div>
                </div>
                <div className={`shrink-0 ml-3 w-8 h-8 rounded-full flex items-center justify-center ${expanded ? 'bg-primary/10' : 'bg-slate-100 dark:bg-slate-800'} transition-colors`}>
                    {expanded ? <ChevronUp className="w-4 h-4 text-primary" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
            </button>

            {expanded && (
                <div className="px-5 pb-5 space-y-4 border-t border-slate-100 dark:border-slate-800 pt-4">
                    {sections.map(({ icon: Icon, iconColor, label, value }, i) => (
                        <div key={label} className="flex gap-4">
                            <div className="flex flex-col items-center shrink-0">
                                <div className={`w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center`}>
                                    <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
                                </div>
                                {i < sections.length - 1 && (
                                    <div className="w-px flex-1 bg-slate-200 dark:bg-slate-700 mt-1" />
                                )}
                            </div>
                            <div className="pb-1">
                                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                    Step {i + 1} — {label}
                                </div>
                                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{value}</p>
                            </div>
                        </div>
                    ))}

                    {/* Recommendation callout */}
                    <div className={`rounded-lg p-4 ${cfg.bg} border ${cfg.border} flex gap-3 items-start`}>
                        <Shield className={`w-5 h-5 ${cfg.color} shrink-0 mt-0.5`} />
                        <div>
                            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Recommendation</div>
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed">{detail.recommendation}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ─── Main Component ──────────────────────────────────────────────────── */
const AnalysisResults = ({ result, imagePreview }: AnalysisResultsProps) => {
    const { setContext } = useChatStore();

    useEffect(() => {
        const xaiStr = result.xai_details ? Object.entries(result.xai_details).map(([k, v]) => 
            `- ${k} (${v.confidence_pct}% conf): ${v.radiological_finding} / Rec: ${v.recommendation}`
        ).join('\n') : "No detailed XAI found.";

        const contextStr = [
            `Current X-Ray Report Prediction: ${result.prediction} (${(result.confidence * 100).toFixed(1)}% confidence, region: ${result.region || "unspecified"})`,
            `Detected Findings:`,
            ...(result.findings || []).map(f => `- ${f.condition} (${(f.score * 100).toFixed(1)}%)`),
            `\nExplainability Details:`,
            xaiStr
        ].join('\n');
        
        setContext(contextStr);

        return () => {
            setContext(null); // Clear context when component unmounts
        };
    }, [result, setContext]);
    const heatmapSrc = (result.heatmap_b64 || result.heatmap_base64)
        ? `data:image/png;base64,${result.heatmap_b64 || result.heatmap_base64}`
        : null;

    const primarySeverity = result.findings?.[0]?.severity ?? 'moderate';
    const cfg = SEVERITY_CONFIG[primarySeverity] ?? SEVERITY_CONFIG.moderate;
    const isNormal = result.prediction === 'Normal';

    const xaiEntries = result.xai_details ? Object.entries(result.xai_details) : [];
    const findingsList = result.findings ?? [];
    const abnormalFindings = findingsList.filter(f => f.condition !== 'Normal');
    const highestSeverity = findingsList.reduce((max, f) => {
        const order = ['normal', 'low', 'moderate', 'high', 'critical'];
        return order.indexOf(f.severity) > order.indexOf(max) ? f.severity : max;
    }, 'normal' as string);

    // All pathology probabilities sorted
    const sortedProbs = Object.entries(result.probabilities ?? {})
        .sort(([, a], [, b]) => b - a);

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-5 fade-in duration-500">

            {/* ── Top Summary Banner ─────────────────────────────────────── */}
            <div className={`rounded-2xl p-6 border-2 ${cfg.border} ${cfg.bg} shadow-lg ${cfg.glow}`}>
                <div className="flex flex-wrap items-center gap-6">
                    <ConfidenceRing value={result.confidence} color={cfg.color} />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                            {isNormal
                                ? <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                                : <AlertCircle className={`w-7 h-7 ${cfg.color}`} />
                            }
                            <h2 className={`text-3xl font-black ${cfg.color}`}>{result.prediction}</h2>
                            <SeverityBadge severity={primarySeverity} />
                        </div>

                        {/* Quick summary sentence */}
                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                            {isNormal
                                ? 'No significant abnormalities detected in this X-ray image.'
                                : `${abnormalFindings.length} patholog${abnormalFindings.length === 1 ? 'y' : 'ies'} detected${highestSeverity !== 'normal' ? `, highest severity: ${SEVERITY_CONFIG[highestSeverity as keyof typeof SEVERITY_CONFIG]?.label}` : ''}.`
                            }
                            {result.region && (
                                <span className="inline-flex items-center gap-1 ml-2">
                                    <MapPin className="inline w-3.5 h-3.5" />
                                    Region: <strong>{result.region}</strong>
                                </span>
                            )}
                        </p>

                        {result.model_info && (
                            <p className="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
                                <Info className="w-3.5 h-3.5" />
                                {result.model_info.name} · {result.model_info.xai_method}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Quick Stats Row ────────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: 'Prediction', value: result.prediction, icon: Target, iconColor: 'text-primary' },
                    { label: 'Confidence', value: `${(result.confidence * 100).toFixed(1)}%`, icon: TrendingUp, iconColor: 'text-emerald-500' },
                    { label: 'Findings', value: `${abnormalFindings.length} detected`, icon: Microscope, iconColor: 'text-violet-500' },
                    { label: 'Severity', value: SEVERITY_CONFIG[highestSeverity as keyof typeof SEVERITY_CONFIG]?.label ?? 'N/A', icon: Shield, iconColor: cfg.color },
                ].map(({ label, value, icon: Icon, iconColor }) => (
                    <div key={label} className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 text-center shadow-sm">
                        <Icon className={`w-5 h-5 ${iconColor} mx-auto mb-2`} />
                        <div className="text-lg font-bold text-slate-900 dark:text-white">{value}</div>
                        <div className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">{label}</div>
                    </div>
                ))}
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
                            Grad-CAM Heatmap
                        </CardTitle>
                        <p className="text-xs text-slate-400 mt-1">Blue → Red = Low → High neural activation</p>
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
                                <div className="absolute top-3 left-3 bg-black/70 text-white text-xs px-2.5 py-1.5 rounded-full backdrop-blur-sm flex items-center gap-1.5 font-medium">
                                    <MapPin className="w-3 h-3 text-red-400" /> {result.region}
                                </div>
                            )}
                        </div>
                        {/* Spectrum Legend */}
                        <div className="mt-3 flex items-center gap-2">
                            <span className="text-xs text-slate-400 font-medium">Low</span>
                            <div className="flex-1 h-2.5 rounded-full" style={{ background: 'linear-gradient(to right, #00008B, #0000FF, #00FFFF, #00FF00, #FFFF00, #FF8000, #FF0000)' }} />
                            <span className="text-xs text-slate-400 font-medium">High</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ── Findings Section ─────────────────────────────────────────── */}
            {findingsList.length > 0 && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between flex-wrap gap-2">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Microscope className="w-5 h-5 text-primary" />
                                Detected Findings
                            </CardTitle>
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                    {findingsList.length} total
                                </span>
                                {abnormalFindings.length > 0 && (
                                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400">
                                        {abnormalFindings.length} abnormal
                                    </span>
                                )}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {findingsList.map(({ condition, score, severity }, idx) => {
                                const scfg = SEVERITY_CONFIG[severity] ?? SEVERITY_CONFIG.moderate;
                                const pct = Math.min(score * 100, 100);
                                return (
                                    <div key={condition}
                                        className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm p-3 rounded-lg transition-colors ${idx % 2 === 0 ? 'bg-slate-50 dark:bg-slate-900/50' : ''}`}>
                                        <div className="flex items-center gap-3 flex-1 sm:flex-none">
                                            <div className={`w-2 h-6 sm:h-8 rounded-full ${scfg.bar} shrink-0`} />
                                            <span className={`w-32 sm:w-40 font-semibold truncate ${scfg.color}`}>{condition}</span>
                                        </div>
                                        <div className="flex items-center gap-3 flex-1 w-full">
                                            <div className="flex-1 h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${scfg.bar} rounded-full transition-all duration-700`}
                                                style={{ width: `${pct}%` }}
                                            />
                                            </div>
                                            <span className="w-12 text-right font-mono text-slate-600 dark:text-slate-400 text-xs font-bold shrink-0">
                                                {pct.toFixed(1)}%
                                            </span>
                                        </div>
                                        <div className="shrink-0 sm:ml-auto">
                                            <SeverityBadge severity={severity} />
                                        </div>
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
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center">
                            <Brain className="w-5 h-5 text-violet-500" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                                AI Explainability
                            </h3>
                            <p className="text-xs text-slate-400">
                                Grad-CAM + Clinical Knowledge Base
                            </p>
                        </div>
                    </div>
                    <p className="text-sm text-slate-500 mb-5 pl-[52px]">
                        Each card explains what the AI detected, where it focused, and the clinical interpretation. Click to expand.
                    </p>
                    <div className="space-y-4">
                        {xaiEntries.map(([condition, detail], index) => (
                            <XAICard
                                key={condition}
                                condition={condition}
                                detail={detail}
                                defaultOpen={index === 0}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* ── Full Probability Distribution ─────────────────────────── */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Activity className="w-5 h-5" /> Probability Distribution
                    </CardTitle>
                    <p className="text-xs text-slate-400 mt-1">
                        Confidence scores for all {sortedProbs.length} pathologies analyzed
                    </p>
                </CardHeader>
                <CardContent className="grid lg:grid-cols-2 gap-6 items-center">
                    <div className="space-y-1">
                        {sortedProbs.map(([condition, prob], idx) => {
                            const pct = prob * 100;
                            const isPrimary = condition === result.prediction;
                            return (
                                <div key={condition}
                                    className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-sm px-3 py-2.5 rounded-lg transition-colors
                                        ${isPrimary ? 'bg-primary/5 border border-primary/20 font-semibold' : idx % 2 === 0 ? 'bg-slate-50 dark:bg-slate-900/30' : ''}`}>
                                    <span className={`w-full sm:w-44 truncate shrink-0 ${isPrimary ? 'text-primary font-bold' : 'text-slate-600 dark:text-slate-400'}`}>
                                        {condition}
                                        {isPrimary && <span className="ml-1.5 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">PRIMARY</span>}
                                    </span>
                                    <div className="flex items-center gap-3 w-full flex-1">
                                        <div className="flex-1 h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-700 ${isPrimary ? 'bg-primary' : 'bg-slate-400/50 dark:bg-slate-600'}`}
                                            style={{ width: `${Math.max(pct, 0.5)}%` }}
                                        />
                                        </div>
                                        <span className={`w-14 text-right font-mono text-xs shrink-0 ${isPrimary ? 'text-primary font-bold' : 'text-slate-400'}`}>
                                            {pct.toFixed(1)}%
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    
                    {/* Radar Chart Visualization */}
                    <div className="hidden lg:flex w-full h-[350px] justify-center items-center rounded-xl bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 p-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={sortedProbs.slice(0, 8).map(([name, val]) => ({ name: name.length > 12 ? name.substring(0, 10) + '...' : name, fullDataName: name, value: Math.round(val * 100) }))}>
                                <PolarGrid stroke="#e2e8f0" />
                                <PolarAngleAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 'bold' }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                <Radar 
                                    name="Confidence %" 
                                    dataKey="value" 
                                    stroke={cfg.hex} 
                                    fill={cfg.hex} 
                                    fillOpacity={0.4} 
                                    isAnimationActive={true}
                                />
                                <RechartsTooltip 
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    formatter={(value: number) => [`${value}%`, 'Confidence']}
                                    labelFormatter={(label, payload) => payload?.[0]?.payload?.fullDataName || label}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* ── Model Info Footer ─────────────────────────────────────── */}
            {result.model_info && (
                <div className="space-y-3">
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {[
                            { emoji: '🧠', label: 'Model', value: result.model_info.name },
                            { emoji: '📂', label: 'Training Data', value: result.model_info.trained_on },
                            { emoji: '🔬', label: 'Pathologies', value: `${result.model_info.pathologies_count} conditions` },
                            { emoji: '🎯', label: 'XAI Method', value: result.model_info.xai_method },
                        ].map(({ emoji, label, value }) => (
                            <div key={label} className="rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
                                <div className="text-lg mb-1">{emoji}</div>
                                <div className="text-[11px] text-slate-400 uppercase tracking-wider font-bold">{label}</div>
                                <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-0.5">{value}</div>
                            </div>
                        ))}
                    </div>

                    <div className="rounded-xl bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 p-4 flex gap-3 items-start">
                        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-sm text-amber-800 dark:text-amber-300">
                            <strong>Disclaimer:</strong> This tool is for educational and research use only. It is not a substitute for professional radiological review.
                        </p>
                    </div>
                </div>
            )}

            <FeedbackForm reportType="xray" />

        </div>
    );
};

export default AnalysisResults;

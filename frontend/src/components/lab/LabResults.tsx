import { useEffect } from 'react';
import type { LabResult, LabParameter } from '../../types';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';
import {
    CheckCircle2, AlertCircle, HelpCircle, Brain, Shield,
    AlertTriangle, Activity, Beaker, ArrowDown, ArrowUp, Minus
} from 'lucide-react';
import { cn } from '../../lib/utils';
import FeedbackForm from '../common/FeedbackForm';
import { calculateParameterStatus } from '../../utils/labUtils';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip } from 'recharts';
import useChatStore from '../../store/useChatStore';

interface LabResultsProps {
    result: LabResult;
}

/* ─── Status Helpers ──────────────────────────────────────────────────── */
const STATUS_CONFIG = {
    normal: { label: 'Normal', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', bar: 'bg-emerald-500', dot: 'bg-emerald-500' },
    abnormal: { label: 'Abnormal', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', bar: 'bg-amber-500', dot: 'bg-amber-500' },
    high: { label: 'High', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', bar: 'bg-amber-500', dot: 'bg-amber-500' },
    low: { label: 'Low', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', bar: 'bg-amber-500', dot: 'bg-amber-500' },
    critical: { label: 'Critical', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', bar: 'bg-red-500', dot: 'bg-red-500' },
    unknown: { label: 'Unknown', color: 'text-slate-500', bg: 'bg-slate-500/10', border: 'border-slate-500/30', bar: 'bg-slate-500', dot: 'bg-slate-500' },
};

function StatusBadge({ status }: { status: string }) {
    const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.unknown;
    return (
        <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full ${cfg.color} ${cfg.bg} border ${cfg.border} uppercase tracking-wider`}>
            {status === 'normal' && <CheckCircle2 className="w-3 h-3" />}
            {(status === 'high' || status === 'low') && <AlertCircle className="w-3 h-3" />}
            {status === 'critical' && <AlertTriangle className="w-3 h-3" />}
            {status === 'unknown' && <HelpCircle className="w-3 h-3" />}
            {cfg.label}
        </span>
    );
}

function getDirectionIcon(status: string, percentage: number) {
    if (status === 'normal') return <Minus className="w-3.5 h-3.5 text-emerald-500" />;
    if (status === 'high') return <ArrowUp className="w-3.5 h-3.5 text-red-500" />;
    if (status === 'low') return <ArrowDown className="w-3.5 h-3.5 text-red-500" />;
    if (percentage > 60) return <ArrowUp className="w-3.5 h-3.5 text-red-500" />;
    if (percentage < 40) return <ArrowDown className="w-3.5 h-3.5 text-red-500" />;
    return <Minus className="w-3.5 h-3.5 text-slate-400" />;
}

/* ─── Enhanced Parameter Card ─────────────────────────────────────────── */
const ParameterCard = ({ param }: { param: LabParameter }) => {
    const calculatedStatus = calculateParameterStatus(param);
    const cfg = STATUS_CONFIG[calculatedStatus as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.unknown;
    const markerPos = Math.min(100, Math.max(0, param.percentage));

    return (
        <div className={cn(
            "rounded-xl border bg-white dark:bg-slate-900 p-5 transition-all hover:shadow-md",
            calculatedStatus === 'critical' ? 'border-red-300 dark:border-red-500/30' :
            (calculatedStatus === 'high' || calculatedStatus === 'low') ? 'border-amber-300 dark:border-amber-500/30' :
            'border-slate-200 dark:border-slate-800'
        )}>
            {/* Header Row */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${cfg.dot} shrink-0`} />
                    <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base uppercase tracking-wide">
                            {param.name}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            {getDirectionIcon(calculatedStatus, param.percentage)}
                            <span className="text-[10px] sm:text-xs text-slate-400">
                                Ref: {param.reference_range}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2">
                    <div className="flex items-baseline gap-1.5">
                        <span className={`text-xl sm:text-2xl font-black ${calculatedStatus === 'normal' ? 'text-slate-900 dark:text-white' : cfg.color}`}>
                            {param.value}
                        </span>
                        {param.flag && (
                            <span className={cn(
                                "flex items-center justify-center min-w-[24px] px-1.5 h-6 rounded bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 text-[10px] font-black border border-red-200 dark:border-red-800/50 animate-pulse-subtle",
                                param.flag === 'H' ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border-blue-200 dark:border-blue-800/50"
                            )} title={param.flag === 'H' ? 'High' : param.flag === 'L' ? 'Low' : 'Flag'}>
                                {param.flag}
                            </span>
                        )}
                        {param.unit && (
                            <span className="text-[10px] sm:text-xs text-slate-400 font-medium">{param.unit}</span>
                        )}
                    </div>
                    <StatusBadge status={calculatedStatus} />
                </div>
            </div>

            {/* Range Bar */}
            <div className="relative">
                {/* Three-zone bar */}
                <div className="flex h-3 rounded-full overflow-hidden">
                    <div className="w-[25%] bg-red-200 dark:bg-red-500/20" />
                    <div className="w-[50%] bg-emerald-200 dark:bg-emerald-500/20" />
                    <div className="w-[25%] bg-red-200 dark:bg-red-500/20" />
                </div>

                {/* Value Marker */}
                <div
                    className="absolute top-1/2 -translate-y-1/2 transition-all duration-700"
                    style={{ left: `${markerPos}%`, transform: `translateX(-50%) translateY(-50%)` }}
                >
                    <div className={`w-4 h-4 rounded-full ${cfg.dot} border-2 border-white dark:border-slate-900 shadow-md`} />
                </div>
            </div>

            {/* Range Labels */}
            <div className="flex justify-between text-[11px] text-slate-400 mt-1.5 font-medium">
                <span className="text-red-400">Low</span>
                <span className="text-emerald-500 font-semibold">Normal Range</span>
                <span className="text-red-400">High</span>
            </div>
        </div>
    );
};

/* ─── Main Component ──────────────────────────────────────────────────── */
const LabResults = ({ result }: LabResultsProps) => {
    const { setContext } = useChatStore();

    useEffect(() => {
        // Construct a nicely formatted string for the AI so it perfectly understands the numbers
        const contextStr = [
            `Current Lab Report Assessment: ${result.assessment} (${(result.confidence * 100).toFixed(1)}% confidence)`,
            `AI Interpretation:\n${result.interpretation}`,
            `\nDetailed Parameter Numbers:`,
            ...result.parameters.map(p => `- ${p.name}: ${p.value} ${p.unit} (Ref: ${p.reference_range}) | Flag: ${p.flag || 'None'}`)
        ].join('\n');
        
        setContext(contextStr);

        return () => {
            setContext(null); // Clear context when component unmounts
        };
    }, [result, setContext]);

    const normalCount = result.parameters.filter(p => calculateParameterStatus(p) === 'normal').length;
    const abnormalCount = result.parameters.filter(p => {
        const s = calculateParameterStatus(p);
        return s === 'high' || s === 'low';
    }).length;
    const criticalCount = result.parameters.filter(p => calculateParameterStatus(p) === 'critical').length;
    const totalCount = result.parameters.length;
    const isNormal = result.assessment === 'Normal';

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-5 fade-in duration-500">

            {/* ── Overall Assessment Banner ────────────────────────────── */}
            <div className={cn(
                "rounded-2xl p-6 border-2 shadow-lg",
                isNormal
                    ? "border-emerald-300 dark:border-emerald-500/30 bg-emerald-500/5 shadow-emerald-500/10"
                    : "border-amber-300 dark:border-amber-500/30 bg-amber-500/5 shadow-amber-500/10"
            )}>
                <div className="flex flex-wrap items-center gap-6">
                    {/* Assessment Icon */}
                    <div className={cn(
                        "w-20 h-20 rounded-full flex items-center justify-center shrink-0",
                        isNormal ? "bg-emerald-500/10" : "bg-amber-500/10"
                    )}>
                        {isNormal
                            ? <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                            : <AlertCircle className="w-10 h-10 text-amber-500" />
                        }
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1 flex-wrap">
                            <h2 className={cn(
                                "text-3xl font-black",
                                isNormal ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                            )}>
                                {result.assessment}
                            </h2>
                            <span className={cn(
                                "text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider",
                                isNormal
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                            )}>
                                AI Analysis
                            </span>
                        </div>
                        <p className="text-sm text-slate-500 leading-relaxed">
                            Confidence: <strong className="text-slate-700 dark:text-slate-300">{(result.confidence * 100).toFixed(1)}%</strong> based on {totalCount} analyzed parameters.
                        </p>
                    </div>
                </div>

                {/* Interpretation */}
                {result.interpretation && (
                    <div className="mt-5 rounded-xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm border border-slate-200 dark:border-slate-800 p-5 flex gap-4 items-start">
                        <div className="w-9 h-9 rounded-full bg-violet-500/10 flex items-center justify-center shrink-0">
                            <Brain className="w-4.5 h-4.5 text-violet-500" />
                        </div>
                        <div>
                            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">AI Interpretation</div>
                            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic">
                                "{result.interpretation}"
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Stats Dashboard ─────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                    {[
                        { label: 'Total Parameters', value: totalCount, icon: Activity, iconColor: 'text-primary', bg: 'bg-primary/5' },
                        { label: 'Normal', value: normalCount, icon: CheckCircle2, iconColor: 'text-emerald-500', bg: 'bg-emerald-500/5' },
                        { label: 'Abnormal', value: abnormalCount, icon: AlertCircle, iconColor: 'text-amber-500', bg: 'bg-amber-500/5' },
                        { label: 'Critical', value: criticalCount, icon: AlertTriangle, iconColor: 'text-red-500', bg: 'bg-red-500/5' },
                    ].map(({ label, value, icon: Icon, iconColor, bg }) => (
                        <div key={label} className={`rounded-xl border border-slate-200 dark:border-slate-800 p-4 text-center ${bg} shadow-sm flex flex-col justify-center items-center h-full`}>
                            <Icon className={`w-6 h-6 ${iconColor} mx-auto mb-2`} />
                            <div className="text-3xl font-black text-slate-900 dark:text-white">{value}</div>
                            <div className="text-[11px] text-slate-400 uppercase tracking-wider font-bold mt-1">{label}</div>
                        </div>
                    ))}
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm bg-white dark:bg-slate-900 flex flex-col">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2 uppercase tracking-wide text-center">Parameter Distribution</h3>
                    <div className="flex-1 min-h-[180px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={[
                                        { name: 'Normal', value: normalCount, color: '#10b981' },
                                        { name: 'Abnormal', value: abnormalCount, color: '#f59e0b' },
                                        { name: 'Critical', value: criticalCount, color: '#ef4444' }
                                    ].filter(d => d.value > 0)}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={75}
                                    paddingAngle={3}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {[
                                        { name: 'Normal', value: normalCount, color: '#10b981' },
                                        { name: 'Abnormal', value: abnormalCount, color: '#f59e0b' },
                                        { name: 'Critical', value: criticalCount, color: '#ef4444' }
                                    ].filter(d => d.value > 0).map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <RechartsTooltip 
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    itemStyle={{ fontWeight: 'bold' }}
                                />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* ── Detailed Parameter Analysis ──────────────────────────── */}
            <div>
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Beaker className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Detailed Parameter Analysis</h3>
                        <p className="text-xs text-slate-400">Individual parameter breakdown with reference range visualization</p>
                    </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                    {result.parameters.map((param, idx) => (
                        <ParameterCard key={idx} param={param} />
                    ))}
                </div>
            </div>

            {/* ── Recommendations ──────────────────────────────────────── */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Shield className="w-5 h-5 text-primary" />
                        Recommendations
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {result.recommendations && result.recommendations.length > 0 ? (
                        <div className="space-y-3">
                            {result.recommendations.map((rec, idx) => (
                                <div key={idx} className="flex gap-4 items-start p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                                    <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-xs font-bold">
                                        {idx + 1}
                                    </div>
                                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{rec}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-slate-400 italic text-sm">No specific recommendations available.</p>
                    )}

                    <div className="mt-8 pt-5 border-t border-slate-100 dark:border-slate-800">
                        <div className="rounded-xl bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 p-4 flex gap-3 items-start">
                            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                            <p className="text-sm text-amber-800 dark:text-amber-300">
                                <strong>Disclaimer:</strong> This AI analysis is for informational purposes only and does not replace professional medical advice.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
            <FeedbackForm reportType="lab" />
        </div>
    );
};

export default LabResults;

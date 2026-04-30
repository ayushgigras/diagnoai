import React from 'react';
import { Target, MapPin, Shield, Brain, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { XAIDetail } from '../../types';

interface XAIMetricsPanelProps {
    xaiDetails?: Record<string, XAIDetail>;
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
        <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${cfg.color} ${cfg.bg} border ${cfg.border} uppercase tracking-wider`}>
            {severity === 'critical' && <AlertTriangle className="w-3 h-3" />}
            {severity === 'normal' && <CheckCircle2 className="w-3 h-3" />}
            {cfg.label}
        </span>
    );
}

const XAIMetricsPanel: React.FC<XAIMetricsPanelProps> = ({ xaiDetails }) => {
    if (!xaiDetails || Object.keys(xaiDetails).length === 0) {
        return (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-6 text-center w-full">
                <Brain className="w-8 h-8 text-slate-400 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">No XAI Metrics Available</h3>
                <p className="text-xs text-slate-500 mt-1">Explainable AI metrics were not generated for this scan.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 w-full">
            {Object.entries(xaiDetails).map(([condition, detail]) => {
                if (!detail) return null;
                const cfg = SEVERITY_CONFIG[detail.severity as keyof typeof SEVERITY_CONFIG] ?? SEVERITY_CONFIG.moderate;
                
                return (
                    <div key={condition} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
                        <div className="flex items-start justify-between flex-wrap gap-4 mb-4">
                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <h4 className="text-base font-bold text-slate-900 dark:text-white capitalize">{condition}</h4>
                                    <SeverityBadge severity={detail.severity || 'normal'} />
                                </div>
                                {(detail.region) && (
                                    <div className="flex items-center gap-1.5 text-sm text-slate-500">
                                        <MapPin className="w-4 h-4" />
                                        <span>Region: <span className="font-medium text-slate-700 dark:text-slate-300">{detail.region}</span></span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Confidence Progress Bar */}
                        <div className="mb-4">
                            <div className="flex justify-between items-center mb-1.5">
                                <span className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                                    <Target className="w-3.5 h-3.5" />
                                    Confidence
                                </span>
                                <span className="text-sm font-bold text-slate-900 dark:text-white">
                                    {detail.confidence_pct ? detail.confidence_pct.toFixed(1) : 0}%
                                </span>
                            </div>
                            <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full rounded-full transition-all duration-1000 ${cfg.bar}`}
                                    style={{ width: `${detail.confidence_pct || 0}%` }}
                                />
                            </div>
                        </div>

                        {/* Recommendation */}
                        {detail.recommendation && (
                            <div className={`mt-4 rounded-lg p-3.5 ${cfg.bg} border ${cfg.border} flex items-start gap-3`}>
                                <Shield className={`w-5 h-5 ${cfg.color} shrink-0 mt-0.5`} />
                                <div>
                                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Clinical Recommendation</p>
                                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{detail.recommendation}</p>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default XAIMetricsPanel;

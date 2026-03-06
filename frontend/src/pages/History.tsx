import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Brain, FlaskConical, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import api from '../services/api';

interface Report {
    id: number;
    report_type: string;
    status: string;
    result_data: any;
    created_at: string;
    task_id: string | null;
}

const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
    completed: { icon: CheckCircle, color: 'text-emerald-500', label: 'Completed' },
    pending: { icon: Clock, color: 'text-amber-500', label: 'Pending' },
    processing: { icon: Loader2, color: 'text-blue-500', label: 'Processing' },
    failed: { icon: XCircle, color: 'text-red-500', label: 'Failed' },
};

const History = () => {
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchReports = async () => {
            try {
                const res = await api.get('/reports/history');
                setReports(res.data);
            } catch (err: any) {
                setError(err.response?.data?.detail || 'Failed to load history.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchReports();
    }, []);

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                    <FileText className="w-8 h-8 text-primary" />
                    Analysis History
                </h1>
                <p className="text-slate-500 mt-2">View all your past X-Ray and Lab report analyses.</p>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/10 text-red-500 p-4 rounded-lg text-center mb-6">
                    {error}
                </div>
            )}

            {reports.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-20"
                >
                    <FileText className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-slate-500 dark:text-slate-400">No reports yet</h2>
                    <p className="text-slate-400 dark:text-slate-500 mt-2">
                        Upload an X-Ray or Lab report to see your analysis history here.
                    </p>
                </motion.div>
            ) : (
                <div className="space-y-4">
                    {reports.map((report, i) => {
                        const status = statusConfig[report.status] || statusConfig.pending;
                        const StatusIcon = status.icon;
                        const isXray = report.report_type === 'xray';

                        return (
                            <motion.div
                                key={report.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.04 }}
                                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    {/* Left: Icon + Info */}
                                    <div className="flex items-start gap-4">
                                        <div className={`p-2.5 rounded-lg ${isXray ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-violet-50 dark:bg-violet-900/20'}`}>
                                            {isXray
                                                ? <Brain className="w-5 h-5 text-blue-500" />
                                                : <FlaskConical className="w-5 h-5 text-violet-500" />
                                            }
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-slate-900 dark:text-white">
                                                {isXray ? 'X-Ray Analysis' : 'Lab Report Analysis'}
                                            </h3>
                                            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {formatDate(report.created_at)}
                                            </p>
                                            {/* Show brief result summary if completed */}
                                            {report.status === 'completed' && report.result_data && (
                                                <div className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                                                    {isXray && report.result_data.findings && (
                                                        <p>
                                                            <span className="font-medium">Findings: </span>
                                                            {Array.isArray(report.result_data.findings)
                                                                ? report.result_data.findings.slice(0, 3).map((f: any) => f.condition || f).join(', ')
                                                                : 'View details'}
                                                        </p>
                                                    )}
                                                    {!isXray && (report.result_data.interpretation || report.result_data.assessment) && (
                                                        <p>
                                                            <span className="font-medium">Summary: </span>
                                                            {typeof report.result_data.interpretation === 'string'
                                                                ? report.result_data.interpretation.slice(0, 120) + (report.result_data.interpretation.length > 120 ? '...' : '')
                                                                : typeof report.result_data.assessment === 'string'
                                                                    ? report.result_data.assessment
                                                                    : 'View details'}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right: Status Badge */}
                                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${status.color} bg-current/5`}>
                                        <StatusIcon className={`w-3.5 h-3.5 ${report.status === 'processing' ? 'animate-spin' : ''}`} />
                                        <span>{status.label}</span>
                                    </div>
                                </div>

                                {/* Report ID & Task ID */}
                                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-4 text-xs text-slate-400">
                                    <span>Report #{report.id}</span>
                                    {report.task_id && <span>Task: {report.task_id.slice(0, 8)}...</span>}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default History;

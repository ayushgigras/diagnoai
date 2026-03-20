import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Brain, FlaskConical, Clock, CheckCircle, XCircle, Loader2, Trash2, CheckSquare2, Square, Download } from 'lucide-react';
import api from '../services/api';
import AnalysisResults from '../components/xray/AnalysisResults';
import LabResults from '../components/lab/LabResults';
import type { ReportPatientDetails } from '../types';
import { downloadReportPdf } from '../utils/reportPdf';
import useToastStore from '../store/useToastStore';

interface Report extends ReportPatientDetails {
    id: number;
    patient_id: number;
    report_type: string;
    status: string;
    result_data: any;
    created_at: string;
    task_id: string | null;
    doctor_name?: string;
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
    const [filterType, setFilterType] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const { addToast } = useToastStore();

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

    const handleDelete = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this report?')) return;
        try {
            await api.delete(`/reports/${id}`);
            setReports(prev => prev.filter(r => r.id !== id));
            addToast('Report deleted successfully', 'success');
        } catch (err: any) {
            console.error(err);
            addToast('Failed to delete report.', 'error');
        }
    };

    const toggleSelect = (id: number) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const selectAllReports = () => {
        if (selectedIds.size === filteredReports.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredReports.map(r => r.id)));
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        if (!window.confirm(`Are you sure you want to delete ${selectedIds.size} report(s)?`)) return;
        try {
            await Promise.all([...selectedIds].map(id => api.delete(`/reports/${id}`)));
            addToast(`${selectedIds.size} report(s) deleted successfully`, 'success');
            setReports(prev => prev.filter(r => !selectedIds.has(r.id)));
            setSelectedIds(new Set());
        } catch (err: any) {
            console.error(err);
            addToast('Failed to delete some reports.', 'error');
        }
    };

    const getPatientName = (report: Report) => {
        if (report.patient_name) return report.patient_name;
        const first = report.patient_first_name || '';
        const last = report.patient_last_name || '';
        const full = `${first} ${last}`.trim();
        return full || `Patient ID: ${report.patient_id}`;
    };

    const downloadReport = (report: Report) => {
        downloadReportPdf({
            fileName: `diagnoai-report-${report.id}`,
            reportType: report.report_type,
            status: report.status,
            analyzedAt: report.created_at,
            analyzedBy: report.doctor_name || 'Doctor',
            patient: {
                patient_name: getPatientName(report),
                patient_first_name: report.patient_first_name,
                patient_last_name: report.patient_last_name,
                patient_date_of_birth: report.patient_date_of_birth,
                patient_gender: report.patient_gender,
                patient_contact_number: report.patient_contact_number,
                patient_address: report.patient_address,
            },
            result: report.result_data,
        });
    };

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

    const filteredReports = reports.filter(report => {
        if (filterType !== 'all' && report.report_type !== filterType) return false;
        if (filterStatus !== 'all') {
            if (filterStatus === 'pending' && !['pending', 'processing'].includes(report.status)) return false;
            else if (filterStatus !== 'pending' && report.status !== filterStatus) return false;
        }
        return true;
    });

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                    <FileText className="w-8 h-8 text-primary" />
                    Analysis History Dashboard
                </h1>
                <p className="text-slate-500 mt-2">Filter and view all your past X-Ray and Lab report analyses.</p>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/10 text-red-500 p-4 rounded-lg text-center mb-6">
                    {error}
                </div>
            )}

            {/* Bulk Actions Bar */}
            {selectedIds.size > 0 && (
                <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center justify-between"
                >
                    <div className="flex items-center gap-3">
                        <span className="font-semibold text-blue-900 dark:text-blue-100">
                            {selectedIds.size} report{selectedIds.size !== 1 ? 's' : ''} selected
                        </span>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleBulkDelete}
                            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
                        >
                            <Trash2 className="w-4 h-4" /> Delete Selected
                        </button>
                        <button
                            onClick={() => setSelectedIds(new Set())}
                            className="px-4 py-2 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600 text-slate-800 dark:text-white rounded-lg font-medium transition-colors"
                        >
                            Clear Selection
                        </button>
                    </div>
                </motion.div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 mb-6 items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-4 flex-1">
                <select 
                    value={filterType} 
                    onChange={(e) => setFilterType(e.target.value)}
                    className="p-2 border rounded-md border-slate-200 dark:bg-slate-900 dark:border-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                >
                    <option value="all">All Analysis Types</option>
                    <option value="xray">X-Ray Analysis</option>
                    <option value="lab">Lab Report Analysis</option>
                </select>
                <select 
                    value={filterStatus} 
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="p-2 border rounded-md border-slate-200 dark:bg-slate-900 dark:border-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                >
                    <option value="all">All Statuses</option>
                    <option value="completed">Completed</option>
                    <option value="pending">Processing</option>
                    <option value="failed">Failed</option>
                </select>
                </div>
                {filteredReports.length > 0 && (
                    <button
                        onClick={selectAllReports}
                        className="px-4 py-2 text-primary hover:bg-primary/10 rounded-lg font-medium flex items-center gap-2 transition-colors whitespace-nowrap"
                    >
                        {selectedIds.size === filteredReports.length && filteredReports.length > 0 ? (
                            <><CheckSquare2 className="w-4 h-4" /> Deselect All</>
                        ) : (
                            <><Square className="w-4 h-4" /> Select All</>
                        )}
                    </button>
                )}
            </div>

            {filteredReports.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-20 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800"
                >
                    <FileText className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-slate-500 dark:text-slate-400">No reports found</h2>
                    <p className="text-slate-400 dark:text-slate-500 mt-2">
                        {reports.length === 0 ? "Upload an X-Ray or Lab report to see your analysis history here." : "Try adjusting your filters to see more results."}
                    </p>
                </motion.div>
            ) : (
                <div className="space-y-4">
                    {filteredReports.map((report, i) => {
                        const status = statusConfig[report.status] || statusConfig.pending;
                        const StatusIcon = status.icon;
                        const isXray = report.report_type === 'xray';
                        const isExpanded = expandedId === report.id;
                        const isSelected = selectedIds.has(report.id);

                        return (
                            <motion.div
                                key={report.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.04 }}
                                className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 hover:shadow-md transition-all ${isSelected ? 'border-primary bg-primary/5 dark:bg-primary/5' : ''}`}
                            >
                                <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                                    {/* Checkbox + Left: Icon + Info */}
                                    <div className="flex items-start gap-3 w-full sm:w-auto">
                                        <button
                                            onClick={() => toggleSelect(report.id)}
                                            className="text-slate-600 dark:text-slate-400 hover:text-primary transition-colors mt-1 shrink-0"
                                        >
                                            {isSelected ? (
                                                <CheckSquare2 className="w-5 h-5 text-primary" />
                                            ) : (
                                                <Square className="w-5 h-5" />
                                            )}
                                        </button>
                                        <div className="flex items-start gap-4 flex-1">
                                        <div className={`p-2.5 rounded-lg shrink-0 ${isXray ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-violet-50 dark:bg-violet-900/20'}`}>
                                            {isXray
                                                ? <Brain className="w-5 h-5 text-blue-500" />
                                                : <FlaskConical className="w-5 h-5 text-violet-500" />
                                            }
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-slate-900 dark:text-white text-lg">
                                                {isXray ? 'X-Ray Analysis' : 'Lab Report Analysis'}
                                            </h3>
                                            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {formatDate(report.created_at)}
                                            </p>
                                            <p className="text-xs text-slate-500 mt-1">
                                                Patient: <span className="font-medium text-slate-700 dark:text-slate-300">{getPatientName(report)}</span>
                                            </p>
                                            {(report.patient_date_of_birth || report.patient_gender) && (
                                                <p className="text-xs text-slate-400 mt-0.5">
                                                    {report.patient_date_of_birth ? `DOB: ${report.patient_date_of_birth}` : ''}
                                                    {report.patient_date_of_birth && report.patient_gender ? ' | ' : ''}
                                                    {report.patient_gender ? `Gender: ${report.patient_gender}` : ''}
                                                </p>
                                            )}
                                            
                                            {/* Show brief result summary if completed */}
                                            {report.status === 'completed' && report.result_data && (
                                                <div className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                                                    {isXray && report.result_data.findings && (
                                                        <p className="truncate max-w-lg">
                                                            <span className="font-medium">Findings: </span>
                                                            {Array.isArray(report.result_data.findings)
                                                                ? report.result_data.findings.slice(0, 3).map((f: any) => f.condition || f).join(', ')
                                                                : 'View details'}
                                                        </p>
                                                    )}
                                                    {!isXray && (report.result_data.interpretation || report.result_data.assessment) && (
                                                        <p className="line-clamp-2 max-w-xl">
                                                            <span className="font-medium">Summary: </span>
                                                            {typeof report.result_data.interpretation === 'string'
                                                                ? report.result_data.interpretation
                                                                : typeof report.result_data.assessment === 'string'
                                                                    ? report.result_data.assessment
                                                                    : 'View details'}
                                                        </p>
                                                    )}
                                                    
                                                    <button 
                                                        onClick={() => setExpandedId(isExpanded ? null : report.id)} 
                                                        className="text-primary hover:text-primary/80 font-medium mt-2 transition-colors"
                                                    >
                                                        {isExpanded ? 'Hide Details' : 'View Full Details'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        </div>
                                    </div>

                                    {/* Right: Status Badge & Actions */}
                                    <div className="flex flex-col items-end gap-3 shrink-0 w-full sm:w-auto mt-4 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-0 border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => downloadReport(report)}
                                                className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                                                title="Download Report"
                                            >
                                                <Download className="w-4 h-4" />
                                            </button>
                                            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${status.color} bg-current/5`}>
                                                <StatusIcon className={`w-3.5 h-3.5 ${report.status === 'processing' ? 'animate-spin' : ''}`} />
                                                <span>{status.label}</span>
                                            </div>
                                            <button
                                                onClick={() => handleDelete(report.id)}
                                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                                                title="Delete Report"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded View */}
                                {isExpanded && report.result_data && (
                                    <motion.div 
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 overflow-hidden"
                                    >
                                        <div className="mb-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 p-3">
                                                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Patient Details</div>
                                                <div className="text-sm font-semibold text-slate-900 dark:text-white mt-1">{getPatientName(report)}</div>
                                                {report.patient_date_of_birth && <div className="text-xs text-slate-500 mt-1">DOB: {report.patient_date_of_birth}</div>}
                                                {report.patient_gender && <div className="text-xs text-slate-500">Gender: {report.patient_gender}</div>}
                                                {report.patient_contact_number && <div className="text-xs text-slate-500">Contact: {report.patient_contact_number}</div>}
                                            </div>
                                            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 p-3">
                                                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Analysis Details</div>
                                                <div className="text-sm font-semibold text-slate-900 dark:text-white mt-1">{isXray ? 'X-Ray Analysis' : 'Lab Report Analysis'}</div>
                                                <div className="text-xs text-slate-500 mt-1">By: {report.doctor_name || 'Doctor'}</div>
                                                <div className="text-xs text-slate-500">Status: {report.status}</div>
                                            </div>
                                        </div>
                                        {isXray ? (
                                            <AnalysisResults result={report.result_data} imagePreview="" />
                                        ) : (
                                            <LabResults result={report.result_data} />
                                        )}
                                    </motion.div>
                                )}
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default History;

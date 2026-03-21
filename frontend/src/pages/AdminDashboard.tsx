import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, FileText, Trash2, Shield, Search, Edit2, X, Check, Eye, CheckSquare2, Square } from 'lucide-react';
import api from '../services/api';
import AnalysisResults from '../components/xray/AnalysisResults';
import LabResults from '../components/lab/LabResults';
import useToastStore from '../store/useToastStore';

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState<'users' | 'reports'>('users');
    const [users, setUsers] = useState<any[]>([]);
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingUser, setEditingUser] = useState<any | null>(null);
    const [viewingReport, setViewingReport] = useState<any | null>(null);
    const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(new Set());
    const [selectedReportIds, setSelectedReportIds] = useState<Set<number>>(new Set());
    const { addToast } = useToastStore();

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const endpoint = activeTab === 'users' ? '/admin/users' : '/admin/reports';
            const res = await api.get(endpoint);
            if (activeTab === 'users') setUsers(res.data);
            else setReports(res.data);
        } catch (err) {
            addToast(`Failed to fetch ${activeTab}`, 'error');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateUserDetails = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await api.patch(`/admin/users/${editingUser.id}`, editingUser);
            addToast("User updated successfully", 'success');
            setUsers(users.map(u => u.id === editingUser.id ? res.data : u));
            setEditingUser(null);
        } catch (err) {
            addToast("Failed to update user details", 'error');
        }
    };

    const handleDeleteUser = async (userId: number) => {
        if (!window.confirm("Are you sure you want to delete this user? All their data will be removed.")) return;
        try {
            await api.delete(`/admin/users/${userId}`);
            addToast("User deleted", 'success');
            setUsers(users.filter(u => u.id !== userId));
        } catch (err) {
            addToast("Failed to delete user", 'error');
        }
    };

    const handleDeleteReport = async (reportId: number) => {
        if (!window.confirm("Are you sure you want to delete this report?")) return;
        try {
            await api.delete(`/admin/reports/${reportId}`);
            addToast("Report deleted", 'success');
            setReports(reports.filter(r => r.id !== reportId));
        } catch (err) {
            addToast("Failed to delete report", 'error');
        }
    };

    const handleUpdateStatus = async (userId: number, currentStatus: boolean) => {
        try {
            const newStatus = !currentStatus;
            await api.patch(`/admin/users/${userId}/status`, { is_active: newStatus });
            addToast(`User ${newStatus ? 'activated' : 'deactivated'}`, 'success');
            setUsers(users.map(u => u.id === userId ? { ...u, is_active: newStatus } : u));
        } catch (err) {
            addToast("Failed to update status", 'error');
        }
    };

    const handleUpdateRole = async (userId: number, newRole: string) => {
        try {
            await api.patch(`/admin/users/${userId}/role`, { role: newRole });
            addToast(`Role updated to ${newRole}`, 'success');
            setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
        } catch (err) {
            addToast("Failed to update role", 'error');
        }
    };

    const toggleUserSelect = (userId: number) => {
        const newSelected = new Set(selectedUserIds);
        if (newSelected.has(userId)) {
            newSelected.delete(userId);
        } else {
            newSelected.add(userId);
        }
        setSelectedUserIds(newSelected);
    };

    const toggleReportSelect = (reportId: number) => {
        const newSelected = new Set(selectedReportIds);
        if (newSelected.has(reportId)) {
            newSelected.delete(reportId);
        } else {
            newSelected.add(reportId);
        }
        setSelectedReportIds(newSelected);
    };

    const selectAllUsers = () => {
        if (selectedUserIds.size === filteredUsers.length) {
            setSelectedUserIds(new Set());
        } else {
            setSelectedUserIds(new Set(filteredUsers.map(u => u.id)));
        }
    };

    const selectAllReports = () => {
        if (selectedReportIds.size === filteredReports.length) {
            setSelectedReportIds(new Set());
        } else {
            setSelectedReportIds(new Set(filteredReports.map(r => r.id)));
        }
    };

    const handleBulkDeleteUsers = async () => {
        if (selectedUserIds.size === 0) return;
        if (!window.confirm(`Are you sure you want to delete ${selectedUserIds.size} user(s)? All their data will be removed.`)) return;
        try {
            await Promise.all([...selectedUserIds].map(id => api.delete(`/admin/users/${id}`)));
            addToast(`${selectedUserIds.size} user(s) deleted successfully`, 'success');
            setUsers(users.filter(u => !selectedUserIds.has(u.id)));
            setSelectedUserIds(new Set());
        } catch (err) {
            addToast("Failed to delete some users", 'error');
        }
    };

    const handleBulkDeleteReports = async () => {
        if (selectedReportIds.size === 0) return;
        if (!window.confirm(`Are you sure you want to delete ${selectedReportIds.size} report(s)?`)) return;
        try {
            await Promise.all([...selectedReportIds].map(id => api.delete(`/admin/reports/${id}`)));
            addToast(`${selectedReportIds.size} report(s) deleted successfully`, 'success');
            setReports(reports.filter(r => !selectedReportIds.has(r.id)));
            setSelectedReportIds(new Set());
        } catch (err) {
            addToast("Failed to delete some reports", 'error');
        }
    };

    const filteredUsers = users.filter(u => 
        u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredReports = reports.filter(r => 
        r.report_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.status?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Resolve the best available patient name for a report.
    // Falls back to the account owner's full_name (user_full_name) which the
    // admin /reports endpoint returns alongside each report.
    const getAdminPatientName = (report: any): string => {
        const candidates = [
            report.patient_name,
            report.patient_first_name && report.patient_last_name
                ? `${report.patient_first_name} ${report.patient_last_name}`.trim()
                : null,
            report.patient_first_name || report.patient_last_name
                ? `${report.patient_first_name || ''} ${report.patient_last_name || ''}`.trim()
                : null,
        ];
        const stored = candidates.find(
            (v) => v && v.trim() && v.toLowerCase() !== 'unknown patient'
        );
        if (stored) return stored;
        // user_full_name = the account name of whoever submitted this report
        if (report.user_full_name) return report.user_full_name;
        return `Patient ID: ${report.patient_id}`;
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <Shield className="w-8 h-8 text-red-500" />
                        Admin Dashboard
                    </h1>
                    <p className="text-slate-500 mt-2">Manage users, roles, and system data.</p>
                </div>

                <div className="relative max-w-xs w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder={`Search ${activeTab}...`}
                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Bulk Actions Bar */}
            {((activeTab === 'users' && selectedUserIds.size > 0) || (activeTab === 'reports' && selectedReportIds.size > 0)) && (
                <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center justify-between"
                >
                    <div className="flex items-center gap-3">
                        <span className="font-semibold text-blue-900 dark:text-blue-100">
                            {activeTab === 'users' ? selectedUserIds.size : selectedReportIds.size} selected
                        </span>
                    </div>
                    <div className="flex gap-2">
                        {activeTab === 'users' ? (
                            <button
                                onClick={handleBulkDeleteUsers}
                                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" /> Delete Selected
                            </button>
                        ) : (
                            <button
                                onClick={handleBulkDeleteReports}
                                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" /> Delete Selected
                            </button>
                        )}
                        <button
                            onClick={() => {
                                if (activeTab === 'users') setSelectedUserIds(new Set());
                                else setSelectedReportIds(new Set());
                            }}
                            className="px-4 py-2 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600 text-slate-800 dark:text-white rounded-lg font-medium transition-colors"
                        >
                            Clear Selection
                        </button>
                    </div>
                </motion.div>
            )}

            {/* Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6 font-medium">
                <button
                    onClick={() => setActiveTab('users')}
                    className={`px-6 py-3 flex items-center gap-2 transition-colors border-b-2 ${
                        activeTab === 'users' 
                            ? 'border-primary text-primary' 
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <Users className="w-4 h-4" /> Users
                </button>
                <button
                    onClick={() => setActiveTab('reports')}
                    className={`px-6 py-3 flex items-center gap-2 transition-colors border-b-2 ${
                        activeTab === 'reports' 
                            ? 'border-primary text-primary' 
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <FileText className="w-4 h-4" /> Reports
                </button>
            </div>

            {/* Content */}
            <AnimatePresence mode="wait">
                {loading ? (
                    <motion.div
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex justify-center py-20"
                    >
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </motion.div>
                ) : (
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
                    >
                        {activeTab === 'users' ? (
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-xs uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4 w-12">
                                            <button 
                                                onClick={selectAllUsers}
                                                className="text-slate-600 dark:text-slate-400 hover:text-primary transition-colors"
                                                title="Select All"
                                            >
                                                {selectedUserIds.size === filteredUsers.length && filteredUsers.length > 0 ? (
                                                    <CheckSquare2 className="w-4 h-4" />
                                                ) : (
                                                    <Square className="w-4 h-4" />
                                                )}
                                            </button>
                                        </th>
                                        <th className="px-6 py-4">User</th>
                                        <th className="px-6 py-4">Role</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                    {filteredUsers.map(user => (
                                        <tr key={user.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors ${selectedUserIds.has(user.id) ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}>
                                            <td className="px-6 py-4">
                                                <button 
                                                    onClick={() => toggleUserSelect(user.id)}
                                                    className="text-slate-600 dark:text-slate-400 hover:text-primary transition-colors"
                                                >
                                                    {selectedUserIds.has(user.id) ? (
                                                        <CheckSquare2 className="w-4 h-4 text-primary" />
                                                    ) : (
                                                        <Square className="w-4 h-4" />
                                                    )}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-slate-900 dark:text-white">{user.full_name}</div>
                                                <div className="text-xs text-slate-500">{user.email}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <select
                                                    value={user.role}
                                                    onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                                                    className="bg-slate-100 dark:bg-slate-800 border-none text-xs rounded px-2 py-1 focus:ring-1 focus:ring-primary"
                                                >
                                                    <option value="patient">Patient</option>
                                                    <option value="doctor">Doctor</option>
                                                    <option value="admin">Admin</option>
                                                </select>
                                            </td>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => handleUpdateStatus(user.id, user.is_active)}
                                                    className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase transition-all hover:ring-2 hover:ring-offset-2 hover:ring-primary/20 ${user.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                                                >
                                                    {user.is_active ? 'Active' : 'Inactive'}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                <button 
                                                    onClick={() => setEditingUser(user)}
                                                    className="p-2 text-primary hover:bg-primary/10 rounded-full transition-colors"
                                                    title="Edit User"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteUser(user.id)}
                                                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-full transition-colors"
                                                    title="Delete User"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-xs uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4 w-12">
                                            <button 
                                                onClick={selectAllReports}
                                                className="text-slate-600 dark:text-slate-400 hover:text-primary transition-colors"
                                                title="Select All"
                                            >
                                                {selectedReportIds.size === filteredReports.length && filteredReports.length > 0 ? (
                                                    <CheckSquare2 className="w-4 h-4" />
                                                ) : (
                                                    <Square className="w-4 h-4" />
                                                )}
                                            </button>
                                        </th>
                                        <th className="px-6 py-4">Type</th>
                                        <th className="px-6 py-4">Patient</th>
                                        <th className="px-6 py-4">Analyzed By</th>
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                    {filteredReports.map(report => (
                                        <tr key={report.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors ${selectedReportIds.has(report.id) ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}>
                                            <td className="px-6 py-4">
                                                <button 
                                                    onClick={() => toggleReportSelect(report.id)}
                                                    className="text-slate-600 dark:text-slate-400 hover:text-primary transition-colors"
                                                >
                                                    {selectedReportIds.has(report.id) ? (
                                                        <CheckSquare2 className="w-4 h-4 text-primary" />
                                                    ) : (
                                                        <Square className="w-4 h-4" />
                                                    )}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="capitalize font-medium text-slate-900 dark:text-white">{report.report_type}</div>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${report.status === 'completed' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                    {report.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">
                                                {getAdminPatientName(report)}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300 italic">
                                                {report.doctor_name || 'System / None'}
                                            </td>
                                            <td className="px-6 py-4 text-xs text-slate-500">
                                                {new Date(report.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                <button 
                                                    onClick={() => setViewingReport(report)}
                                                    className="p-2 text-primary hover:bg-primary/10 rounded-full transition-colors"
                                                    title="View Results"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteReport(report.id)}
                                                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-full transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                        {(filteredUsers.length === 0 && activeTab === 'users' && !loading) || 
                         (filteredReports.length === 0 && activeTab === 'reports' && !loading) ? (
                            <div className="py-20 text-center text-slate-500">
                                No items found matching your search.
                            </div>
                         ) : null}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Edit User Modal */}
            <AnimatePresence>
                {editingUser && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                            onClick={() => setEditingUser(null)}
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800"
                        >
                            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Edit2 className="w-4 h-4 text-primary" />
                                    Edit User Details
                                </h3>
                                <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleUpdateUserDetails} className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label>
                                        <input 
                                            type="text"
                                            value={editingUser.full_name || ''}
                                            onChange={(e) => setEditingUser({...editingUser, full_name: e.target.value})}
                                            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-sm p-3 focus:ring-2 focus:ring-primary/20 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                                        <input 
                                            type="email"
                                            value={editingUser.email || ''}
                                            onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                                            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-sm p-3 focus:ring-2 focus:ring-primary/20 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Phone</label>
                                        <input 
                                            type="text"
                                            value={editingUser.phone || ''}
                                            onChange={(e) => setEditingUser({...editingUser, phone: e.target.value})}
                                            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-sm p-3 focus:ring-2 focus:ring-primary/20 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Location</label>
                                        <input 
                                            type="text"
                                            value={editingUser.location || ''}
                                            onChange={(e) => setEditingUser({...editingUser, location: e.target.value})}
                                            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-sm p-3 focus:ring-2 focus:ring-primary/20 dark:text-white"
                                        />
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Bio</label>
                                    <textarea 
                                        rows={3}
                                        value={editingUser.bio || ''}
                                        onChange={(e) => setEditingUser({...editingUser, bio: e.target.value})}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-sm p-3 focus:ring-2 focus:ring-primary/20 dark:text-white resize-none"
                                    />
                                </div>

                                <div className="flex items-center gap-3 pt-4">
                                    <button 
                                        type="submit"
                                        className="flex-1 bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Check className="w-4 h-4" /> Save Changes
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setEditingUser(null)}
                                        className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-3 rounded-xl transition-all"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* View Report Modal */}
            <AnimatePresence>
                {viewingReport && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                            onClick={() => setViewingReport(null)}
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]"
                        >
                            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                                <div className="flex items-center gap-4">
                                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-primary" />
                                        Report Details
                                    </h3>
                                    <div className="text-xs text-slate-500">
                                        ID: {viewingReport.id} | {new Date(viewingReport.created_at).toLocaleString()}
                                    </div>
                                </div>
                                <button onClick={() => setViewingReport(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto">
                                <div className="grid grid-cols-2 gap-8 mb-8">
                                    <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Patient Details</div>
                                        <div className="text-sm font-bold text-slate-900 dark:text-white">{getAdminPatientName(viewingReport)}</div>
                                        <div className="text-xs text-slate-500">Patient ID: {viewingReport.patient_id}</div>
                                    </div>
                                    <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Analysis Performed By</div>
                                        <div className="text-sm font-bold text-slate-900 dark:text-white">{viewingReport.doctor_name || 'System Analysis'}</div>
                                        <div className="text-xs text-slate-500">Doctor ID: {viewingReport.doctor_id || 'N/A'}</div>
                                    </div>
                                </div>

                                {viewingReport.report_type === 'xray' ? (
                                    <AnalysisResults result={viewingReport.result_data} imagePreview="" />
                                ) : (
                                    <LabResults result={viewingReport.result_data} />
                                )}
                            </div>

                            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end">
                                <button 
                                    onClick={() => setViewingReport(null)}
                                    className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg font-bold text-sm"
                                >
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminDashboard;

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useAuthStore from '../store/useAuthStore';
import api from '../services/api';

const passwordRules = [
    { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
    { label: 'One uppercase letter (A-Z)', test: (p: string) => /[A-Z]/.test(p) },
    { label: 'One lowercase letter (a-z)', test: (p: string) => /[a-z]/.test(p) },
    { label: 'One number (0-9)', test: (p: string) => /\d/.test(p) },
    { label: 'One special character (!@#$...)', test: (p: string) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

const Register = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [role, setRole] = useState<'patient' | 'doctor' | 'admin'>('patient');
    const [adminSecret, setAdminSecret] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showRules, setShowRules] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    const login = useAuthStore((state) => state.login);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // 1. Register the user
            await api.post('/auth/register', {
                email,
                password,
                full_name: fullName,
                role: role,
                admin_secret: role === 'admin' ? adminSecret : undefined
            });

            // 2. Automatically login the user after registration
            const formData = new URLSearchParams();
            formData.append('username', email);
            formData.append('password', password);

            const loginRes = await api.post('/auth/login', formData, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            });

            const { access_token, user: loggedUser } = loginRes.data;
            login(access_token, loggedUser);

            setShowSuccessModal(true);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to register. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const allRulesPassed = passwordRules.every(r => r.test(password));

    return (
        <div className="flex min-h-[80vh] items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="w-full max-w-md space-y-8 bg-white dark:bg-slate-900 p-8 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800">
                <div className="flex flex-col items-center">
                    <img
                        src="/logo.png"
                        alt="DiagnoAI"
                        className="object-contain mb-3"
                        style={{ width: 60, height: 60, mixBlendMode: 'screen' }}
                    />
                    <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                        Create an Account
                    </h2>
                    <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">
                        Join DiagnoAI for AI-powered health insights
                    </p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    {error && (
                        <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm text-center">
                            {error}
                        </div>
                    )}
                    <div className="space-y-4 rounded-md shadow-sm">
                        <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">I am a...</label>
                            <div className="grid grid-cols-3 gap-3 mt-1">
                                <button
                                    type="button"
                                    onClick={() => setRole('patient')}
                                    className={`py-2 px-2 text-xs font-medium rounded-md border transition-all ${
                                        role === 'patient'
                                            ? 'bg-primary/10 border-primary text-primary'
                                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                                    }`}
                                >
                                    Patient
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRole('doctor')}
                                    className={`py-2 px-2 text-xs font-medium rounded-md border transition-all ${
                                        role === 'doctor'
                                            ? 'bg-primary/10 border-primary text-primary'
                                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                                    }`}
                                >
                                    Doctor
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRole('admin')}
                                    className={`py-2 px-2 text-xs font-medium rounded-md border transition-all ${
                                        role === 'admin'
                                            ? 'bg-red-500/10 border-red-500 text-red-600 dark:text-red-400'
                                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                                    }`}
                                >
                                    Admin
                                </button>
                            </div>
                        </div>
                        {role === 'admin' && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="overflow-hidden"
                            >
                                <label className="text-sm font-medium text-red-600 dark:text-red-400">Admin Secret Key</label>
                                <input
                                    type="password"
                                    required
                                    className="relative mt-1 block w-full rounded-md border border-red-300 dark:border-red-900 px-3 py-2 text-slate-900 dark:text-white dark:bg-slate-800 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 sm:text-sm"
                                    placeholder="Enter secret key"
                                    value={adminSecret}
                                    onChange={(e) => setAdminSecret(e.target.value)}
                                />
                            </motion.div>
                        )}
                        <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Full Name</label>
                            <input
                                name="full_name"
                                type="text"
                                required
                                className="relative mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 px-3 py-2 text-slate-900 dark:text-white dark:bg-slate-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                                placeholder={role === 'doctor' ? "Dr. John Doe" : "John Doe"}
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email address</label>
                            <input
                                name="email"
                                type="email"
                                required
                                className="relative mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 px-3 py-2 text-slate-900 dark:text-white dark:bg-slate-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                                placeholder={role === 'doctor' ? "doctor@diagnoai.com" : "john@example.com"}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
                            <input
                                name="password"
                                type="password"
                                required
                                className={`relative mt-1 block w-full rounded-md border px-3 py-2 text-slate-900 dark:text-white dark:bg-slate-800 focus:outline-none focus:ring-1 sm:text-sm transition-colors ${
                                    password.length === 0
                                        ? 'border-slate-300 dark:border-slate-700 focus:border-primary focus:ring-primary'
                                        : allRulesPassed
                                        ? 'border-green-500 focus:border-green-500 focus:ring-green-500'
                                        : 'border-red-400 focus:border-red-400 focus:ring-red-400'
                                }`}
                                placeholder="Min 8 chars, e.g. Diagno@123"
                                value={password}
                                onChange={(e) => { setPassword(e.target.value); setShowRules(true); }}
                                onFocus={() => setShowRules(true)}
                            />

                            {/* Password Rules Checklist */}
                            {showRules && (
                                <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700">
                                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Password must have:</p>
                                    <ul className="space-y-1">
                                        {passwordRules.map((rule) => {
                                            const passed = rule.test(password);
                                            return (
                                                <li key={rule.label} className={`flex items-center gap-2 text-xs transition-colors ${passed ? 'text-green-600 dark:text-green-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                                    <span>{passed ? '✅' : '○'}</span>
                                                    {rule.label}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={loading || !allRulesPassed}
                            className="group relative flex w-full justify-center rounded-md border border-transparent bg-primary py-2 px-4 text-sm font-medium text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 transition-colors"
                        >
                            {loading ? 'Creating account...' : 'Create Account'}
                        </button>
                    </div>

                    <div className="text-center text-sm">
                        <span className="text-slate-500 dark:text-slate-400">Already have an account? </span>
                        <Link to="/login" className="font-medium text-primary hover:text-primary/80">
                            Sign in
                        </Link>
                    </div>
                </form>
            </div>

            {/* Success Modal */}
            <AnimatePresence>
                {showSuccessModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                            onClick={() => navigate('/xray')}
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-8 text-center border border-slate-200 dark:border-slate-800"
                        >
                            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", damping: 12, delay: 0.2 }}
                                >
                                    <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                </motion.div>
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Welcome to DiagnoAI!</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">
                                Your account has been created. Would you like to complete your profile now for a better experience?
                            </p>
                            <div className="space-y-3">
                                <button
                                    onClick={() => navigate('/profile')}
                                    className="w-full py-3 px-4 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl transition-all shadow-lg active:scale-95"
                                >
                                    Complete Profile
                                </button>
                                <button
                                    onClick={() => navigate('/xray')}
                                    className="w-full py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-xl transition-all"
                                >
                                    Maybe Later
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Register;
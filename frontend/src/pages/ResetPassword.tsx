import { useMemo, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

const passwordRules = [
    { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
    { label: 'One uppercase letter (A-Z)', test: (p: string) => /[A-Z]/.test(p) },
    { label: 'One lowercase letter (a-z)', test: (p: string) => /[a-z]/.test(p) },
    { label: 'One number (0-9)', test: (p: string) => /\d/.test(p) },
    { label: 'One special character (!@#$...)', test: (p: string) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const token = searchParams.get('token') || '';
    const allRulesPassed = useMemo(() => passwordRules.every((rule) => rule.test(password)), [password]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');

        if (!token) {
            setError('Reset token is missing. Use the link from your email.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);
        try {
            const response = await api.post('/auth/reset-password', {
                token,
                new_password: password,
            });
            setMessage(response.data.message || 'Password reset successfully.');
            setTimeout(() => navigate('/login'), 1200);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Could not reset password. The link may have expired.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-[80vh] items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="w-full max-w-md space-y-8 bg-white dark:bg-slate-900 p-8 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800">
                <div>
                    <h2 className="mt-2 text-center text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                        Choose a new password
                    </h2>
                </div>

                <form className="space-y-6" onSubmit={handleSubmit}>
                    {error && <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm text-center">{error}</div>}
                    {message && <div className="bg-green-50 text-green-700 p-3 rounded-md text-sm text-center">{message}</div>}

                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">New password</label>
                            <input
                                name="new_password"
                                type="password"
                                required
                                className="relative mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 px-3 py-2 text-slate-900 dark:text-white dark:bg-slate-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Confirm password</label>
                            <input
                                name="confirm_password"
                                type="password"
                                required
                                className="relative mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 px-3 py-2 text-slate-900 dark:text-white dark:bg-slate-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        </div>

                        <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700">
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Password must have:</p>
                            <ul className="space-y-1">
                                {passwordRules.map((rule) => {
                                    const passed = rule.test(password);
                                    return (
                                        <li key={rule.label} className={`flex items-center gap-2 text-xs ${passed ? 'text-green-600 dark:text-green-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                            <span>{passed ? 'OK' : 'o'}</span>
                                            {rule.label}
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !allRulesPassed}
                        className="group relative flex w-full justify-center rounded-md border border-transparent bg-primary py-2 px-4 text-sm font-medium text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 transition-colors"
                    >
                        {loading ? 'Resetting...' : 'Reset password'}
                    </button>

                    <div className="text-center text-sm">
                        <Link to="/login" className="font-medium text-primary hover:text-primary/80">
                            Back to sign in
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ResetPassword;

import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [devResetUrl, setDevResetUrl] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setDevResetUrl('');
        setLoading(true);

        try {
            const response = await api.post('/auth/forgot-password', { email });
            setMessage(response.data.message || 'If your account exists, you will receive a reset link.');
            if (response.data.reset_url) {
                setDevResetUrl(response.data.reset_url);
            }
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to process request. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-[80vh] items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="w-full max-w-md space-y-8 bg-white dark:bg-slate-900 p-8 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800">
                <div>
                    <h2 className="mt-2 text-center text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                        Reset your password
                    </h2>
                    <p className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
                        Enter your email and we will send you a reset link.
                    </p>
                </div>

                <form className="space-y-6" onSubmit={handleSubmit}>
                    {error && <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm text-center">{error}</div>}
                    {message && <div className="bg-green-50 text-green-700 p-3 rounded-md text-sm text-center">{message}</div>}

                    <div>
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email address</label>
                        <input
                            name="email"
                            type="email"
                            required
                            className="relative mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 px-3 py-2 text-slate-900 dark:text-white dark:bg-slate-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="group relative flex w-full justify-center rounded-md border border-transparent bg-primary py-2 px-4 text-sm font-medium text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 transition-colors"
                    >
                        {loading ? 'Sending...' : 'Send reset link'}
                    </button>

                    {devResetUrl && (
                        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
                            <p className="font-semibold mb-1">Development reset URL</p>
                            <a href={devResetUrl} className="underline break-all">
                                {devResetUrl}
                            </a>
                        </div>
                    )}

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

export default ForgotPassword;

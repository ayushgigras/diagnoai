import { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react';
import api from '../services/api';

const VerifyEmail = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    
    // Status can be: 'loading', 'success', 'error'
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('Verifying your email...');
    
    // Prevent double-fetching in strict mode
    const hasFetched = useRef(false);

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('No verification token provided in the URL.');
            return;
        }

        if (hasFetched.current) return;
        hasFetched.current = true;

        const verifyAccount = async () => {
            try {
                const response = await api.post('/auth/verify-email', { token });
                setStatus('success');
                setMessage(response.data.message || 'Email verified successfully!');
            } catch (err: any) {
                setStatus('error');
                setMessage(err.response?.data?.detail || 'Invalid or expired verification link.');
            }
        };

        verifyAccount();
    }, [token]);

    return (
        <div className="flex min-h-[80vh] items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="w-full max-w-md space-y-8 bg-white dark:bg-slate-900 p-8 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 text-center">
                
                {status === 'loading' && (
                    <div className="flex flex-col items-center justify-center space-y-4 py-8">
                        <Loader2 className="h-16 w-16 text-primary animate-spin" />
                        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                            Verifying...
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400">{message}</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="flex flex-col items-center justify-center space-y-6 py-4">
                        <div className="h-20 w-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                            <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                                Email Verified!
                            </h2>
                            <p className="mt-2 text-slate-500 dark:text-slate-400">
                                Your account is now active. You have also received a welcome email.
                            </p>
                        </div>
                        <Link
                            to="/login"
                            className="w-full flex justify-center rounded-md border border-transparent bg-primary py-2 px-4 text-sm font-medium text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
                        >
                            Log in to your account
                        </Link>
                    </div>
                )}

                {status === 'error' && (
                    <div className="flex flex-col items-center justify-center space-y-6 py-4">
                        <div className="h-20 w-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                            <XCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                                Verification Failed
                            </h2>
                            <p className="mt-2 text-red-600 dark:text-red-400">
                                {message}
                            </p>
                        </div>
                        
                        <div className="space-y-3 w-full max-w-xs mt-4">
                            <Link
                                to="/login"
                                className="w-full flex items-center justify-center rounded-md border border-slate-300 dark:border-slate-700 py-2 px-4 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                            >
                                <Mail className="w-4 h-4 mr-2" />
                                Go to login to request a new link
                            </Link>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default VerifyEmail;

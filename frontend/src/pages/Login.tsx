import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import useAuthStore from '../store/useAuthStore';
import api from '../services/api';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    const login = useAuthStore((state) => state.login);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const formData = new URLSearchParams();
            formData.append('username', email); // OAuth2 requires 'username'
            formData.append('password', password);

            const response = await api.post('/auth/login', formData, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });

            const { access_token, user } = response.data;
            login(access_token, user);
            navigate('/xray'); // Redirect to dashboard/xray after successful login
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to login. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async (credential: string) => {
        setError('');
        setGoogleLoading(true);

        try {
            const response = await api.post('/auth/google', {
                credential,
                role: 'patient',
            });

            const { access_token, user } = response.data;
            login(access_token, user);
            navigate('/xray');
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Google sign-in failed. Please try again.');
        } finally {
            setGoogleLoading(false);
        }
    };

    return (
        <div className="flex min-h-[80vh] items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="w-full max-w-md space-y-8 bg-white dark:bg-slate-900 p-8 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                        Sign in to DiagnoAI
                    </h2>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    {error && (
                        <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm text-center">
                            {error}
                        </div>
                    )}
                    <div className="space-y-4 rounded-md shadow-sm">
                        <div>
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email address</label>
                            <input
                                name="email"
                                type="email"
                                required
                                className="relative mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 px-3 py-2 text-slate-900 dark:text-white dark:bg-slate-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                                placeholder="doctor@diagnoai.com"
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
                                className="relative mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 px-3 py-2 text-slate-900 dark:text-white dark:bg-slate-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                                placeholder="********"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative flex w-full justify-center rounded-md border border-transparent bg-primary py-2 px-4 text-sm font-medium text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 transition-colors"
                        >
                            {loading ? 'Signing in...' : 'Sign in'}
                        </button>
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200 dark:border-slate-700" />
                        </div>
                        <div className="relative flex justify-center text-xs">
                            <span className="bg-white dark:bg-slate-900 px-2 text-slate-500">OR</span>
                        </div>
                    </div>

                    {googleClientId ? (
                        <div className="flex justify-center">
                            {googleLoading ? (
                                <p className="text-sm text-slate-500">Signing in with Google...</p>
                            ) : (
                                <GoogleLogin
                                    onSuccess={(credentialResponse: any) => {
                                        if (credentialResponse.credential) {
                                            handleGoogleLogin(credentialResponse.credential);
                                        } else {
                                            setError('Google sign-in did not return a credential token.');
                                        }
                                    }}
                                    onError={() => setError('Google sign-in was cancelled or failed.')}
                                    useOneTap={false}
                                />
                            )}
                        </div>
                    ) : (
                        <p className="text-center text-xs text-slate-500">
                            Google sign-in is unavailable. Set VITE_GOOGLE_CLIENT_ID to enable it.
                        </p>
                    )}

                    <div className="text-center text-sm">
                        <Link to="/forgot-password" className="font-medium text-primary hover:text-primary/80">
                            Forgot your password?
                        </Link>
                    </div>

                    <div className="text-center text-sm">
                        <span className="text-slate-500 dark:text-slate-400">Don't have an account? </span>
                        <Link to="/register" className="font-medium text-primary hover:text-primary/80">
                            Register here
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login;

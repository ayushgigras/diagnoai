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
    
    // Verification state
    const [needsVerification, setNeedsVerification] = useState(false);
    const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

    // Role selection states
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [selectedRole, setSelectedRole] = useState('patient');
    const [adminSecret, setAdminSecret] = useState('');
    const [googleCredential, setGoogleCredential] = useState('');

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
            const detail = err.response?.data?.detail;
            setError(detail || 'Failed to login. Please check your credentials.');
            setNeedsVerification(err.response?.status === 403 && typeof detail === 'string' && detail.includes('verify your email'));
            setResendStatus('idle');
        } finally {
            setLoading(false);
        }
    };

    const handleResendVerification = async () => {
        setResendStatus('sending');
        try {
            await api.post('/auth/resend-verification', { email });
            setResendStatus('success');
            setNeedsVerification(false);
            setError('Verification email sent! Please check your inbox.');
        } catch (err) {
            setResendStatus('error');
            setError('Failed to resend verification email.');
        }
    };

    const handleGoogleLogin = async (credential: string, isRegistration = false, role = 'patient', secret = '') => {
        setError('');
        setGoogleLoading(true);

        try {
            const response = await api.post('/auth/google', {
                credential,
                is_registration: isRegistration,
                role: role,
                admin_secret: secret || undefined,
            });

            if (response.data.requires_registration) {
                setGoogleCredential(credential);
                setShowRoleModal(true);
                return;
            }

            const { access_token, user } = response.data;
            login(access_token, user);
            navigate('/xray');
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Google sign-in failed. Please try again.');
        } finally {
            setGoogleLoading(false);
        }
    };

    const submitGoogleRole = () => {
        setShowRoleModal(false);
        handleGoogleLogin(googleCredential, true, selectedRole, adminSecret);
    };

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
                        Sign in to DiagnoAI
                    </h2>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    {error && (
                        <div className={`p-3 rounded-md text-sm text-center ${resendStatus === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                            <p>{error}</p>
                            {needsVerification && (
                                <button
                                    type="button"
                                    onClick={handleResendVerification}
                                    disabled={resendStatus === 'sending'}
                                    className="mt-2 text-xs font-semibold text-primary underline hover:text-primary/80 disabled:opacity-50"
                                >
                                    {resendStatus === 'sending' ? 'Sending...' : 'Resend verification email'}
                                </button>
                            )}
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
                                    onSuccess={(credentialResponse) => {
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

            {showRoleModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-xl shadow-2xl max-w-sm w-full mx-4 border border-slate-200 dark:border-slate-800">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Select Your Role</h3>
                        <p className="text-sm text-slate-500 mb-6">Since this is your first time signing in with Google, please select your account type.</p>
                        
                        <div className="space-y-4 mb-6">
                            <label className="flex items-center space-x-3 cursor-pointer">
                                <input type="radio" name="role" value="patient" checked={selectedRole === 'patient'} onChange={(e) => setSelectedRole(e.target.value)} className="text-primary focus:ring-primary" />
                                <span className="text-slate-700 dark:text-slate-300">Patient</span>
                            </label>
                            <label className="flex items-center space-x-3 cursor-pointer">
                                <input type="radio" name="role" value="doctor" checked={selectedRole === 'doctor'} onChange={(e) => setSelectedRole(e.target.value)} className="text-primary focus:ring-primary" />
                                <span className="text-slate-700 dark:text-slate-300">Doctor</span>
                            </label>
                            <label className="flex items-center space-x-3 cursor-pointer">
                                <input type="radio" name="role" value="admin" checked={selectedRole === 'admin'} onChange={(e) => setSelectedRole(e.target.value)} className="text-primary focus:ring-primary" />
                                <span className="text-slate-700 dark:text-slate-300">Admin</span>
                            </label>
                            
                            {selectedRole === 'admin' && (
                                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Admin Secret Key</label>
                                    <input 
                                        type="password" 
                                        value={adminSecret} 
                                        onChange={(e) => setAdminSecret(e.target.value)} 
                                        className="w-full rounded-md border border-slate-300 dark:border-slate-700 px-3 py-2 text-slate-900 dark:text-white dark:bg-slate-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:text-sm"
                                        placeholder="Enter secret key"
                                    />
                                </div>
                            )}
                        </div>
                        
                        <div className="flex space-x-3">
                            <button type="button" onClick={() => setShowRoleModal(false)} className="flex-1 rounded-md border border-slate-300 dark:border-slate-700 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                Cancel
                            </button>
                            <button type="button" onClick={submitGoogleRole} disabled={googleLoading || (selectedRole === 'admin' && !adminSecret)} className="flex-1 rounded-md bg-primary py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50 transition-colors">
                                {googleLoading ? 'Saving...' : 'Complete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Login;

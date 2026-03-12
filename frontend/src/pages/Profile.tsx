import React, { useState, useMemo, useEffect, useRef } from 'react';
import useAuthStore from '../store/useAuthStore';
import api from '../services/api';
import { 
    User as UserIcon, 
    Mail, 
    Phone, 
    MapPin, 
    Briefcase, 
    FileText, 
    Camera, 
    CheckCircle2, 
    AlertCircle,
    Loader2,
    ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Profile() {
    const { user, updateUser } = useAuthStore();
    
    // Form state
    const [formData, setFormData] = useState({
        full_name: user?.full_name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        bio: user?.bio || '',
        location: user?.location || '',
        specialization: user?.specialization || '',
        profile_image_url: user?.profile_image_url || ''
    });

    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Sync form with user state when it changes
    useEffect(() => {
        if (user) {
            setFormData({
                full_name: user.full_name || '',
                email: user.email || '',
                phone: user.phone || '',
                bio: user.bio || '',
                location: user.location || '',
                specialization: user.specialization || '',
                profile_image_url: user.profile_image_url || ''
            });
        }
    }, [user]);

    // Auto-clear status message
    useEffect(() => {
        if (status) {
            const timer = setTimeout(() => setStatus(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [status]);

    // Completion percentage logic
    const completionData = useMemo(() => {
        let score = 0;
        const total = 100;
        
        // Weights: Base (40), Phone (15), Bio (15), Location (15), Specialization/Image (15)
        if (formData.full_name && formData.email) score += 40;
        if (formData.phone) score += 15;
        if (formData.bio) score += 15;
        if (formData.location) score += 15;
        if (formData.specialization || formData.profile_image_url) score += 15;
        
        return {
            percentage: score,
            isComplete: score === total,
            remainingItems: [
                !formData.phone && "Phone number",
                !formData.bio && "A short bio",
                !formData.location && "Your location",
                !(formData.specialization || formData.profile_image_url) && (user?.role === 'doctor' ? "Specialization" : "Profile picture")
            ].filter(Boolean) as string[]
        };
    }, [formData, user?.role]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setStatus(null);
        try {
            const res = await api.put('/auth/profile', formData);
            updateUser(res.data);
            setStatus({ type: 'success', message: 'Profile updated successfully!' });
            // Scroll to top to show status
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err: any) {
            setStatus({ type: 'error', message: err.response?.data?.detail || err.message });
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Basic validation
        if (file.size > 10 * 1024 * 1024) {
            setStatus({ type: 'error', message: 'File size exceeds 10MB limit.' });
            return;
        }

        const formDataUpload = new FormData();
        formDataUpload.append('file', file);

        setUploading(true);
        setStatus(null);
        try {
            const res = await api.post('/auth/profile-image', formDataUpload, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            updateUser(res.data.user);
            setStatus({ type: 'success', message: 'Profile picture updated!' });
        } catch (err: any) {
            setStatus({ type: 'error', message: err.response?.data?.detail || 'Failed to upload image' });
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Left Column: Summary & Progress */}
                <div className="lg:col-span-1 space-y-6">
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm"
                    >
                        <div className="relative w-32 h-32 mx-auto mb-4 group">
                            <div className="w-full h-full rounded-full bg-primary/10 flex items-center justify-center border-4 border-white dark:border-slate-800 shadow-md">
                                {formData.profile_image_url ? (
                                    <img src={formData.profile_image_url} alt="Profile" className="w-full h-full rounded-full object-cover" />
                                ) : (
                                    <UserIcon className="w-12 h-12 text-primary" />
                                )}
                                {uploading && (
                                    <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                                    </div>
                                )}
                            </div>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleImageUpload} 
                                className="hidden" 
                                accept="image/*"
                            />
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className="absolute bottom-0 right-0 bg-white dark:bg-slate-800 p-2 rounded-full shadow-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            >
                                <Camera className="w-4 h-4 text-slate-600" />
                            </button>
                        </div>
                        
                        <div className="text-center">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{user?.full_name || 'Guest User'}</h3>
                            <p className="text-sm text-primary font-medium mt-1 uppercase tracking-wider">{user?.role}</p>
                        </div>

                        <div className="mt-8">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Profile Completion</span>
                                <span className="text-sm font-bold text-primary">{completionData.percentage}%</span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                                <motion.div 
                                    className="bg-primary h-full"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${completionData.percentage}%` }}
                                    transition={{ duration: 1, ease: "easeOut" }}
                                />
                            </div>
                            
                            <AnimatePresence>
                                {completionData.remainingItems.length > 0 && (
                                    <motion.div 
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className="mt-4 space-y-2"
                                    >
                                        <p className="text-xs text-slate-500 font-medium">To reach 100%, add:</p>
                                        {completionData.remainingItems.map(item => (
                                            <div key={item} className="flex items-center gap-2 text-xs text-slate-400">
                                                <AlertCircle className="w-3 h-3 text-amber-500" />
                                                {item}
                                            </div>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                            
                            {completionData.isComplete && (
                                <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center gap-2 text-xs text-green-700 dark:text-green-400">
                                    <CheckCircle2 className="w-4 h-4" />
                                    Your profile is fully complete!
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>

                {/* Right Column: Profile Form */}
                <div className="lg:col-span-2">
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm"
                    >
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Account Settings</h2>
                            <p className="text-slate-500 text-sm mt-1">Manage your professional and personal information.</p>
                        </div>

                        {status && (
                            <motion.div 
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`mb-6 p-4 rounded-xl flex items-start gap-3 ${
                                    status.type === 'success' 
                                        ? 'bg-green-50 text-green-800 border border-green-100' 
                                        : 'bg-red-50 text-red-800 border border-red-100'
                                }`}
                            >
                                {status.type === 'success' ? <CheckCircle2 className="w-5 h-5 mt-0.5" /> : <AlertCircle className="w-5 h-5 mt-0.5" />}
                                <div className="text-sm font-medium">{status.message}</div>
                            </motion.div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                                        <UserIcon className="w-4 h-4 text-slate-400" /> Full Name
                                    </label>
                                    <input 
                                        name="full_name"
                                        type="text" 
                                        value={formData.full_name}
                                        onChange={handleChange}
                                        className="w-full rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm focus:border-primary focus:ring-primary dark:text-white sm:text-sm py-3 px-4"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                                        <Mail className="w-4 h-4 text-slate-400" /> Email Address
                                    </label>
                                    <input 
                                        name="email"
                                        type="email" 
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="w-full rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm focus:border-primary focus:ring-primary dark:text-white sm:text-sm py-3 px-4"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                                        <Phone className="w-4 h-4 text-slate-400" /> Phone Number
                                    </label>
                                    <input 
                                        name="phone"
                                        type="text" 
                                        value={formData.phone}
                                        onChange={handleChange}
                                        placeholder="+91 98765-43210"
                                        className="w-full rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm focus:border-primary focus:ring-primary dark:text-white sm:text-sm py-3 px-4"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-slate-400" /> Location
                                    </label>
                                    <input 
                                        name="location"
                                        type="text" 
                                        value={formData.location}
                                        onChange={handleChange}
                                        placeholder="New Delhi, India"
                                        className="w-full rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm focus:border-primary focus:ring-primary dark:text-white sm:text-sm py-3 px-4"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                                        <Camera className="w-4 h-4 text-slate-400" /> Profile Image URL
                                    </label>
                                    <input 
                                        name="profile_image_url"
                                        type="text" 
                                        value={formData.profile_image_url}
                                        onChange={handleChange}
                                        placeholder="https://example.com/image.jpg"
                                        className="w-full rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm focus:border-primary focus:ring-primary dark:text-white sm:text-sm py-3 px-4"
                                    />
                                </div>
                            </div>
                            
                            {user?.role === 'doctor' && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                                        <Briefcase className="w-4 h-4 text-slate-400" /> Specialization
                                    </label>
                                    <input 
                                        name="specialization"
                                        type="text" 
                                        value={formData.specialization}
                                        onChange={handleChange}
                                        placeholder="Radiologist, Cardiologist, etc."
                                        className="w-full rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm focus:border-primary focus:ring-primary dark:text-white sm:text-sm py-3 px-4"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-slate-400" /> Brief Bio
                                </label>
                                <textarea 
                                    name="bio"
                                    rows={4}
                                    value={formData.bio}
                                    onChange={handleChange}
                                    placeholder="Tell us about yourself..."
                                    className="w-full rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm focus:border-primary focus:ring-primary dark:text-white sm:text-sm py-3 px-4"
                                />
                            </div>

                            <div className="pt-4 flex justify-end">
                                <button 
                                    type="submit" 
                                    disabled={loading}
                                    className="flex items-center gap-2 py-3 px-8 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 transition-all active:scale-95"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Saving Changes...
                                        </>
                                    ) : (
                                        <>
                                            Save Profile
                                            <ArrowRight className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}

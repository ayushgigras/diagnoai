import { motion } from 'framer-motion';
import { Activity, Brain, Shield, Zap, Database, Lock, Server, FlaskConical } from 'lucide-react';

const techStack = [
    { name: 'FastAPI', desc: 'High-performance Python backend for AI microservices', icon: Zap, color: 'text-emerald-500' },
    { name: 'React + TypeScript', desc: 'Modern, type-safe frontend with Vite & Tailwind CSS', icon: Activity, color: 'text-cyan-500' },
    { name: 'PostgreSQL', desc: 'Enterprise-grade relational database for patient & report data', icon: Database, color: 'text-blue-500' },
    { name: 'Celery + Redis', desc: 'Distributed task queue for async AI inference processing', icon: Server, color: 'text-orange-500' },
    { name: 'JWT Auth', desc: 'Secure role-based authentication & authorization', icon: Lock, color: 'text-violet-500' },
    { name: 'DenseNet121', desc: 'Pre-trained deep learning model for X-Ray pathology detection', icon: Brain, color: 'text-pink-500' },
    { name: 'Gemini Vision AI', desc: 'Google Generative AI for intelligent lab report OCR & analysis', icon: FlaskConical, color: 'text-amber-500' },
    { name: 'Grad-CAM', desc: 'Explainable AI heatmaps highlighting regions of interest', icon: Shield, color: 'text-red-500' },
];

const features = [
    {
        title: 'X-Ray Analysis',
        desc: 'Upload chest X-rays for AI-powered pathology detection. Our DenseNet121 model identifies conditions like Pneumonia, Cardiomegaly, and Pleural Effusion with Grad-CAM visual explanations.',
    },
    {
        title: 'Lab Report Interpretation',
        desc: 'Upload lab reports (PDF/Image) for automatic OCR extraction using Google Gemini Vision. The AI interprets CBC, Metabolic, Liver, Lipid, and Thyroid panels with clinical insights.',
    },
    {
        title: 'Background Processing',
        desc: 'Heavy AI inference runs asynchronously via Celery workers. The UI stays responsive with real-time status polling — no freezing or timeouts.',
    },
    {
        title: 'Secure by Design',
        desc: 'JWT-based authentication, bcrypt password hashing, file-type validation, UUID-based secure naming, and role-based access control for medical professionals.',
    },
];

const About = () => {
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            {/* Hero */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-16"
            >
                <div className="flex justify-center mb-4">
                    <div className="p-3 bg-primary/10 rounded-2xl">
                        <Activity className="w-10 h-10 text-primary" />
                    </div>
                </div>
                <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
                    About <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">DiagnoAI</span>
                </h1>
                <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
                    An AI-Driven Healthcare Diagnostics platform using <strong>Generative</strong> and <strong>Explainable AI</strong> to assist medical professionals with X-Ray analysis and Lab report interpretation.
                </p>
            </motion.div>

            {/* Problem Statement */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/10 rounded-2xl p-8 mb-16"
            >
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Problem Statement</h2>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    Healthcare diagnostics often require significant time and specialized expertise. DiagnoAI leverages cutting-edge deep learning models and generative AI to provide rapid, explainable diagnostic assistance — empowering doctors with AI-powered second opinions while maintaining full transparency through Grad-CAM heatmap visualizations.
                </p>
            </motion.div>

            {/* Features */}
            <div className="mb-16">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8 text-center">Key Features</h2>
                <div className="grid md:grid-cols-2 gap-6">
                    {features.map((feature, i) => (
                        <motion.div
                            key={feature.title}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15 + i * 0.05 }}
                            className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow"
                        >
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{feature.title}</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{feature.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Tech Stack */}
            <div className="mb-16">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8 text-center">Technology Stack</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {techStack.map((tech, i) => (
                        <motion.div
                            key={tech.name}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2 + i * 0.04 }}
                            className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 text-center hover:border-primary/30 transition-colors"
                        >
                            <tech.icon className={`w-8 h-8 mx-auto mb-3 ${tech.color}`} />
                            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">{tech.name}</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{tech.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Architecture */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 mb-16"
            >
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">System Architecture</h2>
                <div className="grid md:grid-cols-3 gap-6 text-center">
                    <div className="p-4">
                        <div className="text-3xl mb-2">🖥️</div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">Frontend</h3>
                        <p className="text-xs text-slate-500 mt-1">React + Vite + TypeScript + Tailwind CSS</p>
                        <p className="text-xs text-slate-400 mt-1">Auth • Upload • Polling • Results</p>
                    </div>
                    <div className="p-4 border-x border-slate-200 dark:border-slate-700">
                        <div className="text-3xl mb-2">⚡</div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">Backend API</h3>
                        <p className="text-xs text-slate-500 mt-1">FastAPI + SQLAlchemy + JWT + Alembic</p>
                        <p className="text-xs text-slate-400 mt-1">Auth • CRUD • File Validation • Task Queue</p>
                    </div>
                    <div className="p-4">
                        <div className="text-3xl mb-2">🧠</div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">AI Workers</h3>
                        <p className="text-xs text-slate-500 mt-1">Celery + Redis + DenseNet121 + Gemini</p>
                        <p className="text-xs text-slate-400 mt-1">X-Ray Inference • OCR • Grad-CAM</p>
                    </div>
                </div>
            </motion.div>

            {/* Footer Credit */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-center text-sm text-slate-400"
            >
                Built with ❤️ as an AI-Driven Healthcare Diagnostics Mini Project
            </motion.div>
        </div>
    );
};

export default About;

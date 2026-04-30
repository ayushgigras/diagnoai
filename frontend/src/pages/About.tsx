import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Activity, Brain, Shield, Zap, Database, Lock, Server, FlaskConical, GitCommitHorizontal, ExternalLink, RefreshCw } from 'lucide-react';

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

// ─── GitHub Team Config ───────────────────────────────────────────────────────
const GITHUB_REPO = 'ayushgigras/diagnoai';
const TEAM_MEMBERS: Record<string, { label: string; color: string; bg: string; role: string }> = {
    'Manish Saini':    { label: 'Manish',  color: 'text-violet-400', bg: 'bg-violet-500/15 border-violet-500/30', role: 'Backend' },
    'manishsainigvp12@gmail.com': { label: 'Manish', color: 'text-violet-400', bg: 'bg-violet-500/15 border-violet-500/30', role: 'Backend' },
    'sachinchauhaan':  { label: 'Sachin',  color: 'text-cyan-400',   bg: 'bg-cyan-500/15 border-cyan-500/30',     role: 'Frontend' },
    'sachinchauhan3277@gmail.com': { label: 'Sachin', color: 'text-cyan-400', bg: 'bg-cyan-500/15 border-cyan-500/30', role: 'Frontend' },
    'ayushgigras':     { label: 'Ayush',   color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/30', role: 'DevOps' },
    'ayushgigras2567@gmail.com': { label: 'Ayush', color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/30', role: 'DevOps' },
    'Ayush Gigras':    { label: 'Ayush',   color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/30', role: 'DevOps' },
};

// Commit type badge color
const COMMIT_TYPE_COLORS: Record<string, string> = {
    feat: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    fix:  'bg-red-500/20 text-red-400 border-red-500/30',
    test: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    docs: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    chore: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    refactor: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

function getCommitType(message: string) {
    const match = message.match(/^(\w+)(\(.+\))?:/);
    return match ? match[1].toLowerCase() : 'other';
}

function timeAgo(dateStr: string) {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return `${Math.floor(diff)}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

interface GitCommit {
    sha: string;
    html_url: string;
    commit: { message: string; author: { name: string; email: string; date: string } };
    author: { login: string; avatar_url: string } | null;
}

// ─── Component ────────────────────────────────────────────────────────────────
const About = () => {
    const [commits, setCommits] = useState<GitCommit[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [lastRefresh, setLastRefresh] = useState(Date.now());

    const fetchCommits = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch(
                `https://api.github.com/repos/${GITHUB_REPO}/commits?per_page=30`,
                { headers: { Accept: 'application/vnd.github+json' } }
            );
            if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
            const data: GitCommit[] = await res.json();
            setCommits(data);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Failed to fetch commits');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchCommits(); }, [lastRefresh]);

    // Resolve a commit to a known team member (by name or email)
    function resolveMember(c: GitCommit) {
        const name  = c.commit.author.name;
        const email = c.commit.author.email;
        const login = c.author?.login ?? '';
        return TEAM_MEMBERS[name] ?? TEAM_MEMBERS[email] ?? TEAM_MEMBERS[login] ?? null;
    }

    // Only show commits from known team members
    const teamCommits = commits.filter(c => resolveMember(c) !== null).slice(0, 12);

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

            {/* ── Team Activity: Live GitHub Commits ── */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="mb-16"
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-xl">
                            <GitCommitHorizontal className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Team Activity</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Live commits from GitHub</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setLastRefresh(Date.now())}
                        disabled={loading}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-primary/40 hover:text-primary transition-all disabled:opacity-40"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>

                {/* Member legend */}
                <div className="flex flex-wrap gap-2 mb-5">
                    {[
                        { label: 'Manish', role: 'Backend', color: 'text-violet-400', bg: 'bg-violet-500/15 border-violet-500/30' },
                        { label: 'Sachin', role: 'Frontend', color: 'text-cyan-400',   bg: 'bg-cyan-500/15 border-cyan-500/30'   },
                        { label: 'Ayush',  role: 'DevOps',   color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/30' },
                    ].map(m => (
                        <span key={m.label} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${m.bg} ${m.color}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {m.label} · {m.role}
                        </span>
                    ))}
                </div>

                {/* Error state */}
                {error && (
                    <div className="rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 px-5 py-4 text-sm">
                        ⚠️ {error} — GitHub API rate limit ya repo private ho sakta hai.
                    </div>
                )}

                {/* Loading skeleton */}
                {loading && !error && (
                    <div className="space-y-3">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-16 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" style={{ opacity: 1 - i * 0.15 }} />
                        ))}
                    </div>
                )}

                {/* Commit list */}
                {!loading && !error && (
                    <div className="space-y-3">
                        {teamCommits.length === 0 ? (
                            <p className="text-center text-slate-500 py-8">No team commits found.</p>
                        ) : (
                            teamCommits.map((c, i) => {
                                const member = resolveMember(c)!;
                                const type   = getCommitType(c.commit.message);
                                const typeColor = COMMIT_TYPE_COLORS[type] ?? 'bg-slate-500/20 text-slate-400 border-slate-500/30';
                                const title  = c.commit.message.split('\n')[0];
                                const avatar = c.author?.avatar_url;

                                return (
                                    <motion.a
                                        key={c.sha}
                                        href={c.html_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.04 }}
                                        className="flex items-start gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-primary/30 hover:shadow-md transition-all group"
                                    >
                                        {/* Avatar */}
                                        {avatar ? (
                                            <img src={avatar} alt={member.label} className="w-8 h-8 rounded-full ring-2 ring-offset-2 ring-slate-200 dark:ring-slate-700 flex-shrink-0 mt-0.5" />
                                        ) : (
                                            <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold border ${member.bg} ${member.color}`}>
                                                {member.label[0]}
                                            </div>
                                        )}

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${member.bg} ${member.color}`}>
                                                    {member.label}
                                                </span>
                                                <span className={`text-xs px-2 py-0.5 rounded-full border ${typeColor}`}>
                                                    {type}
                                                </span>
                                                <span className="text-xs text-slate-400 ml-auto">
                                                    {timeAgo(c.commit.author.date)}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-700 dark:text-slate-300 truncate">{title}</p>
                                            <p className="text-xs text-slate-400 font-mono mt-0.5">{c.sha.slice(0, 7)}</p>
                                        </div>

                                        <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-primary flex-shrink-0 mt-1 transition-colors" />
                                    </motion.a>
                                );
                            })
                        )}
                    </div>
                )}
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

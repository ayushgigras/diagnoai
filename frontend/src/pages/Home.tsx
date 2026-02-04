import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Scan, FlaskConical, ShieldCheck, Zap, Brain } from 'lucide-react';
import { motion } from 'framer-motion';

const Home = () => {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            {/* Hero Section */}
            <section className="relative overflow-hidden pt-16 pb-32">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10 z-0" />
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="text-center">
                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            className="text-4xl md:text-6xl font-bold tracking-tight text-slate-900 dark:text-white mb-6"
                        >
                            Intelligent Healthcare <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
                                Diagnostics
                            </span>
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="mt-4 text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto"
                        >
                            Empowering healthcare professionals with basic AI-powered analysis for medical imaging and laboratory reports.
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.4 }}
                            className="mt-10 flex justify-center gap-4"
                        >
                            <Link
                                to="/xray"
                                className="group relative px-8 py-3 bg-primary hover:bg-primary/90 text-white rounded-full font-semibold transition-all shadow-lg hover:shadow-primary/30 flex items-center gap-2"
                            >
                                <Scan className="w-5 h-5" />
                                Analyze X-Ray
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </Link>
                            <Link
                                to="/lab"
                                className="group relative px-8 py-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 hover:border-secondary hover:text-secondary rounded-full font-semibold transition-all shadow-lg hover:shadow-secondary/10 flex items-center gap-2"
                            >
                                <FlaskConical className="w-5 h-5" />
                                Analyze Lab Report
                            </Link>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="py-20 bg-white dark:bg-slate-950">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Why DiagnoAI?</h2>
                        <p className="mt-4 text-slate-600 dark:text-slate-400">Advanced features for modern diagnostics</p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {[
                            {
                                icon: <Brain className="w-8 h-8 text-primary" />,
                                title: "AI Powered",
                                desc: "State-of-the-art Deep Learning models for initial screening."
                            },
                            {
                                icon: <Zap className="w-8 h-8 text-amber-500" />,
                                title: "Instant Results",
                                desc: "Get analysis results in seconds, not hours."
                            },
                            {
                                icon: <Scan className="w-8 h-8 text-blue-500" />,
                                title: "Visual Explanations",
                                desc: "Heatmaps and confidence scores help interpret results."
                            },
                            {
                                icon: <ShieldCheck className="w-8 h-8 text-emerald-500" />,
                                title: "Secure & Private",
                                desc: "Data is processed securely and not stored permanently."
                            }
                        ].map((feature, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                viewport={{ once: true }}
                                className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:shadow-xl transition-shadow"
                            >
                                <div className="mb-4 p-3 bg-white dark:bg-slate-800 rounded-xl w-fit shadow-sm">
                                    {feature.icon}
                                </div>
                                <h3 className="text-xl font-semibold mb-2 text-slate-900 dark:text-white">{feature.title}</h3>
                                <p className="text-slate-500 dark:text-slate-400">{feature.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Home;

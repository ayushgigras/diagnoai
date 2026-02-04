import React from 'react';
import { Heart } from 'lucide-react';

const Footer = () => {
    return (
        <footer className="bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row justify-between items-center">
                    <div className="mb-4 md:mb-0">
                        <p className="text-slate-500 text-sm">
                            © {new Date().getFullYear()} DiagnoAI. All rights reserved.
                        </p>
                    </div>
                    <div className="flex flex-col items-center md:items-end">
                        <p className="text-slate-500 text-sm flex items-center">
                            Made with <Heart className="h-4 w-4 text-red-500 mx-1" /> for Healthcare
                        </p>
                        <div className="mt-2 text-xs text-slate-400">
                            Privacy Policy • Terms of Service
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;

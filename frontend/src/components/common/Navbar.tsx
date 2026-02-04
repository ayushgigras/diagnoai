import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Activity, Menu, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useState } from 'react';

const Navbar = () => {
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(false);

    const navLinks = [
        { name: 'Home', path: '/' },
        { name: 'X-Ray Analysis', path: '/xray' },
        { name: 'Lab Analysis', path: '/lab' },
        { name: 'About', path: '/about' },
    ];

    return (
        <nav className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <Link to="/" className="flex items-center space-x-2">
                        <Activity className="h-8 w-8 text-primary" />
                        <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                            DiagnoAI
                        </span>
                    </Link>

                    <div className="hidden md:block">
                        <div className="ml-10 flex items-baseline space-x-4">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.name}
                                    to={link.path}
                                    className={cn(
                                        "px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200",
                                        location.pathname === link.path
                                            ? "bg-primary/10 text-primary"
                                            : "text-slate-600 dark:text-slate-300 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800"
                                    )}
                                >
                                    {link.name}
                                </Link>
                            ))}
                        </div>
                    </div>

                    <div className="md:hidden">
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="p-2 rounded-md text-slate-600 hover:text-primary focus:outline-none"
                        >
                            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile menu */}
            {isOpen && (
                <div className="md:hidden">
                    <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white dark:bg-slate-950 border-b">
                        {navLinks.map((link) => (
                            <Link
                                key={link.name}
                                to={link.path}
                                onClick={() => setIsOpen(false)}
                                className={cn(
                                    "block px-3 py-2 rounded-md text-base font-medium",
                                    location.pathname === link.path
                                        ? "bg-primary/10 text-primary"
                                        : "text-slate-600 dark:text-slate-300 hover:text-primary hover:bg-slate-100"
                                )}
                            >
                                {link.name}
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;

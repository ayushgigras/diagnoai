import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, User as UserIcon, LogOut } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useState } from 'react';
import useAuthStore from '../../store/useAuthStore';

const Navbar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const { isAuthenticated, logout, user } = useAuthStore();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navLinks = [
        { name: 'Home', path: '/' },
        // Only show these in the mapped links if authenticated
        ...(isAuthenticated ? [
            ...(user?.role !== 'admin' ? [
                { name: 'X-Ray Analysis', path: '/xray' },
                { name: 'Lab Analysis', path: '/lab' },
                { name: 'History', path: '/history' },
            ] : [
                { name: 'Admin', path: '/admin' }
            ]),
        ] : []),
        { name: 'About', path: '/about' },
    ];

    return (
        <nav className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <Link to="/" className="flex items-center space-x-3">
                        <img
                            src="/logo.png"
                            alt="DiagnoAI Logo"
                            className="h-10 w-auto object-contain dark:[mix-blend-mode:screen]"
                            style={{ height: 40 }}
                        />
                        <span className="text-2xl font-bold tracking-tight">
                            <span className="text-teal-900 dark:text-blue-500">Diagno</span>
                            <span className="text-teal-900 dark:text-emerald-500">AI</span>
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

                    <div className="hidden md:flex items-center space-x-4">
                        {isAuthenticated ? (
                            <>
                                <Link
                                    to="/profile"
                                    className="flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                                >
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:border-primary/40 transition-colors">
                                        <UserIcon className="w-4 h-4 text-primary" />
                                    </div>
                                    <div className="hidden sm:block text-left">
                                        <div className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-none group-hover:text-primary transition-colors">
                                            {user?.full_name?.split(' ')[0] || 'User'}
                                        </div>
                                        <div className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-tighter mt-1">
                                            {user?.role}
                                        </div>
                                    </div>
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-red-500 transition-colors"
                                >
                                    <LogOut className="w-4 h-4" />
                                    <span className="hidden sm:inline">Logout</span>
                                </button>
                            </>
                        ) : (
                            <div className="flex items-center space-x-2">
                                <Link
                                    to="/login"
                                    className="px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-md transition-colors"
                                >
                                    Sign in
                                </Link>
                                <Link
                                    to="/register"
                                    className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 transition-colors"
                                >
                                    Get Started
                                </Link>
                            </div>
                        )}
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
                        {isAuthenticated ? (
                            <button
                                onClick={() => {
                                    logout();
                                    setIsOpen(false);
                                }}
                                className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10"
                            >
                                Log out
                            </button>
                        ) : (
                            <>
                                <Link
                                    to="/login"
                                    onClick={() => setIsOpen(false)}
                                    className="block px-3 py-2 rounded-md text-base font-medium text-slate-600 dark:text-slate-300 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                    Sign in
                                </Link>
                                <Link
                                    to="/register"
                                    onClick={() => setIsOpen(false)}
                                    className="block px-3 py-2 rounded-md text-base font-medium text-primary hover:bg-primary/10"
                                >
                                    Get Started
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;

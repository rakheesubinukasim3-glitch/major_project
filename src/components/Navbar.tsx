import { NavLink, useNavigate } from 'react-router-dom';
import { Camera, ClipboardList, Home, LogOut, UserPlus, Shield } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuth } from '../contexts/useAuthHook';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const Navbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [showUserMenu, setShowUserMenu] = useState(false);

    // Faculty nav items
    const facultyNavItems = [
        { to: '/', icon: Home, label: 'Dashboard' },
        { to: '/attendance', icon: Camera, label: 'Take Attendance' },
        { to: '/records', icon: ClipboardList, label: 'Records' },
        { to: '/register', icon: UserPlus, label: 'Register Student' },
    ];

    // Admin nav items (primarily for managing students and fines)
    const adminNavItems = [
        { to: '/admin/dashboard', icon: Shield, label: 'Admin Panel' },
        { to: '/records', icon: ClipboardList, label: 'Manage Records' },
        { to: '/register', icon: UserPlus, label: 'Register Student' },
    ];

    const navItems = user?.role === 'admin' ? adminNavItems : facultyNavItems;

    const handleLogout = () => {
        logout();
        navigate('/auth/login');
    };

    return (
        <>
            {/* Main Navbar */}
            <nav className="fixed bottom-0 sm:bottom-6 left-0 sm:left-1/2 sm:-translate-x-1/2 w-full sm:w-auto z-50 px-2 sm:px-8 pt-3 pb-5 sm:py-4 glass-card sm:rounded-2xl rounded-t-2xl sm:border flex items-center justify-around sm:justify-center gap-1 sm:gap-8 shadow-[0_-10px_40px_rgba(0,0,0,0.3)] sm:shadow-2xl">
                {navItems.map(({ to, icon: Icon, label }) => (
                    <NavLink
                        key={to}
                        to={to}
                        className={({ isActive }) =>
                            cn(
                                "flex flex-col items-center gap-1 transition-all duration-300 group p-1 sm:p-0",
                                isActive ? "text-blue-400 sm:scale-110" : "text-slate-400 hover:text-slate-200"
                            )
                        }
                    >
                        <Icon size={22} className="sm:w-6 sm:h-6 group-hover:drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]" />
                        <span className="text-[8px] sm:text-[10px] font-medium uppercase tracking-wider text-center hidden sm:block whitespace-nowrap">{label}</span>
                    </NavLink>
                ))}

                {/* Divider - Only visible on sm and up */}
                <div className="hidden sm:block w-px h-8 bg-white/10"></div>

                {/* User Profile */}
                {user && (
                    <div className="relative">
                        <button
                            onClick={() => setShowUserMenu(!showUserMenu)}
                            className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors p-1 sm:p-0"
                        >
                            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 shadow-inner">
                                {user.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-xs font-medium uppercase hidden sm:inline">{user.role}</span>
                        </button>

                        {/* Dropdown Menu */}
                        <AnimatePresence>
                            {showUserMenu && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="absolute bottom-full right-0 mb-3 w-48 glass-card rounded-lg border border-white/10 overflow-hidden shadow-xl"
                                >
                                    {/* User Info */}
                                    <div className="px-4 py-3 border-b border-white/10 bg-slate-800/50">
                                        <p className="text-sm font-semibold text-slate-200">{user.name}</p>
                                        <p className="text-xs text-slate-400 mt-1">{user.email}</p>
                                        <div className="mt-2 inline-block px-2 py-1 rounded text-xs font-bold uppercase bg-blue-500/20 text-blue-400">
                                            {user.role}
                                        </div>
                                    </div>


                                    {/* Logout Button */}
                                    <button
                                        onClick={handleLogout}
                                        className="w-full px-4 py-3 text-left flex items-center gap-2 text-red-400 hover:bg-red-500/20 transition-colors"
                                    >
                                        <LogOut size={16} />
                                        Sign Out
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </nav>

            {/* Backdrop for menu */}
            {showUserMenu && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowUserMenu(false)}
                />
            )}
        </>
    );
};

export default Navbar;

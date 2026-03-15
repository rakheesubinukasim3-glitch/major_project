import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Phone, Mail, BookOpen, X, Plus, AlertCircle, ArrowLeft, Loader } from 'lucide-react';
import { useAuth } from '../contexts/useAuthHook';
import { DEPARTMENTS, SUBJECTS_BY_DEPARTMENT, type Department } from '../utils/constants';

const FacultyRegister = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { registerFaculty, isLoading, user } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [department, setDepartment] = useState<Department>(DEPARTMENTS[0]);
    const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
    const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [showPassword, setShowPassword] = useState(false);


    const availableSubjectsForAdd = useMemo(() => {
        const subjectsForDepartment: readonly string[] = SUBJECTS_BY_DEPARTMENT[department] ?? [];
        return subjectsForDepartment.filter((s: string) => !selectedSubjects.includes(s));
    }, [department, selectedSubjects]);

    const handleAddSubject = useCallback((subject: string) => {
        setSelectedSubjects(prev => [...prev, subject]);
        setShowSubjectDropdown(false);
    }, []);

    const handleRemoveSubject = useCallback((subject: string) => {
        setSelectedSubjects(prev => prev.filter(s => s !== subject));
    }, []);

    const handleRegister = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage('');

        if (!email || !password || !name || !phone || !department || selectedSubjects.length === 0) {
            setErrorMessage('All fields are required');
            return;
        }

        if (!/^\d{10}$/.test(phone.replace(/\D/g, ''))) {
            setErrorMessage('Please enter a valid 10-digit phone number');
            return;
        }

        if (password !== confirmPassword) {
            setErrorMessage('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setErrorMessage('Password must be at least 6 characters');
            return;
        }

        try {
            const isAdminCreating = user?.role === 'admin';
            const response = await registerFaculty(
                email,
                password,
                name,
                phone,
                department,
                selectedSubjects,
                !isAdminCreating // autoLogin only when self registering
            );
            if (response.success) {
                if (isAdminCreating) {
                    // stay in dashboard context
                    const fromPath = (location.state as { from?: string } | null)?.from;
                    setTimeout(() => navigate(fromPath || '/admin/dashboard'), 800);
                } else {
                    setTimeout(() => navigate('/'), 1500);
                }
            } else {
                setErrorMessage(response.message);
            }
        } catch (err) {
            setErrorMessage('Registration failed. Please try again.');
            console.error('Registration error:', err);
        }
    }, [email, password, confirmPassword, name, phone, department, selectedSubjects, registerFaculty, navigate, user, location]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-4 mb-8"
                >
                    <button
                        onClick={() => {
                            const fromPath = (location.state as { from?: string } | null)?.from;
                            if (fromPath) {
                                navigate(fromPath);
                            } else if (user?.role === 'admin') {
                                navigate('/admin/dashboard');
                            } else {
                                navigate('/auth/register');
                            }
                        }}
                        title="Go back"
                        aria-label="Go back"
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <ArrowLeft size={20} className="text-slate-400" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold gradient-text">Faculty Registration</h1>
                        <p className="text-slate-400">Join our teaching faculty</p>
                    </div>
                </motion.div>

                {/* Form */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card p-8 rounded-2xl border border-white/10"
                >
                    {errorMessage && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-3"
                        >
                            <AlertCircle className="text-red-400" size={20} />
                            <p className="text-red-400 text-sm">{errorMessage}</p>
                        </motion.div>
                    )}

                    <form onSubmit={handleRegister} className="space-y-6">
                        {/* Name */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-200">Full Name *</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Dr. Jane Smith"
                                className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                                disabled={isLoading}
                            />
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-200 flex items-center gap-2">
                                <Mail size={16} />
                                Email Address *
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="jane.smith@school.edu"
                                className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                                disabled={isLoading}
                            />
                        </div>

                        {/* Phone */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-200 flex items-center gap-2">
                                <Phone size={16} />
                                Phone Number *
                            </label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                placeholder="+91 98765 43210"
                                className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                                disabled={isLoading}
                            />
                            {phone && !/^\d{10}$/.test(phone) && (
                                <p className="text-xs text-amber-400">Please enter 10 digits</p>
                            )}
                        </div>

                        {/* Department */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-200 flex items-center gap-2">
                                <Mail size={16} />
                                Department *
                            </label>
                            <select
                                value={department}
                                onChange={(e) => {
                                    setDepartment(e.target.value as Department);
                                    setSelectedSubjects([]);
                                }}
                                className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                                disabled={isLoading}
                            >
                                {DEPARTMENTS.map((dept) => (
                                    <option key={dept} value={dept} className="bg-slate-950">
                                        {dept}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Subjects */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-200 flex items-center gap-2">
                                <BookOpen size={16} />
                                Subjects to Teach *
                            </label>
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setShowSubjectDropdown(!showSubjectDropdown)}
                                    disabled={isLoading || availableSubjectsForAdd.length === 0}
                                    className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-lg text-left flex items-center justify-between hover:border-white/20 transition-all disabled:opacity-50"
                                >
                                    <span className="text-slate-300">
                                        {selectedSubjects.length > 0
                                            ? `${selectedSubjects.length} subject(s) selected`
                                            : 'Select subjects...'}
                                    </span>
                                    <Plus size={18} />
                                </button>

                                {showSubjectDropdown && (
                                    <div className="absolute top-full left-0 right-0 mt-2 z-10 bg-slate-800/90 border border-white/10 rounded-lg backdrop-blur-sm max-h-48 overflow-y-auto">
                                        {availableSubjectsForAdd.length > 0 ? (
                                            availableSubjectsForAdd.map((subject: string) => (
                                                <button
                                                    key={subject}
                                                    type="button"
                                                    onClick={() => handleAddSubject(subject)}
                                                    className="w-full px-4 py-2 text-left hover:bg-blue-500/20 text-slate-200 hover:text-blue-400 transition-colors border-b border-white/5 last:border-0"
                                                >
                                                    + {subject}
                                                </button>
                                            ))
                                        ) : (
                                            <div className="px-4 py-3 text-slate-400 text-sm">
                                                All subjects selected
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {selectedSubjects.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {selectedSubjects.map(subject => (
                                        <div
                                            key={subject}
                                            className="px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/50 flex items-center gap-2 text-sm text-blue-300"
                                        >
                                            {subject}
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveSubject(subject)}
                                                title={`Remove ${subject}`}
                                                aria-label={`Remove ${subject}`}
                                                className="hover:text-blue-200"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-200">Password *</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                                    disabled={isLoading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400"
                                >
                                    {showPassword ? '👁️' : '👁️‍🗨️'}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-200">Confirm Password *</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                                disabled={isLoading}
                            />
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isLoading || !department || selectedSubjects.length === 0}
                            className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
                                isLoading || !department || selectedSubjects.length === 0
                                    ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-500 text-white active:scale-95'
                            }`}
                        >
                            {isLoading ? (
                                <>
                                    <Loader className="animate-spin" size={18} />
                                    Creating Account...
                                </>
                            ) : (
                                'Register as Faculty'
                            )}
                        </button>
                    </form>

                    {/* Login Link */}
                    <p className="text-center text-slate-400 text-sm mt-6">
                        Already have an account?{' '}
                        <button
                            onClick={() => navigate('/auth/login')}
                            className="text-blue-400 hover:text-blue-300 font-semibold"
                        >
                            Sign in
                        </button>
                    </p>
                </motion.div>
            </div>
        </div>
    );
};

export default FacultyRegister;

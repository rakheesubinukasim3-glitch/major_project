import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/useAuthHook';

const ResetPassword = () => {
    const navigate = useNavigate();
    const { user, resetFacultyPassword } = useAuth();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasReset, setHasReset] = useState(false);

    useEffect(() => {
        // Only redirect away if the user is not required to reset password AND we haven't just completed a reset.
        if (!user) {
            navigate('/auth/login', { replace: true });
            return;
        }
        if (!user.mustChangePassword && !hasReset) {
            navigate('/', { replace: true });
        }
    }, [navigate, user, hasReset]);

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!password || !confirmPassword) {
            setError('Please fill in all fields');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        if (!user) {
            setError('Unable to update password. Please login again.');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await resetFacultyPassword(user.id, password);
            if (response.success) {
                setHasReset(true);
                setSuccess('Password updated successfully. Redirecting...');
                setTimeout(() => {
                    // After first login password reset, send faculty directly to records page
                    if (user.role === 'faculty') {
                        navigate('/records', { replace: true });
                    } else {
                        navigate('/admin/dashboard', { replace: true });
                    }
                }, 1200);
            } else {
                setError(response.message);
            }
        } finally {
            setIsSubmitting(false);
        }
    }, [confirmPassword, navigate, password, resetFacultyPassword, user]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md"
            >
                <div className="glass-card p-8 rounded-2xl border border-white/10">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold gradient-text">Reset Password</h1>
                        <p className="text-slate-400">Set a new password to continue.</p>
                    </div>

                    {(error || success) && (
                        <div className={`mb-6 p-4 rounded-lg ${error ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'}`}>
                            {error ? (
                                <><AlertCircle className="inline mr-2" size={18} />{error}</>
                            ) : (
                                <><CheckCircle className="inline mr-2" size={18} />{success}</>
                            )}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-200">New Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                                    disabled={isSubmitting}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-200">Confirm New Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                                    disabled={isSubmitting}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
                                isSubmitting
                                    ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-500 text-white active:scale-95'
                            }`}
                        >
                            {isSubmitting ? 'Saving...' : 'Save New Password'}
                        </button>
                    </form>
                </div>
            </motion.div>
        </div>
    );
};

export default ResetPassword;

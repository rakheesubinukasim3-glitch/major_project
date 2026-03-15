import { useState, useCallback, useRef, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogIn, Mail, Lock, AlertCircle, Loader, Camera, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/useAuthHook';
import { getFaceDescriptor } from '../utils/faceApi';

const Login = () => {
    const navigate = useNavigate();
    const { login, isLoading } = useAuth();
    
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<'admin' | 'faculty'>('faculty');
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    // camera readiness state removed (not read elsewhere)
    const [adminDescriptor, setAdminDescriptor] = useState<number[] | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const startCamera = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error('Camera error:', err);
            setError('Unable to access camera');
        }
    }, []);

    const stopCamera = useCallback(() => {
        if (videoRef.current?.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
        }
    }, []);

    useEffect(() => {
        const run = async () => {
            if (role === 'admin') {
                await startCamera();
            } else {
                stopCamera();
                setAdminDescriptor(null);
            }
        };
        run();
    }, [role, startCamera, stopCamera]);

    const handleLogin = useCallback(async (e: FormEvent) => {
        e.preventDefault();
        setError('');

        if (!email.trim() || !password.trim()) {
            setError('Please fill in all fields');
            return;
        }

        if (role === 'admin' && !adminDescriptor) {
            setError('Admin face verification required');
            return;
        }

        try {
            const response = await login(email, password, role, adminDescriptor || undefined);
            if (response.success) {
                if (response.requiresPasswordReset) {
                    navigate('/auth/reset-password');
                    return;
                }
                setTimeout(() => {
                    if (role === 'admin') navigate('/admin/dashboard');
                    else navigate('/');
                }, 500);
            } else {
                setError(response.message);
            }
        } catch (err) {
            setError('Login failed. Please try again.');
            console.error('Login error:', err);
        }
    }, [email, password, role, login, navigate, adminDescriptor]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="w-full max-w-md"
            >
                <div className="glass-card p-8 rounded-2xl border border-white/10">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="flex justify-center mb-4">
                            <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                                <LogIn className="text-blue-400" size={24} />
                            </div>
                        </div>
                        <h1 className="text-3xl font-bold gradient-text mb-2">Welcome Back</h1>
                        <p className="text-slate-400">Sign in to your account</p>
                    </div>

                    {/* Role Selection */}
                    <div className="flex gap-2 mb-6 p-1 bg-slate-900/50 rounded-lg border border-white/10">
                        <button
                            onClick={() => {
                                setRole('faculty');
                                setError('');
                            }}
                            className={`flex-1 py-2 px-4 rounded-md font-semibold transition-all ${
                                role === 'faculty'
                                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20'
                                    : 'text-slate-400 hover:text-slate-300'
                            }`}
                        >
                            Faculty
                        </button>
                        <button
                            onClick={() => {
                                setRole('admin');
                                setError('');
                            }}
                            className={`flex-1 py-2 px-4 rounded-md font-semibold transition-all ${
                                role === 'admin'
                                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/20'
                                    : 'text-slate-400 hover:text-slate-300'
                            }`}
                        >
                            Admin
                        </button>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-3"
                        >
                            <AlertCircle className="text-red-400" size={18} />
                            <p className="text-red-400 text-sm">{error}</p>
                        </motion.div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleLogin} className="space-y-4">
                        {/* Email */}
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-slate-400 uppercase">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="your@email.com"
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-lg focusoutline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-slate-400 uppercase">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pl-10 pr-12 py-2.5 bg-slate-900/50 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                                    disabled={isLoading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-300"
                                >
                                    {showPassword ? '👁️' : '👁️‍🗨️'}
                                </button>
                            </div>
                        </div>

                        {/* Admin face capture */}
                        {role === 'admin' && (
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-slate-400 uppercase">Verify Face</label>
                                <div className="relative">
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        muted
                                        playsInline
                                        className="w-full h-32 object-cover rounded-lg bg-black"
                                    />
                                    <canvas ref={canvasRef} className="hidden" />
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            if (!videoRef.current) return;
                                            try {
                                                const desc = await getFaceDescriptor(videoRef.current);
                                                if (desc) {
                                                    setAdminDescriptor(Array.from(desc));
                                                    setError('');
                                                } else {
                                                    setError('No face detected');
                                                }
                                            } catch (err) {
                                                console.error(err);
                                                setError('Face capture failed');
                                            }
                                        }}
                                        className="px-3 py-1 bg-blue-600 text-white rounded"
                                    >
                                        <Camera size={16} /> Capture
                                    </button>
                                    {adminDescriptor && <CheckCircle className="text-green-400" size={24} />}
                                </div>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`w-full py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
                                isLoading
                                    ? 'bg-slate-600 text-slate-300 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 active:scale-95'
                            }`}
                        >
                            {isLoading ? (
                                <>
                                    <Loader className="animate-spin" size={18} />
                                    Logging in...
                                </>
                            ) : (
                                <>
                                    <LogIn size={18} />
                                    Sign In
                                </>
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-white/10"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-slate-900 text-slate-400">Or</span>
                        </div>
                    </div>

                    {/* Sign Up Link */}
                    <div className="text-center">
                        <p className="text-slate-400 text-sm">
                            Don't have an account?{' '}
                            <button
                                onClick={() => navigate('/auth/register')}
                                className="text-blue-400 hover:text-blue-300 font-semibold transition-colors"
                            >
                                Sign up
                            </button>
                        </p>
                    </div>

                    {/* Demo Credentials */}
                    <div className="mt-6 p-4 rounded-lg bg-slate-800/30 border border-slate-700/50">
                        <p className="text-xs text-slate-400 font-semibold mb-2">Demo Credentials:</p>
                        <p className="text-xs text-slate-500">Faculty: demo@faculty.com</p>
                        <p className="text-xs text-slate-500">Admin: demo@admin.com</p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;

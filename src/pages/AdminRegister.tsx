import { useRef, useState, useCallback, useEffect, useMemo, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Camera, CheckCircle, AlertCircle, ArrowLeft, Loader } from 'lucide-react';
import { useAuth } from '../contexts/useAuthHook';
import { getFaceDescriptor } from '../utils/faceApi';

const AdminRegister = () => {
    const navigate = useNavigate();
    const { registerAdmin, isLoading, user } = useAuth();
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [isCameraReady, setIsCameraReady] = useState(false);
    const [faceImage, setFaceImage] = useState<string | null>(null);
    const [faceDescriptor, setFaceDescriptor] = useState<number[] | null>(null);
    const [status, setStatus] = useState<'idle' | 'capturing' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const startCamera = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setIsCameraReady(true);
            }
        } catch (err) {
            console.error('Camera error:', err);
            setStatus('error');
            setErrorMessage('Failed to access camera. Please check permissions.');
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
            await startCamera();
        };
        run();
        return () => stopCamera();
    }, [startCamera, stopCamera]);

    const capturePhoto = useCallback((): string | undefined => {
        if (!canvasRef.current || !videoRef.current || videoRef.current.videoWidth <= 0) {
            return undefined;
        }
        try {
            const ctx = canvasRef.current.getContext('2d');
            if (!ctx) return undefined;
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
            ctx.drawImage(videoRef.current, 0, 0);
            return canvasRef.current.toDataURL('image/jpeg', 0.8);
        } catch (err) {
            console.warn('Photo capture failed:', err);
            return undefined;
        }
    }, []);

    const handleCaptureFace = useCallback(async () => {
        setStatus('capturing');
        setErrorMessage('');

        const photo = capturePhoto();
        if (!photo) {
            setStatus('error');
            setErrorMessage('Failed to capture photo. Please try again.');
            setTimeout(() => setStatus('idle'), 2500);
            return;
        }

        try {
            // Verify face exists in the image
            const faceDesc = await getFaceDescriptor(videoRef.current!);
            if (!faceDesc) {
                setStatus('error');
                setErrorMessage('No face detected. Please try again.');
                setTimeout(() => setStatus('idle'), 2500);
                return;
            }

            setFaceImage(photo);
            setFaceDescriptor(Array.from(faceDesc));
            setStatus('success');
            setTimeout(() => setStatus('idle'), 2000);
        } catch (err) {
            setStatus('error');
            setErrorMessage('Face detection failed. Please try again.');
            setTimeout(() => setStatus('idle'), 2500);
            console.error('Face capture error:', err);
        }
    }, [capturePhoto]);

    const handleRegister = useCallback(async (e: FormEvent) => {
        e.preventDefault();
        setErrorMessage('');

        if (!email || !password || !name || !faceImage || !faceDescriptor) {
            setErrorMessage('All fields including face capture are required');
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
            // if someone is already logged-in (likely an admin creating another admin)
            const shouldAutoLogin = !user || user.role !== 'admin';
            const response = await registerAdmin(
                email,
                password,
                name,
                faceImage,
                faceDescriptor!,
                shouldAutoLogin
            );
            if (response.success) {
                setStatus('success');
                // choose redirect path depending on context
                setTimeout(() => {
                    if (shouldAutoLogin) {
                        // first‑time registration – send new admin to dashboard
                        navigate('/admin/dashboard');
                    } else {
                        // existing admin created another admin – stay on dashboard
                        navigate('/admin/dashboard');
                    }
                }, 1200);
            } else {
                setErrorMessage(response.message);
            }
        } catch (err) {
            setErrorMessage('Registration failed. Please try again.');
            console.error('Registration error:', err);
        }
    }, [email, password, confirmPassword, name, faceImage, faceDescriptor, registerAdmin, navigate, user]);

    const cameraStatus = useMemo(() => ({
        isReady: isCameraReady,
        text: isCameraReady ? 'Camera Ready' : 'Camera Disconnected',
        color: isCameraReady ? 'bg-emerald-500' : 'bg-red-500'
    }), [isCameraReady]);

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
                        onClick={() => navigate(user?.role === 'admin' ? '/admin/dashboard' : '/auth/register')}
                        title="Go back"
                        aria-label="Go back"
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <ArrowLeft size={20} className="text-slate-400" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold gradient-text">Admin Registration</h1>
                        <p className="text-slate-400">Create your administrator account</p>
                    </div>
                </motion.div>

                {/* Main Content */}
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Camera Section */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="glass-card p-6 rounded-2xl border border-white/10"
                    >
                        <h2 className="text-lg font-semibold text-white mb-4">Face Authentication</h2>

                        {/* Camera Status */}
                        <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-slate-900/50 border border-white/5">
                            <div className={`w-2 h-2 rounded-full ${cameraStatus.color}`}></div>
                            <span className="text-sm text-slate-300">{cameraStatus.text}</span>
                        </div>

                        {/* Video Feed */}
                        <div className="relative mb-4 rounded-xl overflow-hidden bg-slate-800 aspect-video">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-full object-cover"
                            />
                            <canvas ref={canvasRef} className="hidden" />

                            {faceImage && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                    <CheckCircle className="text-emerald-400" size={48} />
                                </div>
                            )}
                        </div>

                        {faceImage ? (
                            <div className="space-y-3">
                                <button
                                    onClick={() => setFaceImage(null)}
                                    className="w-full py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold transition-colors"
                                >
                                    Retake Photo
                                </button>
                                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2">
                                    <CheckCircle className="text-emerald-400" size={18} />
                                    <span className="text-sm text-emerald-400">Face captured successfully</span>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={handleCaptureFace}
                                disabled={!isCameraReady || status === 'capturing'}
                                className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
                                    !isCameraReady || status === 'capturing'
                                        ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                                        : 'bg-blue-600 hover:bg-blue-500 text-white active:scale-95'
                                }`}
                            >
                                {status === 'capturing' ? (
                                    <>
                                        <Loader className="animate-spin" size={18} />
                                        Capturing...
                                    </>
                                ) : (
                                    <>
                                        <Camera size={18} />
                                        Capture Face
                                    </>
                                )}
                            </button>
                        )}
                    </motion.div>

                    {/* Form Section */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="glass-card p-6 rounded-2xl border border-white/10"
                    >
                        <h2 className="text-lg font-semibold text-white mb-6">Account Details</h2>

                        {errorMessage && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2"
                            >
                                <AlertCircle className="text-red-400" size={18} />
                                <p className="text-red-400 text-sm">{errorMessage}</p>
                            </motion.div>
                        )}

                        <form onSubmit={handleRegister} className="space-y-4">
                            {/* Name */}
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-slate-400 uppercase">Full Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="John Doe"
                                    className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                                    disabled={isLoading}
                                />
                            </div>

                            {/* Email */}
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-slate-400 uppercase">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="admin@edu.com"
                                    className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                                    disabled={isLoading}
                                />
                            </div>

                            {/* Password */}
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-slate-400 uppercase">Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                                        disabled={isLoading}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        title={showPassword ? 'Hide password' : 'Show password'}
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400"
                                    >
                                        {showPassword ? '👁️' : '👁️‍🗨️'}
                                    </button>
                                </div>
                            </div>

                            {/* Confirm Password */}
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-slate-400 uppercase">Confirm Password</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full px-4 py-2.5 bg-slate-900/50 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                                    disabled={isLoading}
                                />
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={isLoading || !faceImage}
                                className={`w-full py-2.5 rounded-lg font-semibold transition-all ${
                                    isLoading || !faceImage
                                        ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                                        : 'bg-purple-600 hover:bg-purple-500 text-white active:scale-95'
                                }`}
                            >
                                {isLoading ? 'Creating Account...' : 'Register as Admin'}
                            </button>
                        </form>

                        {/* Login Link */}
                        <p className="text-center text-slate-400 text-sm mt-4">
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
        </div>
    );
};

export default AdminRegister;

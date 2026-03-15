import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Camera, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getFaceDescriptor, calculateFaceDistance } from '../utils/faceApi';
import { saveRegistration, getRegistrations, type FaceRegistration } from '../services/api';
import { DEPARTMENTS } from '../utils/constants';

const Register = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [name, setName] = useState('');
    const [userId, setUserId] = useState('');
    const [admissionNumber, setAdmissionNumber] = useState('');
    const [department, setDepartment] = useState<string>(DEPARTMENTS[0]);
    const [semester, setSemester] = useState('');
    const [studentWhatsApp, setStudentWhatsApp] = useState('');
    const [parentWhatsApp, setParentWhatsApp] = useState('');
    const [registrations, setRegistrations] = useState<FaceRegistration[]>([]);

    const generateUniqueStudentId = useCallback((regs: FaceRegistration[] = registrations) => {
        const existingIds = new Set(regs.map(r => r.id));
        let id = '';
        do {
            id = `STU-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
        } while (existingIds.has(id));
        return id;
    }, [registrations]);

    const generateUniqueAdmissionNumber = useCallback((regs: FaceRegistration[] = registrations) => {
        const existingNumbers = new Set(regs.map(r => r.admissionNumber).filter(Boolean) as string[]);
        let num = '';
        do {
            // Format: ADM-26-XXXX
            const year = new Date().getFullYear().toString().slice(-2);
            num = `ADM-${year}-${Math.floor(1000 + Math.random() * 9000)}`;
        } while (existingNumbers.has(num));
        return num;
    }, [registrations]);

    useEffect(() => {
        const loadRegs = async () => {
            const regs = await getRegistrations();
            setRegistrations(regs);
            setUserId(generateUniqueStudentId(regs));
            setAdmissionNumber(generateUniqueAdmissionNumber(regs));
        };
        loadRegs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const [status, setStatus] = useState<'idle' | 'capturing' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [isCameraReady, setIsCameraReady] = useState(false);

    const startCamera = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setIsCameraReady(true);
            }
        } catch (err) {
            console.error("Camera error:", err);
            setStatus('error');
            setErrorMessage('Failed to access camera. Please ensure permissions are granted.');
        }
    }, []);

    const stopCamera = useCallback(() => {
        if (videoRef.current?.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
        }
    }, []);

    useEffect(() => {
        startCamera();

        // Refresh registrations every 15 seconds but only when visible
        const interval = setInterval(async () => {
            if (!document.hidden) {
                const regs = await getRegistrations();
                setRegistrations(regs);
            }
        }, 15000);

        return () => {
            stopCamera();
            clearInterval(interval);
        };
    }, [startCamera, stopCamera]);

    // Memoized camera status for display
    const cameraStatus = useMemo(() => ({
        isReady: isCameraReady,
        text: isCameraReady ? 'Camera Ready' : 'Camera Disconnected',
        color: isCameraReady ? 'bg-emerald-500' : 'bg-red-500'
    }), [isCameraReady]);

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

    const handleRegister = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !videoRef.current) return;

        if (!userId.trim()) {
            setStatus('error');
            setErrorMessage('ID / Roll Number is required.');
            setTimeout(() => setStatus('idle'), 2500);
            return;
        }

        if (!admissionNumber.trim()) {
            setStatus('error');
            setErrorMessage('Admission number is required.');
            setTimeout(() => setStatus('idle'), 2500);
            return;
        }

        const existing = registrations.find(r => r.id === userId);
        if (existing) {
            setStatus('error');
            setErrorMessage('ID already registered. Use a different ID.');
            setTimeout(() => setStatus('idle'), 2500);
            return;
        }

        setStatus('capturing');
        try {
            const descriptor = await getFaceDescriptor(videoRef.current);
            if (!descriptor) {
                throw new Error('No face detected. Ensure good lighting and clear visibility.');
            }

            for (const reg of registrations) {
                const distance = calculateFaceDistance(descriptor, reg.descriptor);
                if (distance < 0.55) { // Stricter AI recognition threshold
                    throw new Error(`Face already registered as "${reg.name}".`);
                }
            }

            const photo = capturePhoto();
            await saveRegistration({
                id: userId,
                admissionNumber,
                name: name.trim(),
                descriptor: Array.from(descriptor),
                photo,
                department: department.trim(),
                semester: semester.trim(),
                studentWhatsApp: studentWhatsApp.trim(),
                parentWhatsApp: parentWhatsApp.trim()
            });

            const updatedRegistrations = await getRegistrations();
            setRegistrations(updatedRegistrations);

            // Generate a fresh id + admission number for the next student using the latest registrations
            const existingIds = new Set(updatedRegistrations.map(r => r.id));
            let nextId = '';
            do {
                nextId = `STU-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
            } while (existingIds.has(nextId));

            const existingAdmissionNumbers = new Set(updatedRegistrations.map(r => r.admissionNumber).filter(Boolean) as string[]);
            let nextAdmission = '';
            do {
                const year = new Date().getFullYear().toString().slice(-2);
                nextAdmission = `ADM-${year}-${Math.floor(1000 + Math.random() * 9000)}`;
            } while (existingAdmissionNumbers.has(nextAdmission));

            setUserId(nextId);
            setAdmissionNumber(nextAdmission);

            setStatus('success');
            setName('');
            setDepartment(DEPARTMENTS[0]);
            setSemester('');
            setStudentWhatsApp('');
            setParentWhatsApp('');
            setTimeout(() => setStatus('idle'), 2500);
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Registration failed.';
            setStatus('error');
            setErrorMessage(errorMessage);
            setTimeout(() => setStatus('idle'), 2500);
        }
    }, [name, userId, admissionNumber, registrations, capturePhoto, department, semester, studentWhatsApp, parentWhatsApp]);

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <div className="text-center space-y-2">
                <h1 className="text-4xl font-bold gradient-text">Register Face</h1>
                <p className="text-slate-400">Capture your face to join the attendance system.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                <div className="space-y-4">
                    <div className="relative aspect-video glass-card overflow-hidden bg-black group">
                        <video
                            ref={videoRef}
                            autoPlay
                            muted
                            playsInline
                            className="w-full h-full object-cover"
                        />
                        <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

                        {!isCameraReady && (
                            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
                                <RefreshCw className="animate-spin text-blue-400" size={32} />
                            </div>
                        )}

                        <AnimatePresence>
                            {status === 'capturing' && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 bg-blue-500/20 backdrop-blur-[2px] flex items-center justify-center"
                                >
                                    <div className="text-white font-semibold flex items-center gap-2">
                                        <RefreshCw className="animate-spin" size={20} />
                                        Processing...
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="text-xs text-slate-500 flex items-center gap-2 px-2">
                        <div className={`w-2 h-2 rounded-full ${cameraStatus.color}`} />
                        {cameraStatus.text}
                    </div>
                </div>

                <form onSubmit={handleRegister} className="glass-card p-6 space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="reg-name" className="block text-sm font-medium text-slate-400 mb-1">Full Name</label>
                            <input
                                id="reg-name"
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="John Doe"
                                className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-600"
                            />
                        </div>
                        <div>
                            <label htmlFor="reg-id" className="block text-sm font-medium text-slate-400 mb-1">ID / Roll Number</label>
                            <div className="relative">
                                <input
                                    id="reg-id"
                                    type="text"
                                    required
                                    value={userId}
                                    readOnly
                                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 pr-28 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-600"
                                />
                                <button
                                    type="button"
                                    onClick={() => setUserId(generateUniqueStudentId())}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-2 bg-blue-600/80 hover:bg-blue-600 text-white rounded-lg text-xs"
                                >
                                    Regenerate
                                </button>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="reg-admission" className="block text-sm font-medium text-slate-400 mb-1">Admission Number</label>
                            <div className="relative">
                                <input
                                    id="reg-admission"
                                    type="text"
                                    required
                                    value={admissionNumber}
                                    readOnly
                                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 pr-28 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-600"
                                />
                                <button
                                    type="button"
                                    onClick={() => setAdmissionNumber(generateUniqueAdmissionNumber())}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-2 bg-blue-600/80 hover:bg-blue-600 text-white rounded-lg text-xs"
                                >
                                    Regenerate
                                </button>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="reg-dept" className="block text-sm font-medium text-slate-400 mb-1">Department</label>
                            <select
                                id="reg-dept"
                                value={department}
                                onChange={(e) => setDepartment(e.target.value)}
                                className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                            >
                                {DEPARTMENTS.map((dept) => (
                                    <option key={dept} value={dept} className="bg-slate-950">
                                        {dept}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="reg-sem" className="block text-sm font-medium text-slate-400 mb-1">Semester</label>
                            <input
                                id="reg-sem"
                                type="text"
                                value={semester}
                                onChange={(e) => setSemester(e.target.value)}
                                placeholder="3rd Semester"
                                className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-600"
                            />
                        </div>
                        <div>
                            <label htmlFor="reg-st-whatsapp" className="block text-sm font-medium text-slate-400 mb-1">Student WhatsApp Number</label>
                            <input
                                id="reg-st-whatsapp"
                                type="tel"
                                value={studentWhatsApp}
                                onChange={(e) => setStudentWhatsApp(e.target.value)}
                                placeholder="+1234567890"
                                className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-600"
                            />
                        </div>
                        <div>
                            <label htmlFor="reg-parent-whatsapp" className="block text-sm font-medium text-slate-400 mb-1">Parent WhatsApp Number</label>
                            <input
                                id="reg-parent-whatsapp"
                                type="tel"
                                value={parentWhatsApp}
                                onChange={(e) => setParentWhatsApp(e.target.value)}
                                placeholder="+1234567890"
                                className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-600"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={status === 'capturing' || !isCameraReady}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed py-4 rounded-xl font-semibold shadow-lg shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        <Camera size={20} />
                        Register Now
                    </button>

                    <AnimatePresence>
                        {status === 'success' && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl flex items-center gap-3"
                            >
                                <CheckCircle size={20} />
                                <span className="text-sm">Registration successful! Saved to MongoDB.</span>
                            </motion.div>
                        )}
                        {status === 'error' && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3"
                            >
                                <AlertCircle size={20} />
                                <span className="text-sm">{errorMessage}</span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </form>
            </div>
        </div>
    );
};

export default Register;

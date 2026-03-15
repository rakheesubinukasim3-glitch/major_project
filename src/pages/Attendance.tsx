import { useRef, useState, useEffect, useCallback, useMemo, memo } from 'react';
import { Camera, CheckCircle, AlertCircle, RefreshCw, ClipboardList } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/useAuthHook';
import { getAllFaculties, getRegistrations, saveAttendance, getAttendance, saveFine, getFines, type FaceRegistration, type FineRecord } from '../services/api';
import { detectFace, calculateFaceDistance } from '../utils/faceApi';
import { calculateFineAmount, generateQRCode, generateUPIPaymentString, sendWhatsAppMessage } from '../utils/fineUtils';
import { getCurrentPeriod, getPeriodLateThreshold, getPeriodEnd } from '../utils/periodUtils';
import StudentModal from '../components/StudentModal';

const Attendance = () => {
    const { user } = useAuth();
    const videoRef = useRef<HTMLVideoElement>(null);
    const scanRef = useRef(false);
    const cooldownRef = useRef(0);
    const registrationsRef = useRef<FaceRegistration[]>([]);

    const [facultyDepartment, setFacultyDepartment] = useState<string | null>(null);
    const [registrations, setRegistrations] = useState<FaceRegistration[]>([]);
    const [status, setStatus] = useState<'idle' | 'recognizing' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const [isCameraReady, setIsCameraReady] = useState(false);
    const [lastMarked, setLastMarked] = useState<{ name: string, time: string } | null>(null);
    const [currentPeriod, setCurrentPeriod] = useState<number>(() => getCurrentPeriod() ?? 1);
    const [isPeriodManual, setIsPeriodManual] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalTitle, setModalTitle] = useState('');
    const [modalStudents, setModalStudents] = useState<FaceRegistration[]>([]);

    // Load faculty department info and registrations
    useEffect(() => {
        const loadData = async () => {
            try {
                let dept: string | null = null;
                if (user?.role === 'faculty' && user.id) {
                    const faculties = await getAllFaculties();
                    const found = faculties.find(f => f.id === user.id);
                    dept = found?.department || null;
                }
                setFacultyDepartment(dept);

                const regs = await getRegistrations(dept || undefined);
                setRegistrations(regs);
                registrationsRef.current = regs;
            } catch (err) {
                console.error('Failed to load registrations:', err);
            }
        };
        loadData();
    }, [user]);

    const stopCamera = useCallback(() => {
        if (videoRef.current?.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
        }
    }, []);

    useEffect(() => {
        const initCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { facingMode: { ideal: 'environment' } } 
                });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    setIsCameraReady(true);
                }
            } catch (err) {
                console.error("Camera error:", err);
                setStatus('error');
                setMessage('Failed to access camera.');
            }
        };

        initCamera();

        // Refresh registrations every 15 seconds
        const interval = setInterval(async () => {
            if (!document.hidden) {
                const regs = await getRegistrations(facultyDepartment || undefined);
                setRegistrations(regs);
                registrationsRef.current = regs;
            }
        }, 15000);

        return () => {
            stopCamera();
            clearInterval(interval);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stopCamera]);

    // Keep current period in sync with time
    useEffect(() => {
        const interval = window.setInterval(() => {
            if (!isPeriodManual) {
                setCurrentPeriod(getCurrentPeriod() ?? 1);
            }
        }, 60_000);
        return () => clearInterval(interval);
    }, [isPeriodManual]);

    // Automatic scanning loop
    useEffect(() => {
        if (!isCameraReady) return;

        const autoScan = async () => {
            if (!videoRef.current || scanRef.current) return;
            const currentRegs = registrationsRef.current;
            if (currentRegs.length === 0) return;

            scanRef.current = true;
            try {
                const detection = await detectFace(videoRef.current);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                if (!detection || !(detection as any).descriptor) {
                    scanRef.current = false;
                    return;
                }

                let bestMatch: FaceRegistration | null = null;
                let minDistance = 1.0;
                for (const reg of currentRegs) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const distance = calculateFaceDistance((detection as any).descriptor, reg.descriptor);
                    if (distance < minDistance) {
                        minDistance = distance;
                        if (distance < 0.55) bestMatch = reg;
                    }
                }

                if (bestMatch) {
                    const now = Date.now();
                    if (now - cooldownRef.current < 3000) {
                        scanRef.current = false;
                        return;
                    }

                    const today = new Date().toISOString().split('T')[0];

                    // Check if already marked present for this period (from API)
                    const todayRecords = await getAttendance({ date: today, period: currentPeriod });
                    const alreadyPresent = todayRecords.find(a => a.id === bestMatch!.id && a.status === 'present');
                    if (alreadyPresent) {
                        scanRef.current = false;
                        return;
                    }

                    // Check for existing fines today
                    const allFines = await getFines(facultyDepartment || undefined);
                    const existingUnpaidFineSamePeriod = allFines.find(f =>
                        f.studentId === bestMatch!.id && f.date === today && !f.paid && f.period === currentPeriod
                    );
                    const existingUnpaidFineOtherPeriod = allFines.find(f =>
                        f.studentId === bestMatch!.id && f.date === today && !f.paid && f.period !== currentPeriod
                    );

                    const entryTime = new Date();
                    const lateThreshold = getPeriodLateThreshold(currentPeriod);
                    const periodEnd = getPeriodEnd(currentPeriod);

                    const windowStart = new Date();
                    const windowEnd = new Date();
                    if (currentPeriod <= 3) {
                        windowStart.setHours(9, 40, 0, 0);
                        windowEnd.setHours(12, 30, 0, 0);
                    } else {
                        windowStart.setHours(12, 30, 0, 0);
                        windowEnd.setHours(16, 15, 0, 0);
                    }

                    if (existingUnpaidFineSamePeriod) {
                        setStatus('error');
                        setMessage(`Unpaid fine already exists for ${bestMatch.name} for period P${currentPeriod}. Please pay to mark attendance.`);
                        cooldownRef.current = now;
                        setTimeout(() => setStatus('idle'), 2500);
                        setTimeout(() => { scanRef.current = false; }, 3000);
                        return;
                    }

                    if (entryTime <= lateThreshold) {
                        // On time — mark present
                        await saveAttendance(bestMatch.name, bestMatch.id, currentPeriod, bestMatch.department, bestMatch.semester);
                        cooldownRef.current = now;
                        setStatus('success');
                        setMessage(`✓ ${bestMatch.name} marked present (P${currentPeriod})`);
                        setLastMarked({ name: bestMatch.name, time: new Date().toLocaleTimeString() });
                    } else if (entryTime >= windowStart && entryTime <= windowEnd && entryTime > lateThreshold && entryTime <= periodEnd) {
                        // Late entry within window
                        if (existingUnpaidFineOtherPeriod) {
                            // Already has fine from another period — just mark present
                            await saveAttendance(bestMatch.name, bestMatch.id, currentPeriod, bestMatch.department, bestMatch.semester);
                            cooldownRef.current = now;
                            setStatus('success');
                            setMessage(`✓ ${bestMatch.name} marked present (P${currentPeriod}). Existing unpaid fine remains.`);
                            setLastMarked({ name: bestMatch.name, time: new Date().toLocaleTimeString() });
                        } else {
                            // Issue a fine
                            const fineAmount = calculateFineAmount(entryTime, currentPeriod);
                            const upiString = generateUPIPaymentString(fineAmount);
                            const qrCode = await generateQRCode(upiString);

                            const fine: Omit<FineRecord, 'id'> = {
                                studentId: bestMatch.id,
                                studentName: bestMatch.name,
                                department: bestMatch.department || 'N/A',
                                semester: bestMatch.semester || 'N/A',
                                entryTime: entryTime.toISOString(),
                                fineAmount,
                                date: today,
                                period: currentPeriod,
                                paid: false,
                                qrCode
                            };

                            const fineSaved = await saveFine(fine);
                            if (!fineSaved) {
                                setStatus('error');
                                setMessage(`A fine already exists for ${bestMatch.name} today.`);
                                cooldownRef.current = now;
                                setTimeout(() => setStatus('idle'), 2500);
                                setTimeout(() => { scanRef.current = false; }, 3000);
                                return;
                            }

                            let studentMessageSent = false;
                            let parentMessageSent = false;
                            if (bestMatch.studentWhatsApp) {
                                const studentMessage = `Late Entry Fine Slip\n\nStudent: ${bestMatch.name}\nDepartment: ${bestMatch.department || 'N/A'}\nSemester: ${bestMatch.semester || 'N/A'}\nEntry Time: ${entryTime.toLocaleTimeString()}\nFine: ₹${fineAmount}\n\nUPI Payment: ${upiString}\n\nPlease pay the fine to mark your attendance.`;
                                studentMessageSent = await sendWhatsAppMessage(bestMatch.studentWhatsApp, studentMessage);
                            }
                            if (bestMatch.parentWhatsApp) {
                                const parentMessage = `Late Entry Fine Slip for ${bestMatch.name}\n\nDepartment: ${bestMatch.department || 'N/A'}\nSemester: ${bestMatch.semester || 'N/A'}\nEntry Time: ${entryTime.toLocaleTimeString()}\nFine: ₹${fineAmount}\n\nPlease ensure the fine is paid.`;
                                parentMessageSent = await sendWhatsAppMessage(bestMatch.parentWhatsApp, parentMessage);
                            }

                            let messageStatus = '';
                            if (studentMessageSent && parentMessageSent) {
                                messageStatus = ' WhatsApp notifications sent to student and parent.';
                            } else if (studentMessageSent) {
                                messageStatus = ' WhatsApp notification sent to student.';
                            } else if (parentMessageSent) {
                                messageStatus = ' WhatsApp notification sent to parent.';
                            }

                            setStatus('error');
                            setMessage(`Late entry fine generated for ${bestMatch.name}. Fine: ₹${fineAmount}.${messageStatus}`);
                            cooldownRef.current = now;
                        }
                    } else {
                        setStatus('error');
                        setMessage(`Attendance closed for current period (${currentPeriod}).`);
                        cooldownRef.current = now;
                    }
                    setTimeout(() => setStatus('idle'), 2500);
                    setTimeout(() => { scanRef.current = false; }, 3000);
                    return;
                }
            } catch {
                // ignore detection errors silently
            }
            scanRef.current = false;
        };

        const interval = window.setInterval(autoScan, 1500);
        return () => { clearInterval(interval); };
    }, [isCameraReady, currentPeriod, facultyDepartment]);

    const handleOpenModal = useCallback((title: string, students: FaceRegistration[]) => {
        setModalTitle(title);
        setModalStudents(students);
        setModalOpen(true);
    }, []);

    const StatBox = memo(({ box, index }: { box: { label: string; count: number; color: string; onClick: () => void }, index: number }) => (
        <motion.button
            key={index}
            whileHover={{ y: -5 }}
            whileTap={{ scale: 0.95 }}
            onClick={box.onClick}
            className="glass-card p-6 text-center hover:bg-white/[0.08] transition-all cursor-pointer group"
        >
            <h4 className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">{box.label}</h4>
            <div className={`text-3xl font-bold ${box.color} mt-2`}>{box.count}</div>
            <p className="text-xs text-slate-500 mt-3 group-hover:text-slate-400 transition-colors">Click to view</p>
        </motion.button>
    ));

    const statBoxes = useMemo(() => [
        {
            label: 'Total Registered',
            count: registrations.length,
            color: 'text-blue-400',
            onClick: () => handleOpenModal('All Registered Students', registrations)
        },
        {
            label: 'Student Info',
            count: registrations.length,
            color: 'text-purple-400',
            onClick: () => handleOpenModal('Student Details', registrations)
        }
    ], [registrations, handleOpenModal]);

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-2">
                <h1 className="text-4xl font-bold gradient-text">Take Attendance</h1>
                <p className="text-slate-400">Position your face in the frame for instant recognition.</p>
            </div>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {statBoxes.map((box, i) => (
                    <StatBox key={i} box={box} index={i} />
                ))}
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="relative aspect-video glass-card overflow-hidden bg-black ring-1 ring-white/10">
                        <video
                            ref={videoRef}
                            autoPlay
                            muted
                            playsInline
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 border-2 border-blue-500/20 pointer-events-none" />
                        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-scan z-20" />

                        <AnimatePresence>
                            {status === 'recognizing' && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 bg-blue-500/10 backdrop-blur-[1px] flex items-center justify-center z-30"
                                >
                                    <div className="glass-card px-6 py-3 flex items-center gap-3">
                                        <RefreshCw className="animate-spin text-blue-400" size={20} />
                                        <span className="font-semibold text-blue-100">Analyzing Face...</span>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {!isCameraReady && (
                            <div className="absolute inset-0 flex items-center justify-center bg-slate-950 z-40">
                                <RefreshCw className="animate-spin text-blue-400" size={32} />
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="glass-card p-6 space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <ClipboardList size={20} className="text-blue-400" />
                            Status Feed
                        </h3>

                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm text-slate-400">Current Period</span>
                            <select
                                value={currentPeriod}
                                onChange={(e) => {
                                    const period = Number(e.target.value);
                                    if (!Number.isNaN(period)) {
                                        setCurrentPeriod(period);
                                        setIsPeriodManual(true);
                                    }
                                }}
                                className="text-sm font-semibold text-white bg-white/10 px-3 py-1 rounded-xl outline-none"
                            >
                                {[1, 2, 3, 4, 5, 6].map((p) => (
                                    <option key={p} value={p} className="bg-slate-950">P{p}</option>
                                ))}
                            </select>
                            {isPeriodManual && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsPeriodManual(false);
                                        setCurrentPeriod(getCurrentPeriod() ?? 1);
                                    }}
                                    className="text-xs text-slate-300 bg-white/10 px-2 py-1 rounded-xl hover:bg-white/20 transition"
                                >
                                    Auto
                                </button>
                            )}
                        </div>

                        <div className="min-h-[200px] flex flex-col items-center justify-center text-center p-4">
                            <AnimatePresence mode="wait">
                                {status === 'idle' && (
                                    <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-emerald-600 space-y-2">
                                        <div className="w-12 h-12 rounded-full bg-emerald-500/20 mx-auto flex items-center justify-center animate-pulse">
                                            <Camera size={24} />
                                        </div>
                                        <p className="text-sm font-semibold">Automatic Scanning Active</p>
                                        <p className="text-xs text-slate-400">Faces are being detected automatically.</p>
                                    </motion.div>
                                )}
                                {status === 'success' && (
                                    <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                                        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center mx-auto">
                                            <CheckCircle size={32} className="text-emerald-500" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-emerald-400 text-lg">Success!</h4>
                                            <p className="text-slate-300 text-sm">{message}</p>
                                        </div>
                                    </motion.div>
                                )}
                                {status === 'error' && (
                                    <motion.div key="error" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                                        <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/50 flex items-center justify-center mx-auto">
                                            <AlertCircle size={32} className="text-red-500" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-red-400 text-lg">Late Entry Fine</h4>
                                            <p className="text-slate-300 text-sm">{message}</p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    <AnimatePresence>
                        {lastMarked && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="glass-card p-4 border-emerald-500/20 bg-emerald-500/5"
                            >
                                <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-2">Last Attendance</p>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="font-semibold text-emerald-100">{lastMarked.name}</span>
                                    <span className="text-slate-400">{lastMarked.time}</span>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <StudentModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={modalTitle}
                students={modalStudents}
                onStudentUpdate={async () => {
                    const regs = await getRegistrations(facultyDepartment || undefined);
                    setRegistrations(regs);
                    registrationsRef.current = regs;
                }}
            />
        </div>
    );
};

export default Attendance;

import React, { useState, useCallback, useRef } from 'react';
import { getFaceDescriptor } from '../utils/faceApi';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Edit2, Save, RotateCcw, Camera, Upload, Trash2 } from 'lucide-react';
import { type FaceRegistration, updateStudentInfo, deleteStudent as deleteStudentFromStorage } from '../utils/storage';
import { DEPARTMENTS } from '../utils/constants';

interface StudentModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    students: FaceRegistration[];
    onStudentUpdate?: () => void;
}

const StudentModal = ({ isOpen, onClose, title, students, onStudentUpdate }: StudentModalProps) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editUserId, setEditUserId] = useState('');
    const [editAdmissionNumber, setEditAdmissionNumber] = useState('');
    const [editDepartment, setEditDepartment] = useState('');
    const [editSemester, setEditSemester] = useState('');
    const [editStudentWhatsApp, setEditStudentWhatsApp] = useState('');
    const [editParentWhatsApp, setEditParentWhatsApp] = useState('');
    const [editPhoto, setEditPhoto] = useState<string | undefined>('');
    const [photoInputKey, setPhotoInputKey] = useState(0);
    const [saveError, setSaveError] = useState('');
    const [cameraMode, setCameraMode] = useState(false);
    const [isCameraReady, setIsCameraReady] = useState(false);

    const startCamera = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setIsCameraReady(true);
                setCameraMode(true);
            }
        } catch (err) {
            console.error('Camera error:', err);
            setSaveError('Failed to access camera');
        }
    }, []);

    const stopCamera = useCallback(() => {
        if (videoRef.current?.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            setIsCameraReady(false);
        }
        setCameraMode(false);
    }, []);

    const captureFromCamera = useCallback(() => {
        if (videoRef.current && canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
                canvasRef.current.width = videoRef.current.videoWidth;
                canvasRef.current.height = videoRef.current.videoHeight;
                ctx.drawImage(videoRef.current, 0, 0);
                const photo = canvasRef.current.toDataURL('image/jpeg', 0.8);
                setEditPhoto(photo);
                stopCamera();
                setSaveError('');
            }
        }
    }, [stopCamera]);

    const startEdit = useCallback((student: FaceRegistration) => {
        setEditingId(student.id);
        setEditName(student.name);
        setEditUserId(student.id);
        setEditAdmissionNumber(student.admissionNumber || '');
        setEditDepartment(student.department || DEPARTMENTS[0]);
        setEditSemester(student.semester || '');
        setEditStudentWhatsApp(student.studentWhatsApp || '');
        setEditParentWhatsApp(student.parentWhatsApp || '');
        setEditPhoto(student.photo);
        setSaveError('');
        setCameraMode(false);
        setIsCameraReady(false);
    }, []);

    const cancelEdit = useCallback(() => {
        stopCamera();
        setEditingId(null);
        setEditName('');
        setEditUserId('');
        setEditAdmissionNumber('');
        setEditDepartment(DEPARTMENTS[0]);
        setEditSemester('');
        setEditStudentWhatsApp('');
        setEditParentWhatsApp('');
        setEditPhoto('');
        setSaveError('');
        setPhotoInputKey(prev => prev + 1);
        setCameraMode(false);
    }, [stopCamera]);

    const handlePhotoCapture = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setEditPhoto(event.target?.result as string);
                setCameraMode(false);
                stopCamera();
                setSaveError('');
            };
            reader.readAsDataURL(file);
        }
    }, [stopCamera]);

    const handleSaveEdit = useCallback(async (student: FaceRegistration) => {
        if (!editName.trim()) {
            setSaveError('Name is required');
            return;
        }
        if (!editUserId.trim()) {
            setSaveError('ID is required');
            return;
        }

        try {
            let descriptor: number[] | undefined;
            // if photo changed and is base64 string, attempt to compute new descriptor
            if (editPhoto && editPhoto !== student.photo) {
                const img = new Image();
                img.src = editPhoto;
                await new Promise<void>((resolve) => { img.onload = () => resolve(); img.onerror = () => resolve(); });
                const desc = await getFaceDescriptor(img);
                if (desc) {
                    descriptor = Array.from(desc);
                }
            }

            updateStudentInfo(
                student.id,
                editName.trim(),
                editUserId.trim(),
                editPhoto,
                editDepartment.trim() || undefined,
                editSemester.trim() || undefined,
                editStudentWhatsApp.trim() || undefined,
                editParentWhatsApp.trim() || undefined,
                descriptor
            );
            setEditingId(null);
            setSaveError('');
            setPhotoInputKey(prev => prev + 1);
            setCameraMode(false);
            stopCamera();
            onStudentUpdate?.();
        } catch (error: unknown) {
            setSaveError(error instanceof Error ? error.message : 'Failed to update student');
        }
    }, [editName, editUserId, editDepartment, editSemester, editStudentWhatsApp, editParentWhatsApp, editPhoto, onStudentUpdate, stopCamera]);

    const handleDeleteStudent = useCallback((student: FaceRegistration) => {
        if (window.confirm(`Delete ${student.name} from all records? This action cannot be undone.`)) {
            deleteStudentFromStorage(student.id);
            setEditingId(null);
            setSaveError('');
            onStudentUpdate?.();
        }
    }, [onStudentUpdate]);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        onClick={onClose}
                    >
                        <div
                            className="glass-card max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="border-b border-white/10 p-6 flex items-center justify-between">
                                <h2 className="text-2xl font-bold gradient-text">{title}</h2>
                                <button
                                    onClick={onClose}
                                    title="Close"
                                    className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="overflow-auto flex-1">
                                {students.length === 0 ? (
                                    <div className="flex items-center justify-center h-64 text-slate-400">
                                        <p className="text-center">
                                            <User size={48} className="mx-auto mb-4 opacity-50" />
                                            No students to display
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                                        {students.map((student, i) => (
                                            <motion.div
                                                key={student.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.05 }}
                                                className="glass-card border border-white/10 hover:border-blue-500/30 transition-all group overflow-hidden"
                                            >
                                                {editingId === student.id ? (
                                                    // Edit Mode
                                                    <div className="p-4 space-y-4">
                                                        <h3 className="font-bold text-blue-400">Edit Student</h3>
                                                        
                                                        {/* Photo/Camera Section */}
                                                        <div>
                                                            <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-2">Photo/Face</p>
                                                            
                                                            {cameraMode && isCameraReady ? (
                                                                // Live Camera Mode
                                                                <div className="space-y-3">
                                                                    <div className="relative aspect-square rounded-lg overflow-hidden bg-black border-2 border-blue-500/30">
                                                                        <video
                                                                            ref={videoRef}
                                                                            autoPlay
                                                                            muted
                                                                            playsInline
                                                                            className="w-full h-full object-cover"
                                                                        />
                                                                        <canvas ref={canvasRef} className="hidden" />
                                                                    </div>
                                                                    <div className="flex gap-2">
                                                                        <button
                                                                            onClick={captureFromCamera}
                                                                            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-2 flex items-center justify-center gap-1 text-sm font-semibold transition-all"
                                                                        >
                                                                            <Camera size={16} />
                                                                            Capture
                                                                        </button>
                                                                        <button
                                                                            onClick={stopCamera}
                                                                            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white rounded-lg py-2 flex items-center justify-center gap-1 text-sm font-semibold transition-all"
                                                                        >
                                                                            <RotateCcw size={16} />
                                                                            Close
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                // Photo Display & Upload
                                                                <div className="space-y-3">
                                                                    <div className="relative aspect-square rounded-lg overflow-hidden bg-slate-900/50">
                                                                        {editPhoto ? (
                                                                            <img src={editPhoto} alt="Edit" className="w-full h-full object-cover" />
                                                                        ) : (
                                                                            <div className="w-full h-full flex items-center justify-center">
                                                                                <div className="text-center">
                                                                                    <User size={32} className="mx-auto opacity-50" />
                                                                                    <p className="text-xs text-slate-500 mt-2">No photo</p>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {/* Upload Button */}
                                                                    <label className="block w-full px-3 py-2 bg-blue-600/20 border border-blue-500/30 hover:border-blue-500/60 rounded-lg cursor-pointer text-center text-sm text-blue-400 transition-all font-medium flex items-center justify-center gap-2">
                                                                        <Upload size={16} />
                                                                        Upload Photo
                                                                        <input
                                                                            key={photoInputKey}
                                                                            type="file"
                                                                            accept="image/*"
                                                                            onChange={handlePhotoCapture}
                                                                            className="hidden"
                                                                        />
                                                                    </label>

                                                                    {/* Live Capture Button */}
                                                                    <button
                                                                        onClick={startCamera}
                                                                        className="w-full px-3 py-2 bg-purple-600/20 border border-purple-500/30 hover:border-purple-500/60 rounded-lg text-center text-sm text-purple-400 transition-all font-medium flex items-center justify-center gap-2"
                                                                    >
                                                                        <Camera size={16} />
                                                                        Live Capture
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Name */}
                                                        <div>
                                                            <label className="text-xs text-slate-500 uppercase tracking-wider font-bold">Name</label>
                                                            <input
                                                                type="text"
                                                                value={editName}
                                                                onChange={(e) => setEditName(e.target.value)}
                                                                className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all mt-1"
                                                                placeholder="Full name"
                                                            />
                                                        </div>

                                                        {/* ID */}
                                                        <div>
                                                            <label className="text-xs text-slate-500 uppercase tracking-wider font-bold">ID / Roll</label>
                                                            <input
                                                                type="text"
                                                                value={editUserId}
                                                                onChange={(e) => setEditUserId(e.target.value)}
                                                                className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all mt-1"
                                                                placeholder="ID"
                                                            />
                                                        </div>

                                                        {/* Admission Number */}
                                                        <div>
                                                            <label className="text-xs text-slate-500 uppercase tracking-wider font-bold">Admission Number</label>
                                                            <input
                                                                type="text"
                                                                value={editAdmissionNumber}
                                                                readOnly
                                                                className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all mt-1"
                                                                placeholder="Admission Number"
                                                            />
                                                        </div>

                                                        {/* Department */}
                                                        <div>
                                                            <label htmlFor="edit-department-select" className="text-xs text-slate-500 uppercase tracking-wider font-bold">Department</label>
                                                            <select
                                                                id="edit-department-select"
                                                                value={editDepartment}
                                                                onChange={(e) => setEditDepartment(e.target.value)}
                                                                className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all mt-1"
                                                            >
                                                                {DEPARTMENTS.map((dept) => (
                                                                    <option key={dept} value={dept} className="bg-slate-950">
                                                                        {dept}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>

                                                        {/* Semester */}
                                                        <div>
                                                            <label className="text-xs text-slate-500 uppercase tracking-wider font-bold">Semester</label>
                                                            <input
                                                                type="text"
                                                                value={editSemester}
                                                                onChange={(e) => setEditSemester(e.target.value)}
                                                                className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all mt-1"
                                                                placeholder="Semester"
                                                            />
                                                        </div>

                                                        {/* Student WhatsApp */}
                                                        <div>
                                                            <label className="text-xs text-slate-500 uppercase tracking-wider font-bold">Student WhatsApp</label>
                                                            <input
                                                                type="text"
                                                                value={editStudentWhatsApp}
                                                                onChange={(e) => setEditStudentWhatsApp(e.target.value)}
                                                                className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all mt-1"
                                                                placeholder="Student WhatsApp number"
                                                            />
                                                        </div>

                                                        {/* Parent WhatsApp */}
                                                        <div>
                                                            <label className="text-xs text-slate-500 uppercase tracking-wider font-bold">Parent WhatsApp</label>
                                                            <input
                                                                type="text"
                                                                value={editParentWhatsApp}
                                                                onChange={(e) => setEditParentWhatsApp(e.target.value)}
                                                                className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all mt-1"
                                                                placeholder="Parent WhatsApp number"
                                                            />
                                                        </div>

                                                        {/* Error */}
                                                        {saveError && (
                                                            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded p-2">
                                                                {saveError}
                                                            </div>
                                                        )}

                                                        {/* Buttons */}
                                                        <div className="flex gap-2 pt-2">
                                                            <button
                                                                onClick={() => handleSaveEdit(student)}
                                                                className="flex-1 bg-emerald-600 hover:bg-emerald-500 rounded-lg py-2 flex items-center justify-center gap-1 text-sm font-semibold transition-all"
                                                            >
                                                                <Save size={16} />
                                                                Save
                                                            </button>
                                                            <button
                                                                onClick={cancelEdit}
                                                                className="flex-1 bg-slate-700 hover:bg-slate-600 rounded-lg py-2 flex items-center justify-center gap-1 text-sm font-semibold transition-all"
                                                            >
                                                                <RotateCcw size={16} />
                                                                Cancel
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteStudent(student)}
                                                                className="flex-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg py-2 flex items-center justify-center gap-1 text-sm font-semibold border border-red-500/20 transition-all"
                                                            >
                                                                <Trash2 size={16} />
                                                                Delete
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    // View Mode
                                                    <div className="p-4 space-y-3">
                                                        {/* Photo */}
                                                        <div className="relative aspect-square rounded-lg overflow-hidden bg-slate-900/50">
                                                            {student.photo ? (
                                                                <img
                                                                    src={student.photo}
                                                                    alt={student.name}
                                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center">
                                                                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-2xl">
                                                                        {student.name.charAt(0).toUpperCase()}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Info */}
                                                        <div className="space-y-2">
                                                            <div>
                                                                <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Name</p>
                                                                <p className="text-sm font-semibold text-slate-200">{student.name}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">ID / Roll</p>
                                                                <p className="text-sm font-mono text-blue-400">{student.id}</p>
                                                            </div>
                                                            {student.admissionNumber && (
                                                                <div>
                                                                    <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Admission Number</p>
                                                                    <p className="text-sm font-mono text-blue-400">{student.admissionNumber}</p>
                                                                </div>
                                                            )}
                                                            {student.department && (
                                                                <div>
                                                                    <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Department</p>
                                                                    <p className="text-sm text-slate-200">{student.department}</p>
                                                                </div>
                                                            )}
                                                            {student.semester && (
                                                                <div>
                                                                    <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Semester</p>
                                                                    <p className="text-sm text-slate-200">{student.semester}</p>
                                                                </div>
                                                            )}
                                                            {student.studentWhatsApp && (
                                                                <div>
                                                                    <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Student WhatsApp</p>
                                                                    <p className="text-sm text-slate-200">{student.studentWhatsApp}</p>
                                                                </div>
                                                            )}
                                                            {student.parentWhatsApp && (
                                                                <div>
                                                                    <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Parent WhatsApp</p>
                                                                    <p className="text-sm text-slate-200">{student.parentWhatsApp}</p>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Edit Button */}
                                                        <button
                                                            onClick={() => startEdit(student)}
                                                            className="w-full mt-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded-lg py-2 flex items-center justify-center gap-2 text-sm font-semibold transition-all border border-blue-500/20"
                                                        >
                                                            <Edit2 size={16} />
                                                            Edit
                                                        </button>

                                                        {/* Delete Button */}
                                                        <button
                                                            onClick={() => handleDeleteStudent(student)}
                                                            className="w-full bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg py-2 flex items-center justify-center gap-2 text-sm font-semibold transition-all border border-red-500/20"
                                                        >
                                                            <Trash2 size={16} />
                                                            Delete
                                                        </button>
                                                    </div>
                                                )}
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="border-t border-white/10 p-4 bg-slate-900/30">
                                <p className="text-sm text-slate-400 text-center">
                                    Total: <span className="font-bold text-blue-400">{students.length}</span> student{students.length !== 1 ? 's' : ''}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default React.memo(StudentModal);

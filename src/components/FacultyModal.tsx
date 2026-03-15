import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Edit2, Trash2 } from 'lucide-react';
import { updateFaculty, deleteFaculty, type FacultyUser } from '../services/api';

interface FacultyModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    faculties: FacultyUser[];
    onFacultyUpdate?: () => void;
}

const FacultyModal = ({ isOpen, onClose, title, faculties, onFacultyUpdate }: FacultyModalProps) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    // canvas not used in faculty modal
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [editSubjects, setEditSubjects] = useState('');
    const [editPhoto, setEditPhoto] = useState<string | undefined>('');
    const [photoInputKey, setPhotoInputKey] = useState(0);
    const [saveError, setSaveError] = useState('');

    const startCamera = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
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
        }
        // no-op state updates removed
    }, []);

    // captureFromCamera removed (not used in faculty modal)

    const startEdit = useCallback((faculty: FacultyUser) => {
        setEditingId(faculty.id);
        setEditName(faculty.name);
        setEditEmail(faculty.email);
        setEditPhone(faculty.phone);
        setEditSubjects((faculty.subjects || []).join(', '));
        setEditPhoto(undefined);
        setSaveError('');
    }, []);

    const cancelEdit = useCallback(() => {
        stopCamera();
        setEditingId(null);
        setEditName('');
        setEditEmail('');
        setEditPhone('');
        setEditSubjects('');
        setEditPhoto('');
        setSaveError('');
        setPhotoInputKey(prev => prev + 1);
    }, [stopCamera]);

    const handlePhotoCapture = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setEditPhoto(event.target?.result as string);
                stopCamera();
                setSaveError('');
            };
            reader.readAsDataURL(file);
        }
    }, [stopCamera]);

    const handleSaveEdit = useCallback(async (faculty: FacultyUser) => {
        if (!editName.trim()) {
            setSaveError('Name is required');
            return;
        }
        if (!editEmail.trim()) {
            setSaveError('Email is required');
            return;
        }
        try {
            const subjectsArray = editSubjects.split(',').map(s => s.trim()).filter(Boolean);
            await updateFaculty(faculty.id, {
                name: editName.trim(),
                email: editEmail.trim(),
                phone: editPhone.trim(),
                subjects: subjectsArray,
            });
            setEditingId(null);
            setSaveError('');
            setPhotoInputKey(prev => prev + 1);
            stopCamera();
            onFacultyUpdate?.();
        } catch (error: unknown) {
            setSaveError(error instanceof Error ? error.message : 'Failed to update faculty');
        }
    }, [editName, editEmail, editPhone, editSubjects, editPhoto, onFacultyUpdate, stopCamera]);

    const handleDeleteFaculty = useCallback(async (faculty: FacultyUser) => {
        if (window.confirm(`Delete ${faculty.name} from system? This action cannot be undone.`)) {
            await deleteFaculty(faculty.id);
            setEditingId(null);
            setSaveError('');
            onFacultyUpdate?.();
        }
    }, [onFacultyUpdate]);

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
                                {faculties.length === 0 ? (
                                    <div className="flex items-center justify-center h-64 text-slate-400">
                                        <p className="text-center">
                                            <User size={48} className="mx-auto mb-4 opacity-50" />
                                            No faculties to display
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                                        {faculties.map((fac, i) => (
                                            <motion.div
                                                key={fac.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.05 }}
                                                className="glass-card border border-white/10 hover:border-blue-500/30 transition-all group overflow-hidden"
                                            >
                                                {editingId === fac.id ? (
                                                    // Edit Mode
                                                    <div className="p-4 space-y-4">
                                                        <h3 className="font-bold text-blue-400">Edit Faculty</h3>
                                                        {/* form fields similar to StudentModal */}
                                                        <div>
                                                            <label htmlFor="fac-name" className="block text-sm font-medium text-slate-400 mb-1">Name</label>
                                                            <input
                                                                id="fac-name"
                                                                value={editName}
                                                                onChange={e => setEditName(e.target.value)}
                                                                className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label htmlFor="fac-email" className="block text-sm font-medium text-slate-400 mb-1">Email</label>
                                                            <input
                                                                id="fac-email"
                                                                value={editEmail}
                                                                onChange={e => setEditEmail(e.target.value)}
                                                                className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none"
                                                                type="email"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label htmlFor="fac-phone" className="block text-sm font-medium text-slate-400 mb-1">Phone</label>
                                                            <input
                                                                id="fac-phone"
                                                                value={editPhone}
                                                                onChange={e => setEditPhone(e.target.value)}
                                                                className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none"
                                                                type="tel"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label htmlFor="fac-subjects" className="block text-sm font-medium text-slate-400 mb-1">Subjects (comma separated)</label>
                                                            <input
                                                                id="fac-subjects"
                                                                value={editSubjects}
                                                                onChange={e => setEditSubjects(e.target.value)}
                                                                className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-slate-400 mb-1">Photo</label>
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    key={photoInputKey}
                                                                    type="file"
                                                                    accept="image/*"
                                                                    onChange={handlePhotoCapture}
                                                                    className="hidden"
                                                                    id="fac-photo-input"
                                                                />
                                                                <label htmlFor="fac-photo-input" className="px-3 py-1 bg-slate-700/50 rounded cursor-pointer text-sm">
                                                                    Choose File
                                                                </label>
                                                                <button onClick={startCamera} className="px-3 py-1 bg-blue-600/20 rounded text-sm">
                                                                    Use Camera
                                                                </button>
                                                            </div>
                                                            {editPhoto && <img src={editPhoto} alt="faculty" className="mt-2 w-20 h-20 object-cover rounded" />}
                                                        </div>
                                                        {saveError && <p className="text-sm text-red-400">{saveError}</p>}
                                                        <div className="flex gap-2">
                                                            <button onClick={() => handleSaveEdit(fac)} className="px-4 py-2 bg-green-500 text-white rounded">Save</button>
                                                            <button onClick={cancelEdit} className="px-4 py-2 bg-slate-600 text-white rounded">Cancel</button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    // Display mode
                                                    <div className="p-4 space-y-3">
                                                        <h3 className="font-semibold text-white">{fac.name}</h3>
                                                        <p className="text-xs text-slate-400">{fac.email}</p>
                                                        <p className="text-xs text-slate-400">{fac.phone}</p>
                                                        <p className="text-xs text-slate-400">{(fac.subjects || []).join(', ')}</p>
                                                        <div className="flex gap-2 justify-end">
                                                            <button title="Edit faculty" onClick={() => startEdit(fac)} className="text-blue-400 hover:text-blue-200">
                                                                <Edit2 size={16} />
                                                            </button>
                                                            <button title="Delete faculty" onClick={() => handleDeleteFaculty(fac)} className="text-red-400 hover:text-red-200">
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default React.memo(FacultyModal);

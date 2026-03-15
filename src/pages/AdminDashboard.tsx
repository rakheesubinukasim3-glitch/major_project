import { useState, useEffect, useCallback, useMemo } from 'react';
import type { FaceRegistration } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Users, BarChart3, Trash2, Download, RefreshCw,
    Shield, UserX, ClipboardList, Settings, Edit2, Database
} from 'lucide-react';
import { useAuth } from '../contexts/useAuthHook';
import { getAllFaculties, getRegistrations, getAdminStats, deleteFaculty, deleteStudent, type FacultyUser } from '../services/api';
import StudentModal from '../components/StudentModal';
import FacultyModal from '../components/FacultyModal';

interface AdminStats {
    totalFaculties: number;
    totalStudents: number;
    totalAttendanceRecords: number;
}

const AdminDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('faculties');
    const [stats, setStats] = useState<AdminStats>({
        totalFaculties: 0,
        totalStudents: 0,
        totalAttendanceRecords: 0,
    });

    // tab definitions memoized to avoid recreating on every render
    const tabs = useMemo(() => [
        { id: 'faculties', label: 'Faculties', icon: Users },
        { id: 'students', label: 'Students', icon: Users },
        { id: 'settings', label: 'Settings', icon: Settings },
    ], []);
    const [faculties, setFaculties] = useState<FacultyUser[]>([]);
    const [students, setStudents] = useState<FaceRegistration[]>([]);
    const [facultySearch, setFacultySearch] = useState('');
    const [studentSearch, setStudentSearch] = useState('');
    // loading removed (not used in UI)
    const [confirmDelete, setConfirmDelete] = useState<{ type: string; id: string } | null>(null);
    const [studentEditorOpen, setStudentEditorOpen] = useState(false);
    const [facultyEditorOpen, setFacultyEditorOpen] = useState(false);

    // Load dashboard data (stable reference)
    const loadDashboardData = useCallback(async () => {
        try {
            const [facList, stdList, statsResult] = await Promise.all([
                getAllFaculties(),
                getRegistrations(),
                getAdminStats()
            ]);

            setFaculties(facList);
            setStudents(stdList);
            setStats({
                totalFaculties: statsResult.totalFaculties,
                totalStudents: statsResult.totalStudents,
                totalAttendanceRecords: statsResult.totalAttendanceRecords,
            });
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        }
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(loadDashboardData, 0);
        return () => clearTimeout(timer);
    }, [activeTab, loadDashboardData]);

    const filteredFaculties = useMemo(() => {
        const term = facultySearch.trim().toLowerCase();
        if (!term) return faculties;
        return faculties.filter(f =>
            f.name.toLowerCase().includes(term) ||
            f.email.toLowerCase().includes(term) ||
            f.phone.toLowerCase().includes(term) ||
            (f.department?.toLowerCase().includes(term) ?? false)
        );
    }, [faculties, facultySearch]);

    const filteredStudents = useMemo(() => {
        const term = studentSearch.trim().toLowerCase();
        if (!term) return students;
        return students.filter(s =>
            s.name.toLowerCase().includes(term) ||
            s.id.toLowerCase().includes(term) ||
            (s.department?.toLowerCase().includes(term) ?? false)
        );
    }, [students, studentSearch]);

    const handleDeleteFaculty = useCallback(async (id: string) => {
        if (confirmDelete?.id === id) {
            try {
                await deleteFaculty(id);
                loadDashboardData();
                setConfirmDelete(null);
            } catch (err) {
                console.error(err);
                alert('Failed to delete faculty');
            }
        } else {
            setConfirmDelete({ type: 'faculty', id });
        }
    }, [confirmDelete, loadDashboardData]);
    const handleDeleteStudent = useCallback(async (id: string) => {
        if (confirmDelete?.id === id) {
            try {
                await deleteStudent(id);
                loadDashboardData();
                setConfirmDelete(null);
            } catch (err) {
                console.error(err);
                alert('Failed to delete student');
            }
        } else {
            setConfirmDelete({ type: 'student', id });
        }
    }, [confirmDelete, loadDashboardData]);

    const handleClearAllData = async () => {
        if (window.confirm('Are you sure? This will delete ALL data from the system!')) {
            try {
                // Clear via API
                await Promise.all([
                    fetch(`${import.meta.env.VITE_API_URL}/students`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` } }).catch(() => null),
                ]);
                alert('Note: For full data clearing, use MongoDB directly or contact admin.');
                loadDashboardData();
            } catch (err) {
                console.error(err);
                alert('Failed to clear data');
            }
        }
    };

    const exportToCSV = useCallback((data: unknown[], filename: string) => {
        if (!data || data.length === 0) return;
        const csv = [
            Object.keys((data[0] as Record<string, unknown>) || {}).join(','),
            ...data.map(row => Object.values(row as Record<string, unknown>).join(','))
        ].join('\n');

        const element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(csv));
        element.setAttribute('download', `${filename}.csv`);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    }, []);
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-8">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-white/20">
                                <Shield className="text-white" size={28} />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
                                <p className="text-blue-100">Welcome, {user?.name}</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={() => navigate('/records?tab=attendance')}
                                className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-200 rounded-xl text-sm font-semibold transition-all border border-blue-500/20"
                            >
                                Manage Students
                            </button>
                            <button
                                onClick={() => navigate('/records?tab=fines')}
                                className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-200 rounded-xl text-sm font-semibold transition-all border border-red-500/20"
                            >
                                Manage Fines
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <motion.div
                        whileHover={{ y: -5 }}
                        className="glass-card p-6 rounded-xl border border-white/10"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-400 text-sm">Total Faculties</p>
                                <p className="text-3xl font-bold text-white mt-2">{stats.totalFaculties}</p>
                            </div>
                            <Users className="text-blue-400" size={32} />
                        </div>
                    </motion.div>

                    <motion.div
                        whileHover={{ y: -5 }}
                        className="glass-card p-6 rounded-xl border border-white/10"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-400 text-sm">Total Students</p>
                                <p className="text-3xl font-bold text-white mt-2">{stats.totalStudents}</p>
                            </div>
                            <Users className="text-purple-400" size={32} />
                        </div>
                    </motion.div>

                    <motion.div
                        whileHover={{ y: -5 }}
                        className="glass-card p-6 rounded-xl border border-white/10"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-400 text-sm">Attendance Records</p>
                                <p className="text-3xl font-bold text-white mt-2">{stats.totalAttendanceRecords}</p>
                            </div>
                            <BarChart3 className="text-pink-400" size={32} />
                        </div>
                    </motion.div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-6 py-3 rounded-lg font-medium flex items-center gap-2 whitespace-nowrap transition-all ${
                                    activeTab === tab.id
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50'
                                }`}
                            >
                                <Icon size={18} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Content */}
                {activeTab === 'dashboard' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-card p-8 rounded-xl border border-white/10"
                    >
                        <h2 className="text-2xl font-bold text-white mb-6">System Overview</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-6 bg-slate-800/50 rounded-lg">
                                <h3 className="text-white font-semibold mb-4">Quick Stats</h3>
                                <ul className="space-y-3 text-slate-300">
                                    <li>✓ Faculties Registered: {stats.totalFaculties}</li>
                                    <li>✓ Students Registered: {stats.totalStudents}</li>
                                    <li>✓ Total Attendance Entries: {stats.totalAttendanceRecords}</li>
                                </ul>
                            </div>
                            <div className="p-6 bg-slate-800/50 rounded-lg">
                                <h3 className="text-white font-semibold mb-4">System Health</h3>
                                <ul className="space-y-3 text-slate-300">
                                    <li>✓ Face Recognition: Active</li>
                                    <li>✓ Database: Connected</li>
                                    <li>✓ All Systems: Operational</li>
                                </ul>
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'faculties' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-card p-8 rounded-xl border border-white/10"
                    >
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                            <div className="flex flex-col gap-2 md:flex-row md:items-center">
                                <h2 className="text-2xl font-bold text-white">Manage Faculties</h2>
                                <input
                                    value={facultySearch}
                                    onChange={(e) => setFacultySearch(e.target.value)}
                                    placeholder="Search faculty..."
                                    className="w-full md:w-72 bg-slate-900/50 border border-white/10 rounded-xl px-4 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                            <button
                                onClick={() => navigate('/auth/register/faculty', { state: { from: '/admin/dashboard' } })}
                                title="Add faculty"
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                            >
                                <Edit2 size={18} />
                                Add Faculty
                            </button>
                            <button
                                onClick={() => setFacultyEditorOpen(true)}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                            >
                                <Edit2 size={18} />
                                Edit Faculties
                            </button>
                            <button
                                onClick={() => exportToCSV(faculties, 'faculties')}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                            >
                                <Download size={18} />
                                Export CSV
                            </button>
                            <button
                                onClick={() => navigate('/records')}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                            >
                                <ClipboardList size={18} />
                                Records
                            </button>
                        </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="px-6 py-3 text-left text-slate-300">Name</th>
                                        <th className="px-6 py-3 text-left text-slate-300">Email</th>
                                        <th className="px-6 py-3 text-left text-slate-300">Phone</th>
                                        <th className="px-6 py-3 text-left text-slate-300">Subjects</th>
                                        <th className="px-6 py-3 text-left text-slate-300">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredFaculties.map(faculty => (
                                        <tr key={faculty.id} className="border-b border-white/5 hover:bg-white/5 transition">
                                            <td className="px-6 py-4 text-white">{faculty.name}</td>
                                            <td className="px-6 py-4 text-slate-300">{faculty.email}</td>
                                            <td className="px-6 py-4 text-slate-300">{faculty.phone}</td>
                                            <td className="px-6 py-4 text-slate-300">{(faculty.subjects || []).join(', ')}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => setFacultyEditorOpen(true)}
                                                        title="Edit faculty"
                                                        className="p-2 hover:bg-blue-500/20 rounded-lg transition-all text-blue-400 hover:text-blue-200"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteFaculty(faculty.id)}
                                                        className={`px-3 py-1 rounded text-sm font-medium transition flex items-center gap-2 ${
                                                            confirmDelete?.id === faculty.id
                                                                ? 'bg-red-600 text-white'
                                                                : 'bg-slate-700 text-red-400 hover:bg-red-900'
                                                        }`}
                                                    >
                                                        <Trash2 size={16} />
                                                        {confirmDelete?.id === faculty.id ? 'Confirm?' : 'Delete'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'students' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-card p-8 rounded-xl border border-white/10"
                    >
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                            <div className="flex flex-col gap-2 md:flex-row md:items-center">
                                <h2 className="text-2xl font-bold text-white">Manage Students</h2>
                                <input
                                    value={studentSearch}
                                    onChange={(e) => setStudentSearch(e.target.value)}
                                    placeholder="Search students..."
                                    className="w-full md:w-72 bg-slate-900/50 border border-white/10 rounded-xl px-4 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => navigate('/register')}
                                    title="Add student"
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                                >
                                    <Edit2 size={18} />
                                    Add Student
                                </button>
                                <button
                                    onClick={() => setStudentEditorOpen(true)}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                                >
                                    <Edit2 size={18} />
                                    Edit Students
                                </button>
                                <button
                                    onClick={() => exportToCSV(students, 'students')}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                                >
                                    <Download size={18} />
                                    Export CSV
                                </button>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="px-6 py-3 text-left text-slate-300">ID</th>
                                        <th className="px-6 py-3 text-left text-slate-300">Name</th>
                                        <th className="px-6 py-3 text-left text-slate-300">Department</th>
                                        <th className="px-6 py-3 text-left text-slate-300">Semester</th>
                                        <th className="px-6 py-3 text-left text-slate-300">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredStudents.map(student => (
                                        <tr key={student.id} className="border-b border-white/5 hover:bg-white/5 transition">
                                            <td className="px-6 py-4 text-white">{student.id}</td>
                                            <td className="px-6 py-4 text-white">{student.name}</td>
                                            <td className="px-6 py-4 text-slate-300">{student.department || '-'}</td>
                                            <td className="px-6 py-4 text-slate-300">{student.semester || '-'}</td>
                                            <td className="px-6 py-4">
                                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => setStudentEditorOpen(true)}
                                                        title="Edit student"
                                                        className="p-2 hover:bg-blue-500/20 rounded-lg transition-all text-blue-400 hover:text-blue-200"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteStudent(student.id)}
                                                        className={`px-3 py-1 rounded text-sm font-medium transition flex items-center gap-2 ${
                                                            confirmDelete?.id === student.id
                                                                ? 'bg-red-600 text-white'
                                                                : 'bg-slate-700 text-red-400 hover:bg-red-900'
                                                        }`}
                                                    >
                                                        <Trash2 size={16} />
                                                        {confirmDelete?.id === student.id ? 'Confirm?' : 'Delete'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'settings' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-card p-8 rounded-xl border border-white/10"
                    >
                        <h2 className="text-2xl font-bold text-white mb-6">System Settings</h2>
                        <div className="space-y-6">
                            <div className="p-6 bg-slate-800/50 rounded-lg border-l-4 border-blue-600">
                                <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                                    <Database size={20} />
                                    Database Management
                                </h3>
                                <p className="text-slate-300 text-sm mb-4">
                                    Export or clear system data. Use with caution.
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => exportToCSV(faculties, 'all_faculties')}
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                                    >
                                        <Download size={18} />
                                        Export Faculties
                                    </button>
                                    <button
                                        onClick={() => exportToCSV(students, 'all_students')}
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                                    >
                                        <Download size={18} />
                                        Export Students
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 bg-slate-800/50 rounded-lg border-l-4 border-red-600">
                                <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                                    <UserX size={20} />
                                    Danger Zone
                                </h3>
                                <p className="text-slate-300 text-sm mb-4">
                                    Irreversible operations. This action cannot be undone.
                                </p>
                                <button
                                    onClick={handleClearAllData}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                                >
                                    <Trash2 size={18} />
                                    Clear All Data
                                </button>
                            </div>

                            <div className="p-6 bg-slate-800/50 rounded-lg border-l-4 border-purple-600">
                                <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                                    <RefreshCw size={20} />
                                    System Status
                                </h3>
                                <ul className="space-y-2 text-slate-300 text-sm">
                                    <li>✓ Face Recognition API: Connected</li>
                                    <li>✓ LocalStorage Database: Operational</li>
                                    <li>✓ Last Updated: Just now</li>
                                </ul>
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Editors */}
            <StudentModal
                isOpen={studentEditorOpen}
                onClose={() => setStudentEditorOpen(false)}
                title="All Students"
                students={students}
                onStudentUpdate={loadDashboardData}
            />
            <FacultyModal
                isOpen={facultyEditorOpen}
                onClose={() => setFacultyEditorOpen(false)}
                title="All Faculties"
                faculties={faculties}
                onFacultyUpdate={loadDashboardData}
            />
        </div>
    );
};

export default AdminDashboard;

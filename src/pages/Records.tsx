import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Download, Trash2, Search, Calendar, Plus, UserMinus, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    getAttendance, getRegistrations, exportToCSV,
    markAllStudentsAbsentForDay, markAllStudentsAbsentForPeriod,
    toggleAttendanceStatus, deleteAttendanceRecord,
    getFines, markFinePaid, deleteFine, generateMissingQRCodes, regenerateFineQRCode,
    getAllFaculties,
    deleteStudent,
    type AttendanceRecord, type FaceRegistration, type FineRecord
} from '../services/api';
import { whatsAppService } from '../utils/whatsappService';
import StudentModal from '../components/StudentModal';
import { useAuth } from '../contexts/useAuthHook';

const MERCHANT_ID = 'rakheesmeppally-1@oksbi';
const ANIMATION_DELAY_MULTIPLIER = 0.05;
const MAX_ANIMATION_DELAY = 0.5;
const TIME_FORMAT_OPTIONS = { hour: '2-digit' as const, minute: '2-digit' as const };
const INITIAL_PERIOD_FILTER = '';
const TAB_TYPES = { ATTENDANCE: 'attendance' as const, FINES: 'fines' as const };

const AttendanceRecordRow = React.memo(({ record, index, onToggleStatus, onDeleteRecord, onDeleteStudent }: {
    record: AttendanceRecord;
    index: number;
    onToggleStatus: (studentId: string, date: string, period: number) => void;
    onDeleteRecord: (timestamp: string) => void;
    onDeleteStudent: (studentId: string, studentName: string) => void;
}) => {
    const formattedTime = useMemo(() =>
        new Date(record.timestamp).toLocaleTimeString([], TIME_FORMAT_OPTIONS),
        [record.timestamp]
    );

    return (
        <motion.tr
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ delay: Math.min(index * ANIMATION_DELAY_MULTIPLIER, MAX_ANIMATION_DELAY) }}
            className="hover:bg-white/[0.02] transition-colors"
        >
            <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold text-xs">
                        {record.name.charAt(0)}
                    </div>
                    <span className="font-medium text-slate-200">{record.name}</span>
                </div>
            </td>
            <td className="px-6 py-4 text-slate-400 text-sm">{record.id}</td>
            <td className="px-6 py-4 text-slate-400 text-sm">{record.date}</td>
            <td className="px-6 py-4 text-slate-200 text-sm">{formattedTime}</td>
            <td className="px-6 py-4 text-slate-200 text-sm">P{record.period}</td>
            <td className="px-6 py-4 text-right">
                <div className="flex flex-col items-end">
                    <span
                        onClick={() => onToggleStatus(record.id, record.date, record.period)}
                        className={`px-2 py-1 text-[10px] font-bold uppercase rounded-md cursor-pointer transition-all hover:scale-105 active:scale-95 ${
                            record.status === 'present'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                                : 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20'
                        }`}>
                        {record.status}
                    </span>
                    {record.remark && (
                        <span className="text-xs text-slate-400 mt-1">{record.remark}</span>
                    )}
                </div>
            </td>
            <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                <button
                    onClick={() => onDeleteRecord(record.timestamp)}
                    className="p-2 hover:bg-red-500/20 rounded-lg transition-all text-red-400 hover:text-red-300"
                    title="Delete record"
                >
                    <Trash2 size={16} />
                </button>
                <button
                    onClick={() => onDeleteStudent(record.id, record.name)}
                    className="p-2 hover:bg-red-500/10 rounded-lg transition-all text-rose-300 hover:text-rose-200"
                    title="Delete student and all their records"
                >
                    <UserMinus size={16} />
                </button>
            </td>
        </motion.tr>
    );
});

const FineSlipCard = React.memo(({ fine, onMarkPaid, onDelete, onQREnlarge, onRegenerateQR, onRefresh }: {
    fine: FineRecord;
    onMarkPaid: (id: string, name: string) => void;
    onDelete: (id: string, name: string) => void;
    onQREnlarge: (qrCode: string) => void;
    onRegenerateQR: (id: string, name: string) => void;
    onRefresh: () => void;
}) => {
    const formattedEntryTime = useMemo(() =>
        new Date(fine.entryTime).toLocaleString(),
        [fine.entryTime]
    );

    return (
        <div className="border border-red-500/20 rounded-lg p-4 bg-red-500/5">
            <div className="flex justify-between items-start mb-3">
                <div>
                    <h4 className="font-semibold text-red-400">{fine.studentName}</h4>
                    <p className="text-sm text-slate-400">{fine.department} - {fine.semester}</p>
                </div>
                <div className="text-right">
                    <p className="text-lg font-bold text-red-400">₹{fine.fineAmount}</p>
                    <p className={`text-xs ${fine.paid ? 'text-green-400' : 'text-amber-400'}`}>
                        {fine.paid ? 'Paid' : 'Unpaid'}
                    </p>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm text-slate-300 mb-3">
                <div><span className="text-slate-500">Entry Time:</span> {formattedEntryTime}</div>
                <div><span className="text-slate-500">Date:</span> {fine.date} (Period {fine.period})</div>
            </div>
            {fine.qrCode && (
                <div className="flex items-center justify-between">
                    <div className="flex flex-col items-center gap-2">
                        <img
                            src={fine.qrCode}
                            alt="Payment QR"
                            className="w-16 h-16 cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => onQREnlarge(fine.qrCode!)}
                        />
                        <div className="text-center">
                            <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Merchant ID</p>
                            <p className="text-sm font-mono text-blue-400 bg-blue-500/10 px-2 py-1 rounded">{MERCHANT_ID}</p>
                        </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {!fine.paid && (
                            <button
                                onClick={() => { if (window.confirm(`Mark fine for ${fine.studentName} as paid?`)) { onMarkPaid(fine.id, fine.studentName); onRefresh(); } }}
                                className="px-3 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded text-sm font-semibold"
                            >Mark as Paid</button>
                        )}
                        <button
                            onClick={() => { if (window.confirm(`Delete fine slip for ${fine.studentName}?`)) { onDelete(fine.id, fine.studentName); onRefresh(); } }}
                            className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-sm font-semibold"
                        >Delete</button>
                        <button
                            onClick={() => { if (window.confirm(`Regenerate QR for ${fine.studentName}?`)) { onRegenerateQR(fine.id, fine.studentName); onRefresh(); } }}
                            className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded text-sm font-semibold"
                        >Regenerate QR</button>
                    </div>
                </div>
            )}
        </div>
    );
});

const StatButton = React.memo(({ title, count, onClick, color }: { title: string; count: number; onClick: () => void; color: string; }) => (
    <motion.button whileHover={{ x: 5 }} onClick={onClick} className="w-full text-left flex justify-between items-center p-2 hover:bg-white/5 rounded-lg transition-colors">
        <span className="text-slate-400">{title}</span>
        <span className={`font-bold ${color}`}>{count}</span>
    </motion.button>
));

const getCurrentPeriod = () => {
    const hour = new Date().getHours();
    if (hour >= 8 && hour < 9) return 1;
    if (hour >= 9 && hour < 10) return 2;
    if (hour >= 10 && hour < 11) return 3;
    if (hour >= 11 && hour < 12) return 4;
    if (hour >= 12 && hour < 13) return 5;
    if (hour >= 13 && hour < 14) return 6;
    return undefined;
};

const Records = () => {
    const { user } = useAuth();
    const location = useLocation();

    const [facultyDepartment, setFacultyDepartment] = useState<string | null>(null);
    const [lecturerName, setLecturerName] = useState('');
    const [subjectName, setSubjectName] = useState('');

    const [registrations, setRegistrations] = useState<FaceRegistration[]>([]);
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [fines, setFines] = useState<FineRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [searchTerm, setSearchTerm] = useState('');
    const [filterDate, setFilterDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [filterPeriod, setFilterPeriod] = useState<string>(() => getCurrentPeriod()?.toString() ?? INITIAL_PERIOD_FILTER);
    const [activeTab, setActiveTab] = useState<'attendance' | 'fines'>(() => {
        const tab = new URLSearchParams(location.search).get('tab');
        return tab === TAB_TYPES.FINES ? TAB_TYPES.FINES : TAB_TYPES.ATTENDANCE;
    });
    const [modalOpen, setModalOpen] = useState(false);
    const [modalTitle, setModalTitle] = useState('');
    const [modalStudents, setModalStudents] = useState<FaceRegistration[]>([]);
    const [enlargedQR, setEnlargedQR] = useState<string | null>(null);
    const [finesSearch, setFinesSearch] = useState('');

    // Load faculty info
    useEffect(() => {
        const loadFacultyInfo = async () => {
            if (!user || user.role !== 'faculty') return;
            const allFac = await getAllFaculties();
            const found = allFac.find(f => f.id === user.id);
            if (found) {
                setFacultyDepartment(found.department || null);
                setLecturerName(found.name);
                setSubjectName((found.subjects || []).join(', '));
            }
        };
        loadFacultyInfo();
    }, [user]);

    const refreshData = useCallback(async () => {
        try {
            const dept = facultyDepartment || undefined;
            const [allRegs, allAttendance, allFines] = await Promise.all([
                getRegistrations(dept),
                getAttendance(dept ? { department: dept } : {}),
                getFines(dept)
            ]);

            setRegistrations(allRegs);
            setRecords([...allAttendance].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
            setFines([...allFines].sort((a, b) => new Date(b.entryTime).getTime() - new Date(a.entryTime).getTime()));
        } catch (error) {
            console.error('Error loading records:', error);
        } finally {
            setIsLoading(false);
        }
    }, [facultyDepartment]);

    useEffect(() => {
        const timer = window.setTimeout(refreshData, 0);
        const tab = new URLSearchParams(location.search).get('tab');
        if (tab === TAB_TYPES.FINES) setActiveTab(TAB_TYPES.FINES);
        if (tab === TAB_TYPES.ATTENDANCE) setActiveTab(TAB_TYPES.ATTENDANCE);

        const handleVisibilityChange = () => { if (!document.hidden) refreshData(); };
        const interval = setInterval(refreshData, 30000);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearTimeout(timer);
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [location.search, refreshData]);

    const handleExport = useCallback(() => {
        try { exportToCSV(records, `attendance_report_${new Date().toISOString().split('T')[0]}.csv`); }
        catch (error) { console.error('Export failed:', error); alert('Failed to export data'); }
    }, [records]);

    const handleInitializeDay = useCallback(async () => {
        if (registrations.length === 0) { alert('No students registered.'); return; }
        const today = new Date().toISOString().split('T')[0];
        if (window.confirm(`Mark all ${registrations.length} students as absent for all periods on ${today}?`)) {
            await markAllStudentsAbsentForDay(today, facultyDepartment || undefined);
            refreshData();
        }
    }, [registrations.length, refreshData, facultyDepartment]);

    const handleMarkPeriodAbsent = useCallback(async () => {
        if (registrations.length === 0) { alert('No students registered.'); return; }
        const date = filterDate || new Date().toISOString().split('T')[0];
        let period = filterPeriod ? Number(filterPeriod) : NaN;
        if (!period || Number.isNaN(period) || period < 1 || period > 6) {
            const p = window.prompt('Enter period number (1-6):', '1');
            if (!p) return;
            period = Number(p);
            if (Number.isNaN(period) || period < 1 || period > 6) { alert('Invalid period.'); return; }
        }
        if (window.confirm(`Mark all ${registrations.length} students absent for Period ${period} on ${date}?`)) {
            await markAllStudentsAbsentForPeriod(date, period, facultyDepartment || undefined);
            setFilterPeriod(String(period));
            refreshData();
        }
    }, [registrations.length, filterDate, filterPeriod, refreshData, facultyDepartment]);

    const filteredRecords = useMemo(() => {
        return records.filter(record => {
            const matchesSearch = record.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                record.id.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesDate = filterDate ? record.date === filterDate : true;
            const matchesPeriod = filterPeriod ? record.period === Number(filterPeriod) : true;
            return matchesSearch && matchesDate && matchesPeriod;
        });
    }, [records, searchTerm, filterDate, filterPeriod]);

    const filteredFines = useMemo(() => {
        const term = finesSearch.trim().toLowerCase();
        if (!term) return fines;
        return fines.filter(f => f.studentName.toLowerCase().includes(term) || f.studentId.toLowerCase().includes(term));
    }, [fines, finesSearch]);

    const dateToCheck = useMemo(() => filterDate || new Date().toISOString().split('T')[0], [filterDate]);

    const statsData = useMemo(() => {
        const attendanceForDate = records.filter(r => r.date === dateToCheck && (filterPeriod ? r.period === Number(filterPeriod) : true));
        const presentIds = new Set(attendanceForDate.filter(r => r.status === 'present').map(r => r.id));
        const presentCount = presentIds.size;
        const absentStudents = registrations.filter(reg => !presentIds.has(reg.id));
        const presentStudents = registrations.filter(reg => presentIds.has(reg.id));
        return { presentCount, absentStudents, presentStudents, attendanceForDate };
    }, [records, dateToCheck, registrations, filterPeriod]);

    const handleSendWhatsAppReport = useCallback(() => {
        if (statsData.absentStudents.length === 0) { alert('No absent students!'); return; }
        const date = dateToCheck;
        const period = filterPeriod ? `P${filterPeriod}` : 'Multiple';
        let message = `*━━━━━━━━━━━━━━━━━━━*\n*📋 ATTENDANCE REPORT*\n📅 *Date:* *${date}*\n*━━━━━━━━━━━━━━━━━━━*\n\n`;
        message += subjectName ? `*${subjectName}*\n\n` : '';
        message += `⏰ *Periods:* *${period}*\n👤 *Marked by:* *${lecturerName}*\n*Total Absentees:* *${statsData.absentStudents.length}*\n\n*ABSENTEE LIST*\n───────────────────\n`;
        statsData.absentStudents.forEach((student, index) => { message += `${index + 1}. ${student.id} . ${student.name}\n`; });
        message += `_were marked as absent!_`;
        whatsAppService.sendMessage('', message);
    }, [statsData, dateToCheck, filterPeriod, lecturerName, subjectName]);

    const handleOpenModal = useCallback((title: string, students: FaceRegistration[]) => {
        setModalTitle(title); setModalStudents(students); setModalOpen(true);
    }, []);

    const handleGenerateQRCodes = useCallback(async () => {
        if (window.confirm('Generate QR codes for all fines that don\'t have them?')) {
            const updated = await generateMissingQRCodes();
            alert(updated ? 'QR codes generated successfully!' : 'All fines already have QR codes.');
            if (updated) refreshData();
        }
    }, [refreshData]);

    const handleToggleStatus = useCallback(async (studentId: string, date: string, period: number) => {
        await toggleAttendanceStatus(studentId, date, period);
        setTimeout(refreshData, 100);
    }, [refreshData]);

    const handleDeleteStudent = useCallback(async (studentId: string, studentName: string) => {
        if (window.confirm(`Delete ${studentName} from all records and registrations? This cannot be undone.`)) {
            await deleteStudent(studentId);
            setTimeout(refreshData, 100);
        }
    }, [refreshData]);

    const handleDeleteRecord = useCallback(async (timestamp: string) => {
        if (window.confirm('Delete this attendance record?')) {
            await deleteAttendanceRecord(timestamp);
            setTimeout(refreshData, 100);
        }
    }, [refreshData]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-bold gradient-text">Records</h1>
                    <p className="text-slate-400">Manage attendance records and fine slips.</p>
                    {lecturerName && <p className="text-slate-300 text-sm mt-1">Lecturer: <span className="font-medium text-slate-100">{lecturerName}</span></p>}
                    {subjectName && <p className="text-slate-300 text-sm">Subject: <span className="font-medium text-slate-100">{subjectName}</span></p>}
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    <button onClick={handleInitializeDay} className="px-4 py-2 bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all border border-purple-500/20">
                        <Plus size={18} /> Initialize Day
                    </button>
                    <button onClick={handleMarkPeriodAbsent} className="px-4 py-2 bg-amber-600/10 hover:bg-amber-600/20 text-amber-400 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all border border-amber-500/20">
                        Mark All Absent (Period)
                    </button>
                    <button onClick={handleSendWhatsAppReport} className="px-4 py-2 bg-green-600/10 hover:bg-green-600/20 text-green-400 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all border border-green-500/20">
                        <MessageCircle size={18} /> WhatsApp Report
                    </button>
                    <button onClick={handleExport} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20">
                        <Download size={18} /> Export CSV
                    </button>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-1 p-1 bg-slate-900/50 rounded-xl border border-white/10">
                <button onClick={() => setActiveTab(TAB_TYPES.ATTENDANCE)} className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${activeTab === TAB_TYPES.ATTENDANCE ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20' : 'text-slate-400 hover:text-slate-300'}`}>
                    Attendance Records
                </button>
                <button onClick={() => setActiveTab(TAB_TYPES.FINES)} className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${activeTab === TAB_TYPES.FINES ? 'bg-red-500/20 text-red-400 border border-red-500/20' : 'text-slate-400 hover:text-slate-300'}`}>
                    Fine Slips ({fines.length})
                </button>
            </div>

            {activeTab === TAB_TYPES.ATTENDANCE && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="md:col-span-1 space-y-6">
                            <div className="glass-card p-6 space-y-6">
                                <h3 className="font-semibold text-slate-200">Filters</h3>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-slate-500 uppercase flex items-center gap-2"><Search size={14} /> Search</label>
                                        <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Name or ID"
                                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-slate-500 uppercase flex items-center gap-2"><Calendar size={14} /> Date</label>
                                        <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)}
                                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 [color-scheme:dark]" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-slate-500 uppercase">Period</label>
                                        <select value={filterPeriod} onChange={(e) => setFilterPeriod(e.target.value)}
                                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                                            <option value="">All Periods</option>
                                            {[1,2,3,4,5,6].map(p => <option key={p} value={String(p)}>Period {p}</option>)}
                                        </select>
                                    </div>
                                    {records.length > 0 && (
                                        <div className="pt-4 border-t border-white/5 space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-400">Total Logs</span>
                                                <span className="font-bold text-blue-400">{records.length}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-400">Showing</span>
                                                <span className="font-bold text-slate-200">{filteredRecords.length}</span>
                                            </div>
                                            <div className="pt-3 border-t border-white/3 space-y-2">
                                                <StatButton title="Total Students" count={registrations.length} onClick={() => handleOpenModal('All Students', registrations)} color="text-blue-400" />
                                                <StatButton title={`Present (${dateToCheck})`} count={statsData.presentCount} onClick={() => handleOpenModal(`Present (${dateToCheck})`, statsData.presentStudents)} color="text-emerald-400" />
                                                <StatButton title="Absent" count={statsData.absentStudents.length} onClick={() => handleOpenModal('Absent Students', statsData.absentStudents)} color="text-red-400" />
                                                {statsData.absentStudents.length > 0 && (
                                                    <div className="mt-2 text-sm text-slate-300 space-y-1 max-h-36 overflow-auto">
                                                        {statsData.absentStudents.map(a => (
                                                            <div key={a.id} className="flex justify-between px-2">
                                                                <span>{a.name}</span>
                                                                <span className="text-slate-400">{a.id}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="md:col-span-3">
                            <div className="glass-card overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-white/5 text-slate-400 text-xs uppercase tracking-wider">
                                            <tr>
                                                <th className="px-6 py-4 font-semibold">User</th>
                                                <th className="px-6 py-4 font-semibold">ID</th>
                                                <th className="px-6 py-4 font-semibold">Date</th>
                                                <th className="px-6 py-4 font-semibold">Time</th>
                                                <th className="px-6 py-4 font-semibold">Period</th>
                                                <th className="px-6 py-4 font-semibold">Status</th>
                                                <th className="px-6 py-4 font-semibold text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            <AnimatePresence mode="popLayout">
                                                {filteredRecords.map((record, i) => (
                                                    <AttendanceRecordRow
                                                        key={record.timestamp}
                                                        record={record}
                                                        index={i}
                                                        onToggleStatus={handleToggleStatus}
                                                        onDeleteRecord={handleDeleteRecord}
                                                        onDeleteStudent={handleDeleteStudent}
                                                    />
                                                ))}
                                            </AnimatePresence>
                                            {filteredRecords.length === 0 && (
                                                <tr>
                                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500 italic">No records found matching your criteria.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {activeTab === TAB_TYPES.FINES && (
                <div className="glass-card p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                        <h3 className="text-xl font-semibold">Fine Slips</h3>
                        <div className="flex flex-wrap gap-2 items-center">
                            <div className="relative">
                                <input type="text" value={finesSearch} onChange={(e) => setFinesSearch(e.target.value)} placeholder="Search fines..."
                                    className="w-full md:w-64 bg-slate-900/50 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            </div>
                            <button onClick={handleGenerateQRCodes} className="px-4 py-2 bg-green-600/10 hover:bg-green-600/20 text-green-400 rounded-lg text-sm font-semibold transition-all border border-green-500/20">
                                Generate Missing QR Codes
                            </button>
                        </div>
                    </div>
                    <div className="space-y-4 max-h-96 overflow-auto">
                        {filteredFines.length === 0 ? (
                            <p className="text-slate-400 text-center py-8">No fines recorded yet.</p>
                        ) : (
                            filteredFines.map(fine => (
                                <FineSlipCard
                                    key={fine.id}
                                    fine={fine}
                                    onMarkPaid={async (id) => { await markFinePaid(id); }}
                                    onDelete={async (id) => { await deleteFine(id); }}
                                    onQREnlarge={(qrCode) => setEnlargedQR(qrCode)}
                                    onRegenerateQR={async (id, name) => {
                                        const newQRCode = await regenerateFineQRCode(id);
                                        if (newQRCode) alert(`QR code regenerated for ${name}!`);
                                        else alert('Failed to regenerate QR code.');
                                    }}
                                    onRefresh={refreshData}
                                />
                            ))
                        )}
                    </div>
                </div>
            )}

            <StudentModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={modalTitle}
                students={modalStudents}
                onStudentUpdate={refreshData}
            />

            {/* Enlarged QR Code Modal */}
            <AnimatePresence>
                {enlargedQR && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setEnlargedQR(null)}
                            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                                onClick={(e) => e.stopPropagation()} className="relative max-w-md w-full">
                                <div className="glass-card p-6 text-center">
                                    <h3 className="text-lg font-semibold text-slate-200 mb-4">Payment QR Code</h3>
                                    <div className="flex justify-center mb-4">
                                        <img src={enlargedQR} alt="Enlarged Payment QR" className="w-64 h-64 border-2 border-white/20 rounded-lg" />
                                    </div>
                                    <div className="mb-4">
                                        <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-2">Merchant ID</p>
                                        <p className="text-lg font-mono text-blue-400 bg-blue-500/10 px-4 py-2 rounded-lg border border-blue-500/20">{MERCHANT_ID}</p>
                                    </div>
                                    <p className="text-sm text-slate-400 mb-4">Scan this QR code to make payment</p>
                                    <button onClick={() => setEnlargedQR(null)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition-all">Close</button>
                                </div>
                            </motion.div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Records;
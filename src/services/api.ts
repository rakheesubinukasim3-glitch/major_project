/**
 * API Service — replaces all localStorage-based storage utility calls.
 * All functions mirror the same API surface as the old storage.ts / authService.ts
 * so that existing page components need minimal changes.
 */

import axios from 'axios';

const envUrl = import.meta.env.VITE_API_URL;
const BASE_URL = envUrl 
    ? envUrl.replace('localhost', window.location.hostname)
    : `http://${window.location.hostname}:5000/api`;

// ─── Axios instance ─────────────────────────────────────────────────────────
const api = axios.create({ baseURL: BASE_URL });

// Attach JWT token to every request automatically
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Types ─────────────────────────────────────────────────────────────────────
export interface FaceRegistration {
    id: string;
    admissionNumber?: string;
    name: string;
    descriptor: number[];
    photo?: string;
    department?: string;
    semester?: string;
    studentWhatsApp?: string;
    parentWhatsApp?: string;
}

export interface AttendanceRecord {
    id: string;
    name: string;
    timestamp: string;
    date: string;
    status: 'present' | 'absent';
    period: number;
    remark?: string;
    department?: string;
    semester?: string;
}

export interface FineRecord {
    id: string;
    studentId: string;
    studentName: string;
    department: string;
    semester: string;
    entryTime: string;
    fineAmount: number;
    date: string;
    period: number;
    paid: boolean;
    qrCode?: string;
}

export interface AuthUser {
    id: string;
    email: string;
    role: 'admin' | 'faculty' | 'student';
    name: string;
    createdAt: string;
    mustChangePassword?: boolean;
    department?: string;
    subjects?: string[];
    phone?: string;
}

export interface FacultyUser {
    id: string;
    email: string;
    name: string;
    phone: string;
    department: string;
    subjects: string[];
    mustChangePassword?: boolean;
    createdAt: string;
}

export interface AuthResponse {
    success: boolean;
    message: string;
    user?: AuthUser;
    token?: string;
    requiresPasswordReset?: boolean;
}

// ─── Token helpers ──────────────────────────────────────────────────────────
export const saveToken = (token: string) => localStorage.setItem('auth_token', token);
export const getToken = () => localStorage.getItem('auth_token');
export const removeToken = () => localStorage.removeItem('auth_token');

export const saveCurrentUser = (user: AuthUser) => localStorage.setItem('auth_user', JSON.stringify(user));
export const getCurrentUser = (): AuthUser | null => {
    try {
        const stored = localStorage.getItem('auth_user');
        return stored ? JSON.parse(stored) : null;
    } catch { return null; }
};
export const removeCurrentUser = () => localStorage.removeItem('auth_user');

// ─── AUTH ────────────────────────────────────────────────────────────────────
export const apiLogin = async (email: string, password: string, role: 'admin' | 'faculty', faceDescriptor?: number[]): Promise<AuthResponse> => {
    try {
        const { data } = await api.post('/auth/login', { email, password, role, faceDescriptor });
        if (data.success && data.token && data.user) {
            saveToken(data.token);
            saveCurrentUser(data.user);
        }
        return data;
    } catch (err: unknown) {
        const error = err as { response?: { data?: { message?: string } } };
        return { success: false, message: error.response?.data?.message || 'Login failed' };
    }
};

export const apiLogout = () => {
    removeToken();
    removeCurrentUser();
};

export const apiRegisterAdmin = async (
    email: string, password: string, name: string,
    faceImage: string, faceDescriptor?: number[], autoLogin: boolean = true
): Promise<AuthResponse> => {
    try {
        const { data } = await api.post('/auth/register/admin', { email, password, name, faceImage, faceDescriptor, autoLogin });
        if (data.success && data.token && data.user && autoLogin) {
            saveToken(data.token);
            saveCurrentUser(data.user);
        }
        return data;
    } catch (err: unknown) {
        const error = err as { response?: { data?: { message?: string } } };
        return { success: false, message: error.response?.data?.message || 'Registration failed' };
    }
};

export const apiRegisterFaculty = async (
    email: string, password: string, name: string,
    phone: string, department: string, subjects: string[], autoLogin: boolean = true
): Promise<AuthResponse> => {
    try {
        const { data } = await api.post('/auth/register/faculty', { email, password, name, phone, department, subjects, autoLogin });
        if (data.success && data.token && data.user && autoLogin) {
            saveToken(data.token);
            saveCurrentUser(data.user);
        }
        return data;
    } catch (err: unknown) {
        const error = err as { response?: { data?: { message?: string } } };
        return { success: false, message: error.response?.data?.message || 'Registration failed' };
    }
};

export const apiResetPassword = async (newPassword: string): Promise<{ success: boolean; message: string }> => {
    try {
        const { data } = await api.put('/auth/password/reset', { newPassword });
        if (data.success) {
            const user = getCurrentUser();
            if (user) { saveCurrentUser({ ...user, mustChangePassword: false }); }
        }
        return data;
    } catch (err: unknown) {
        const error = err as { response?: { data?: { message?: string } } };
        return { success: false, message: error.response?.data?.message || 'Password reset failed' };
    }
};

export const apiResetFacultyPassword = async (facultyId: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
    try {
        const { data } = await api.put(`/faculty/${facultyId}/password`, { newPassword });
        return data;
    } catch (err: unknown) {
        const error = err as { response?: { data?: { message?: string } } };
        return { success: false, message: error.response?.data?.message || 'Password reset failed' };
    }
};

// ─── STUDENTS ────────────────────────────────────────────────────────────────
export const getRegistrations = async (department?: string): Promise<FaceRegistration[]> => {
    try {
        const params = department ? { department } : {};
        const { data } = await api.get('/students', { params });
        return data.students || [];
    } catch { return []; }
};

export const saveRegistration = async (registration: FaceRegistration): Promise<void> => {
    await api.post('/students', {
        id: registration.id,
        admissionNumber: registration.admissionNumber,
        name: registration.name,
        descriptor: registration.descriptor,
        photo: registration.photo,
        department: registration.department,
        semester: registration.semester,
        studentWhatsApp: registration.studentWhatsApp,
        parentWhatsApp: registration.parentWhatsApp,
    });
};

export const updateStudentInfo = async (
    currentId: string, newName: string, newId: string,
    photo?: string, department?: string, semester?: string,
    studentWhatsApp?: string, parentWhatsApp?: string, descriptor?: number[]
): Promise<boolean> => {
    try {
        await api.put(`/students/${currentId}`, { newId, name: newName, photo, department, semester, studentWhatsApp, parentWhatsApp, descriptor });
        return true;
    } catch { return false; }
};

export const deleteStudent = async (id: string): Promise<boolean> => {
    try {
        await api.delete(`/students/${id}`);
        return true;
    } catch { return false; }
};

// ─── ATTENDANCE ──────────────────────────────────────────────────────────────
export const getAttendance = async (filters?: { date?: string; period?: number; department?: string }): Promise<AttendanceRecord[]> => {
    try {
        const { data } = await api.get('/attendance', { params: filters });
        return data.records || [];
    } catch { return []; }
};

export const saveAttendance = async (name: string, id: string, period: number = 1, department?: string, semester?: string): Promise<void> => {
    await api.post('/attendance', { id, name, period, status: 'present', department, semester });
};

export const toggleAttendanceStatus = async (studentId: string, date: string, period: number): Promise<boolean> => {
    try {
        await api.put('/attendance/toggle', { studentId, date, period });
        return true;
    } catch { return false; }
};

export const deleteAttendanceRecord = async (timestamp: string): Promise<void> => {
    await api.delete(`/attendance/${encodeURIComponent(timestamp)}`);
};

export const markAllStudentsAbsentForDay = async (date: string, department?: string): Promise<void> => {
    await api.post('/attendance/mark-absent-day', { date, department });
};

export const markAllStudentsAbsentForPeriod = async (date: string, period: number, department?: string): Promise<void> => {
    await api.post('/attendance/mark-absent-period', { date, period, department });
};

// ─── FINES ───────────────────────────────────────────────────────────────────
export const getFines = async (department?: string): Promise<FineRecord[]> => {
    try {
        const params = department ? { department } : {};
        const { data } = await api.get('/fines', { params });
        return data.fines || [];
    } catch { return []; }
};

export const saveFine = async (fine: Omit<FineRecord, 'id'>): Promise<boolean> => {
    try {
        await api.post('/fines', fine);
        return true;
    } catch { return false; }
};

export const markFinePaid = async (fineId: string): Promise<FineRecord | null> => {
    try {
        const { data } = await api.put(`/fines/${fineId}/paid`);
        return data.fine || null;
    } catch { return null; }
};

export const deleteFine = async (fineId: string): Promise<boolean> => {
    try {
        await api.delete(`/fines/${fineId}`);
        return true;
    } catch { return false; }
};

export const regenerateFineQRCode = async (fineId: string, merchantId: string = 'rakheesmeppally-1@oksbi'): Promise<string | null> => {
    try {
        const { generateFineQRCode } = await import('../utils/fineUtils');
        const fine = (await getFines()).find(f => f.id === fineId);
        if (!fine) return null;
        const qrCode = await generateFineQRCode(fine.fineAmount, merchantId);
        await api.put(`/fines/${fineId}/qr`, { qrCode });
        return qrCode;
    } catch { return null; }
};

export const generateMissingQRCodes = async (merchantId: string = 'rakheesmeppally-1@oksbi'): Promise<boolean> => {
    try {
        const fines = await getFines();
        const { generateFineQRCode } = await import('../utils/fineUtils');
        let updated = false;
        for (const fine of fines) {
            if (!fine.qrCode) {
                const qrCode = await generateFineQRCode(fine.fineAmount, merchantId);
                await api.put(`/fines/${fine.id}/qr`, { qrCode });
                updated = true;
            }
        }
        return updated;
    } catch { return false; }
};

// ─── FACULTY ─────────────────────────────────────────────────────────────────
export const getAllFaculties = async (): Promise<FacultyUser[]> => {
    try {
        const { data } = await api.get('/faculty');
        return data.faculties || [];
    } catch { return []; }
};

export const updateFaculty = async (facultyId: string, updates: Partial<FacultyUser>): Promise<boolean> => {
    try {
        await api.put(`/faculty/${facultyId}`, updates);
        return true;
    } catch { return false; }
};

export const deleteFaculty = async (facultyId: string): Promise<boolean> => {
    try {
        await api.delete(`/faculty/${facultyId}`);
        return true;
    } catch { return false; }
};

export const getAdminStats = async (): Promise<{ totalFaculties: number; totalStudents: number; totalAttendanceRecords: number }> => {
    try {
        const { data } = await api.get('/faculty/stats/summary');
        return data.stats;
    } catch { return { totalFaculties: 0, totalStudents: 0, totalAttendanceRecords: 0 }; }
};

// ─── CSV Export (kept client-side) ───────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(obj => Object.values(obj).join(',')).join('\n');
    const csvContent = `${headers}\n${rows}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export default api;

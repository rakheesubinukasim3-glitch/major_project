// Auth Service for user authentication and role management
// Currently using localStorage for demonstration
// Ready to integrate with Supabase or Firebase

import { getRegistrations, deleteStudent as storageDeleteStudent, type FaceRegistration, type AttendanceRecord } from './storage';

export interface AdminUser {
    id: string;
    email: string;
    password?: string;
    name: string;
    faceImage: string;
    faceDescriptor?: number[]; // stored descriptor for face login
    createdAt: string;
}

export interface FacultyUser {
    id: string;
    email: string;
    password: string;
    name: string;
    phone: string;
    department: string;
    subjects: string[];
    mustChangePassword?: boolean;
    photo?: string;                // optional photo for future face features
    faceDescriptor?: number[];     // optional descriptor if face capture is added
    createdAt: string;
}

export interface StudentUser {
    id: string;
    email?: string;
    name: string;
    faceDescriptor: Float32Array;
    department: string;
    semester: string;
}

export type UserRole = 'admin' | 'faculty' | 'student';

export interface AuthUser {
    id: string;
    email: string;
    role: UserRole;
    name: string;
    createdAt: string;
    // When true, user must set a new password after first login
    mustChangePassword?: boolean;
}

export interface AuthResponse {
    success: boolean;
    message: string;
    user?: AuthUser;
    token?: string;
    requiresPasswordReset?: boolean;
}

class AuthService {
    private static instance: AuthService;
    private currentUser: AuthUser | null = null;
    private STORAGE_KEY = 'auth_user';
    private ADMINS_KEY = 'admins_db';
    private FACULTIES_KEY = 'faculties_db';

    private constructor() {
        this.loadUserFromStorage();
    }

    static getInstance(): AuthService {
        if (!AuthService.instance) {
            AuthService.instance = new AuthService();
        }
        return AuthService.instance;
    }

    // Load user from localStorage
    private loadUserFromStorage(): void {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                this.currentUser = JSON.parse(stored);
            }
        } catch (error) {
            console.error('Error loading user from storage:', error);
            this.currentUser = null;
        }
    }

    // Save user to localStorage
    private saveUserToStorage(user: AuthUser): void {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));
        this.currentUser = user;
    }

    // Register Admin
    /**
     * Register Admin user.
     * @param autoLogin if false the new account will be created but not stored as current session (used when an
     *                   already authenticated admin is creating another admin).
     */
    async registerAdmin(
        email: string,
        password: string,
        name: string,
        faceImage: string,
        faceDescriptor?: number[],
        autoLogin: boolean = true
    ): Promise<AuthResponse> {
        try {
            // Validate inputs
            if (!email || !password || !name || !faceImage) {
                return {
                    success: false,
                    message: 'All fields are required'
                };
            }

            // Check if email already exists
            const existingAdmins = this.getAllAdmins();
            if (existingAdmins.some(a => a.email === email)) {
                return {
                    success: false,
                    message: 'Email already registered as Admin'
                };
            }

            // Create admin user
            const adminId = `admin_${Date.now()}`;
            const user: AuthUser = {
                id: adminId,
                email,
                role: 'admin',
                name,
                createdAt: new Date().toISOString()
            };

            const adminData: AdminUser = {
                id: adminId,
                email,
                password, // store password
                name,
                faceImage,
                faceDescriptor,
                createdAt: new Date().toISOString(),
            };

            // Store admin data
            const allAdmins = this.getAllAdmins();
            allAdmins.push(adminData);
            localStorage.setItem(this.ADMINS_KEY, JSON.stringify(allAdmins));
            try { window.dispatchEvent(new CustomEvent('app:dataChanged', { detail: { type: 'admins' } })); } catch (e) { console.warn('dispatch event failed', e); }

            // Save user session only if requested
            if (autoLogin) {
                this.saveUserToStorage(user);
            }

            return {
                success: true,
                message: 'Admin registered successfully',
                user: autoLogin ? user : undefined,
                token: autoLogin ? this.generateToken(user) : undefined
            };
        } catch (error) {
            return {
                success: false,
                message: 'Registration failed: ' + (error as Error).message
            };
        }
    }

    // Register Faculty
    /**
     * Register Faculty user.
     * @param autoLogin if false the new account will be created but not stored as current session. useful when an
     *                   admin is creating a faculty account from dashboard.
     */
    async registerFaculty(
        email: string,
        password: string,
        name: string,
        phone: string,
        department: string,
        subjects: string[],
        autoLogin: boolean = true
    ): Promise<AuthResponse> {
        try {
            if (!email || !password || !name || !phone || !department || subjects.length === 0) {
                return {
                    success: false,
                    message: 'All fields are required'
                };
            }

            // Check if email already exists
            const faculties = this.getAllFaculties();
            if (faculties.some(f => f.email === email)) {
                return {
                    success: false,
                    message: 'Email already registered as Faculty'
                };
            }

            // Create faculty user
            const facultyId = `faculty_${Date.now()}`;
            const user: AuthUser = {
                id: facultyId,
                email,
                role: 'faculty',
                name,
                createdAt: new Date().toISOString(),
                mustChangePassword: !autoLogin
            };

            const facultyData: FacultyUser = {
                id: facultyId,
                email,
                password,
                name,
                phone,
                department,
                subjects,
                mustChangePassword: !autoLogin,
                createdAt: new Date().toISOString()
            };

            // Store faculty data
            const allFaculties = this.getAllFaculties();

            // Ensure we don't create duplicates (e.g., repeated submissions)
            const facultiesMap = new Map<string, FacultyUser>();
            allFaculties.forEach(f => facultiesMap.set(f.id, f));
            facultiesMap.set(facultyId, facultyData);

            const uniqueFaculties = Array.from(facultiesMap.values());
            localStorage.setItem(this.FACULTIES_KEY, JSON.stringify(uniqueFaculties));
            // notify listeners (admin dashboard, other pages) that faculties changed
            try { window.dispatchEvent(new CustomEvent('app:dataChanged', { detail: { type: 'faculties' } })); } catch (e) { console.warn('dispatch event failed', e); }

            // Save user session only if requested
            if (autoLogin) {
                this.saveUserToStorage(user);
            }

            return {
                success: true,
                message: 'Faculty registered successfully',
                user: autoLogin ? user : undefined,
                token: autoLogin ? this.generateToken(user) : undefined
            };
        } catch (error) {
            return {
                success: false,
                message: 'Registration failed: ' + (error as Error).message
            };
        }
    }

    // Login user with role validation
    async login(email: string, password: string, role: 'admin' | 'faculty', faceDescriptor?: number[]): Promise<AuthResponse> {
        try {
            if (!email || !password || !role) {
                return {
                    success: false,
                    message: 'Email, password, and role required'
                };
            }

            if (role === 'admin') {
                // Check admin
                const admins = this.getAllAdmins();
                const admin = admins.find(a => a.email === email);
                if (admin) {
                    // verify password
                    if (admin.password !== password) {
                        return { success: false, message: 'Invalid email or password' };
                    }
                    // if face descriptor provided and admin has stored descriptor, validate
                    if (faceDescriptor && admin.faceDescriptor) {
                        const { calculateFaceDistance } = await import('./faceApi');
                        const fd = Array.isArray(faceDescriptor) ? faceDescriptor : Array.from(faceDescriptor as unknown as Float32Array);
                        const ad = Array.isArray(admin.faceDescriptor) ? admin.faceDescriptor : Array.from(admin.faceDescriptor as unknown as Float32Array);
                        const distance = calculateFaceDistance(new Float32Array(fd), ad);
                        if (distance > 0.6) {
                            return { success: false, message: 'Face did not match. Access denied.' };
                        }
                    }
                    const user: AuthUser = {
                        id: admin.id,
                        email: admin.email,
                        role: 'admin',
                        name: admin.name,
                        createdAt: admin.createdAt
                    };
                    this.saveUserToStorage(user);
                    return {
                        success: true,
                        message: 'Login successful',
                        user,
                        token: this.generateToken(user)
                    };
                }
                return {
                    success: false,
                    message: 'No admin account found with this email'
                };
            } else if (role === 'faculty') {
                // Check faculty
                const faculties = this.getAllFaculties();
                const faculty = faculties.find(f => f.email === email);
                if (faculty) {
                    // verify password
                    if (faculty.password !== password) {
                        return { success: false, message: 'Invalid email or password' };
                    }
                    const user: AuthUser = {
                        id: faculty.id,
                        email: faculty.email,
                        role: 'faculty',
                        name: faculty.name,
                        createdAt: faculty.createdAt,
                        mustChangePassword: faculty.mustChangePassword
                    };
                    this.saveUserToStorage(user);
                    return {
                        success: true,
                        message: 'Login successful',
                        user,
                        token: this.generateToken(user),
                        requiresPasswordReset: !!faculty.mustChangePassword
                    };
                }
                return {
                    success: false,
                    message: 'No faculty account found with this email'
                };
            }

            return {
                success: false,
                message: 'Invalid role selected'
            };
        } catch (error) {
            return {
                success: false,
                message: 'Login failed: ' + (error as Error).message
            };
        }
    }

    // Get current user
    getCurrentUser(): AuthUser | null {
        return this.currentUser;
    }

    // Logout
    logout(): void {
        localStorage.removeItem(this.STORAGE_KEY);
        this.currentUser = null;
    }

    // Get all admins
    private getAllAdmins(): AdminUser[] {
        try {
            const stored = localStorage.getItem(this.ADMINS_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    }

    // Get all faculties (public so admin dashboard and other callers can access)
    getAllFaculties(): FacultyUser[] {
        try {
            const stored = localStorage.getItem(this.FACULTIES_KEY);
            if (!stored) return [];
            const parsed: FacultyUser[] = JSON.parse(stored);
            const unique = new Map<string, FacultyUser>();
            parsed.forEach(f => {
                unique.set(f.id, f);
            });
            return Array.from(unique.values());
        } catch {
            return [];
        }
    }

    // Get admin by ID
    getAdminById(id: string): AdminUser | undefined {
        return this.getAllAdmins().find(a => a.id === id);
    }

    // Get faculty by ID
    getFacultyById(id: string): FacultyUser | undefined {
        return this.getAllFaculties().find(f => f.id === id);
    }

    // Check if user is authenticated
    isAuthenticated(): boolean {
        return this.currentUser !== null;
    }

    // Check role
    hasRole(role: UserRole): boolean {
        return this.currentUser?.role === role;
    }

    // Generate JWT-like token (for demonstration)
    private generateToken(user: AuthUser): string {
        const payload = {
            sub: user.id,
            email: user.email,
            role: user.role,
            iat: Math.floor(Date.now() / 1000)
        };
        return btoa(JSON.stringify(payload));
    }

    // Verify token
    verifyToken(token: string): boolean {
        try {
            const payload = JSON.parse(atob(token));
            return payload.sub && payload.role;
        } catch {
            return false;
        }
    }

    // ===== ADMIN FUNCTIONS =====

    // Get all students from face registrations
    getAllStudents(): FaceRegistration[] {
        try {
            return getRegistrations();
        } catch (err) {
            console.error('Error getting students:', err);
            return [];
        }
    }

    // Delete student
    deleteStudent(studentId: string): boolean {
        try {
            // remove from registration storage and related data (attendance, fines)
            storageDeleteStudent(studentId);
            // also update any internal list if needed (registrations is sourced from storage anyway)
            return true;
        } catch (err) {
            console.error('Error deleting student:', err);
            return false;
        }
    }

    // Delete faculty
    deleteFaculty(facultyId: string): boolean {
        try {
            const faculties = this.getAllFaculties();
            const filtered = faculties.filter((f: FacultyUser) => f.id !== facultyId);
            localStorage.setItem('faculties_db', JSON.stringify(filtered));
            try { window.dispatchEvent(new CustomEvent('app:dataChanged', { detail: { type: 'faculties' } })); } catch (e) { console.warn('dispatch event failed', e); }
            return true;
        } catch (err) {
            console.error('Error deleting faculty:', err);
            return false;
        }
    }

    // Update faculty information
    updateFaculty(facultyId: string, updates: Partial<FacultyUser>): boolean {
        try {
            const faculties = this.getAllFaculties();
            const idx = faculties.findIndex(f => f.id === facultyId);
            if (idx === -1) return false;
            faculties[idx] = { ...faculties[idx], ...updates };
            localStorage.setItem(this.FACULTIES_KEY, JSON.stringify(faculties));
            try { window.dispatchEvent(new CustomEvent('app:dataChanged', { detail: { type: 'faculties' } })); } catch (e) { console.warn('dispatch event failed', e); }
            return true;
        } catch (error) {
            console.error('Error updating faculty:', error);
            return false;
        }
    }

    // Clear all system data
    clearAllData(): boolean {
        try {
            localStorage.removeItem('faculties_db');
            localStorage.removeItem('students_db');
            localStorage.removeItem('face_attendance_registrations');
            localStorage.removeItem('attendance_records');
            localStorage.removeItem('auth_user');
            try { window.dispatchEvent(new CustomEvent('app:dataChanged', { detail: { type: 'all' } })); } catch (e) { console.warn('dispatch event failed', e); }
            return true;
        } catch (error) {
            console.error('Error clearing data:', error);
            return false;
        }
    }

    // Get attendance records for admin
    getAttendanceRecords(): AttendanceRecord[] {
        try {
            const stored = localStorage.getItem('attendance_records');
            return stored ? JSON.parse(stored) as AttendanceRecord[] : [];
        } catch (err) {
            console.error('Error getting attendance records:', err);
            return [];
        }
    }

    // Edit student
    editStudent(studentId: string, updates: Partial<FaceRegistration>): boolean {
        try {
            const students = this.getAllStudents();
            const index = students.findIndex((s: FaceRegistration) => s.id === studentId);
            if (index !== -1) {
                students[index] = { ...students[index], ...updates };
                localStorage.setItem('face_attendance_registrations', JSON.stringify(students));
                try { window.dispatchEvent(new CustomEvent('app:dataChanged', { detail: { type: 'students' } })); } catch (e) { console.warn('dispatch event failed', e); }
                return true;
            }
            return false;
        } catch (err) {
            console.error('Error editing student:', err);
            return false;
        }
    }

    // Edit faculty
    editFaculty(facultyId: string, updates: Partial<FacultyUser>): boolean {
        try {
            const faculties = this.getAllFaculties();
            const index = faculties.findIndex((f: FacultyUser) => f.id === facultyId);
            if (index !== -1) {
                faculties[index] = { ...faculties[index], ...updates };
                localStorage.setItem('faculties_db', JSON.stringify(faculties));
                return true;
            }
            return false;
        } catch (err) {
            console.error('Error editing faculty:', err);
            return false;
        }
    }
    // Update faculty password and clear reset requirement
    updateFacultyPassword(facultyId: string, newPassword: string): boolean {
        try {
            const faculties = this.getAllFaculties();
            const index = faculties.findIndex((f: FacultyUser) => f.id === facultyId);
            if (index === -1) return false;

            faculties[index].password = newPassword;
            faculties[index].mustChangePassword = false;
            localStorage.setItem(this.FACULTIES_KEY, JSON.stringify(faculties));

            // If this is the currently logged-in user, update session user object too
            if (this.currentUser?.id === facultyId) {
                this.currentUser = {
                    ...this.currentUser,
                    mustChangePassword: false
                };
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.currentUser));
            }

            return true;
        } catch (err) {
            console.error('Error updating faculty password:', err);
            return false;
        }
    }

    // Update admin password
    updateAdminPassword(adminId: string, newPassword: string): boolean {
        try {
            const admins = this.getAllAdmins();
            const index = admins.findIndex((a: AdminUser) => a.id === adminId);
            if (index === -1) return false;

            admins[index].password = newPassword;
            localStorage.setItem(this.ADMINS_KEY, JSON.stringify(admins));

            // If this is the currently logged-in user, update session user object too
            if (this.currentUser?.id === adminId) {
                this.currentUser = {
                    ...this.currentUser
                };
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.currentUser));
            }

            return true;
        } catch (err) {
            console.error('Error updating admin password:', err);
            return false;
        }
    }

    // Get admin statistics
    getAdminStats() {
        return {
            totalFaculties: this.getAllFaculties().length,
            totalStudents: this.getAllStudents().length,
            totalAttendanceRecords: this.getAttendanceRecords().length,
            timestamp: new Date().toISOString()
        };
    }
}

export const authService = AuthService.getInstance();

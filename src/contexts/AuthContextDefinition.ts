import { createContext } from 'react';
import type { AuthUser } from '../services/api';
export type UserRole = 'admin' | 'faculty' | 'student';

export interface AuthContextType {
    user: AuthUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string, role: 'admin' | 'faculty', faceDescriptor?: number[]) => Promise<{ success: boolean; message: string; requiresPasswordReset?: boolean }>;
    logout: () => void;
    /**
     * create admin account; autoLogin controls whether the new account becomes current session
     */
    registerAdmin: (
        email: string,
        password: string,
        name: string,
        faceImage: string,
        faceDescriptor?: number[],
        autoLogin?: boolean
    ) => Promise<{ success: boolean; message: string }>;
    /**
     * create faculty account; autoLogin should be false when admin is creating the account
     */
    registerFaculty: (
        email: string,
        password: string,
        name: string,
        phone: string,
        department: string,
        subjects: string[],
        autoLogin?: boolean
    ) => Promise<{ success: boolean; message: string }>;
    /**
     * Update a faculty user's password (used on first login when a reset is required)
     */
    resetFacultyPassword: (facultyId: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
    /**
     * Update the current user's password. Used for first-login password resets.
     */
    updatePassword: (newPassword: string) => Promise<{ success: boolean; message: string }>;
    hasRole: (role: UserRole) => boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

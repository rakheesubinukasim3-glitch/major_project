import React, { useState, useCallback, useEffect } from 'react';
import { AuthContext, type AuthContextType } from './AuthContextDefinition';
import {
    apiLogin,
    apiLogout,
    apiRegisterAdmin,
    apiRegisterFaculty,
    apiResetPassword,
    apiResetFacultyPassword,
    getCurrentUser,
    saveCurrentUser,
    type AuthUser
} from '../services/api';

export type { AuthUser };
export type UserRole = 'admin' | 'faculty' | 'student';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Initialize auth state from localStorage cache
    useEffect(() => {
        const currentUser = getCurrentUser();
        setUser(currentUser);
        setIsLoading(false);
    }, []);

    const login = useCallback(async (email: string, password: string, role: 'admin' | 'faculty', faceDescriptor?: number[]) => {
        setIsLoading(true);
        try {
            const response = await apiLogin(email, password, role, faceDescriptor);
            if (response.success && response.user) {
                setUser(response.user);
            }
            return {
                success: response.success,
                message: response.message,
                requiresPasswordReset: response.requiresPasswordReset
            };
        } finally {
            setIsLoading(false);
        }
    }, []);

    const logout = useCallback(() => {
        apiLogout();
        setUser(null);
    }, []);

    const registerAdmin = useCallback(
        async (
            email: string,
            password: string,
            name: string,
            faceImage: string,
            faceDescriptor?: number[],
            autoLogin: boolean = true
        ) => {
            setIsLoading(true);
            try {
                const response = await apiRegisterAdmin(email, password, name, faceImage, faceDescriptor, autoLogin);
                if (response.success && response.user && autoLogin) {
                    setUser(response.user);
                }
                return { success: response.success, message: response.message };
            } finally {
                setIsLoading(false);
            }
        },
        []
    );

    const registerFaculty = useCallback(
        async (
            email: string,
            password: string,
            name: string,
            phone: string,
            department: string,
            subjects: string[],
            autoLogin: boolean = true
        ) => {
            setIsLoading(true);
            try {
                const response = await apiRegisterFaculty(email, password, name, phone, department, subjects, autoLogin);
                if (response.success && response.user && autoLogin) {
                    setUser(response.user);
                }
                return { success: response.success, message: response.message };
            } finally {
                setIsLoading(false);
            }
        },
        []
    );

    const resetFacultyPassword = useCallback(async (facultyId: string, newPassword: string) => {
        setIsLoading(true);
        try {
            const result = await apiResetFacultyPassword(facultyId, newPassword);
            if (result.success && user?.id === facultyId) {
                const updatedUser = { ...user, mustChangePassword: false };
                setUser(updatedUser);
                saveCurrentUser(updatedUser);
            }
            return { success: result.success, message: result.message };
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    const updatePassword = useCallback(async (newPassword: string) => {
        if (!user) return { success: false, message: 'No authenticated user found' };
        setIsLoading(true);
        try {
            const result = await apiResetPassword(newPassword);
            if (result.success) {
                const updatedUser = { ...user, mustChangePassword: false };
                setUser(updatedUser);
                saveCurrentUser(updatedUser);
            }
            return { success: result.success, message: result.message };
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    const hasRole = useCallback((role: UserRole): boolean => {
        return user?.role === role;
    }, [user]);

    const value: AuthContextType = {
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        registerAdmin,
        registerFaculty,
        resetFacultyPassword,
        updatePassword,
        hasRole
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

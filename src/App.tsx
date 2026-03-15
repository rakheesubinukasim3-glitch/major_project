import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Register from './pages/Register';
import Attendance from './pages/Attendance';
import Records from './pages/Records';
import Login from './pages/Login';
import AuthRegister from './pages/AuthRegister';
import AdminRegister from './pages/AdminRegister';
import FacultyRegister from './pages/FacultyRegister';
import AdminDashboard from './pages/AdminDashboard';
import ResetPassword from './pages/ResetPassword';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/useAuthHook';
import { useEffect } from 'react';
import { loadModels } from './utils/faceApi';

// Protected route component
const ProtectedRoute: React.FC<{ children: React.ReactNode; requiredRole?: string }> = ({ 
    children, 
    requiredRole 
}) => {
    const { isAuthenticated, user, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/auth/login" replace />;
    }

    // If user must reset password, force them to the reset page first.
    // But allow rendering the reset page itself to avoid redirect loops.
    const isResetRoute = location.pathname === '/auth/reset-password';
    if (user?.mustChangePassword && !isResetRoute) {
        return <Navigate to="/auth/reset-password" replace />;
    }

    if (requiredRole) {
        // Allow admins to access faculty pages as well (admins have full access)
        if (user?.role !== requiredRole && !(requiredRole === 'faculty' && user?.role === 'admin')) {
            return <Navigate to="/" replace />;
        }
    }

    return <>{children}</>;
};

function AppContent() {
    useEffect(() => {
        // Load AI models once on mount
        loadModels().catch(err => console.error('Failed to load models:', err));
    }, []);

    return (
        <Router>
            <Routes>
                {/* Auth Routes - No Layout */}
                <Route path="/auth/login" element={<Login />} />
                <Route path="/auth/register" element={<AuthRegister />} />
                <Route path="/auth/register/admin" element={<AdminRegister />} />
                <Route path="/auth/register/faculty" element={<FacultyRegister />} />
                <Route
                    path="/auth/reset-password"
                    element={
                        <ProtectedRoute>
                            <ResetPassword />
                        </ProtectedRoute>
                    }
                />

                {/* Protected Routes - With Layout */}
                <Route
                    path="/"
                    element={
                        <ProtectedRoute>
                            <Layout>
                                <Home />
                            </Layout>
                        </ProtectedRoute>
                    }
                />
                {/* Student registration route accessible to any authenticated user */}
                <Route
                    path="/register"
                    element={
                        <ProtectedRoute>
                            <Layout>
                                <Register />
                            </Layout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/attendance"
                    element={
                        <ProtectedRoute requiredRole="faculty">
                            <Layout>
                                <Attendance />
                            </Layout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/records"
                    element={
                        <ProtectedRoute requiredRole="faculty">
                            <Layout>
                                <Records />
                            </Layout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/admin/dashboard"
                    element={
                        <ProtectedRoute requiredRole="admin">
                            <Layout>
                                <AdminDashboard />
                            </Layout>
                        </ProtectedRoute>
                    }
                />

                {/* Catch all */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
    );
}

function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
}

export default App;

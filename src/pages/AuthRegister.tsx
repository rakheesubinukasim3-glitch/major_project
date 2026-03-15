import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserPlus, ArrowRight, Lock, Users, Shield } from 'lucide-react';

const AuthRegister = () => {
    const navigate = useNavigate();
    const [selectedRole, setSelectedRole] = useState<'admin' | 'faculty' | null>(null);

    const roles = [
        {
            id: 'admin',
            title: 'Administrator',
            description: 'System admin with full control',
            icon: Shield,
            color: 'from-purple-600 to-pink-600',
            features: ['Full system access', 'Manage faculty', 'View reports', 'Face authentication']
        },
        {
            id: 'faculty',
            title: 'Faculty Member',
            description: 'Manage attendance and records',
            icon: Users,
            color: 'from-blue-600 to-cyan-600',
            features: ['Mark attendance', 'Manage subjects', 'View records', 'WhatsApp integration']
        }
    ];

    const handleSelectRole = (role: 'admin' | 'faculty') => {
        setSelectedRole(role);
        setTimeout(() => {
            navigate(`/auth/register/${role}`);
        }, 300);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="w-full max-w-5xl"
            >
                {/* Header */}
                <div className="text-center mb-12">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.1, type: 'spring' }}
                        className="flex justify-center mb-4"
                    >
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <UserPlus className="text-white" size={28} />
                        </div>
                    </motion.div>
                    <h1 className="text-4xl font-bold gradient-text mb-3">Create Account</h1>
                    <p className="text-slate-400 max-w-md mx-auto">
                        Choose your role to get started with our attendance management system
                    </p>
                </div>

                {/* Role Selection Cards */}
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                    {roles.map((role, index) => {
                        const IconComponent = role.icon;
                        return (
                            <motion.button
                                key={role.id}
                                initial={{ opacity: 0, x: index === 0 ? -20 : 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 + index * 0.1 }}
                                onClick={() => handleSelectRole(role.id as 'admin' | 'faculty')}
                                className={`relative group overflow-hidden rounded-2xl p-8 text-left transition-all duration-300 ${
                                    selectedRole === role.id
                                        ? 'ring-2 ring-blue-500 scale-105'
                                        : 'hover:scale-105'
                                }`}
                            >
                                {/* Background gradient */}
                                <div
                                    className={`absolute inset-0 bg-gradient-to-br ${role.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}
                                ></div>

                                {/* Border */}
                                <div className="absolute inset-0 border border-white/10 group-hover:border-white/20 rounded-2xl transition-colors"></div>

                                {/* Glass effect background */}
                                <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm rounded-2xl"></div>

                                {/* Content */}
                                <div className="relative z-10">
                                    <div className="flex items-start justify-between mb-4">
                                        <div
                                            className={`p-3 rounded-lg bg-gradient-to-br ${role.color} bg-opacity-20`}
                                        >
                                            <IconComponent size={24} className="text-white" />
                                        </div>
                                        <ArrowRight className={`text-slate-400 group-hover:text-white group-hover:translate-x-1 transition-all ${
                                            selectedRole === role.id ? 'text-blue-400 translate-x-1' : ''
                                        }`} size={20} />
                                    </div>

                                    <h3 className="text-xl font-bold text-white mb-2">{role.title}</h3>
                                    <p className="text-slate-400 text-sm mb-4">{role.description}</p>

                                    {/* Features */}
                                    <div className="space-y-2">
                                        {role.features.map((feature, idx) => (
                                            <div key={idx} className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                                                <span className="text-xs text-slate-300">{feature}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </motion.button>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="text-center">
                    <p className="text-slate-400 text-sm mb-4">
                        Already have an account?{' '}
                        <button
                            onClick={() => navigate('/auth/login')}
                            className="text-blue-400 hover:text-blue-300 font-semibold transition-colors"
                        >
                            Sign in instead
                        </button>
                    </p>
                    <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                        <Lock size={14} />
                        <span>Your data is secure and encrypted</span>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default AuthRegister;

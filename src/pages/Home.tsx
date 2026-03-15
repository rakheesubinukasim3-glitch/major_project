import { motion } from 'framer-motion';
import { ArrowRight, Camera, ClipboardList } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState, useCallback, useMemo, memo } from 'react';
import { getRegistrations, getAllFaculties, type FaceRegistration } from '../services/api';
import StudentModal from '../components/StudentModal';
import { useAuth } from '../contexts/useAuthHook';

const StatCard = memo(({ title, count, onClick, color }: { title: string, count: number | string, onClick: () => void, color: string }) => (
    <motion.button
        whileHover={{ y: -5 }}
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
        className="glass-card p-6 text-center hover:bg-white/[0.08] transition-all cursor-pointer group text-left"
    >
        <h4 className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">{title}</h4>
        <div className={`text-3xl font-bold ${color} mt-2`}>{count}</div>
        <p className="text-xs text-slate-500 mt-3 group-hover:text-slate-400 transition-colors">Click to view</p>
    </motion.button>
));

const Home = () => {
    const { user } = useAuth();
    const [facultyDepartment, setFacultyDepartment] = useState<string | null>(null);
    const [registrations, setRegistrations] = useState<FaceRegistration[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalTitle, setModalTitle] = useState('');
    const [modalStudents, setModalStudents] = useState<FaceRegistration[]>([]);

    useEffect(() => {
        const loadDept = async () => {
            if (!user || user.role !== 'faculty') return;
            try {
                const facs = await getAllFaculties();
                const found = facs.find(f => f.id === user.id);
                if (found) setFacultyDepartment(found.department || null);
            } catch (err) {
                console.error(err);
            }
        };
        loadDept();
    }, [user]);

    const visibleRegistrations = useMemo(() => {
        if (!facultyDepartment) return registrations;
        return registrations.filter(r => r.department === facultyDepartment);
    }, [registrations, facultyDepartment]);

    const refreshData = useCallback(async () => {
        try {
            const data = await getRegistrations();
            setRegistrations(data);
        } catch (error) {
            console.error('Error refreshing data:', error);
        }
    }, []);

    useEffect(() => {
        refreshData();
        // Refresh data when page becomes visible
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                refreshData();
            }
        };

        // Auto-refresh every 20 seconds for optimal performance
        const interval = setInterval(refreshData, 20000);

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [refreshData]);

    const handleOpenModal = useCallback((title: string, students: FaceRegistration[]) => {
        setModalTitle(title);
        setModalStudents(students);
        setModalOpen(true);
    }, []);

    const cards = useMemo(() => [
        {

            icon: Camera,
            to: '/attendance',
            color: 'from-indigo-500 to-purple-400'
        },
        {
            title: 'View Records',
            desc: 'Track and export attendance history with detailed logs.',
            icon: ClipboardList,
            to: '/records',
            color: 'from-emerald-500 to-teal-400'
        }
    ], []);

    return (
        <div className="max-w-4xl mx-auto space-y-12">
            <header className="text-center space-y-4">
                <motion.h1
                    className="text-5xl md:text-7xl font-bold tracking-tight"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                >
                    Face <span className="gradient-text">Recognition</span>
                    <br /> Attendance System
                </motion.h1>
                <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                    DEVELOPED BY RAKHEESUBINU KASIM
                </p>
            </header>

            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    title="Total Registered Students"
                    count={visibleRegistrations.length}
                    onClick={() => handleOpenModal('All Students', visibleRegistrations)}
                    color="text-blue-400"
                />

                {cards.map((card, i) => (
                    <motion.div
                        key={card.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                    >
                        <Link to={card.to} className="group block h-full">
                            <div className="h-full p-8 glass-card border-white/5 hover:border-white/20 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10 flex flex-col items-start space-y-4">
                                <div className={`p-3 rounded-xl bg-gradient-to-br ${card.color} shadow-lg shadow-black/20`}>
                                    <card.icon size={24} className="text-white" />
                                </div>
                                <h3 className="text-xl font-semibold">{card.title}</h3>
                                <p className="text-slate-400 text-sm flex-grow">{card.desc}</p>
                                <div className="pt-4 flex items-center gap-2 text-blue-400 font-medium group-hover:gap-3 transition-all">
                                    <span>Get Started</span>
                                    <ArrowRight size={18} />
                                </div>
                            </div>
                        </Link>
                    </motion.div>
                ))}
            </section>

            <StudentModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={modalTitle}
                students={modalStudents}
                onStudentUpdate={refreshData}
            />
        </div>
    );
};

export default Home;

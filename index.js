require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { connect } = require('./db');

const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/students');
const attendanceRoutes = require('./routes/attendance');
const fineRoutes = require('./routes/fines');
const facultyRoutes = require('./routes/faculty');

const app = express();

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/fines', fineRoutes);
app.use('/api/faculty', facultyRoutes);

// Health check
app.get('/api/health', async (req, res) => {
    const { getDb } = require('./db');
    try {
        const db = getDb();
        const [students, faculties, attendance, fines] = await Promise.all([
            db.collection('students').countDocuments(),
            db.collection('faculties').countDocuments(),
            db.collection('attendance').countDocuments(),
            db.collection('fines').countDocuments(),
        ]);
        res.json({ status: 'ok', database: 'connected', stats: { students, faculties, attendanceRecords: attendance, fines }, timestamp: new Date().toISOString() });
    } catch (e) {
        res.json({ status: 'ok', database: 'disconnected', error: e.message });
    }
});

// Serve React frontend (production)
app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server Error:', err.stack);
    res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
});

const PORT = process.env.PORT || 5000;

// Connect DB then start server
connect()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
            console.log(`📡 API available at http://localhost:${PORT}/api`);
        });
    })
    .catch(err => {
        console.error('❌ MongoDB connection error:', err.message);
        process.exit(1);
    });

const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { authMiddleware } = require('../middleware/auth');

// GET /api/attendance
router.get('/', authMiddleware, async (req, res) => {
    try {
        const db = getDb();
        const filter = {};
        if (req.query.date) filter.date = req.query.date;
        if (req.query.period) filter.period = parseInt(req.query.period);
        if (req.query.studentId) filter.studentId = req.query.studentId;
        if (req.query.department) filter.department = req.query.department;

        const records = await db.collection('attendance').find(filter).sort({ timestamp: -1 }).toArray();
        const mapped = records.map(r => ({
            id: r.studentId,
            name: r.name,
            timestamp: r.timestamp,
            date: r.date,
            status: r.status,
            period: r.period,
            remark: r.remark || '',
            department: r.department || '',
            semester: r.semester || '',
            _mongoId: r._id.toString()
        }));
        res.json({ success: true, records: mapped });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/attendance — save attendance (upsert)
router.post('/', authMiddleware, async (req, res) => {
    try {
        const db = getDb();
        const { id, name, period, status, date, department, semester } = req.body;
        if (!id || !name || !period)
            return res.status(400).json({ success: false, message: 'id, name, and period are required' });

        const now = new Date();
        const recordDate = date || now.toISOString().split('T')[0];
        const timestamp = now.toISOString();

        await db.collection('attendance').updateOne(
            { studentId: id, date: recordDate, period: parseInt(period) },
            {
                $set: {
                    studentId: id, name, timestamp, date: recordDate,
                    status: status || 'present', period: parseInt(period),
                    department: department || '', semester: semester || '',
                    remark: status === 'present' ? '' : 'Marked absent',
                    updatedAt: now
                },
                $setOnInsert: { createdAt: now }
            },
            { upsert: true }
        );
        res.json({ success: true, message: 'Attendance saved' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/attendance/toggle
router.put('/toggle', authMiddleware, async (req, res) => {
    try {
        const db = getDb();
        const { studentId, date, period } = req.body;
        const record = await db.collection('attendance').findOne({ studentId, date, period: parseInt(period) });
        if (!record) return res.status(404).json({ success: false, message: 'Record not found' });

        const newStatus = record.status === 'present' ? 'absent' : 'present';
        await db.collection('attendance').updateOne(
            { studentId, date, period: parseInt(period) },
            { $set: { status: newStatus, updatedAt: new Date() } }
        );
        res.json({ success: true, message: 'Status toggled', status: newStatus });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE /api/attendance/:timestamp
router.delete('/:timestamp', authMiddleware, async (req, res) => {
    try {
        const db = getDb();
        const timestamp = decodeURIComponent(req.params.timestamp);
        await db.collection('attendance').deleteOne({ timestamp });
        res.json({ success: true, message: 'Attendance record deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/attendance/mark-absent-day
router.post('/mark-absent-day', authMiddleware, async (req, res) => {
    try {
        const db = getDb();
        const { date, department } = req.body;
        if (!date) return res.status(400).json({ success: false, message: 'date is required' });

        const filter = department ? { department } : {};
        const students = await db.collection('students').find(filter).toArray();
        const periods = [1, 2, 3, 4, 5, 6];
        const baseTime = new Date();
        let offset = 0;

        for (const period of periods) {
            for (const student of students) {
                const timestamp = new Date(baseTime.getTime() + offset).toISOString();
                const now = new Date();
                await db.collection('attendance').updateOne(
                    { studentId: student.studentId, date, period },
                    {
                        $set: {
                            studentId: student.studentId, name: student.name, timestamp,
                            date, period, status: 'absent',
                            department: student.department || '', semester: student.semester || '',
                            remark: '', updatedAt: now
                        },
                        $setOnInsert: { createdAt: now }
                    },
                    { upsert: true }
                );
                offset += 1;
            }
        }
        res.json({ success: true, message: `Marked all students absent for ${date}` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/attendance/mark-absent-period
router.post('/mark-absent-period', authMiddleware, async (req, res) => {
    try {
        const db = getDb();
        const { date, period, department } = req.body;
        if (!date || !period) return res.status(400).json({ success: false, message: 'date and period are required' });

        const filter = department ? { department } : {};
        const students = await db.collection('students').find(filter).toArray();
        const baseTime = new Date();
        let offset = 0;

        for (const student of students) {
            const timestamp = new Date(baseTime.getTime() + offset).toISOString();
            const now = new Date();
            await db.collection('attendance').updateOne(
                { studentId: student.studentId, date, period: parseInt(period) },
                {
                    $set: {
                        studentId: student.studentId, name: student.name, timestamp,
                        date, period: parseInt(period), status: 'absent',
                        department: student.department || '', semester: student.semester || '',
                        remark: 'Marked absent (bulk)', updatedAt: now
                    },
                    $setOnInsert: { createdAt: now }
                },
                { upsert: true }
            );
            offset += 1;
        }
        res.json({ success: true, message: `Marked all students absent for Period ${period} on ${date}` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/attendance/stats
router.get('/stats', authMiddleware, async (req, res) => {
    try {
        const db = getDb();
        const { date, period, department } = req.query;
        const filter = {};
        if (date) filter.date = date;
        if (period) filter.period = parseInt(period);
        if (department) filter.department = department;

        const records = await db.collection('attendance').find(filter).toArray();
        const presentIds = new Set(records.filter(r => r.status === 'present').map(r => r.studentId));

        const studentFilter = department ? { department } : {};
        const allStudents = await db.collection('students').find(studentFilter).toArray();
        const absentStudents = allStudents.filter(s => !presentIds.has(s.studentId));

        res.json({
            success: true,
            presentCount: presentIds.size,
            absentCount: absentStudents.length,
            totalStudents: allStudents.length,
            absentStudents: absentStudents.map(s => ({ id: s.studentId, name: s.name }))
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { ObjectId } = require('mongodb');
const { getDb } = require('../db');
const { authMiddleware, requireAdmin } = require('../middleware/auth');

// GET /api/faculty/stats/summary — MUST be before /:id to avoid route conflict
router.get('/stats/summary', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const db = getDb();
        const [totalFaculties, totalStudents, totalAttendanceRecords] = await Promise.all([
            db.collection('faculties').countDocuments(),
            db.collection('students').countDocuments(),
            db.collection('attendance').countDocuments()
        ]);
        res.json({ success: true, stats: { totalFaculties, totalStudents, totalAttendanceRecords } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/faculty — list all faculties
router.get('/', authMiddleware, async (req, res) => {
    try {
        const db = getDb();
        const faculties = await db.collection('faculties').find({}, { projection: { passwordHash: 0 } }).sort({ name: 1 }).toArray();
        const mapped = faculties.map(f => ({
            id: f._id.toString(),
            email: f.email,
            name: f.name,
            phone: f.phone || '',
            department: f.department || '',
            subjects: f.subjects || [],
            mustChangePassword: !!f.mustChangePassword,
            createdAt: f.createdAt
        }));
        res.json({ success: true, faculties: mapped });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/faculty/:id
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const db = getDb();
        const faculty = await db.collection('faculties').findOne({ _id: new ObjectId(req.params.id) }, { projection: { passwordHash: 0 } });
        if (!faculty) return res.status(404).json({ success: false, message: 'Faculty not found' });
        res.json({ success: true, faculty: {
            id: faculty._id.toString(), email: faculty.email, name: faculty.name,
            phone: faculty.phone || '', department: faculty.department || '',
            subjects: faculty.subjects || [], mustChangePassword: !!faculty.mustChangePassword, createdAt: faculty.createdAt
        }});
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/faculty/:id — update faculty
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const db = getDb();
        const { name, phone, department, subjects, email } = req.body;
        const updates = { updatedAt: new Date() };
        if (name) updates.name = name;
        if (phone) updates.phone = phone;
        if (department) updates.department = department;
        if (subjects) updates.subjects = subjects;
        if (email) updates.email = email.toLowerCase();

        const result = await db.collection('faculties').findOneAndUpdate(
            { _id: new ObjectId(req.params.id) },
            { $set: updates },
            { returnDocument: 'after', projection: { passwordHash: 0 } }
        );
        if (!result) return res.status(404).json({ success: false, message: 'Faculty not found' });
        res.json({ success: true, message: 'Faculty updated', faculty: {
            id: result._id.toString(), email: result.email, name: result.name,
            phone: result.phone || '', department: result.department || '', subjects: result.subjects || []
        }});
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE /api/faculty/:id
router.delete('/:id', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const db = getDb();
        await db.collection('faculties').deleteOne({ _id: new ObjectId(req.params.id) });
        res.json({ success: true, message: 'Faculty deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/faculty/:id/password
router.put('/:id/password', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const db = getDb();
        const { newPassword } = req.body;
        if (!newPassword) return res.status(400).json({ success: false, message: 'New password required' });

        const passwordHash = await bcrypt.hash(newPassword, 10);
        await db.collection('faculties').updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: { passwordHash, mustChangePassword: false, updatedAt: new Date() } }
        );
        res.json({ success: true, message: 'Password updated' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;

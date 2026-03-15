const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const { getDb } = require('../db');
const { authMiddleware } = require('../middleware/auth');

// GET /api/fines
router.get('/', authMiddleware, async (req, res) => {
    try {
        const db = getDb();
        const filter = {};
        if (req.query.department) filter.department = req.query.department;
        if (req.query.paid !== undefined) filter.paid = req.query.paid === 'true';

        const fines = await db.collection('fines').find(filter).sort({ createdAt: -1 }).toArray();
        const mapped = fines.map(f => ({
            id: f._id.toString(),
            studentId: f.studentId,
            studentName: f.studentName,
            department: f.department || '',
            semester: f.semester || '',
            entryTime: f.entryTime,
            fineAmount: f.fineAmount,
            date: f.date,
            period: f.period,
            paid: f.paid,
            qrCode: f.qrCode || ''
        }));
        res.json({ success: true, fines: mapped });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/fines — create a fine (one fine per student per day)
router.post('/', authMiddleware, async (req, res) => {
    try {
        const db = getDb();
        const { studentId, studentName, department, semester, entryTime, fineAmount, date, period, qrCode } = req.body;
        if (!studentId || !studentName || !fineAmount || !date)
            return res.status(400).json({ success: false, message: 'studentId, studentName, fineAmount, date are required' });

        // One fine per student per day
        const existing = await db.collection('fines').findOne({ studentId, date });
        if (existing)
            return res.status(400).json({ success: false, message: 'A fine already exists for this student today' });

        const now = new Date();
        const result = await db.collection('fines').insertOne({
            studentId, studentName,
            department: department || '', semester: semester || '',
            entryTime: entryTime || now.toISOString(),
            fineAmount, date, period: period || 1,
            paid: false, qrCode: qrCode || '',
            createdAt: now, updatedAt: now
        });

        const fine = await db.collection('fines').findOne({ _id: result.insertedId });
        res.status(201).json({ success: true, message: 'Fine created', fine: { id: fine._id.toString(), ...fine, _id: undefined } });
    } catch (err) {
        if (err.code === 11000)
            return res.status(400).json({ success: false, message: 'A fine already exists for this student today' });
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/fines/:id/paid — mark fine as paid
router.put('/:id/paid', authMiddleware, async (req, res) => {
    try {
        const db = getDb();
        const result = await db.collection('fines').findOneAndUpdate(
            { _id: new ObjectId(req.params.id) },
            { $set: { paid: true, updatedAt: new Date() } },
            { returnDocument: 'after' }
        );
        const fine = result;
        if (!fine) return res.status(404).json({ success: false, message: 'Fine not found' });

        // Also mark attendance present since fine is paid
        const now = new Date().toISOString();
        await db.collection('attendance').updateOne(
            { studentId: fine.studentId, date: fine.date, period: fine.period },
            {
                $set: {
                    studentId: fine.studentId, name: fine.studentName, timestamp: now,
                    date: fine.date, status: 'present', period: fine.period,
                    remark: 'Fine paid', updatedAt: new Date()
                },
                $setOnInsert: { createdAt: new Date() }
            },
            { upsert: true }
        );

        res.json({ success: true, message: 'Fine marked as paid and attendance updated', fine: { id: fine._id.toString(), ...fine, _id: undefined } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/fines/:id/qr — update QR code
router.put('/:id/qr', authMiddleware, async (req, res) => {
    try {
        const db = getDb();
        const { qrCode } = req.body;
        const result = await db.collection('fines').findOneAndUpdate(
            { _id: new ObjectId(req.params.id) },
            { $set: { qrCode, updatedAt: new Date() } },
            { returnDocument: 'after' }
        );
        if (!result) return res.status(404).json({ success: false, message: 'Fine not found' });
        res.json({ success: true, message: 'QR code updated', qrCode: result.qrCode });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE /api/fines/:id
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const db = getDb();
        await db.collection('fines').deleteOne({ _id: new ObjectId(req.params.id) });
        res.json({ success: true, message: 'Fine deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;

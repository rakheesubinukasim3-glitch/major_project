const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { authMiddleware } = require('../middleware/auth');

// GET /api/students
router.get('/', authMiddleware, async (req, res) => {
    try {
        const db = getDb();
        const filter = {};
        if (req.query.department) filter.department = req.query.department;

        const students = await db.collection('students').find(filter).sort({ name: 1 }).toArray();
        const mapped = students.map(s => ({
            id: s.studentId,
            admissionNumber: s.admissionNumber || '',
            name: s.name,
            descriptor: s.descriptor,
            photo: s.photo || '',
            department: s.department || '',
            semester: s.semester || '',
            studentWhatsApp: s.studentWhatsApp || '',
            parentWhatsApp: s.parentWhatsApp || '',
            _mongoId: s._id.toString()
        }));
        res.json({ success: true, students: mapped });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/students — register or update a student
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { id, admissionNumber, name, descriptor, photo, department, semester, studentWhatsApp, parentWhatsApp } = req.body;
        if (!id || !name || !descriptor)
            return res.status(400).json({ success: false, message: 'id, name, and descriptor are required' });

        const db = getDb();
        const now = new Date();
        await db.collection('students').updateOne(
            { studentId: id },
            {
                $set: {
                    studentId: id, admissionNumber: admissionNumber || '', name,
                    descriptor, photo: photo || '', department: department || '',
                    semester: semester || '', studentWhatsApp: studentWhatsApp || '',
                    parentWhatsApp: parentWhatsApp || '', updatedAt: now
                },
                $setOnInsert: { createdAt: now }
            },
            { upsert: true }
        );
        res.json({ success: true, message: 'Student saved successfully', student: { id, name } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// PUT /api/students/:id — update student info
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const db = getDb();
        const currentId = req.params.id;
        const { newId, name, photo, department, semester, studentWhatsApp, parentWhatsApp, descriptor, admissionNumber } = req.body;

        const student = await db.collection('students').findOne({ studentId: currentId });
        if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

        if (newId && newId !== currentId) {
            const dup = await db.collection('students').findOne({ studentId: newId });
            if (dup) return res.status(400).json({ success: false, message: 'ID already exists' });
            await db.collection('attendance').updateMany({ studentId: currentId }, { $set: { studentId: newId, name: name || student.name } });
            await db.collection('fines').updateMany({ studentId: currentId }, { $set: { studentId: newId, studentName: name || student.studentName } });
        }

        const updates = { updatedAt: new Date() };
        if (newId) updates.studentId = newId;
        if (name) updates.name = name;
        if (photo !== undefined) updates.photo = photo;
        if (department !== undefined) updates.department = department;
        if (semester !== undefined) updates.semester = semester;
        if (studentWhatsApp !== undefined) updates.studentWhatsApp = studentWhatsApp;
        if (parentWhatsApp !== undefined) updates.parentWhatsApp = parentWhatsApp;
        if (descriptor !== undefined) updates.descriptor = descriptor;
        if (admissionNumber !== undefined) updates.admissionNumber = admissionNumber;

        await db.collection('students').updateOne({ studentId: currentId }, { $set: updates });
        res.json({ success: true, message: 'Student updated successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// DELETE /api/students/:id
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const db = getDb();
        const studentId = req.params.id;
        await Promise.all([
            db.collection('students').deleteOne({ studentId }),
            db.collection('attendance').deleteMany({ studentId }),
            db.collection('fines').deleteMany({ studentId })
        ]);
        res.json({ success: true, message: 'Student and all related records deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;

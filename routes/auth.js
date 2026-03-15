const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');
const { getDb } = require('../db');
const { authMiddleware } = require('../middleware/auth');

const generateToken = (user) =>
    jwt.sign(
        { id: user._id.toString(), email: user.email, role: user.role, name: user.name },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password, role } = req.body;
        if (!email || !password || !role)
            return res.status(400).json({ success: false, message: 'Email, password, and role are required' });

        const db = getDb();

        if (role === 'admin') {
            const admin = await db.collection('admins').findOne({ email: email.toLowerCase() });
            if (!admin) return res.status(401).json({ success: false, message: 'No admin account found with this email' });

            const isMatch = await bcrypt.compare(password, admin.passwordHash);
            if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid email or password' });

            const token = generateToken({ ...admin, role: 'admin' });
            return res.json({
                success: true, message: 'Login successful', token,
                user: { id: admin._id.toString(), email: admin.email, role: 'admin', name: admin.name, createdAt: admin.createdAt }
            });
        }

        if (role === 'faculty') {
            const faculty = await db.collection('faculties').findOne({ email: email.toLowerCase() });
            if (!faculty) return res.status(401).json({ success: false, message: 'No faculty account found with this email' });

            const isMatch = await bcrypt.compare(password, faculty.passwordHash);
            if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid email or password' });

            const token = generateToken({ ...faculty, role: 'faculty' });
            return res.json({
                success: true, message: 'Login successful', token,
                requiresPasswordReset: !!faculty.mustChangePassword,
                user: {
                    id: faculty._id.toString(), email: faculty.email, role: 'faculty',
                    name: faculty.name, createdAt: faculty.createdAt,
                    mustChangePassword: !!faculty.mustChangePassword,
                    department: faculty.department, subjects: faculty.subjects, phone: faculty.phone
                }
            });
        }

        return res.status(400).json({ success: false, message: 'Invalid role' });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ success: false, message: 'Login failed: ' + err.message });
    }
});

// POST /api/auth/register/admin
router.post('/register/admin', async (req, res) => {
    try {
        const { email, password, name, faceImage, faceDescriptor, autoLogin } = req.body;
        if (!email || !password || !name)
            return res.status(400).json({ success: false, message: 'Email, password, and name are required' });

        const db = getDb();
        const existing = await db.collection('admins').findOne({ email: email.toLowerCase() });
        if (existing) return res.status(400).json({ success: false, message: 'Email already registered as Admin' });

        const passwordHash = await bcrypt.hash(password, 10);
        const now = new Date();
        const result = await db.collection('admins').insertOne({
            email: email.toLowerCase(), passwordHash, name,
            faceImage: faceImage || '', faceDescriptor: faceDescriptor || [],
            createdAt: now, updatedAt: now
        });

        const user = { id: result.insertedId.toString(), email: email.toLowerCase(), role: 'admin', name, createdAt: now };
        const token = autoLogin !== false ? generateToken({ ...user, _id: result.insertedId }) : null;

        res.status(201).json({ success: true, message: 'Admin registered successfully', user: autoLogin !== false ? user : undefined, token });
    } catch (err) {
        console.error('Admin register error:', err);
        res.status(500).json({ success: false, message: 'Registration failed: ' + err.message });
    }
});

// POST /api/auth/register/faculty
router.post('/register/faculty', async (req, res) => {
    try {
        const { email, password, name, phone, department, subjects, autoLogin } = req.body;
        if (!email || !password || !name || !phone || !department || !subjects || subjects.length === 0)
            return res.status(400).json({ success: false, message: 'All fields are required' });

        const db = getDb();
        const existing = await db.collection('faculties').findOne({ email: email.toLowerCase() });
        if (existing) return res.status(400).json({ success: false, message: 'Email already registered as Faculty' });

        const passwordHash = await bcrypt.hash(password, 10);
        const mustChangePassword = autoLogin === false;
        const now = new Date();

        const result = await db.collection('faculties').insertOne({
            email: email.toLowerCase(), passwordHash, name, phone, department,
            subjects: Array.isArray(subjects) ? subjects : subjects.split(',').map(s => s.trim()),
            mustChangePassword, createdAt: now, updatedAt: now
        });

        const user = { id: result.insertedId.toString(), email: email.toLowerCase(), role: 'faculty', name, createdAt: now, mustChangePassword, department, subjects, phone };
        const token = autoLogin !== false ? generateToken({ ...user, _id: result.insertedId }) : null;

        res.status(201).json({ success: true, message: 'Faculty registered successfully', user: autoLogin !== false ? user : undefined, token });
    } catch (err) {
        console.error('Faculty register error:', err);
        res.status(500).json({ success: false, message: 'Registration failed: ' + err.message });
    }
});

// PUT /api/auth/password/reset — update own password
router.put('/password/reset', authMiddleware, async (req, res) => {
    try {
        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 4)
            return res.status(400).json({ success: false, message: 'Password must be at least 4 characters' });

        const db = getDb();
        const passwordHash = await bcrypt.hash(newPassword, 10);
        const collection = req.user.role === 'admin' ? 'admins' : 'faculties';
        const updates = req.user.role === 'admin' ? { passwordHash } : { passwordHash, mustChangePassword: false };

        await db.collection(collection).updateOne({ _id: new ObjectId(req.user.id) }, { $set: { ...updates, updatedAt: new Date() } });
        res.json({ success: true, message: 'Password updated successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to update password' });
    }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const db = getDb();
        if (req.user.role === 'admin') {
            const admin = await db.collection('admins').findOne({ _id: new ObjectId(req.user.id) }, { projection: { passwordHash: 0 } });
            if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });
            res.json({ success: true, user: { id: admin._id.toString(), email: admin.email, role: 'admin', name: admin.name, createdAt: admin.createdAt } });
        } else {
            const faculty = await db.collection('faculties').findOne({ _id: new ObjectId(req.user.id) }, { projection: { passwordHash: 0 } });
            if (!faculty) return res.status(404).json({ success: false, message: 'Faculty not found' });
            res.json({ success: true, user: { id: faculty._id.toString(), email: faculty.email, role: 'faculty', name: faculty.name, createdAt: faculty.createdAt, mustChangePassword: faculty.mustChangePassword, department: faculty.department, subjects: faculty.subjects, phone: faculty.phone } });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;

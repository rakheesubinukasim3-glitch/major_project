const mongoose = require('mongoose');

const facultySchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, default: '' },
    department: { type: String, default: '' },
    subjects: { type: [String], default: [] },
    mustChangePassword: { type: Boolean, default: false },
    photo: { type: String, default: '' },
    faceDescriptor: { type: [Number], default: [] },
}, { timestamps: true });

module.exports = mongoose.model('Faculty', facultySchema);

const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    // studentId is the admission number / roll number used as the main identifier
    studentId: { type: String, required: true, unique: true, trim: true },
    admissionNumber: { type: String, default: '', trim: true },
    name: { type: String, required: true, trim: true },
    descriptor: { type: [Number], required: true }, // face descriptor array
    photo: { type: String, default: '' }, // base64 photo
    department: { type: String, default: '' },
    semester: { type: String, default: '' },
    studentWhatsApp: { type: String, default: '' },
    parentWhatsApp: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Student', studentSchema);

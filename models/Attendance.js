const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    studentId: { type: String, required: true },
    name: { type: String, required: true },
    timestamp: { type: String, required: true }, // ISO string
    date: { type: String, required: true }, // YYYY-MM-DD
    status: { type: String, enum: ['present', 'absent'], required: true },
    period: { type: Number, required: true, min: 1, max: 6 },
    remark: { type: String, default: '' },
    department: { type: String, default: '' },
    semester: { type: String, default: '' },
}, { timestamps: true });

// Ensure one record per student per date per period
attendanceSchema.index({ studentId: 1, date: 1, period: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);

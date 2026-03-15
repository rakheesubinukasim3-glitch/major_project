const mongoose = require('mongoose');

const fineSchema = new mongoose.Schema({
    studentId: { type: String, required: true },
    studentName: { type: String, required: true },
    department: { type: String, default: '' },
    semester: { type: String, default: '' },
    entryTime: { type: String, required: true }, // ISO string
    fineAmount: { type: Number, required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    period: { type: Number, required: true },
    paid: { type: Boolean, default: false },
    qrCode: { type: String, default: '' }, // base64 QR code
}, { timestamps: true });

// One fine per student per date (enforces "one fine per day" rule at DB level)
fineSchema.index({ studentId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Fine', fineSchema);

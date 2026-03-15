const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    faceImage: { type: String, default: '' }, // base64
    faceDescriptor: { type: [Number], default: [] },
}, { timestamps: true });

module.exports = mongoose.model('Admin', adminSchema);

const mongoose = require('mongoose');

const FindingSchema = new mongoose.Schema({
    severity: {
        type: String,
        enum: ['CRITICAL', 'SUGGESTION'],
        required: true
    },
    line_number: { type: Number },
    message: { type: String, required: true }
});

const ReviewSchema = new mongoose.Schema({
    repoName: { type: String, default: 'Unknown Repo' },
    repoPath: { type: String },
    diff: { type: String, required: true },
    findings: [FindingSchema],
    verdict: {
        type: String,
        enum: ['APPROVED', 'REJECTED'],
        default: 'APPROVED'
    },
    committedByUser: { type: Boolean, default: false },
    committedAt: { type: Date },
    createdAt: { type: Date, default: Date.now }
});

// Middleware: Automatically determine verdict before saving
ReviewSchema.pre('save', function (next) {
    const hasCritical = this.findings.some(f => f.severity === 'CRITICAL');
    this.verdict = hasCritical ? 'REJECTED' : 'APPROVED';
    next();
});

module.exports = mongoose.model('Review', ReviewSchema);
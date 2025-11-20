const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    sender: {
        type: String,
        enum: ['user', 'ai'],
        required: true
    },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

const ChatSchema = new mongoose.Schema({
    reviewId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Review',
        required: true
    },
    findingIndex: { type: Number, required: true }, // Index of the finding in the review
    findingMessage: { type: String, required: true }, // Store finding message for reference
    severity: { type: String, required: true },
    lineNumber: { type: Number },
    messages: [MessageSchema],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt timestamp on save
ChatSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Chat', ChatSchema);

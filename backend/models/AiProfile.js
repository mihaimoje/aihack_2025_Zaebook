const mongoose = require('mongoose');

const AiProfileSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    systemPrompt: {
        type: String,
        default: ''
    },
    temperature: {
        type: Number,
        default: 0.7,
        min: 0,
        max: 1
    },
    maxTokens: {
        type: Number,
        default: 2000,
        min: 500,
        max: 8000
    },
    model: {
        type: String,
        default: 'llama3:8b'
    },
    isDefault: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Ensure only one profile can be default at a time
AiProfileSchema.pre('save', async function (next) {
    if (this.isDefault) {
        await this.constructor.updateMany(
            { _id: { $ne: this._id } },
            { isDefault: false }
        );
    }
    next();
});

module.exports = mongoose.model('AiProfile', AiProfileSchema);

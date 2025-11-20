require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { exec } = require('child_process');
const axios = require('axios');
const aiController = require('./controllers/aiController');
const chatController = require('./controllers/chatController');
const Review = require('./models/review');
const Chat = require('./models/Chat');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Big diffs need big limits

// DB Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ai_reviewer')
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.error('❌ DB Error:', err));

// --- Routes ---

// 1. The Trigger (Used by Git Hook)
app.post('/api/review', aiController.reviewDiff);

// 2. The Dashboard History (Used by React)
app.get('/api/reviews', async (req, res) => {
    try {
        const reviews = await Review.find().sort({ createdAt: -1 }).limit(20);
        res.json(reviews);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 3. Single Review Detail (Used by React)
app.get('/api/reviews/:id', async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);
        res.json(review);
    } catch (e) {
        res.status(404).json({ error: "Review not found" });
    }
});

// 4. Git Status Utility (Optional for Dashboard)
app.get('/api/git/status', (req, res) => {
    exec('git status', (err, stdout) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ output: stdout });
    });
});

// 5. AI Chat Endpoint with History (Used by Review Page Chat)
app.post('/api/chat', chatController.sendMessage);

// 6. Get Chat History for a Finding
app.get('/api/chat/:reviewId/:findingIndex', chatController.getChatHistory);

// 7. Delete Chat History for a Finding
app.delete('/api/chat/:reviewId/:findingIndex', chatController.deleteChatHistory);

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
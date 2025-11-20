require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { exec } = require('child_process');
const aiController = require('./controllers/aiController');
const Review = require('./models/review');

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

// 5. AI Chat Endpoint (Used by Review Page Chat)
app.post('/api/chat', async (req, res) => {
    try {
        const { prompt, findingContext } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: "No prompt provided" });
        }

        // Build context-aware prompt for the AI
        const contextPrompt = `
You are a helpful coding assistant. A developer needs help with a code review finding.

Finding Details:
- Severity: ${findingContext?.severity || 'Unknown'}
- Line: ${findingContext?.line_number || 'Unknown'}
- Issue: ${findingContext?.message || 'No description'}

Developer Question: ${prompt}

Please provide a clear, actionable response with code examples when applicable.
`;

        // Call Ollama
        const aiResponse = await axios.post(process.env.OLLAMA_URL || "http://127.0.0.1:11434/api/generate", {
            model: process.env.LLM_MODEL || "llama3",
            prompt: contextPrompt,
            stream: false
        });

        const responseText = aiResponse.data.response || "I couldn't generate a response.";

        res.json({
            text: responseText,
            sources: [] // Can add sources later if needed
        });

    } catch (error) {
        console.error("❌ Chat Error:", error.message);
        res.status(500).json({
            text: "Sorry, I encountered an error processing your request. Please try again.",
            sources: []
        });
    }
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
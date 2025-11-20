require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { exec } = require('child_process');
const axios = require('axios');
const aiController = require('./controllers/aiController');
const chatController = require('./controllers/chatController');
const profileController = require('./controllers/profileController');
const Review = require('./models/review');
const Chat = require('./models/Chat');
const AiProfile = require('./models/AiProfile');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Big diffs need big limits

// DB Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ai_reviewer')
    .then(async () => {
        console.log('✅ MongoDB Connected');

        // Create default profile if none exists
        const existingDefault = await AiProfile.findOne({ isDefault: true });
        if (!existingDefault) {
            await AiProfile.create({
                name: 'Default Assistant',
                systemPrompt: 'You are a helpful AI assistant that reviews code changes and provides constructive feedback.',
                temperature: 0.7,
                maxTokens: 2000,
                model: 'llama3:8b',
                isDefault: true
            });
            console.log('✅ Default AI profile created');
        }
    })
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

// 8. AI Profile Management
app.get('/api/profiles', profileController.getAllProfiles);
app.get('/api/profiles/default', profileController.getDefaultProfile);
app.get('/api/profiles/:id', profileController.getProfile);
app.post('/api/profiles', profileController.createProfile);
app.put('/api/profiles/:id', profileController.updateProfile);
app.delete('/api/profiles/:id', profileController.deleteProfile);

// 9. Commit Anyway (Bypass AI Review)
app.post('/api/reviews/:id/commit', async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);
        if (!review) return res.status(404).json({ error: 'Review not found' });

        if (review.committedByUser) {
            return res.status(400).json({ error: 'Already committed by user' });
        }

        // Allow passing repoPath in request body for older reviews or manual override
        const repoPath = review.repoPath || req.body.repoPath;

        if (!repoPath) {
            return res.status(400).json({
                error: 'Repository path not available. This review was created before repository path tracking was added. Please commit manually using "git commit --no-verify" in your repository.'
            });
        }

        // First check if there are staged changes in the repository
        exec('git diff --cached --name-only', { cwd: repoPath }, (checkErr, checkStdout, checkStderr) => {
            if (checkErr) {
                console.error('Git check error:', checkStderr);
                return res.status(500).json({ error: 'Failed to check git status', details: checkStderr });
            }

            if (!checkStdout.trim()) {
                return res.status(400).json({ error: 'No staged changes to commit. Please stage your changes first.' });
            }

            // Execute git commit with --no-verify flag to bypass the hook in the repository directory
            exec('git commit --no-verify', { cwd: repoPath }, (err, stdout, stderr) => {
                if (err) {
                    console.error('Git commit error:', stderr);
                    return res.status(500).json({
                        error: 'Failed to commit',
                        details: stderr || err.message,
                        hint: 'Make sure you have staged changes and are in a git repository'
                    });
                }

                // Update review as committed
                review.committedByUser = true;
                review.committedAt = new Date();
                review.save()
                    .then(() => {
                        res.json({
                            success: true,
                            message: 'Committed successfully',
                            output: stdout
                        });
                    })
                    .catch(saveErr => {
                        res.status(500).json({ error: 'Commit succeeded but failed to update review', details: saveErr.message });
                    });
            });
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
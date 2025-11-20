const axios = require('axios');
const Chat = require('../models/Chat');

// Configuration
const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434/api/generate";
const LLM_MODEL = process.env.LLM_MODEL || "llama3";

/**
 * Handle chat messages for a specific finding with conversation history
 */
exports.sendMessage = async (req, res) => {
    try {
        const { prompt, findingContext, reviewId, findingIndex, customSettings } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: "No prompt provided" });
        }

        if (!reviewId || findingIndex === undefined) {
            return res.status(400).json({ error: "Review ID and finding index are required" });
        }

        // Use custom settings if provided, otherwise use defaults
        const model = customSettings?.model || LLM_MODEL;
        const temperature = customSettings?.temperature !== undefined ? customSettings.temperature : 0.7;
        const maxTokens = customSettings?.maxTokens || 2000;
        const systemPrompt = customSettings?.systemPrompt || '';

        // Find or create chat session for this finding
        let chatSession = await Chat.findOne({
            reviewId: reviewId,
            findingIndex: findingIndex
        });

        if (!chatSession) {
            // Create new chat session
            chatSession = new Chat({
                reviewId: reviewId,
                findingIndex: findingIndex,
                findingMessage: findingContext?.message || 'Unknown issue',
                severity: findingContext?.severity || 'UNKNOWN',
                lineNumber: findingContext?.line_number,
                messages: []
            });
        }

        // Build conversation context from history (last 6 messages before current, for context)
        const previousMessages = chatSession.messages
            .slice(-6)
            .map(msg => `${msg.sender === 'user' ? 'User' : 'Assistant'}: ${msg.text}`)
            .join('\n\n');

        // Add user message to history
        chatSession.messages.push({
            sender: 'user',
            text: prompt
        });

        // Build context-aware prompt for the AI
        const baseInstructions = `You are a helpful coding assistant. A developer needs help with a code review finding.

Finding Details:
- Severity: ${findingContext?.severity || 'Unknown'}
- Line: ${findingContext?.line_number || 'Unknown'}
- Issue: ${findingContext?.message || 'No description'}

${previousMessages ? `Previous Conversation:\n${previousMessages}\n\n` : ''}Current User Question: ${prompt}

Instructions:
- Respond ONLY to the current user question above
- Provide a clear, actionable answer
- Use markdown formatting for code blocks
- Keep responses concise and focused
- Do not repeat or summarize previous messages`;

        // Add custom system prompt if provided
        const contextPrompt = systemPrompt
            ? `${systemPrompt}\n\n${baseInstructions}`
            : baseInstructions;

        console.log(`💬 Generating response for Review ${reviewId}, Finding ${findingIndex}...`);
        if (systemPrompt) console.log(`🔧 Using custom settings: model=${model}, temp=${temperature}, maxTokens=${maxTokens}`);

        // Call Ollama with custom settings
        const ollamaPayload = {
            model: model,
            prompt: contextPrompt,
            stream: false,
            options: {
                temperature: temperature,
                num_predict: maxTokens
            }
        };

        const aiResponse = await axios.post(OLLAMA_URL, ollamaPayload);

        const responseText = aiResponse.data.response || "I couldn't generate a response.";

        // Add AI response to history
        chatSession.messages.push({
            sender: 'ai',
            text: responseText
        });

        // Save chat session
        await chatSession.save();

        console.log(`✅ Chat saved: ${chatSession.messages.length} messages total`);

        res.json({
            text: responseText,
            sources: [],
            chatId: chatSession._id,
            messageCount: chatSession.messages.length
        });

    } catch (error) {
        console.error("❌ Chat Error:", error.message);
        res.status(500).json({
            text: "Sorry, I encountered an error processing your request. Please try again.",
            sources: []
        });
    }
};

/**
 * Get chat history for a specific finding
 */
exports.getChatHistory = async (req, res) => {
    try {
        const { reviewId, findingIndex } = req.params;

        const chatSession = await Chat.findOne({
            reviewId: reviewId,
            findingIndex: parseInt(findingIndex)
        });

        if (!chatSession) {
            return res.json({ messages: [] });
        }

        res.json({
            messages: chatSession.messages,
            chatId: chatSession._id,
            findingMessage: chatSession.findingMessage,
            severity: chatSession.severity
        });
    } catch (error) {
        console.error("❌ Get Chat Error:", error.message);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Delete chat history for a specific finding
 */
exports.deleteChatHistory = async (req, res) => {
    try {
        const { reviewId, findingIndex } = req.params;

        const result = await Chat.deleteOne({
            reviewId: reviewId,
            findingIndex: parseInt(findingIndex)
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({ error: "Chat not found" });
        }

        console.log(`🗑️ Deleted chat for Review ${reviewId}, Finding ${findingIndex}`);
        res.json({ message: "Chat history deleted successfully" });
    } catch (error) {
        console.error("❌ Delete Chat Error:", error.message);
        res.status(500).json({ error: error.message });
    }
};

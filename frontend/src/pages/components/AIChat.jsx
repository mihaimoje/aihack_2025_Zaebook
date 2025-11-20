import React, { useState, useRef, useEffect } from 'react';
import { FaTimes, FaRobot, FaUser } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';
import styles from '../../styles/Review.module.css'; // Shared styles

// --- GENERIC BACKEND ENDPOINT ---
const BACKEND_ENDPOINT = "/api/chat";

// Custom component to display a single chat message
const ChatMessage = ({ sender, text, sources = [] }) => {
    return (
        <div className={`${styles.chatMessage} ${sender === 'ai' ? styles.aiMessage : styles.userMessage}`}>

            {/* AI Icon (Left side) */}
            {sender === 'ai' && <FaRobot className={styles.chatIcon} />}

            {/* Message Bubble */}
            <div className={styles.messageBubble}>
                <ReactMarkdown>{text}</ReactMarkdown>
                {sources.length > 0 && (
                    <div className={styles.sourceList}>
                        <p className={styles.sourceHeader}>Sources:</p>
                        <ul>
                            {sources.map((source, index) => (
                                <li key={index}>
                                    <a href={source.uri} target="_blank" rel="noopener noreferrer">
                                        {source.title || new URL(source.uri).hostname}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            {/* User Icon (Right side) */}
            {sender === 'user' && <FaUser className={`${styles.chatIcon} ${styles.userIconAlignment}`} />}
        </div>
    );
};


const AIChat = ({ finding, reviewId, findingIndex, onClose }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);
    const messagesEndRef = useRef(null);
    const isCommitted = finding.reviewCommitted || false;

    // Auto-scroll to the bottom of the chat
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Define the complex prompt based on the finding with diff context
    const fullDiff = finding.diff || 'No diff available';
    const diffLines = fullDiff.split('\n');
    const isTruncated = diffLines.length > 20;
    const truncatedDiff = isTruncated
        ? diffLines.slice(0, 20).join('\n') + '\n... (truncated for display, full diff sent to AI)'
        : fullDiff;

    const initialPrompt = `I have a ${finding.severity} issue on line ${finding.line_number}: "${finding.message}".

Here is the relevant code diff:
\`\`\`
${truncatedDiff}
\`\`\`

Please help me understand and fix this issue. Provide an explanation and a suggested code fix using markdown.`;

    const fullPromptForAI = `I have a ${finding.severity} issue on line ${finding.line_number}: "${finding.message}".

Here is the relevant code diff:
\`\`\`
${fullDiff}
\`\`\`

Please help me understand and fix this issue. Provide an explanation and a suggested code fix using markdown.`;

    // Load chat history on mount
    useEffect(() => {
        const loadChatHistory = async () => {
            if (!reviewId || findingIndex === undefined) {
                setIsLoadingHistory(false);
                return;
            }

            try {
                const response = await fetch(`/api/chat/${reviewId}/${findingIndex}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.messages && data.messages.length > 0) {
                        setMessages(data.messages);
                    }
                }
            } catch (error) {
                console.error("Failed to load chat history:", error);
            } finally {
                setIsLoadingHistory(false);
            }
        };

        loadChatHistory();
        setInput('');
    }, [reviewId, findingIndex]);


    // --- New: Handler for the Quick Query Button ---
    const handleQuickQuery = () => {
        if (isLoading || isCommitted) return;
        // Display the truncated version to the user, but send the full version to AI
        setMessages(prev => [...prev, { sender: 'user', text: initialPrompt }]);
        generateResponse(fullPromptForAI, true); // Pass flag to skip adding message again
    };

    // --- Clear Chat Handler ---
    const handleClearChat = async () => {
        if (!window.confirm('Are you sure you want to clear this chat history? This cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`/api/chat/${reviewId}/${findingIndex}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                setMessages([]);
                alert('Chat history cleared successfully.');
            } else {
                alert('Failed to clear chat history.');
            }
        } catch (error) {
            console.error('Clear chat error:', error);
            alert('Failed to clear chat history: ' + error.message);
        }
    };


    // --- API Logic (Sends request to the dedicated backend endpoint) ---
    const generateResponse = async (prompt, skipAddingMessage = false) => {
        setIsLoading(true);

        // Add the user's prompt to the history immediately (unless already added)
        if (!skipAddingMessage) {
            setMessages(prev => [...prev, { sender: 'user', text: prompt }]);
        }

        // Load custom settings from default profile in database
        let customSettings = {};
        try {
            const profileResponse = await fetch('/api/profiles/default');
            if (profileResponse.ok) {
                const profile = await profileResponse.json();
                customSettings = {
                    systemPrompt: profile.systemPrompt,
                    temperature: profile.temperature,
                    maxTokens: profile.maxTokens,
                    model: profile.model
                };
            }
        } catch (error) {
            console.error('Failed to load profile settings:', error);
        }

        // Enhanced payload with review context and custom settings
        const payload = {
            prompt: prompt,
            findingContext: finding,
            reviewId: reviewId,
            findingIndex: findingIndex,
            customSettings: customSettings
        };

        let responseText = "Sorry, I couldn't get a response from the backend server.";
        let sources = [];

        try {
            const response = await fetch(BACKEND_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                // Expect the backend to return { text: "...", sources: [...] }
                const result = await response.json();

                responseText = result.text || responseText;
                sources = result.sources || [];

            } else {
                responseText = `Backend Error: ${response.status} ${response.statusText}. Please check the server logs.`;
            }
        } catch (error) {
            console.error("Fetch error:", error);
            responseText = `Network Error: Failed to connect to ${BACKEND_ENDPOINT}.`;
        }

        setIsLoading(false);
        setMessages(prev => [...prev, { sender: 'ai', text: responseText, sources }]);
    };

    // --- Input and Submit Handlers ---
    const handleInput = (e) => setInput(e.target.value);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (input.trim() === '' || isLoading || isCommitted) return;
        const query = input.trim();
        setInput(''); // Clear input after sending
        generateResponse(query);
    };

    return (
        <div className={styles.chatOverlay}>
            <div className={styles.chatWindow}>
                <div className={styles.chatHeader}>
                    <h3>AI Assistant: {finding.severity} Line {finding.line_number}</h3>
                    <div className={styles.headerButtons}>
                        {!isCommitted && messages.length > 0 && (
                            <button onClick={handleClearChat} className={styles.clearButton} title="Clear chat history">
                                Clear
                            </button>
                        )}
                        <button onClick={onClose} className={styles.closeButton}>
                            <FaTimes />
                        </button>
                    </div>
                </div>

                <div className={styles.chatBody}>

                    {/* Committed Notice */}
                    {isCommitted && (
                        <div className={styles.committedNotice}>
                            This review has been committed. Chat is read-only.
                        </div>
                    )}

                    {/* Loading History */}
                    {isLoadingHistory && (
                        <div className={styles.systemMessage}>
                            Loading chat history...
                        </div>
                    )}

                    {/* --- WELCOME MESSAGE AND QUICK QUERY BUTTON (Renders only if no messages exist) --- */}
                    {!isLoadingHistory && messages.length === 0 && !isCommitted && (
                        <div className={styles.welcomeSection}>
                            <div className={styles.systemMessage}>
                                Welcome to the AI Assistant! I am ready to help you fix this code review finding.
                                <p>This finding is: **{finding.message}** (Line {finding.line_number})</p>
                            </div>
                            <button
                                onClick={handleQuickQuery}
                                className={styles.quickQueryButton}
                                disabled={isLoading}
                            >
                                🤖 Start: "Help me fix this issue"
                            </button>
                        </div>
                    )}
                    {/* --------------------------------------------------------------------------------- */}

                    {messages.map((msg, index) => (
                        <ChatMessage key={index} sender={msg.sender} text={msg.text} sources={msg.sources} />
                    ))}

                    {isLoading && (
                        <div className={`${styles.chatMessage} ${styles.aiMessage}`}>
                            <FaRobot className={styles.chatIcon} />
                            <div className={styles.messageBubble}>
                                <div className={styles.loadingDots}>
                                    <span></span><span></span><span></span>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSubmit} className={styles.chatInput}>
                    <input
                        type="text"
                        placeholder={isCommitted ? "Chat is read-only (review committed)" : isLoading ? "Waiting for response..." : "Ask your question about the finding..."}
                        value={input}
                        onChange={handleInput}
                        disabled={isLoading || isCommitted}
                    />
                    <button type="submit" disabled={isLoading || isCommitted}>
                        {isLoading ? 'Sending...' : 'Send'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AIChat;
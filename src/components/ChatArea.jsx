import { useEffect, useRef, memo } from 'react';
import { Bot, Menu } from 'lucide-react';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import { motion } from 'framer-motion';

const SUGGESTIONS = [
    { icon: '💡', text: 'Explain quantum computing in simple terms' },
    { icon: '🧑‍💻', text: 'Write a Python function to sort a list' },
    { icon: '📖', text: 'Summarize the plot of Interstellar' },
    { icon: '🚀', text: 'What are the best practices for React performance?' },
];

function ChatArea({
    messages,
    isStreaming,
    streamingContent,
    onSend,
    onStop,
    onSuggestion,
    isConnected,
    activeTitle,
    selectedModel,
    onMenuToggle,
}) {
    const scrollContainerRef = useRef(null);
    const isAutoScrollFast = useRef(true);

    const handleScroll = () => {
        if (!scrollContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        isAutoScrollFast.current = scrollHeight - scrollTop - clientHeight < 150;
    };

    // Fast auto-scroll to bottom using direct scrollTop (avoids expensive DOM reflows)
    useEffect(() => {
        if (isAutoScrollFast.current && scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
    }, [messages, streamingContent]);

    const showWelcome = messages.length === 0 && !isStreaming;

    return (
        <main className="chat-main">
            {/* Header */}
            <div className="chat-header glass">
                <div className="chat-header-left">
                    <button className="mobile-menu-btn" onClick={onMenuToggle}>
                        <Menu size={20} />
                    </button>
                    <div>
                        <div className="chat-title">{activeTitle || 'New Chat'}</div>
                        <div className="chat-subtitle">
                            {selectedModel ? `Using ${selectedModel}` : 'No model selected'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Messages or Welcome */}
            {showWelcome ? (
                <div className="welcome-screen">
                    <div className="welcome-icon">
                        <Bot size={36} color="white" />
                    </div>
                    <motion.h1
                        className="welcome-title"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, type: 'spring' }}
                    >
                        Welcome to LumiChat
                    </motion.h1>
                    <motion.p
                        className="welcome-subtitle"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        Your AI assistant powered by Ollama. Ask me anything — from code reviews to creative
                        writing, I'm here to help.
                    </motion.p>
                    <motion.div
                        className="welcome-suggestions"
                        initial="hidden"
                        animate="visible"
                        variants={{
                            hidden: { opacity: 0, scale: 0.95 },
                            visible: {
                                opacity: 1,
                                scale: 1,
                                transition: { staggerChildren: 0.08, delayChildren: 0.2 }
                            }
                        }}
                    >
                        {SUGGESTIONS.map((s, i) => (
                            <motion.button
                                variants={{
                                    hidden: { opacity: 0, y: 15 },
                                    visible: { opacity: 1, y: 0, transition: { type: 'spring' } }
                                }}
                                whileHover={{ scale: 1.02, y: -2 }}
                                whileTap={{ scale: 0.98 }}
                                key={i}
                                className="suggestion-card glass"
                                onClick={() => onSuggestion(s.text)}
                                disabled={!isConnected}
                            >
                                <span className="suggestion-icon">{s.icon}</span>
                                {s.text}
                            </motion.button>
                        ))}
                    </motion.div>
                </div>
            ) : (
                <div
                    className="messages-container"
                    ref={scrollContainerRef}
                    onScroll={handleScroll}
                >
                    {messages.map((msg, i) => (
                        <MessageBubble key={msg.timestamp ? `${msg.timestamp}-${i}` : i} message={msg} />
                    ))}

                    {/* Streaming message */}
                    {isStreaming && (
                        <div className="message assistant">
                            <div className="message-avatar">
                                <Bot size={16} />
                            </div>
                            <div className="message-content">
                                <div className="message-text">
                                    {streamingContent ? (
                                        <p className="streaming-text">
                                            {streamingContent}
                                            <span className="streaming-cursor">▋</span>
                                        </p>
                                    ) : (
                                        <div className="typing-indicator">
                                            <span></span>
                                            <span></span>
                                            <span></span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Input */}
            <MessageInput
                onSend={onSend}
                onStop={onStop}
                isStreaming={isStreaming}
                disabled={!isConnected}
            />
        </main>
    );
}

export default memo(ChatArea);

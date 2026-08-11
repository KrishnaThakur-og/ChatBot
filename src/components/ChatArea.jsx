import { useEffect, useRef } from 'react';
import { Bot, Menu } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';

const SUGGESTIONS = [
    { icon: '💡', text: 'Explain quantum computing in simple terms' },
    { icon: '🧑‍💻', text: 'Write a Python function to sort a list' },
    { icon: '📖', text: 'Summarize the plot of Interstellar' },
    { icon: '🚀', text: 'What are the best practices for React performance?' },
];

function MessageBubbleContent({ content }) {
    return (
        <ReactMarkdown
            components={{
                code({ className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    const isInline = !match && !String(children).includes('\n');
                    return isInline ? (
                        <code className={className} {...props}>{children}</code>
                    ) : (
                        <div className="code-block-wrapper">
                            <SyntaxHighlighter
                                language={match?.[1] || 'text'}
                                style={oneDark}
                                customStyle={{
                                    margin: 0,
                                    padding: '16px',
                                    fontSize: '13px',
                                    background: 'transparent',
                                }}
                            >
                                {String(children).replace(/\n$/, '')}
                            </SyntaxHighlighter>
                        </div>
                    );
                },
            }}
        >
            {content}
        </ReactMarkdown>
    );
}

export default function ChatArea({
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
    const messagesEndRef = useRef(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
                    <h1 className="welcome-title">Welcome to LumiChat</h1>
                    <p className="welcome-subtitle">
                        Your AI assistant powered by Ollama. Ask me anything — from code reviews to creative
                        writing, I'm here to help.
                    </p>
                    <div className="welcome-suggestions">
                        {SUGGESTIONS.map((s, i) => (
                            <button
                                key={i}
                                className="suggestion-card glass"
                                onClick={() => onSuggestion(s.text)}
                                disabled={!isConnected}
                            >
                                <span className="suggestion-icon">{s.icon}</span>
                                {s.text}
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="messages-container">
                    {messages.map((msg, i) => (
                        <MessageBubble key={i} message={msg} />
                    ))}

                    {/* Streaming message */}
                    {isStreaming && (
                        <div className="message assistant">
                            <div className="message-avatar">
                                <Bot size={16} />
                            </div>
                            <div className="message-content" style={{
                                background: 'var(--msg-ai-bg)',
                                border: '1px solid var(--msg-ai-border)',
                                backdropFilter: 'blur(12px)',
                                padding: '14px 18px',
                                borderRadius: 'var(--radius-md)',
                            }}>
                                <div className="message-text">
                                    {streamingContent ? (
                                        <MessageBubbleContent content={streamingContent} />
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

                    <div ref={messagesEndRef} />
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

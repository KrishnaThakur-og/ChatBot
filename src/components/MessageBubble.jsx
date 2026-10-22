import { useState, useCallback, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check, Bot, User } from 'lucide-react';
import { motion } from 'framer-motion';

const CodeBlock = memo(function CodeBlock({ language, children }) {
    const [copied, setCopied] = useState(false);
    const code = String(children).replace(/\n$/, '');

    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [code]);

    return (
        <div className="code-block-wrapper">
            <div className="code-block-header">
                <span>{language || 'code'}</span>
                <button className={`copy-code-btn ${copied ? 'copied' : ''}`} onClick={handleCopy}>
                    {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
                </button>
            </div>
            <SyntaxHighlighter
                language={language || 'text'}
                style={oneDark}
                customStyle={{
                    margin: 0,
                    padding: '16px',
                    fontSize: '13px',
                    background: 'transparent',
                }}
            >
                {code}
            </SyntaxHighlighter>
        </div>
    );
});

function MessageBubble({ message }) {
    const isUser = message.role === 'user';
    const time = message.timestamp
        ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '';

    return (
        <motion.div
            className={`message ${message.role}`}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 450, damping: 28 }}
        >
            <div className="message-avatar">
                {isUser ? <User size={16} /> : <Bot size={16} />}
            </div>
            <div className="message-content">
                <div className="message-text">
                    {isUser ? (
                        <p>{message.content}</p>
                    ) : (
                        <ReactMarkdown
                            components={{
                                code({ className, children, ...props }) {
                                    const match = /language-(\w+)/.exec(className || '');
                                    const isInline = !match && !String(children).includes('\n');
                                    return isInline ? (
                                        <code className={className} {...props}>{children}</code>
                                    ) : (
                                        <CodeBlock language={match?.[1]}>{children}</CodeBlock>
                                    );
                                },
                            }}
                        >
                            {message.content}
                        </ReactMarkdown>
                    )}
                </div>
                {time && <div className="message-meta">{time}</div>}
            </div>
        </motion.div>
    );
}

export default memo(MessageBubble);

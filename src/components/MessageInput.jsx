import { useRef, useState, useCallback, useEffect } from 'react';
import { Send, Square } from 'lucide-react';

export default function MessageInput({ onSend, onStop, isStreaming, disabled }) {
    const [text, setText] = useState('');
    const textareaRef = useRef(null);

    // Auto-resize textarea
    useEffect(() => {
        const ta = textareaRef.current;
        if (!ta) return;
        ta.style.height = 'auto';
        ta.style.height = Math.min(ta.scrollHeight, 150) + 'px';
    }, [text]);

    const handleSend = useCallback(() => {
        const trimmed = text.trim();
        if (!trimmed || isStreaming) return;
        onSend(trimmed);
        setText('');
        // Reset textarea height
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }
    }, [text, isStreaming, onSend]);

    const handleKeyDown = useCallback(
        (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
            }
        },
        [handleSend]
    );

    return (
        <div className="input-area">
            <div className="input-container glass-elevated">
                <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    rows={1}
                    disabled={disabled}
                />
                {isStreaming ? (
                    <button className="send-btn stop-btn" onClick={onStop} title="Stop generating">
                        <Square size={16} />
                    </button>
                ) : (
                    <button
                        className="send-btn"
                        onClick={handleSend}
                        disabled={!text.trim() || disabled}
                        title="Send message (Enter)"
                    >
                        <Send size={16} />
                    </button>
                )}
            </div>
            <div className="input-hint">
                {isStreaming ? 'AI is generating a response...' : 'Press Enter to send · Shift+Enter for new line'}
            </div>
        </div>
    );
}

import { memo } from 'react';
import {
    MessageSquarePlus,
    MessageCircle,
    Sparkles,
    Trash2,
    MessageSquare,
    RefreshCw,
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import ModelSelector from './ModelSelector';
import { motion, AnimatePresence } from 'framer-motion';

function Sidebar({
    conversations,
    activeId,
    onSelect,
    onNewChat,
    onDelete,
    models,
    selectedModel,
    onModelChange,
    isConnected,
    theme,
    onThemeToggle,
    isOpen,
    onClose,
    onRefresh,
}) {
    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="sidebar-overlay visible"
                        onClick={onClose}
                    />
                )}
            </AnimatePresence>
            <aside className={`sidebar glass-elevated ${isOpen ? 'open' : ''}`}>
                {/* Header */}
                <div className="sidebar-header">
                    <div className="sidebar-title">
                        <Sparkles size={20} />
                        <span>LumiChat</span>
                    </div>
                </div>

                {/* New Chat Button */}
                <button className="new-chat-btn" onClick={onNewChat}>
                    <MessageSquarePlus size={16} />
                    New Chat
                </button>

                {/* Chat List */}
                <div className="chat-list">
                    {conversations.length === 0 ? (
                        <div className="empty-chats">
                            <MessageSquare size={28} />
                            <span>No conversations yet</span>
                            <span>Start a new chat to begin</span>
                        </div>
                    ) : (
                        conversations.map((conv, idx) => (
                            <motion.button
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                                key={conv.id}
                                className={`chat-list-item ${conv.id === activeId ? 'active' : ''}`}
                                onClick={() => onSelect(conv.id)}
                            >
                                <MessageCircle size={14} />
                                <span>{conv.title || 'New Chat'}</span>
                                <span
                                    className="delete-btn"
                                    role="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete(conv.id);
                                    }}
                                >
                                    <Trash2 size={13} />
                                </span>
                            </motion.button>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="sidebar-footer">
                    <ModelSelector
                        models={models}
                        selected={selectedModel}
                        onChange={onModelChange}
                    />
                    <div className="connection-status">
                        <span className={`status-dot ${isConnected ? 'online' : 'offline'}`} />
                        <span>{isConnected ? 'Ollama Connected' : 'Ollama Offline'}</span>
                        {onRefresh && (
                            <button
                                className="refresh-status-btn"
                                onClick={onRefresh}
                                title="Refresh Ollama status & models"
                                aria-label="Refresh status"
                            >
                                <RefreshCw size={12} />
                            </button>
                        )}
                    </div>
                    <ThemeToggle theme={theme} onToggle={onThemeToggle} />
                </div>
            </aside>
        </>
    );
}

export default memo(Sidebar);

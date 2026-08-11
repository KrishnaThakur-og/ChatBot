import {
    MessageSquarePlus,
    MessageCircle,
    Sparkles,
    Trash2,
    MessageSquare,
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import ModelSelector from './ModelSelector';

export default function Sidebar({
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
}) {
    return (
        <>
            <div className={`sidebar-overlay ${isOpen ? 'visible' : ''}`} onClick={onClose} />
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
                        conversations.map((conv) => (
                            <button
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
                            </button>
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
                    </div>
                    <ThemeToggle theme={theme} onToggle={onThemeToggle} />
                </div>
            </aside>
        </>
    );
}

import { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import { checkConnection, fetchModels, streamChat } from './services/ollama';

// ── Helpers ────────────────────────────────
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function getStoredConversations() {
  try {
    return JSON.parse(localStorage.getItem('lumichat-conversations') || '[]');
  } catch {
    return [];
  }
}

function storeConversations(convs) {
  localStorage.setItem('lumichat-conversations', JSON.stringify(convs));
}

function getStoredTheme() {
  return localStorage.getItem('lumichat-theme') || 'dark';
}

function getStoredModel() {
  return localStorage.getItem('lumichat-model') || '';
}

// ── App ────────────────────────────────────
export default function App() {
  // Theme
  const [theme, setTheme] = useState(getStoredTheme);

  // Conversations: [{ id, title, messages: [{role, content, timestamp}] }]
  const [conversations, setConversations] = useState(getStoredConversations);
  const [activeId, setActiveId] = useState(() => {
    const stored = getStoredConversations();
    return stored.length > 0 ? stored[0].id : null;
  });

  // Models
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState(getStoredModel);

  // Connection
  const [isConnected, setIsConnected] = useState(false);

  // Streaming
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const abortRef = useRef(null);

  // Sidebar mobile
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── Apply theme ──
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('lumichat-theme', theme);
  }, [theme]);

  // ── Persist conversations ──
  useEffect(() => {
    storeConversations(conversations);
  }, [conversations]);

  // ── Persist selected model ──
  useEffect(() => {
    if (selectedModel) localStorage.setItem('lumichat-model', selectedModel);
  }, [selectedModel]);

  // ── Check connection & load models ──
  useEffect(() => {
    let interval;
    const check = async () => {
      const online = await checkConnection();
      setIsConnected(online);
      if (online) {
        const modelList = await fetchModels();
        setModels(modelList);
        // Auto-select first model if none selected
        if (!selectedModel && modelList.length > 0) {
          setSelectedModel(modelList[0].name);
        }
      }
    };
    check();
    interval = setInterval(check, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Get active conversation ──
  const activeConv = conversations.find((c) => c.id === activeId);
  const activeMessages = activeConv?.messages || [];

  // ── Toggle theme ──
  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'light' ? 'dark' : 'light'));
  }, []);

  // ── New Chat ──
  const handleNewChat = useCallback(() => {
    const newConv = { id: generateId(), title: 'New Chat', messages: [] };
    setConversations((prev) => [newConv, ...prev]);
    setActiveId(newConv.id);
    setSidebarOpen(false);
  }, []);

  // ── Select Chat ──
  const handleSelectChat = useCallback((id) => {
    setActiveId(id);
    setSidebarOpen(false);
  }, []);

  // ── Delete Chat ──
  const handleDeleteChat = useCallback(
    (id) => {
      setConversations((prev) => {
        const next = prev.filter((c) => c.id !== id);
        if (activeId === id) {
          setActiveId(next.length > 0 ? next[0].id : null);
        }
        return next;
      });
    },
    [activeId]
  );

  // ── Send Message ──
  const handleSend = useCallback(
    async (text) => {
      if (!selectedModel || !isConnected) return;

      // If no active conversation, create one
      let convId = activeId;
      if (!convId) {
        const newConv = { id: generateId(), title: 'New Chat', messages: [] };
        setConversations((prev) => [newConv, ...prev]);
        convId = newConv.id;
        setActiveId(convId);
      }

      const userMessage = { role: 'user', content: text, timestamp: Date.now() };

      // Add user message
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== convId) return c;
          const updatedMessages = [...c.messages, userMessage];
          // Auto-title from first user message
          const title = c.messages.length === 0 ? text.slice(0, 40) + (text.length > 40 ? '…' : '') : c.title;
          return { ...c, messages: updatedMessages, title };
        })
      );

      // Start streaming
      setIsStreaming(true);
      setStreamingContent('');

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        // Build messages array for Ollama
        const currentConv = conversations.find((c) => c.id === convId);
        const chatMessages = [...(currentConv?.messages || []), userMessage].map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const fullResponse = await streamChat(
          selectedModel,
          chatMessages,
          (token) => {
            setStreamingContent((prev) => prev + token);
          },
          controller.signal
        );

        // Add AI message
        const aiMessage = { role: 'assistant', content: fullResponse, timestamp: Date.now() };
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== convId) return c;
            return { ...c, messages: [...c.messages, aiMessage] };
          })
        );
      } catch (err) {
        if (err.name !== 'AbortError') {
          const errMsg = {
            role: 'assistant',
            content: `⚠️ Error: ${err.message}\n\nMake sure Ollama is running and the model "${selectedModel}" is available.`,
            timestamp: Date.now(),
          };
          setConversations((prev) =>
            prev.map((c) => {
              if (c.id !== convId) return c;
              return { ...c, messages: [...c.messages, errMsg] };
            })
          );
        }
      } finally {
        setIsStreaming(false);
        setStreamingContent('');
        abortRef.current = null;
      }
    },
    [selectedModel, isConnected, activeId, conversations]
  );

  // ── Stop Streaming ──
  const handleStop = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
  }, []);

  // ── Suggestion Click ──
  const handleSuggestion = useCallback(
    (text) => {
      handleSend(text);
    },
    [handleSend]
  );

  return (
    <>
      {/* Animated Background */}
      <div className="animated-bg">
        <div className="bg-orb"></div>
        <div className="bg-orb"></div>
      </div>

      {/* Main Layout */}
      <div className="app-container">
        <Sidebar
          conversations={conversations}
          activeId={activeId}
          onSelect={handleSelectChat}
          onNewChat={handleNewChat}
          onDelete={handleDeleteChat}
          models={models}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          isConnected={isConnected}
          theme={theme}
          onThemeToggle={toggleTheme}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <ChatArea
          messages={activeMessages}
          isStreaming={isStreaming}
          streamingContent={streamingContent}
          onSend={handleSend}
          onStop={handleStop}
          onSuggestion={handleSuggestion}
          isConnected={isConnected}
          activeTitle={activeConv?.title}
          selectedModel={selectedModel}
          onMenuToggle={() => setSidebarOpen((o) => !o)}
        />
      </div>
    </>
  );
}

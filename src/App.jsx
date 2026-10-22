import { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import { fetchModels, streamChat, preloadModel } from './services/ollama';

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
  const conversationsRef = useRef(conversations);
  const isStreamingRef = useRef(false);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    isStreamingRef.current = isStreaming;
  }, [isStreaming]);

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

  // ── Fetch models & check connection on-demand ──
  const refreshModels = useCallback(async () => {
    const { online, models: modelList } = await fetchModels();
    setIsConnected(online);
    if (online) {
      setModels(modelList);

      const modelNames = modelList.map((m) => m.name);
      let chosen = selectedModel;

      if (!chosen || !modelNames.includes(chosen)) {
        // Prioritize 3B / fast models that fit 100% on GPU
        const fastModel = modelList.find((m) => /3b|local|qwen2\.5:3b/i.test(m.name)) || modelList[0];
        chosen = fastModel ? fastModel.name : '';
        if (chosen) {
          setSelectedModel(chosen);
          localStorage.setItem('lumichat-model', chosen);
        }
      }

      if (chosen) {
        preloadModel(chosen);
      }
    }
  }, [selectedModel]);

  // ── Load models ONCE on startup and on window focus (NO background timer polling) ──
  useEffect(() => {
    // Initial fetch once on app load
    refreshModels();

    // Only re-check when the user returns to the window (e.g. after starting Ollama)
    const onFocus = () => {
      if (!isStreamingRef.current) {
        refreshModels();
      }
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Persist selected model & preload into GPU ──
  const handleModelChange = useCallback((newModel) => {
    setSelectedModel(newModel);
    if (newModel) {
      localStorage.setItem('lumichat-model', newModel);
      preloadModel(newModel);
    }
  }, []);

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
          const title = c.messages.length === 0 ? text.slice(0, 36) + (text.length > 36 ? '…' : '') : c.title;
          return { ...c, messages: updatedMessages, title };
        })
      );

      // Start streaming
      setIsStreaming(true);
      setStreamingContent('');

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        // Keep history to last 8 messages for optimal context speed
        const currentConv = conversationsRef.current.find((c) => c.id === convId);
        const recentHistory = (currentConv?.messages || []).slice(-8);

        const systemPrompt = {
          role: 'system',
          content:
            'You are LumiChat, a fast and helpful AI assistant. Give concise, direct answers. Use code blocks when sharing code.',
        };

        const chatMessages = [systemPrompt, ...recentHistory, userMessage].map((m) => ({
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
    [selectedModel, isConnected, activeId]
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
          onModelChange={handleModelChange}
          isConnected={isConnected}
          theme={theme}
          onThemeToggle={toggleTheme}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onRefresh={refreshModels}
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

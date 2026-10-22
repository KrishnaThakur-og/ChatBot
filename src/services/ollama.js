// Ollama API Service — handles model listing, streaming chat, and connection checks

const OLLAMA_BASE = 'http://localhost:11434';

/**
 * Fetch available models from Ollama & check connection status in a single request.
 * Does NOT spam `/api/tags` repeatedly.
 */
export async function fetchModels() {
    try {
        const res = await fetch(`${OLLAMA_BASE}/api/tags`, { signal: AbortSignal.timeout(3500) });
        if (!res.ok) throw new Error('Failed to fetch models');
        const data = await res.json();
        const models = (data.models || []).map((m) => ({
            name: m.name,
            size: m.size,
            modified: m.modified_at,
        }));
        return { online: true, models };
    } catch {
        return { online: false, models: [] };
    }
}

/**
 * Check if Ollama server is reachable using lightweight /api/version
 */
export async function checkConnection() {
    try {
        const res = await fetch(`${OLLAMA_BASE}/api/version`, { signal: AbortSignal.timeout(2000) });
        return res.ok;
    } catch {
        return false;
    }
}

/**
 * Preload a model into GPU memory and keep it warm.
 * This eliminates the cold-start delay when the user sends their first message.
 */
export async function preloadModel(model) {
    if (!model) return;
    try {
        await fetch(`${OLLAMA_BASE}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                keep_alive: '60m',
            }),
        });
    } catch (err) {
        console.warn('preloadModel error:', err);
    }
}

/**
 * Stream a chat completion from Ollama.
 * Tokens are batched with requestAnimationFrame so the UI is not
 * re-rendered on every single token.
 */
export async function streamChat(model, messages, onChunk, signal) {
    const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model,
            messages,
            stream: true,
            keep_alive: '60m',
            options: {
                temperature: 0.5,
                top_p: 0.9,
                top_k: 40,
                num_predict: 768,
                num_ctx: 2048,     // Optimal context: keeps 3B models 100% in 4GB GPU VRAM
                num_thread: 8,     // Fallback to physical CPU cores
            },
        }),
        signal,
    });

    if (!res.ok) {
        const errText = await res.text().catch(() => 'Unknown error');
        throw new Error(`Ollama error ${res.status}: ${errText}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let pending = '';
    let rafId = 0;
    let leftover = '';

    const flush = () => {
        rafId = 0;
        if (!pending) return;
        const chunk = pending;
        pending = '';
        onChunk(chunk);
    };

    const queue = (token) => {
        pending += token;
        if (!rafId) {
            rafId = requestAnimationFrame(flush);
        }
    };

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            leftover += decoder.decode(value, { stream: true });
            const lines = leftover.split('\n');
            leftover = lines.pop() || '';

            for (const line of lines) {
                if (!line.trim()) continue;
                try {
                    const json = JSON.parse(line);
                    const token = json.message?.content;
                    if (token) {
                        fullText += token;
                        queue(token);
                    }
                } catch {
                    // skip malformed JSON chunks
                }
            }
        }

        if (leftover.trim()) {
            try {
                const json = JSON.parse(leftover);
                const token = json.message?.content;
                if (token) {
                    fullText += token;
                    queue(token);
                }
            } catch {
                // ignore trailing garbage
            }
        }
    } finally {
        if (rafId) cancelAnimationFrame(rafId);
        if (pending) onChunk(pending);
    }

    return fullText;
}

// Ollama API Service — handles model listing, streaming chat, and connection checks

const OLLAMA_BASE = 'http://localhost:11434';

/**
 * Check if Ollama server is reachable
 */
export async function checkConnection() {
    try {
        const res = await fetch(`${OLLAMA_BASE}/api/tags`, { signal: AbortSignal.timeout(3000) });
        return res.ok;
    } catch {
        return false;
    }
}

/**
 * Fetch available models from Ollama
 */
export async function fetchModels() {
    try {
        const res = await fetch(`${OLLAMA_BASE}/api/tags`);
        if (!res.ok) throw new Error('Failed to fetch models');
        const data = await res.json();
        return (data.models || []).map((m) => ({
            name: m.name,
            size: m.size,
            modified: m.modified_at,
        }));
    } catch (err) {
        console.error('fetchModels error:', err);
        return [];
    }
}

/**
 * Stream a chat completion from Ollama
 * @param {string} model - model name (e.g. "llama3.2")
 * @param {Array} messages - array of {role, content}
 * @param {function} onChunk - callback(token: string)
 * @param {AbortSignal} signal - AbortController signal
 * @returns {Promise<string>} full response text
 */
export async function streamChat(model, messages, onChunk, signal) {
    const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model,
            messages,
            stream: true,
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

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(Boolean);

        for (const line of lines) {
            try {
                const json = JSON.parse(line);
                if (json.message?.content) {
                    fullText += json.message.content;
                    onChunk(json.message.content);
                }
            } catch {
                // skip malformed JSON chunks
            }
        }
    }

    return fullText;
}

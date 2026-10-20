import { auth } from './firebase';
import { settingsService } from './settingsService';
import { describeAiError, getOllamaProxyBase, resolveCloudModel } from './ollamaConfig';

class AiService {
    model() {
        return resolveCloudModel(settingsService.get().llmModel);
    }

    isAvailable() {
        return true;
    }

    async _authHeaders() {
        const user = auth.currentUser;
        if (!user) {
            const error = new Error('Sign in required');
            error.status = 401;
            throw error;
        }
        const token = await user.getIdToken();
        return {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        };
    }

    async _request(path, { method = 'GET', body, signal } = {}) {
        const headers = await this._authHeaders();
        let res;
        try {
            res = await fetch(`${getOllamaProxyBase()}${path}`, {
                method,
                headers,
                body: body === undefined ? undefined : JSON.stringify(body),
                signal: signal ?? null,
            });
        } catch (err) {
            if (err?.name === 'AbortError') throw err;
            const wrapped = new TypeError(err?.message || 'Failed to fetch');
            wrapped.cause = err;
            throw wrapped;
        }

        if (!res.ok) {
            const errText = await res.text().catch(() => '');
            let detail = errText;
            try {
                const parsed = JSON.parse(errText);
                if (parsed && typeof parsed.error === 'string') detail = parsed.error;
            } catch (e) { /* body was not JSON */ }
            const error = new Error(detail || `Request failed (${res.status})`);
            error.status = res.status;
            throw error;
        }
        return res;
    }

    async chat(messages, opts = {}) {
        try {
            const res = await this._request('/v1/chat/completions', {
                method: 'POST',
                signal: opts.signal,
                body: {
                    model: resolveCloudModel(opts.model || settingsService.get().llmModel),
                    messages,
                    stream: false,
                    temperature: opts.temperature ?? 0.8,
                    max_tokens: opts.maxTokens ?? 1024,
                },
            });
            const json = await res.json();
            return json.choices?.[0]?.message?.content ?? null;
        } catch (e) {
            if (e?.name !== 'AbortError') {
                console.warn('[ai]', describeAiError(e));
            }
            return null;
        }
    }

    /** OpenAI-compatible SSE response from Ollama Cloud, via the proxy. */
    chatStream(messages, opts = {}) {
        return this._request('/v1/chat/completions', {
            method: 'POST',
            signal: opts.signal,
            body: {
                model: resolveCloudModel(opts.model || settingsService.get().llmModel),
                messages,
                stream: true,
                temperature: opts.temperature ?? 0.8,
                max_tokens: opts.maxTokens ?? 1024,
            },
        });
    }

    async listModels(opts = {}) {
        const res = await this._request('/api/tags', { method: 'GET', signal: opts.signal });
        const data = await res.json();
        return (data.models || [])
            .map((m) => m.name || m.model)
            .filter(Boolean);
    }

    /**
     * Confirms the server key is accepted, then returns Cloud model ids.
     * /api/tags answers without a key, so a one-token chat is the real check.
     */
    async testConnection(opts = {}) {
        const res = await this._request('/v1/chat/completions', {
            method: 'POST',
            signal: opts.signal,
            body: {
                model: this.model(),
                messages: [{ role: 'user', content: 'ping' }],
                stream: false,
                temperature: 0,
                max_tokens: 1,
            },
        });
        await res.json().catch(() => null);
        try {
            return await this.listModels(opts);
        } catch (e) {
            return [];
        }
    }
}

export const aiService = new AiService();
export { describeAiError };

import { settingsService } from './settingsService';

class AiService {
    _getConfig() {
        const s = settingsService.get();
        return {
            url: s.llmApiUrl.replace(/\/+$/, ''),
            model: s.llmModel,
        };
    }

    isAvailable() {
        return !!settingsService.get().llmApiUrl;
    }

    async chat(messages, opts = {}) {
        if (!this.isAvailable()) return null;
        const config = this._getConfig();

        const temperature = opts.temperature ?? 0.8;
        const maxTokens = opts.maxTokens ?? 1024;

        try {
            const res = await fetch(`${config.url}/v1/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: config.model,
                    messages,
                    stream: false,
                    temperature,
                    max_tokens: maxTokens,
                }),
                signal: opts.signal ?? null,
            });

            if (!res.ok) return null;

            const json = await res.json();
            return json.choices?.[0]?.message?.content ?? null;
        } catch (e) {
            return null;
        }
    }
}

export const aiService = new AiService();
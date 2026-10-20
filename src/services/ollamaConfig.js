/** Ollama Cloud model id used when Settings has none. See https://docs.ollama.com/cloud */
export const DEFAULT_CLOUD_MODEL = 'gemma4:31b';

/**
 * Browser base URL for the proxy. The API key never lives here.
 * - Unset: same-origin `/ollama-proxy` (webpack dev proxy, or Hosting → Cloud Run).
 * - `OLLAMA_PROXY_URL`: full origin, inlined by webpack (direct Cloud Run or a custom local port).
 */
export function getOllamaProxyBase() {
    const configured = (process.env.OLLAMA_PROXY_URL || '').trim().replace(/\/+$/, '');
    return configured || '/ollama-proxy';
}

/**
 * Direct Cloud API names do not use the CLI `:cloud` suffix.
 * https://docs.ollama.com/cloud — example model `gemma4:31b`.
 */
export function resolveCloudModel(model) {
    const trimmed = (model || '').trim();
    if (!trimmed || trimmed === 'gemma4:cloud' || trimmed === 'gemma4:31b-cloud') {
        return DEFAULT_CLOUD_MODEL;
    }
    if (trimmed.endsWith('-cloud')) return trimmed.slice(0, -'-cloud'.length);
    return trimmed;
}

export function describeAiError(err) {
    const message = err?.message || '';
    const network = err?.name === 'TypeError'
        || /Failed to fetch|NetworkError|Load failed|ECONNREFUSED/i.test(message);
    if (network) {
        const base = getOllamaProxyBase();
        const localProxy = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(base);
        const localPage = typeof location !== 'undefined'
            && /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
        if (localPage || localProxy) {
            return 'Could not reach the Ollama proxy. In another terminal, run npm run proxy with the API key in the gitignored .env.';
        }
        return 'Could not reach Ollama Cloud. Try again in a moment.';
    }
    if (err?.status === 401) return 'Sign in to use AI, then try again.';
    if (err?.status === 429) return message || 'Too many AI requests. Wait a moment and try again.';
    if (err?.status === 503) return message || 'Ollama Cloud is not configured on the server.';
    return message || 'Ollama Cloud request failed.';
}

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { authState, settingsState } = vi.hoisted(() => ({
    authState: {
        currentUser: {
            getIdToken: vi.fn(async () => 'firebase-id-token'),
        },
    },
    settingsState: {
        llmModel: 'gemma4:31b-cloud',
    },
}));

vi.mock('../src/services/firebase', () => ({
    auth: authState,
}));

vi.mock('../src/services/settingsService', () => ({
    settingsService: {
        get: () => settingsState,
    },
}));

import { aiService } from '../src/services/aiService';

beforeEach(() => {
    authState.currentUser = { getIdToken: vi.fn(async () => 'firebase-id-token') };
    settingsState.llmModel = 'gemma4:31b-cloud';
    vi.stubGlobal('fetch', vi.fn());
});

describe('aiService', () => {
    it('calls the proxy with the Firebase ID token and a cloud model id', async () => {
        fetch.mockResolvedValue(new Response(JSON.stringify({
            choices: [{ message: { content: 'hola' } }],
        }), { status: 200, headers: { 'content-type': 'application/json' } }));

        const text = await aiService.chat([{ role: 'user', content: 'hi' }], { temperature: 0.2 });

        expect(text).toBe('hola');
        expect(fetch).toHaveBeenCalledTimes(1);
        const [url, init] = fetch.mock.calls[0];
        expect(url).toBe('/ollama-proxy/v1/chat/completions');
        expect(init.headers.Authorization).toBe('Bearer firebase-id-token');
        const body = JSON.parse(init.body);
        expect(body.model).toBe('gemma4:31b');
        expect(body.stream).toBe(false);
        expect(body.temperature).toBe(0.2);
        expect(JSON.stringify(init.headers)).not.toMatch(/OLLAMA_API_KEY|sk-/);
    });

    it('returns null when the proxy rejects the call', async () => {
        fetch.mockResolvedValue(new Response(JSON.stringify({ error: 'nope' }), { status: 502 }));
        const text = await aiService.chat([{ role: 'user', content: 'hi' }]);
        expect(text).toBeNull();
    });

    it('returns null when nobody is signed in', async () => {
        authState.currentUser = null;
        const text = await aiService.chat([{ role: 'user', content: 'hi' }]);
        expect(text).toBeNull();
        expect(fetch).not.toHaveBeenCalled();
    });

    it('is available without a user-supplied server URL', () => {
        expect(aiService.isAvailable()).toBe(true);
    });

    it('checks the server key with a one-token chat before listing models', async () => {
        fetch
            .mockResolvedValueOnce(new Response(JSON.stringify({
                choices: [{ message: { content: 'ok' } }],
            }), { status: 200, headers: { 'content-type': 'application/json' } }))
            .mockResolvedValueOnce(new Response(JSON.stringify({
                models: [{ name: 'gemma4:31b' }],
            }), { status: 200, headers: { 'content-type': 'application/json' } }));

        const models = await aiService.testConnection();
        expect(models).toEqual(['gemma4:31b']);
        expect(fetch.mock.calls[0][0]).toBe('/ollama-proxy/v1/chat/completions');
        expect(JSON.parse(fetch.mock.calls[0][1].body).max_tokens).toBe(1);
        expect(fetch.mock.calls[1][0]).toBe('/ollama-proxy/api/tags');
    });
});

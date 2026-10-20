/**
 * @vitest-environment node
 */
import { describe, it, expect, afterEach } from 'vitest';
import { createApp, resolveUpstream, stripProxyPrefix } from '../functions/server.js';

describe('proxy path helpers', () => {
    it('strips the hosting prefix and ignores anything else', () => {
        expect(stripProxyPrefix('/ollama-proxy/v1/chat/completions')).toBe('/v1/chat/completions');
        expect(stripProxyPrefix('/v1/chat/completions')).toBe('/v1/chat/completions');
        expect(stripProxyPrefix('/ollama-proxy')).toBe('/');
    });

    it('only allows the official Ollama Cloud hosts', () => {
        expect(resolveUpstream('')).toBe('https://ollama.com');
        expect(resolveUpstream('https://api.ollama.com/ignored')).toBe('https://api.ollama.com');
        expect(resolveUpstream('http://ollama.com')).toBe('https://ollama.com');
        expect(resolveUpstream('https://evil.example')).toBe('https://ollama.com');
    });
});

describe('ollama proxy http', () => {
    let server;

    afterEach(async () => {
        if (server) {
            await new Promise((resolve) => server.close(resolve));
            server = null;
        }
    });

    function start(overrides = {}) {
        const calls = [];
        const fetchImpl = overrides.fetchImpl || (async (url, init) => {
            calls.push({ url, init });
            return new Response(JSON.stringify({ models: [{ name: 'gemma4:31b' }] }), {
                status: 200,
                headers: { 'content-type': 'application/json' },
            });
        });
        const app = createApp({
            apiKey: 'server-side-key',
            authRequired: true,
            verifyToken: async (token) => (token === 'good-token' ? 'user-1' : null),
            rateLimitPerMin: 60,
            corsOrigins: ['http://localhost:8080'],
            fetchImpl,
            ...overrides,
            fetchImpl,
        });
        return new Promise((resolve) => {
            server = app.listen(0, '127.0.0.1', () => {
                resolve({ base: `http://127.0.0.1:${server.address().port}`, calls });
            });
        });
    }

    it('rejects missing and invalid Firebase tokens', async () => {
        const { base } = await start();
        const missing = await fetch(`${base}/api/tags`);
        expect(missing.status).toBe(401);
        const bad = await fetch(`${base}/api/tags`, { headers: { Authorization: 'Bearer nope' } });
        expect(bad.status).toBe(401);
    });

    it('forwards an allowlisted call with the server key, not the user token', async () => {
        const { base, calls } = await start();
        const res = await fetch(`${base}/ollama-proxy/api/tags`, {
            headers: {
                Authorization: 'Bearer good-token',
                Origin: 'http://localhost:8080',
            },
        });
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.models[0].name).toBe('gemma4:31b');
        expect(calls[0].url).toBe('https://ollama.com/api/tags');
        expect(calls[0].init.headers.Authorization).toBe('Bearer server-side-key');
        expect(calls[0].init.headers.Authorization).not.toContain('good-token');
        expect(res.headers.get('access-control-allow-origin')).toBe('http://localhost:8080');
    });

    it('streams chat completions and blocks other paths', async () => {
        const { base, calls } = await start({
            fetchImpl: async (url, init) => {
                calls.push({ url, init });
                return new Response('data: {"choices":[{"delta":{"content":"Hi"}}]}\n\n', {
                    status: 200,
                    headers: { 'content-type': 'text/event-stream' },
                });
            },
        });

        const blocked = await fetch(`${base}/api/pull`, {
            method: 'POST',
            headers: {
                Authorization: 'Bearer good-token',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: 'x' }),
        });
        expect(blocked.status).toBe(403);

        const res = await fetch(`${base}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                Authorization: 'Bearer good-token',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gemma4:31b',
                messages: [{ role: 'user', content: 'Say hi' }],
                stream: true,
            }),
        });
        expect(res.status).toBe(200);
        expect(await res.text()).toContain('Hi');
        const forwarded = JSON.parse(calls[0].init.body);
        expect(forwarded.model).toBe('gemma4:31b');
        expect(forwarded.stream).toBe(true);
        expect(calls[0].init.headers.Authorization).toBe('Bearer server-side-key');
    });

    it('turns an upstream auth failure into a server-key error', async () => {
        const { base } = await start({
            fetchImpl: async () => new Response('{"error":"unauthorized"}', {
                status: 401,
                headers: { 'content-type': 'application/json' },
            }),
        });
        const res = await fetch(`${base}/api/tags`, {
            headers: { Authorization: 'Bearer good-token' },
        });
        const json = await res.json();
        expect(res.status).toBe(502);
        expect(json.error).toMatch(/server API key/i);
        expect(JSON.stringify(json)).not.toContain('server-side-key');
    });

    it('does not leak the API key from the health check', async () => {
        const { base } = await start();
        const res = await fetch(`${base}/health`);
        const text = await res.text();
        expect(res.status).toBe(200);
        expect(text).not.toContain('server-side-key');
        expect(text).toContain('polyglot-ollama-proxy');
    });

    it('rate limits per Firebase user', async () => {
        const { base } = await start({ rateLimitPerMin: 1 });
        const headers = { Authorization: 'Bearer good-token' };
        expect((await fetch(`${base}/api/tags`, { headers })).status).toBe(200);
        expect((await fetch(`${base}/api/tags`, { headers })).status).toBe(429);
    });
});

/**
 * Ollama Cloud proxy.
 *
 * The browser sends the user's Firebase ID token. This process verifies it,
 * then calls https://ollama.com with OLLAMA_API_KEY from the environment.
 * The key is never returned to the client.
 *
 * Local:  npm run proxy   (reads the repo-root .env)
 * Cloud:  Cloud Run service "ollama-proxy", secret OLLAMA_API_KEY
 */
const express = require('express');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');

const ALLOWED_ROUTES = {
    '/api/tags': 'GET',
    '/api/chat': 'POST',
    '/api/generate': 'POST',
    '/v1/chat/completions': 'POST',
};

const ALLOWED_UPSTREAM_HOSTS = new Set(['ollama.com', 'api.ollama.com']);
const PROXY_PREFIX = '/ollama-proxy';

const DEFAULT_CORS = [
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    'https://polyglot121725.web.app',
    'https://polyglot121725.firebaseapp.com',
];

function loadDotEnv() {
    const files = [
        path.join(__dirname, '.env'),
        path.join(__dirname, '..', '.env'),
    ];
    for (const file of files) {
        if (!fs.existsSync(file)) continue;
        const text = fs.readFileSync(file, 'utf8');
        for (const line of text.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            const eq = trimmed.indexOf('=');
            if (eq <= 0) continue;
            const key = trimmed.slice(0, eq).trim();
            let value = trimmed.slice(eq + 1).trim();
            if (
                (value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))
            ) {
                value = value.slice(1, -1);
            }
            if (process.env[key] === undefined) process.env[key] = value;
        }
    }
}

function stripProxyPrefix(pathname) {
    if (pathname === PROXY_PREFIX) return '/';
    if (pathname.startsWith(`${PROXY_PREFIX}/`)) return pathname.slice(PROXY_PREFIX.length);
    return pathname;
}

function resolveUpstream(raw) {
    const fallback = 'https://ollama.com';
    if (!raw) return fallback;
    try {
        const url = new URL(raw);
        if (url.protocol !== 'https:' || !ALLOWED_UPSTREAM_HOSTS.has(url.hostname)) return fallback;
        return url.origin;
    } catch (e) {
        return fallback;
    }
}

function parseCorsOrigins(raw) {
    const list = (raw || DEFAULT_CORS.join(','))
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    return list.length ? list : DEFAULT_CORS.slice();
}

function redact(text, secret) {
    const value = String(text || '');
    if (!secret) return value;
    return value.split(secret).join('[redacted]');
}

function createApp(options = {}) {
    const apiKey = options.apiKey ?? process.env.OLLAMA_API_KEY ?? '';
    const authRequired = options.authRequired
        ?? String(process.env.PROXY_AUTH_REQUIRED ?? 'true').toLowerCase() !== 'false';
    const upstreamBase = resolveUpstream(options.upstreamBase || process.env.OLLAMA_UPSTREAM);
    const verifyToken = options.verifyToken || defaultVerifyToken;
    const fetchImpl = options.fetchImpl || fetch;
    const rateLimitPerMin = Math.max(1, parseInt(options.rateLimitPerMin ?? process.env.RATE_LIMIT_PER_MIN ?? '60', 10));
    const corsOrigins = options.corsOrigins || parseCorsOrigins(process.env.CORS_ORIGINS);

    const buckets = new Map();
    const app = express();
    app.disable('x-powered-by');
    app.set('trust proxy', true);
    app.use(express.json({ limit: '1mb' }));

    function applyCors(req, res) {
        const origin = req.headers.origin || '';
        if (origin && corsOrigins.includes(origin)) {
            res.set('Access-Control-Allow-Origin', origin);
            res.set('Vary', 'Origin');
        }
        res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.set('Access-Control-Max-Age', '600');
    }

    app.use((req, res, next) => {
        applyCors(req, res);
        if (req.method === 'OPTIONS') {
            res.status(204).end();
            return;
        }
        next();
    });

    app.get(['/', '/health'], (req, res) => {
        res.json({
            ok: true,
            service: 'polyglot-ollama-proxy',
            authRequired,
            upstream: upstreamBase,
            allowlist: Object.keys(ALLOWED_ROUTES),
        });
    });

    app.use(async (req, res) => {
        try {
            if (!apiKey) {
                res.status(503).json({ error: 'OLLAMA_API_KEY is not configured on the server' });
                return;
            }

            const auth = await authenticate(req, authRequired, verifyToken);
            const rateKey = auth.uid ? `uid:${auth.uid}` : `ip:${req.ip || 'unknown'}`;
            if (!allowRequest(buckets, rateKey, rateLimitPerMin)) {
                res.status(429).json({ error: 'Too many AI requests. Wait a moment and try again.' });
                return;
            }

            const upstreamPath = stripProxyPrefix(req.path);
            const allowedMethod = ALLOWED_ROUTES[upstreamPath];
            if (!allowedMethod) {
                res.status(403).json({ error: 'Path not allowlisted' });
                return;
            }
            if (req.method !== allowedMethod) {
                res.status(405).json({ error: `Use ${allowedMethod} for this path` });
                return;
            }

            let body;
            if (req.method === 'POST') {
                if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
                    res.status(400).json({ error: 'JSON object body required' });
                    return;
                }
                body = req.body;
            }

            const controller = new AbortController();
            res.on('close', () => {
                if (!res.writableEnded) controller.abort();
            });

            const upstream = await fetchImpl(`${upstreamBase}${upstreamPath}`, {
                method: req.method,
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
                },
                body: body !== undefined ? JSON.stringify(body) : undefined,
                signal: controller.signal,
            });

            if (upstream.status === 401 || upstream.status === 403) {
                const text = await upstream.text().catch(() => '');
                console.error('Ollama Cloud rejected the server API key', redact(text, apiKey).slice(0, 300));
                res.status(502).json({ error: 'Ollama Cloud rejected the server API key' });
                return;
            }

            res.status(upstream.status);
            const contentType = upstream.headers.get('content-type');
            if (contentType) res.set('Content-Type', contentType);
            res.set('Cache-Control', 'no-cache, no-transform');
            res.set('X-Accel-Buffering', 'no');
            res.flushHeaders();

            if (!upstream.body) {
                res.end();
                return;
            }

            await new Promise((resolve, reject) => {
                const stream = Readable.fromWeb(upstream.body);
                stream.on('error', reject);
                res.on('error', reject);
                res.on('finish', resolve);
                stream.pipe(res);
            });
        } catch (err) {
            if (res.headersSent || res.writableEnded) {
                if (!res.writableEnded) res.end();
                return;
            }
            const status = err.status || 502;
            const message = status === 401
                ? err.message
                : (err.name === 'AbortError' ? 'Request cancelled' : 'Could not reach Ollama Cloud');
            if (status !== 401) {
                console.error(redact(err && err.stack || err, apiKey));
            }
            res.status(status).json({ error: message });
        }
    });

    app.use((err, req, res, next) => {
        applyCors(req, res);
        if (res.headersSent) {
            next(err);
            return;
        }
        if (err.type === 'entity.parse.failed') {
            res.status(400).json({ error: 'Invalid JSON body' });
            return;
        }
        if (err.status === 413 || err.type === 'entity.too.large') {
            res.status(413).json({ error: 'Request body too large' });
            return;
        }
        console.error(redact(err && err.message, apiKey));
        res.status(500).json({ error: 'Proxy error' });
    });

    return app;
}

async function authenticate(req, authRequired, verifyToken) {
    const header = req.headers.authorization || '';
    const match = header.match(/^Bearer\s+(\S+)/i);
    if (!match) {
        if (!authRequired) return { uid: null };
        const error = new Error('Sign in required');
        error.status = 401;
        throw error;
    }
    try {
        const uid = await verifyToken(match[1]);
        if (!uid) throw new Error('missing uid');
        return { uid: String(uid) };
    } catch (err) {
        if (!authRequired) return { uid: null };
        const error = new Error('Invalid or expired sign-in');
        error.status = 401;
        throw error;
    }
}

function allowRequest(buckets, key, limit) {
    const now = Date.now();
    if (buckets.size > 10000) {
        for (const [bucketKey, bucket] of buckets) {
            if (now >= bucket.resetAt) buckets.delete(bucketKey);
        }
    }
    let bucket = buckets.get(key);
    if (!bucket || now >= bucket.resetAt) {
        bucket = { count: 0, resetAt: now + 60_000 };
        buckets.set(key, bucket);
    }
    bucket.count += 1;
    return bucket.count <= limit;
}

async function defaultVerifyToken(token) {
    const admin = require('firebase-admin');
    if (!admin.apps.length) {
        admin.initializeApp({
            projectId: process.env.FIREBASE_PROJECT_ID || 'polyglot121725',
        });
    }
    const decoded = await admin.auth().verifyIdToken(token);
    return decoded.uid;
}

if (require.main === module) {
    loadDotEnv();
    if (!process.env.OLLAMA_API_KEY) {
        console.error('OLLAMA_API_KEY is required. Put it in the repo-root .env (see .env.example) or the process environment.');
        process.exit(1);
    }
    const port = parseInt(process.env.PORT || '8787', 10);
    const server = createApp().listen(port, () => {
        console.log(`Ollama proxy listening on http://127.0.0.1:${port}`);
    });
    server.requestTimeout = 0;
    server.headersTimeout = 0;
}

module.exports = {
    createApp,
    stripProxyPrefix,
    resolveUpstream,
    ALLOWED_ROUTES,
    loadDotEnv,
};

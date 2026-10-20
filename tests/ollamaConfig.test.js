import fs from 'fs';
import path from 'path';
import { describe, it, expect, afterEach } from 'vitest';
import { describeAiError, getOllamaProxyBase, resolveCloudModel } from '../src/services/ollamaConfig';

const originalProxyUrl = process.env.OLLAMA_PROXY_URL;

afterEach(() => {
    if (originalProxyUrl === undefined) delete process.env.OLLAMA_PROXY_URL;
    else process.env.OLLAMA_PROXY_URL = originalProxyUrl;
});

describe('resolveCloudModel', () => {
    it('defaults to the documented Ollama Cloud model', () => {
        expect(resolveCloudModel()).toBe('gemma4:31b');
        expect(resolveCloudModel('  ')).toBe('gemma4:31b');
    });

    it('maps CLI cloud tags to direct API ids', () => {
        expect(resolveCloudModel('gemma4:31b-cloud')).toBe('gemma4:31b');
        expect(resolveCloudModel('gemma4:cloud')).toBe('gemma4:31b');
        expect(resolveCloudModel('gpt-oss:20b-cloud')).toBe('gpt-oss:20b');
    });

    it('keeps an explicit cloud model id', () => {
        expect(resolveCloudModel('gemma4:26b')).toBe('gemma4:26b');
    });
});

describe('getOllamaProxyBase', () => {
    it('uses the same-origin proxy path when unset', () => {
        delete process.env.OLLAMA_PROXY_URL;
        expect(getOllamaProxyBase()).toBe('/ollama-proxy');
    });

    it('uses OLLAMA_PROXY_URL without a trailing slash', () => {
        process.env.OLLAMA_PROXY_URL = 'http://127.0.0.1:8787/';
        expect(getOllamaProxyBase()).toBe('http://127.0.0.1:8787');
    });
});

describe('client bundle sources', () => {
    it('never mentions the server API key', () => {
        const root = path.resolve(__dirname, '../src');
        const files = [];
        const walk = (dir) => {
            for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
                const full = path.join(dir, entry.name);
                if (entry.isDirectory()) walk(full);
                else if (/\.(js|html)$/.test(entry.name)) files.push(full);
            }
        };
        walk(root);
        expect(files.length).toBeGreaterThan(10);
        for (const file of files) {
            expect(fs.readFileSync(file, 'utf8'), file).not.toContain('OLLAMA_API_KEY');
        }
    });
});

describe('describeAiError', () => {
    it('tells local developers to start the proxy', () => {
        process.env.OLLAMA_PROXY_URL = 'http://127.0.0.1:8787';
        const message = describeAiError(new TypeError('Failed to fetch'));
        expect(message).toContain('npm run proxy');
        expect(message).not.toMatch(/Ollama4Android|11434|HTTPS page/);
    });

    it('does not mention a local Ollama server for hosted failures', () => {
        delete process.env.OLLAMA_PROXY_URL;
        const err = new Error('upstream');
        err.status = 502;
        expect(describeAiError(err)).toBe('upstream');
        expect(describeAiError(err)).not.toMatch(/localhost:11434|Ollama4Android/);
    });
});

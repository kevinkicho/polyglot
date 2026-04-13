import { describe, it, expect } from 'vitest';
import { escapeHTML } from '../src/utils/sanitize';

describe('escapeHTML', () => {
    it('escapes HTML special characters', () => {
        expect(escapeHTML('<script>alert("xss")</script>')).toBe(
            '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
        );
    });

    it('escapes ampersands', () => {
        expect(escapeHTML('A & B')).toBe('A &amp; B');
    });

    it('escapes single quotes', () => {
        expect(escapeHTML("it's")).toBe('it&#39;s');
    });

    it('returns empty string for null/undefined', () => {
        expect(escapeHTML(null)).toBe('');
        expect(escapeHTML(undefined)).toBe('');
        expect(escapeHTML('')).toBe('');
    });

    it('converts non-string values to string', () => {
        expect(escapeHTML(42)).toBe('42');
        expect(escapeHTML(true)).toBe('true');
    });

    it('preserves safe text unchanged', () => {
        expect(escapeHTML('Hello World')).toBe('Hello World');
        expect(escapeHTML('日本語テスト')).toBe('日本語テスト');
    });

    it('handles multiple special characters together', () => {
        expect(escapeHTML('<div class="test">&\'end</div>')).toBe(
            '&lt;div class=&quot;test&quot;&gt;&amp;&#39;end&lt;/div&gt;'
        );
    });
});

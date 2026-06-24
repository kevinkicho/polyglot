import { settingsService } from './settingsService';
import { escapeHTML } from '../utils/sanitize';

class TextService {
    constructor() {
        this._smartWrapCache = new Map();
    }

    /**
     * The Main "SmartFit" Function.
     * Maximizes font size within a container without wrapping.
     * * @param {HTMLElement} el - The element to resize.
     * @param {number} min - Minimum font size (default 10).
     * @param {number} max - Maximum starting font size (default 100).
     * @param {boolean} enforceNoWrap - (Deprecated/Always True for this logic) Forces single line.
     */
    fitText(el, min = 10, max = 100, enforceNoWrap = true) {
        if (!el) return;

        // Ensure the parent has a width. If 0, the DOM isn't ready.
        if (el.clientWidth === 0 && el.parentElement?.clientWidth === 0) {
            return;
        }

        // Detect smartWrap children (block divs with whitespace-nowrap)
        const innerDivs = el.querySelectorAll(':scope > div');
        const hasSmartWrapChildren = innerDivs.length > 0;

        // Force styles on the outer element
        el.style.width = '100%';
        el.style.overflow = 'hidden';
        el.style.lineHeight = '1.2';

        if (hasSmartWrapChildren) {
            // smartWrap output: multiple child divs, each needs nowrap
            el.style.display = 'flex';
            el.style.flexDirection = 'column';
            el.style.alignItems = 'center';
            innerDivs.forEach(d => {
                d.style.whiteSpace = 'nowrap';
                d.style.overflow = 'hidden';
            });
        } else {
            // Plain text: single element
            el.style.display = 'block';
            el.style.whiteSpace = 'nowrap';
        }

        const overflows = () => {
            if (el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight) return true;
            for (const d of innerDivs) {
                if (d.scrollWidth > d.clientWidth) return true;
            }
            return false;
        };

        let low = min, high = max, best = min;
        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            el.style.fontSize = `${mid}px`;
            if (overflows()) {
                high = mid - 1;
            } else {
                best = mid;
                low = mid + 1;
            }
        }
        el.style.fontSize = `${best}px`;

        if (best <= min && overflows()) {
            el.style.whiteSpace = 'normal';
            el.style.overflowWrap = 'break-word';
            el.style.wordBreak = 'break-word';
        }
    }

    /**
     * Helper to fit a group of elements (used by apps to resize everything at once).
     */
    fitGroup(elements, min = 10, max = 100) {
        if (!elements) return;
        
        // Handle NodeList or Array
        const elArray = elements instanceof NodeList ? Array.from(elements) : elements;

        elArray.forEach(el => {
            this.fitText(el, min, max);
        });
    }

    /**
     * Prepares text for display (handling Japanese, etc.)
     * This creates the structure.
     */
    smartWrap(text) {
        if (!text) return "";
        if (this._smartWrapCache.has(text)) return this._smartWrapCache.get(text);

        const separatorRegex = /[\/·・･,、。]+/;
        let result;

        if (separatorRegex.test(text)) {
            result = text.split(separatorRegex)
                .filter(part => part.trim().length > 0)
                .map(part => `<div class="w-full my-1 whitespace-nowrap">${escapeHTML(part.trim())}</div>`)
                .join('');
        } else {
            result = escapeHTML(text);
        }

        this._smartWrapCache.set(text, result);
        return result;
    }

    /**
     * Splits a sentence into phrase chunks at natural language break points.
     * Breaks after punctuation and before structural/conjunction words.
     * Returns an array of phrase strings.
     */
    smartSentenceBreak(text) {
        if (!text || text.trim().length < 15) return [text || ''];

        const MARKER = '\u2060'; // word-joiner as split marker

        let result = text;

        // Break after punctuation + space (commas, semicolons, colons, dashes)
        result = result.replace(/([,;:—–])\s+/g, `$1 ${MARKER}`);

        // Break before structural words (conjunctions, relative pronouns, subordinators)
        // Multilingual: English, French, Spanish, German, Italian, Portuguese
        const structuralWords = [
            // English
            'who', 'whom', 'whose', 'which', 'that', 'where', 'when',
            'while', 'because', 'since', 'although', 'though', 'if',
            'unless', 'until', 'after', 'before', 'but', 'and', 'or',
            'nor', 'yet', 'so', 'as', 'than', 'once', 'whereas',
            'whether', 'whenever', 'wherever',
            // French
            'qui', 'que', 'dont', 'où', 'quand', 'parce', 'puisque',
            'lorsque', 'mais', 'donc', 'car', 'puis', 'ensuite',
            // Spanish
            'quien', 'cuando', 'donde', 'porque', 'aunque', 'pero',
            'sino', 'mientras', 'desde', 'hasta', 'según',
            // German
            'weil', 'wenn', 'dass', 'obwohl', 'aber', 'oder', 'und',
            'während', 'nachdem', 'bevor', 'damit', 'sondern',
            // Italian
            'perché', 'quando', 'dove', 'mentre', 'anche', 'però',
            'oppure', 'affinché', 'sebbene',
            // Portuguese
            'porque', 'quando', 'onde', 'enquanto', 'embora', 'porém',
            'contudo', 'todavia'
        ];

        const wordPattern = structuralWords.join('|');
        const breakBefore = new RegExp(
            `(\\s)(${wordPattern})(\\s)`, 'gi'
        );
        result = result.replace(breakBefore, `${MARKER}$2$3`);

        let chunks = result.split(MARKER).filter(s => s.length > 0);

        // Merge very short leading/trailing chunks (< 4 chars) with neighbor
        if (chunks.length > 1) {
            const merged = [chunks[0]];
            for (let i = 1; i < chunks.length; i++) {
                if (chunks[i].trim().length < 4) {
                    merged[merged.length - 1] += chunks[i];
                } else {
                    merged.push(chunks[i]);
                }
            }
            chunks = merged;
        }

        return chunks;
    }

    /**
     * Like fitText, but allows controlled wrapping between phrase chunks.
     * Phrase chunks (span.phrase-chunk) stay on one line; breaks happen between them.
     * Scales font to fit both width and height of the container.
     */
    fitSentence(el, min = 10, max = 100) {
        if (!el) return;
        if (el.clientWidth === 0 && el.parentElement?.clientWidth === 0) return;

        const phraseChunks = el.querySelectorAll('.phrase-chunk');

        el.style.width = '100%';
        el.style.overflow = 'hidden';
        el.style.lineHeight = '1.4';
        el.style.display = 'block';
        el.style.whiteSpace = 'normal';
        el.style.textAlign = 'center';
        el.style.wordBreak = 'normal';
        el.style.overflowWrap = 'anywhere';

        // Each phrase chunk stays on one line
        phraseChunks.forEach(chunk => {
            chunk.style.whiteSpace = 'nowrap';
            chunk.style.display = 'inline';
        });

        let currentSize = max;
        el.style.fontSize = `${currentSize}px`;

        const overflows = () =>
            el.scrollWidth > el.clientWidth + 1 ||
            el.scrollHeight > el.clientHeight + 1;

        while (overflows() && currentSize > min) {
            currentSize--;
            el.style.fontSize = `${currentSize}px`;
        }

        if (currentSize <= min) {
            el.style.fontSize = `${min}px`;
            phraseChunks.forEach(chunk => {
                chunk.style.whiteSpace = 'normal';
            });
        }
    }

    // --- Japanese Tokenizer Utilities (Unchanged but included for completeness) ---
    tokenizeJapanese(text, vocab = '', applyPostProcessing = true) {
        if (typeof Intl === 'undefined' || !Intl.Segmenter) {
            return text.split('').filter(s => s.trim().length > 0);
        }

        const segmenter = new Intl.Segmenter('ja-JP', { granularity: 'word' });
        let chunks = Array.from(segmenter.segment(text))
                          .map(s => s.segment)
                          .filter(s => s.trim().length > 0);
        
        if (!applyPostProcessing) return chunks;
        return this.postProcessJapanese(chunks, vocab);
    }

    postProcessJapanese(chunks, vocab = '') {
        if (chunks.length === 0) return [];
        const smallKana = /^([っゃゅょャュョん])/;
        const punctuation = /^([、。？?！!])/; 
        const isAllKanji = /^[\u4e00-\u9faf]+$/;
        const startsHiragana = /^[\u3040-\u309f]/;
        const specialWords = ['とても', 'たくさんの'];
        const suffixes = ['さん', 'ちゃん', 'くん', 'さま', 'たち', '屋', 'さ', 'み', 'さく', 'い', 'げ', 'らしい', 'る', 'える', 'する', 'した', 'します', 'しました', 'です', 'てすか', 'ですか', 'ですか', 'ですか', 'ですか', 'ですか', 'でした', 'だ', 'だろう', 'ろう', 'ます', 'ました', 'ませ', 'ません', 'ない', 'たい', 'て', 'いる', 'ある', 'れる', 'られる', 'でき', 'できな', 'できない', 'の', 'には', 'では', 'がら', 'から', 'より', 'にして', 'どころ', 'ですが', 'けど', 'けれど', 'のに', 'ので', 'か', 'よ', 'ね', 'わ', 'ぜ', 'な', 'へ', 'に', 'が', 'で'];

        let processed = [...chunks];
        let changed = true;

        while (changed) {
            changed = false;
            const nextPass = [];
            if (processed.length > 0) {
                nextPass.push(processed[0]);
                for (let i = 1; i < processed.length; i++) {
                    const prev = nextPass[nextPass.length - 1];
                    const curr = processed[i];
                    let merged = false;
                    if (smallKana.test(curr) || specialWords.includes(prev + curr)) {
                        nextPass[nextPass.length - 1] = prev + curr; merged = true;
                    } else if (punctuation.test(curr)) {
                         nextPass[nextPass.length - 1] = prev + curr; merged = true;
                    } else {
                        const isSuffix = suffixes.some(s => curr === s || curr.startsWith(s));
                        if (isSuffix || prev === 'お' || curr === 'は' || curr === 'を' || (isAllKanji.test(prev) && startsHiragana.test(curr))) {
                            nextPass[nextPass.length - 1] = prev + curr; merged = true;
                        }
                    }
                    if (merged) changed = true; else nextPass.push(curr);
                }
            }
            processed = nextPass;
        }
        return processed;
    }
}

export const textService = new TextService();

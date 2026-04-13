import { settingsService } from './settingsService';

class TextService {
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

        // --- 1. PREPARATION ---
        // If the element has internal structure (like the "smart stacks" from smartWrap),
        // we need to target the containers slightly differently, but the logic is similar.
        // For this specific 'No Wrap' request, we operate on the main element or its children.
        
        // Ensure the parent has a width. If 0, the DOM isn't ready.
        if (el.clientWidth === 0 && el.parentElement?.clientWidth === 0) {
            // Safety: if called too early, do nothing.
            return;
        }

        const originalText = el.innerText;
        
        // Force these styles to ensure accurate measurement
        el.style.width = '100%';
        el.style.display = 'block';     
        el.style.whiteSpace = 'nowrap'; // CRITICAL: Never wrap
        el.style.overflow = 'hidden';   // Hide overflow during calc
        el.style.lineHeight = '1.2';
        
        // --- 2. THE MAXIMIZE-THEN-SHRINK LOOP ---
        let currentSize = max;
        el.style.fontSize = `${currentSize}px`;

        // While the text sticks out (scrollWidth > clientWidth) AND we are above min size
        // We also check scrollHeight to ensure it doesn't wrap vertically if container is short
        while (
            (el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight) && 
            currentSize > min
        ) {
            currentSize--;
            el.style.fontSize = `${currentSize}px`;
        }

        // --- 3. SAFETY CHECK ---
        // If we hit the bottom and it still overflows, clamp it to min.
        if (currentSize <= min) {
            el.style.fontSize = `${min}px`;
            // Optional: If you want ellipsis when it really doesn't fit:
            // el.style.textOverflow = 'ellipsis';
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
        const separatorRegex = /[\/·・･,、。]+/;

        if (separatorRegex.test(text)) {
            // These DIVs create the structure.
            // TextService will resize the PARENT, so these children need to flow nicely.
            // For "No Wrap" behavior on the whole card, we usually want these to stack 
            // but the font size to be governed by the widest one.
            return text.split(separatorRegex)
                .filter(part => part.trim().length > 0)
                .map(part => `<div class="w-full my-1 whitespace-nowrap">${part.trim()}</div>`)
                .join('');
        }
        
        // Default return
        return text;
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

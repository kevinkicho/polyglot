import { settingsService } from './settingsService';

class TextService {
    _calculateBestFit(el, min, max, enforceNoWrap = true) {
        if (!el || !el.parentElement) return min;

        const parent = el.parentElement;
        const style = window.getComputedStyle(parent);
        const padX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
        const padY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
        
        const parentW = parent.clientWidth - padX;
        const parentH = parent.clientHeight - padY;
        
        if (parentW <= 0 || parentH <= 0) return min;

        const originalSize = el.style.fontSize;
        
        el.style.fontSize = `${min}px`;
        el.style.lineHeight = '1.1';
        el.style.display = 'inline-block';
        el.style.width = '100%';
        
        el.style.whiteSpace = enforceNoWrap ? 'nowrap' : 'normal'; 
        el.style.wordBreak = enforceNoWrap ? 'keep-all' : 'break-word';

        let best = min;
        let low = min;
        let high = max;
        let iterations = 0;

        while (low <= high && iterations < 15) {
            const mid = Math.floor((low + high) / 2);
            el.style.fontSize = `${mid}px`;
            if (el.scrollWidth <= parentW && el.scrollHeight <= parentH) {
                best = mid;
                low = mid + 1;
            } else {
                high = mid - 1;
            }
            iterations++;
        }

        el.style.fontSize = originalSize;
        return Math.max(best - 1, min);
    }

    fitText(el, min = 10, max = 150, enforceNoWrap = true) {
        if (!el || !el.style) return;
        const size = this._calculateBestFit(el, min, max, enforceNoWrap);
        el.style.fontSize = `${size}px`;
        el.style.lineHeight = '1.1';
        el.style.whiteSpace = enforceNoWrap ? 'nowrap' : 'normal';
        el.style.wordBreak = enforceNoWrap ? 'keep-all' : 'break-word';
    }

    fitGroup(elements, min = 10, max = 48, enforceNoWrap = true) {
        if (!elements || elements.length === 0) return;
        let minSizeFound = max;
        elements.forEach(el => {
            if(el && el.style) { 
                const bestForEl = this._calculateBestFit(el, min, max, enforceNoWrap);
                if (bestForEl < minSizeFound) minSizeFound = bestForEl;
            }
        });
        elements.forEach(el => {
            if(el && el.style) { 
                el.style.fontSize = `${minSizeFound}px`;
                el.style.lineHeight = '1.1';
                el.style.whiteSpace = enforceNoWrap ? 'nowrap' : 'normal';
                el.style.wordBreak = enforceNoWrap ? 'keep-all' : 'break-word';
            }
        });
    }

    // --- JAPANESE TOKENIZER (Restored as requested) ---
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
        const suffixes = ['さん', 'ちゃん', 'くん', 'さま', 'たち', '屋', 'さ', 'み', 'さく', 'い', 'げ', 'らしい', 'る', 'える', 'する', 'した', 'します', 'しました', 'です', 'てすか', 'ですか', 'ですか', 'ですか', 'ですか', 'でした', 'だ', 'だろう', 'ろう', 'ます', 'ました', 'ませ', 'ません', 'ない', 'たい', 'て', 'いる', 'ある', 'れる', 'られる', 'でき', 'できな', 'できない', 'の', 'には', 'では', 'がら', 'から', 'より', 'にして', 'どころ', 'ですが', 'けど', 'けれど', 'のに', 'ので', 'か', 'よ', 'ね', 'わ', 'ぜ', 'な', 'へ', 'に', 'が', 'で'];

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

    /**
     * Replaces common separators with line breaks to ensure single-column text.
     * UPDATED: Now handles separators for vertical stacking including special chars
     */
    smartWrap(text) {
        if (!text) return "";
        
        // 1. Check for separators: / (slash), · (\u00B7), ・ (\u30FB), ･ (\uFF65), , (comma), 、 (\u3001), 。 (\u3002)
        const separatorRegex = /[\/·・･,、。]+/;

        if (separatorRegex.test(text)) {
            return text.split(separatorRegex)
                .filter(part => part.trim().length > 0)
                .map(part => `<div class="w-full whitespace-normal leading-tight my-1">${part.trim()}</div>`)
                .join('');
        }

        // 2. If it contains Japanese/Chinese characters, allow flexible wrapping for grid fitting
        if (/[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/.test(text)) {
            return text.split('').map(char => 
                `<span class="inline-block">${char}</span>`
            ).join('');
        }
        
        return text;
    }
}

export const textService = new TextService();

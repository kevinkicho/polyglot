import { settingsService } from './settingsService';

class TextService {
    constructor() {
        this.observer = new ResizeObserver(entries => {
            window.requestAnimationFrame(() => {
                for (let entry of entries) {
                    if (entry.target._fitText) {
                        this.fitText(entry.target);
                    }
                }
            });
        });
    }

    smartWrap(text) {
        if (!text) return "";
        return text
            .replace(/([、。，．！？])/g, '$1<wbr>') 
            .replace(/(failed|error)/gi, '$1')      
            .replace(/_/g, '_<wbr>');               
    }

    // 3. JAPANESE TOKENIZER (Restored Full Logic)
    tokenizeJapanese(text, vocab = '', applyPostProcessing = true) {
        // Safety check for Segmenter support
        if (typeof Intl === 'undefined' || typeof Intl.Segmenter !== 'function') {
            return text.split(''); // Fallback
        }

        const segmenter = new Intl.Segmenter('ja-JP', { granularity: 'word' });
        let chunks = Array.from(segmenter.segment(text)).map(s => s.segment).filter(s => s.trim().length > 0);
        
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
        const suffixes = [
            'さん', 'ちゃん', 'くん', 'さま', 'たち', '屋', 'さ', 'み', 'さく', 'い', 'げ', 'らしい',
            'る', 'える', 'する', 'した', 'します', 'しました', 'です', 'てすか', 'ですか', 'でした', 'だ', 'だろう', 'ろう',
            'ます', 'ました', 'ませ', 'ません', 'ない', 'たい', 'て', 'いる', 'ある', 'れる', 'られる',
            'でき', 'できな', 'できない', 'の', 'には', 'では', 'がら', 'から', 'より', 'にして', 
            'どころ', 'ですが', 'けど', 'けれど', 'のに', 'ので', 'か', 'よ', 'ね', 'わ', 'ぜ', 'な', 'へ', 'に', 'が', 'で'
        ];

        let processed = [...chunks];
        let changed = true;

        // Pass 1: Agglutination / Suffix merging
        while (changed) {
            changed = false;
            const nextPass = [];
            if (processed.length > 0) {
                nextPass.push(processed[0]);
                for (let i = 1; i < processed.length; i++) {
                    const prev = nextPass[nextPass.length - 1];
                    const curr = processed[i];
                    let merged = false;

                    if (smallKana.test(curr)) { 
                        nextPass[nextPass.length - 1] = prev + curr; merged = true; 
                    } else if (specialWords.includes(prev + curr)) { 
                        nextPass[nextPass.length - 1] = prev + curr; merged = true; 
                    } else {
                        const isSuffix = suffixes.some(s => curr === s || curr.startsWith(s));
                        if (isSuffix) { nextPass[nextPass.length - 1] = prev + curr; merged = true; }
                        else if (prev === 'お') { nextPass[nextPass.length - 1] = prev + curr; merged = true; }
                        else if (curr === 'は' || curr === 'を') { nextPass[nextPass.length - 1] = prev + curr; merged = true; }
                        else if (isAllKanji.test(prev) && startsHiragana.test(curr)) { nextPass[nextPass.length - 1] = prev + curr; merged = true; }
                    }
                    
                    if (merged) changed = true; 
                    else nextPass.push(curr);
                }
            }
            processed = nextPass;
        }

        // Pass 2: Vocab Protection (Ensure specific vocab word isn't split)
        if (vocab && vocab.trim().length > 0) {
            const cleanVocab = vocab.replace(/\s+/g, '');
            let currentMapStr = "";
            
            const chunkMap = processed.map((chunk, idx) => {
                const cleanChunk = chunk.replace(/\s+/g, '');
                const start = currentMapStr.length;
                currentMapStr += cleanChunk;
                const end = currentMapStr.length;
                return { idx, start, end };
            });

            const vocabRanges = [];
            let searchPos = 0;
            let foundIdx = currentMapStr.indexOf(cleanVocab, searchPos);
            while (foundIdx !== -1) {
                vocabRanges.push({ start: foundIdx, end: foundIdx + cleanVocab.length });
                searchPos = foundIdx + 1;
                foundIdx = currentMapStr.indexOf(cleanVocab, searchPos);
            }

            if (vocabRanges.length > 0) {
                const groups = Array.from({ length: processed.length }, (_, i) => i);
                
                vocabRanges.forEach(vRange => {
                    let startIndex = -1; 
                    let endIndex = -1;
                    for(let i=0; i<chunkMap.length; i++) {
                        const c = chunkMap[i];
                        if (c.start < vRange.end && c.end > vRange.start) { 
                            if (startIndex === -1) startIndex = i; 
                            endIndex = i; 
                        }
                    }
                    if (startIndex !== -1 && endIndex !== -1 && startIndex !== endIndex) {
                        const targetGroup = groups[startIndex]; 
                        for(let k = startIndex + 1; k <= endIndex; k++) { 
                            groups[k] = targetGroup; 
                        }
                    }
                });

                const mergedChunks = []; 
                let currentChunk = ""; 
                let currentGroup = -1;
                
                for(let i=0; i<processed.length; i++) {
                    if (groups[i] !== currentGroup) { 
                        if (currentChunk) mergedChunks.push(currentChunk); 
                        currentChunk = processed[i]; 
                        currentGroup = groups[i]; 
                    } else { 
                        currentChunk += processed[i]; 
                    }
                }
                if (currentChunk) mergedChunks.push(currentChunk); 
                processed = mergedChunks;
            }
        }

        // Pass 2.5: Final check for broken vocab chunks before punctuation
        if (vocab && vocab.length > 1) {
            const repairPass = [];
            for (let i = 0; i < processed.length; i++) {
                if (i < processed.length - 1 && (processed[i] + processed[i+1]).includes(vocab)) {
                    repairPass.push(processed[i] + processed[i+1]);
                    i++;
                } else {
                    repairPass.push(processed[i]);
                }
            }
            processed = repairPass;
        }

        // Pass 3: Punctuation Merging
        const punctPass = [];
        if (processed.length > 0) {
            punctPass.push(processed[0]);
            for (let i = 1; i < processed.length; i++) {
                const prev = punctPass[punctPass.length - 1];
                const curr = processed[i];
                if (punctuation.test(curr)) punctPass[punctPass.length - 1] = prev + curr; 
                else punctPass.push(curr);
            }
            processed = punctPass;
        }
        return processed;
    }

    fitText(el) {
        if (!el) return;
        
        if (!el._fitText) {
            el._fitText = true;
            this.observer.observe(el);
        }

        const settings = settingsService.get();
        const parent = el.parentElement;
        if (!parent) return;

        el.style.fontFamily = this.getFontFamily(settings.fontFamily);
        el.style.fontWeight = this.getFontWeight(settings.fontWeight);
        el.style.lineHeight = '1.3';
        
        const allowWrap = el.getAttribute('data-wrap') === 'true';

        if (allowWrap) {
            el.style.whiteSpace = 'normal';
            el.style.wordBreak = (settings.targetLang === 'ja' || settings.targetLang === 'zh') ? 'keep-all' : 'break-word';
            el.style.overflowWrap = 'break-word';
        } else {
            el.style.whiteSpace = 'nowrap';
        }

        let min = 10;
        let max = 90; 
        
        if (el.getAttribute('data-type') === 'hint') max = 32; 

        if (settings.fontSize === 'small') max = Math.min(max, 24);
        else if (settings.fontSize === 'medium') max = Math.min(max, 48);
        else if (settings.fontSize === 'large') max = 120; 

        let low = min;
        let high = max;
        let best = min;

        el.style.fontSize = `${high}px`; 

        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            el.style.fontSize = `${mid}px`;

            const scrollW = el.scrollWidth;
            const scrollH = el.scrollHeight;
            const clientW = parent.clientWidth;
            const clientH = parent.clientHeight;

            let fits = false;

            if (allowWrap) {
                fits = (scrollH <= clientH + 2);
            } else {
                fits = (scrollW <= clientW + 2);
            }

            if (fits) {
                best = mid;
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }

        el.style.fontSize = `${best}px`;
    }

    getFontFamily(key) {
        const fonts = {
            'notosans': "'Noto Sans JP', 'Noto Sans SC', 'Noto Sans KR', sans-serif",
            'notoserif': "'Noto Serif JP', 'Noto Serif SC', 'Noto Serif KR', serif",
            'mplus': "'M PLUS Rounded 1c', sans-serif",
            'sawarabi': "'Sawarabi Mincho', serif",
            'nanumgothic': "'Nanum Gothic', sans-serif",
            'nanummyeongjo': "'Nanum Myeongjo', serif",
            'zcool': "'ZCOOL XiaoWei', serif",
            'merriweather': "'Merriweather', 'Noto Serif JP', serif",
            'roboto': "'Roboto', 'Noto Sans JP', sans-serif",
            'system': "system-ui, -apple-system, sans-serif"
        };
        return fonts[key] || fonts['notosans'];
    }

    getFontWeight(key) {
        const weights = {
            'light': '300',
            'normal': '400',
            'bold': '700',
            'thick': '900'
        };
        return weights[key] || '700';
    }
}

export const textService = new TextService();

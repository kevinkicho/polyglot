export const textService = {
    // 1. MAXIMIZE TEXT SIZE
    fitText(element) {
        if (!element) return;
        
        // Reset to minimum
        element.style.fontSize = '10px';
        element.style.whiteSpace = 'nowrap';
        element.style.display = 'inline-block';
        element.style.width = 'auto'; 
        
        const parent = element.parentElement;
        const maxWidth = parent.offsetWidth - 32; 
        const maxHeight = parent.offsetHeight - 16;

        let min = 10;
        let max = 150;
        let optimal = min;

        // Binary Search
        while (min <= max) {
            const current = Math.floor((min + max) / 2);
            element.style.fontSize = `${current}px`;
            
            if (element.scrollWidth <= maxWidth && element.scrollHeight <= maxHeight) {
                optimal = current;
                min = current + 1;
            } else {
                max = current - 1;
            }
        }
        
        element.style.fontSize = `${optimal}px`;
    },

    // 2. SMART WRAPPING (Visual)
    formatSentence(text, lang) {
        if (!text) return '';
        if (lang === 'ja') return text.replace(/([、。！？])/g, '$1<wbr>').replace(/(は|が|を|に|で|へ|と|も|から|より)(?![、。])/g, '$1<wbr>');
        if (lang === 'zh') return `<span style="word-break: break-all;">${text}</span>`;
        return text;
    },

    // 3. ADVANCED JAPANESE TOKENIZER
    tokenizeJapanese(text, vocab = '', applyPostProcessing = true) {
        const segmenter = new Intl.Segmenter('ja-JP', { granularity: 'word' });
        let chunks = Array.from(segmenter.segment(text)).map(s => s.segment);
        
        if (!applyPostProcessing) {
            return chunks; 
        }

        return this.postProcessJapanese(chunks, vocab);
    },

    postProcessJapanese(chunks, vocab = '') {
        if (chunks.length === 0) return [];

        // --- REGEX & LISTS ---
        const smallKana = /^([っゃゅょャュョん])/;
        const punctuation = /^([、。？?！!])/;
        // Kanji only (Simple range)
        const isAllKanji = /^[\u4e00-\u9faf]+$/;
        // Starts with Hiragana
        const startsHiragana = /^[\u3040-\u309f]/;

        const specialWords = ['とても', 'たくさんの'];
        
        const suffixes = [
            'さん', 'ちゃん', 'くん', 'さま', 'たち', '屋',
            'さ', 'み', 'さく', 'い', 'げ', 'らしい',
            'る', 'える', 'する', 'した', 'します', 'しました',
            'です', 'てすか', 'ですか', 'でした', 'だ', 'だろう', 'ろう',
            'ます', 'ました', 'ませ', 'ません',
            'ない', 'たい', 'て', 'いる', 'ある', 'れる', 'られる',
            'でき', 'できな', 'できない',
            'の', 'には', 'では', 'がら', 'から', 'より', 'にして', 
            'どころ', 'ですが', 'けど', 'けれど', 'のに', 'ので',
            'か', 'よ', 'ね', 'わ', 'ぜ', 'な', 'へ', 'に', 'が', 'で' 
            // Note: 'は' and 'を' are handled by specific rule below
        ];

        let processed = [...chunks];
        let changed = true;

        // --- MAIN MERGE LOOP ---
        while (changed) {
            changed = false;
            const nextPass = [];
            
            if (processed.length > 0) {
                nextPass.push(processed[0]);
                
                for (let i = 1; i < processed.length; i++) {
                    const prev = nextPass[nextPass.length - 1];
                    const curr = processed[i];
                    let merged = false;

                    // 1. Small Kana (Highest Priority)
                    if (smallKana.test(curr)) {
                        nextPass[nextPass.length - 1] = prev + curr;
                        merged = true;
                    }
                    // 2. Special Words
                    else if (specialWords.includes(prev + curr)) {
                        nextPass[nextPass.length - 1] = prev + curr;
                        merged = true;
                    }
                    // 3. Suffixes
                    else {
                        const isSuffix = suffixes.some(s => curr === s || curr.startsWith(s));
                        if (isSuffix) {
                            nextPass[nextPass.length - 1] = prev + curr;
                            merged = true;
                        }
                        // 4. Specific Characters (お / は / を)
                        // 'お' merges with block BEHIND it (next) -> prev='お' merge with curr
                        else if (prev === 'お') {
                            nextPass[nextPass.length - 1] = prev + curr;
                            merged = true;
                        }
                        // 'は' or 'を' merges with block BEFORE it -> merge with prev
                        else if (curr === 'は' || curr === 'を') {
                            nextPass[nextPass.length - 1] = prev + curr;
                            merged = true;
                        }
                        // 5. Freestanding Kanji + Hiragana Start
                        // e.g. "行" + "き" -> "行き"
                        else if (isAllKanji.test(prev) && startsHiragana.test(curr)) {
                            nextPass[nextPass.length - 1] = prev + curr;
                            merged = true;
                        }
                        // 6. Punctuation (Lowest Priority)
                        else if (punctuation.test(curr)) {
                            nextPass[nextPass.length - 1] = prev + curr;
                            merged = true;
                        }
                    }

                    if (merged) {
                        changed = true;
                    } else {
                        nextPass.push(curr);
                    }
                }
            }
            processed = nextPass;
        }

        // --- FINAL PASS: VOCAB CONSISTENCY ---
        // Checks if the target vocabulary word was chopped up and forces a merge if found.
        if (vocab && vocab.length > 0) {
            const finalPass = [];
            let i = 0;
            while (i < processed.length) {
                let merged = false;
                // Look ahead to see if processed[i]...processed[k] forms the vocab
                let currentString = "";
                for (let k = i; k < processed.length; k++) {
                    currentString += processed[k];
                    if (currentString === vocab) {
                        // Found the vocab split across i to k!
                        finalPass.push(currentString);
                        i = k + 1; // Skip the consumed chunks
                        merged = true;
                        break;
                    }
                    // Optimization: stop if we exceed length
                    if (currentString.length > vocab.length) break;
                }

                if (!merged) {
                    finalPass.push(processed[i]);
                    i++;
                }
            }
            processed = finalPass;
        }

        return processed.filter(c => c.trim().length > 0);
    }
};

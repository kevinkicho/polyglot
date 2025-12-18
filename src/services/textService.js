export const textService = {
    // 1. MAXIMIZE TEXT SIZE
    fitText(element) {
        if (!element) return;
        element.style.fontSize = '10px';
        element.style.whiteSpace = 'nowrap';
        element.style.display = 'inline-block';
        element.style.width = 'auto'; 
        
        const parent = element.parentElement;
        if (!parent) return;
        
        const maxWidth = parent.offsetWidth - 32; 
        const maxHeight = parent.offsetHeight - 16;

        let min = 10; let max = 150; let optimal = min;

        while (min <= max) {
            const current = Math.floor((min + max) / 2);
            element.style.fontSize = `${current}px`;
            
            if (element.scrollWidth <= maxWidth && element.scrollHeight <= maxHeight) {
                optimal = current; min = current + 1;
            } else {
                max = current - 1;
            }
        }
        element.style.fontSize = `${optimal}px`;
    },

    // 2. SMART WRAPPING
    formatSentence(text, lang) {
        if (!text) return '';
        
        let formatted = text;
        if (lang === 'ja') {
            formatted = text.replace(/([、。！？])/g, '$1<wbr>')
                            .replace(/(は|が|を|に|で|へ|と|も|から|より)(?![、。])/g, '$1<wbr>');
        } else if (lang === 'zh') {
            formatted = `<span style="word-break: break-all;">${text}</span>`;
        }
        return formatted;
    },

    // 3. JAPANESE TOKENIZER (Safe Mode)
    tokenizeJapanese(text, vocab = '', applyPostProcessing = true) {
        // Safety check for Segmenter support
        if (typeof Intl === 'undefined' || typeof Intl.Segmenter !== 'function') {
            return text.split(''); // Fallback to char split
        }

        const segmenter = new Intl.Segmenter('ja-JP', { granularity: 'word' });
        let chunks = Array.from(segmenter.segment(text)).map(s => s.segment).filter(s => s.trim().length > 0);
        
        if (!applyPostProcessing) return chunks;

        return this.postProcessJapanese(chunks, vocab);
    },

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

        while (changed) {
            changed = false;
            const nextPass = [];
            if (processed.length > 0) {
                nextPass.push(processed[0]);
                for (let i = 1; i < processed.length; i++) {
                    const prev = nextPass[nextPass.length - 1];
                    const curr = processed[i];
                    let merged = false;
                    if (smallKana.test(curr)) { nextPass[nextPass.length - 1] = prev + curr; merged = true; }
                    else if (specialWords.includes(prev + curr)) { nextPass[nextPass.length - 1] = prev + curr; merged = true; }
                    else {
                        const isSuffix = suffixes.some(s => curr === s || curr.startsWith(s));
                        if (isSuffix) { nextPass[nextPass.length - 1] = prev + curr; merged = true; }
                        else if (prev === 'お') { nextPass[nextPass.length - 1] = prev + curr; merged = true; }
                        else if (curr === 'は' || curr === 'を') { nextPass[nextPass.length - 1] = prev + curr; merged = true; }
                        else if (isAllKanji.test(prev) && startsHiragana.test(curr)) { nextPass[nextPass.length - 1] = prev + curr; merged = true; }
                    }
                    if (merged) changed = true; else nextPass.push(curr);
                }
            }
            processed = nextPass;
        }

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
                    let startIndex = -1; let endIndex = -1;
                    for(let i=0; i<chunkMap.length; i++) {
                        const c = chunkMap[i];
                        if (c.start < vRange.end && c.end > vRange.start) { if (startIndex === -1) startIndex = i; endIndex = i; }
                    }
                    if (startIndex !== -1 && endIndex !== -1 && startIndex !== endIndex) {
                        const targetGroup = groups[startIndex]; for(let k = startIndex + 1; k <= endIndex; k++) { groups[k] = targetGroup; }
                    }
                });
                const mergedChunks = []; let currentChunk = ""; let currentGroup = -1;
                for(let i=0; i<processed.length; i++) {
                    if (groups[i] !== currentGroup) { if (currentChunk) mergedChunks.push(currentChunk); currentChunk = processed[i]; currentGroup = groups[i]; } else { currentChunk += processed[i]; }
                }
                if (currentChunk) mergedChunks.push(currentChunk); processed = mergedChunks;
            }
        }

        const punctPass = [];
        if (processed.length > 0) {
            punctPass.push(processed[0]);
            for (let i = 1; i < processed.length; i++) {
                const prev = punctPass[punctPass.length - 1];
                const curr = processed[i];
                if (punctuation.test(curr)) punctPass[punctPass.length - 1] = prev + curr; else punctPass.push(curr);
            }
            processed = punctPass;
        }
        return processed;
    }
};

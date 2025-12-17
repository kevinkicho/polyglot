export const textService = {
    fitText(element) {
        if (!element) return;
        element.style.fontSize = '10px';
        element.style.whiteSpace = 'nowrap';
        element.style.display = 'inline-block';
        element.style.width = 'auto'; 
        
        const parent = element.parentElement;
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

    formatSentence(text, lang) {
        if (!text) return '';
        // Japanese: Break after punctuation and particles
        if (lang === 'ja') {
            return text
                .replace(/([、。！？])/g, '$1<wbr>')
                .replace(/(は|が|を|に|で|へ|と|も|から|より)(?![、。])/g, '$1<wbr>');
        }
        // Chinese: Allow break anywhere
        if (lang === 'zh') return `<span style="word-break: break-all;">${text}</span>`;
        return text;
    },

    tokenizeJapanese(text) {
        const markers = ['は', 'が', 'を', 'に', 'で', 'へ', 'と', 'も', 'から', 'より', 'です', 'ます', 'した', 'ない', 'たい', 'さん', 'ちゃん', 'くん', 'さま', 'たち', '、', '。', '！', '？'];
        let chunks = [];
        let current = '';
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            current += char;
            for (const marker of markers) {
                if (current.endsWith(marker)) {
                    chunks.push(current);
                    current = '';
                    break;
                }
            }
        }
        if (current) chunks.push(current);
        return chunks.filter(c => c.trim().length > 0);
    }
};

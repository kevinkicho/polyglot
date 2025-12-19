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
        // Basic punctuation wrapping help
        return text
            .replace(/([、。，．！？])/g, '$1<wbr>') 
            .replace(/(failed|error)/gi, '$1')      
            .replace(/_/g, '_<wbr>');               
    }

    /**
     * BASIC TOKENIZER (Restored to simple logic)
     * Removes all complex chunking/gluing. 
     * Waits for new specs from user.
     */
    tokenizeJapanese(text) {
        if (!text) return [];
        
        // If text already has spaces, respect them
        if (text.includes(' ')) return text.split(' ').filter(t => t.trim().length > 0);

        // Fallback: Simple character split
        return Array.from(text);
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
            // Use keep-all for CJK to prevent mid-word breaks if possible
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

import dbData from '../data/export_rtdb_121725.json';

class DictionaryService {
    constructor() {
        this.index = {};
        this.isInitialized = false;
    }

    init() {
        if (this.isInitialized) return;
        
        const list = dbData.dictionary || [];
        list.forEach(item => {
            if (!item) return;
            if (item.s) this.index[item.s] = item;
            if (item.t && item.t !== item.s) this.index[item.t] = item;
        });
        
        this.isInitialized = true;
    }

    lookup(char) {
        if (!this.isInitialized) this.init();
        const entry = this.index[char];
        if (!entry) return null;

        return {
            simp: entry.s,
            trad: entry.t,
            pinyin: entry.p,
            en: entry.e,
            ko: entry.k
        };
    }

    // [NEW] Lookup all characters in a string
    lookupText(text) {
        if (!text) return [];
        if (!this.isInitialized) this.init();

        const results = [];
        const seen = new Set(); // Avoid duplicates in the popup

        // Regex to match CJK Unified Ideographs (Hanzi/Kanji)
        const regex = /[\u4E00-\u9FFF]/g;
        const matches = text.match(regex);

        if (matches) {
            matches.forEach(char => {
                if (!seen.has(char)) {
                    const data = this.lookup(char);
                    if (data) {
                        results.push(data);
                        seen.add(char);
                    }
                }
            });
        }
        return results;
    }
}

export const dictionaryService = new DictionaryService();

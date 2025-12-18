// Ensure this path is correct. If your file is in src/data/export_rtdb_121725.json
// and this service is in src/services/dictionaryService.js, then '../data/...' is correct.
import dbData from '../data/export_rtdb_121725.json';

class DictionaryService {
    constructor() {
        this.index = {};
        this.isInitialized = false;
    }

    init() {
        if (this.isInitialized) return;
        
        console.log("Dictionary Initializing...");
        
        // Safety Check: Ensure dbData exists
        if (!dbData) {
            console.error("CRITICAL: dbData is undefined. Check JSON import.");
            return;
        }

        const rawDict = dbData.dictionary || {};
        const list = Array.isArray(rawDict) ? rawDict : Object.values(rawDict);

        list.forEach(item => {
            if (!item) return;
            if (item.s) this.index[item.s] = item;
            if (item.t && item.t !== item.s) this.index[item.t] = item;
        });
        
        this.isInitialized = true;
        console.log(`Dictionary ready: ${Object.keys(this.index).length} entries.`);
    }

    lookup(char) {
        if (!this.isInitialized) this.init();
        const entry = this.index[char];
        if (!entry) return null;
        return { simp: entry.s, trad: entry.t, pinyin: entry.p, en: entry.e, ko: entry.k };
    }

    lookupText(text) {
        if (!text) return [];
        if (!this.isInitialized) this.init();

        const results = [];
        const seen = new Set(); 
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

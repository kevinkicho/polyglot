import { db, ref, get, child } from './firebase';

class DictionaryService {
    constructor() {
        this.index = {};
        this.isInitialized = false;
    }

    async fetchData() {
        if (this.isInitialized) return;
        
        try {
            console.log("[Dictionary] Fetching...");
            const dbRef = ref(db);
            const snapshot = await get(child(dbRef, 'dictionary'));
            
            if (snapshot.exists()) {
                const val = snapshot.val();
                const list = Array.isArray(val) ? val : Object.values(val);

                list.forEach(item => {
                    if (!item) return;
                    // Map Simplified
                    if (item.s) this.index[item.s] = item;
                    // Map Traditional
                    if (item.t && item.t !== item.s) this.index[item.t] = item;
                });
                
                this.isInitialized = true;
                console.log(`[Dictionary] Loaded ${Object.keys(this.index).length} entries.`);
            } else {
                console.warn("[Dictionary] No data found.");
            }
        } catch (error) {
            console.error("[Dictionary] Fetch Failed:", error);
        }
    }

    lookup(char) {
        if (!this.isInitialized) return null;
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

    lookupText(text) {
        if (!text) return [];
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

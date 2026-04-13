import { db } from './firebase'; 
import { ref, get, child, update } from 'firebase/database';

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
                // Use forEach to preserve the Firebase Key (index or ID)
                snapshot.forEach(childSnapshot => {
                    const key = childSnapshot.key;
                    const item = childSnapshot.val();
                    
                    if (!item) return;

                    const entry = { 
                        firebaseKey: key, // Store key for updates
                        id: item.id || '',
                        s: item.s || item.simplified || '', 
                        t: item.t || item.traditional || (item.s || ''), 
                        p: item.p || item.pinyin || '', 
                        e: item.e || item.english || '', 
                        ko: item.k || item.ko || item.korean || '' 
                    };
                    
                    // Only index if we have a headword
                    if (entry.s) {
                        this.index[entry.s] = entry;
                        if (entry.t && entry.t !== entry.s) this.index[entry.t] = entry;
                    }
                });
                
                this.isInitialized = true;
                console.log(`[Dictionary] Loaded ${Object.keys(this.index).length} entries.`);
            } else {
                console.warn("[Dictionary] No data.");
            }
        } catch (error) {
            console.error("[Dictionary] Error:", error);
        }
    }

    lookupText(text) {
        if (!text || !this.isInitialized) return [];
        const results = [];
        const seen = new Set();
        const regex = /[\u4E00-\u9FFF]/g;
        const matches = text.match(regex);

        if (matches) {
            matches.forEach(char => {
                if (!seen.has(char)) {
                    const data = this.index[char];
                    if (data) {
                        results.push(data);
                        seen.add(char);
                    }
                }
            });
        }
        return results;
    }

    // NEW: Update an entry in Firebase
    async saveEntry(key, data) {
        if (!key) return;
        try {
            const updates = {};
            // Map internal keys back to DB keys (s, t, p, e, k)
            updates[`dictionary/${key}/s`] = data.s;
            updates[`dictionary/${key}/t`] = data.t;
            updates[`dictionary/${key}/p`] = data.p;
            updates[`dictionary/${key}/e`] = data.e;
            updates[`dictionary/${key}/k`] = data.ko;
            // Also update traditional/simplified aliases if needed, but usually s/t/p/e/k is enough
            
            await update(ref(db), updates);
            
            // Update local index to reflect changes immediately
            if (this.index[data.s]) {
                Object.assign(this.index[data.s], { ...data, firebaseKey: key });
            }
            console.log(`[Dictionary] Saved entry ${key}`);
        } catch (e) {
            console.error("[Dictionary] Save failed:", e);
            throw e;
        }
    }
}
export const dictionaryService = new DictionaryService();

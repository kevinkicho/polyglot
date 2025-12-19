import { db, ref, get, child } from './firebase';
import { settingsService } from './settingsService';

class VocabService {
    constructor() {
        this.vocabList = [];
        this.subscribers = [];
        this.isLoaded = false;
    }

    async init() {
        if (this.isLoaded && this.vocabList.length > 0) return;
        await this.reload();
    }

    async reload() {
        try {
            console.log("VocabService: Fetching data...");
            const dbRef = ref(db);
            const snapshot = await get(child(dbRef, 'vocab'));
            
            if (snapshot.exists()) {
                const data = snapshot.val();
                let rawList = Array.isArray(data) ? data : Object.values(data);
                
                // DATA MAPPING FIX: Convert Flat DB to Game Structure
                this.vocabList = rawList
                    .filter(item => item && item.id !== undefined)
                    .map(item => {
                        const id = parseInt(item.id);
                        
                        // 1. Determine Front (Target)
                        // If 'front' exists, use it. Otherwise, look for language keys.
                        let frontObj = item.front;
                        if (!frontObj) {
                            // Heuristic: Try to find a non-English character string, or default to specific keys
                            const mainText = item.ja || item.zh || item.ko || item.ru || item.fr || item.de || item.es || item.it || item.pt || item.word || "???";
                            const subText = item.furi || item.pinyin || item.roma || "";
                            frontObj = { main: mainText, sub: subText };
                        }

                        // 2. Determine Back (Origin/Definition)
                        let backObj = item.back;
                        if (!backObj) {
                            const def = item.en || item.meaning || "???";
                            // Map example sentences
                            const sentT = item.ja_ex || item.zh_ex || item.ko_ex || "";
                            const sentO = item.en_ex || "";
                            backObj = { definition: def, sentenceTarget: sentT, sentenceOrigin: sentO };
                        }

                        return {
                            ...item, // Keep original flat props (ja, en, etc) for editing
                            id: id,
                            front: frontObj,
                            back: backObj
                        };
                    });

                console.log(`VocabService: Loaded and Mapped ${this.vocabList.length} items.`);
            } else {
                console.warn("VocabService: No data found in Firebase.");
                this.vocabList = [];
            }
        } catch (error) {
            console.error("VocabService Error:", error);
            this.vocabList = [];
        } finally {
            this.isLoaded = true;
            this.notify();
        }
    }

    // Helper to refresh mapping if user changes Target Language settings
    // (Optional: You can call this from settingsService if you want dynamic flipping)
    remapForLanguage(targetLang, originLang) {
        if(!this.vocabList.length) return;
        
        this.vocabList = this.vocabList.map(item => {
            // If the item has the specific keys requested, use them
            const main = item[targetLang] || item.front.main; 
            const def = item[originLang] || item.back.definition;
            const sentT = item[`${targetLang}_ex`] || item.back.sentenceTarget;
            const sentO = item[`${originLang}_ex`] || item.back.sentenceOrigin;

            return {
                ...item,
                front: { ...item.front, main: main },
                back: { ...item.back, definition: def, sentenceTarget: sentT, sentenceOrigin: sentO }
            };
        });
        this.notify();
    }

    hasData() {
        return this.isLoaded && this.vocabList.length > 0;
    }

    getAll() {
        return this.vocabList;
    }

    getFlashcardData() {
        return this.vocabList.filter(item => item.front && item.front.main && item.front.main !== "???");
    }

    findIndexById(id) {
        return this.vocabList.findIndex(item => item.id === id);
    }

    getRandomIndex() {
        if (this.vocabList.length === 0) return 0;
        return Math.floor(Math.random() * this.vocabList.length);
    }

    subscribe(callback) {
        this.subscribers.push(callback);
    }

    notify() {
        this.subscribers.forEach(cb => cb(this.vocabList));
    }
}

export const vocabService = new VocabService();

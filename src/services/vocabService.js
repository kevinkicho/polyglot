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
                
                this.vocabList = rawList
                    .filter(item => item && item.id !== undefined)
                    .map(item => {
                        const id = parseInt(item.id);
                        
                        // 1. Determine Front (Target)
                        let frontObj = item.front;
                        if (!frontObj) {
                            const mainText = item.ja || item.zh || item.ko || item.ru || item.fr || item.de || item.es || item.it || item.pt || item.word || "???";
                            const subText = item.furi || item.pinyin || item.roma || "";
                            frontObj = { main: mainText, sub: subText };
                        } else {
                            // FIXED: Ensure main exists even if front object was present
                            if (!frontObj.main) {
                                frontObj.main = item.ja || item.zh || item.ko || item.word || "???";
                            }
                        }

                        // 2. Determine Back (Origin/Definition)
                        let backObj = item.back;
                        if (!backObj) {
                            const def = item.en || item.meaning || "???";
                            const sentT = item.ja_ex || item.zh_ex || item.ko_ex || "";
                            const sentO = item.en_ex || "";
                            backObj = { main: def, definition: def, sentenceTarget: sentT, sentenceOrigin: sentO };
                        } else {
                             if (!backObj.main) backObj.main = backObj.definition || item.en || "???";
                        }

                        return {
                            ...item, 
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
    remapForLanguage(targetLang, originLang) {
        if(!this.vocabList.length) return;
        
        this.vocabList = this.vocabList.map(item => {
            const main = item[targetLang] || item.front.main; 
            const def = item[originLang] || item.back.definition;
            const sentT = item[`${targetLang}_ex`] || item.back.sentenceTarget;
            const sentO = item[`${originLang}_ex`] || item.back.sentenceOrigin;

            return {
                ...item,
                front: { ...item.front, main: main },
                back: { ...item.back, main: def, definition: def, sentenceTarget: sentT, sentenceOrigin: sentO }
            };
        });
        this.notify();
    }

    hasData() { return this.isLoaded && this.vocabList.length > 0; }
    getAll() { return this.vocabList; }
    getFlashcardData() { return this.vocabList.filter(item => item.front && item.front.main && item.front.main !== "???"); }
    findIndexById(id) { return this.vocabList.findIndex(item => item.id === id); }
    getRandomIndex() {
        if (this.vocabList.length === 0) return 0;
        return Math.floor(Math.random() * this.vocabList.length);
    }
    subscribe(callback) { this.subscribers.push(callback); }
    notify() { this.subscribers.forEach(cb => cb(this.vocabList)); }
}

export const vocabService = new VocabService();

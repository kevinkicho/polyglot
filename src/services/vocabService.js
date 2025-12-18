import { db, ref, get, child } from './firebase';
import { settingsService } from './settingsService';

class VocabService {
    constructor() {
        this.rawList = [];
        this.isInitialized = false;
    }

    async fetchData() {
        if (this.isInitialized) return;
        
        try {
            console.log("[Vocab] Connecting to Firebase...");
            const dbRef = ref(db);
            const snapshot = await get(child(dbRef, 'vocab'));
            
            if (snapshot.exists()) {
                const val = snapshot.val();
                // Handle both Array (exported from JSON) and Object (pushed to Firebase) structures
                const data = Array.isArray(val) ? val : Object.values(val);
                
                // Filter out nulls or empty slots
                this.rawList = data.filter(item => item && item.id !== undefined);
                
                this.isInitialized = true;
                console.log(`[Vocab] Loaded ${this.rawList.length} items successfully.`);
            } else {
                console.warn("[Vocab] No data found at node '/vocab'. Check DB structure.");
                this.rawList = [];
            }
        } catch (error) {
            console.error("[Vocab] Fetch Critical Error:", error);
            this.rawList = [];
        }
    }

    // [CRITICAL] Transforms Flat DB Data -> App Structure
    formatItem(item) {
        const settings = settingsService.get();
        const t = settings.targetLang || 'ja'; // Target (e.g. 'ja')
        const o = settings.originLang || 'en'; // Origin (e.g. 'en')

        return {
            id: item.id,
            front: {
                // Get target lang (e.g. item['ja'])
                main: item[t] || "???",
                // Try reading/pinyin fields if they exist
                sub: item[t + '_furi'] || item[t + '_pin'] || item[t + '_roma'] || "",
                type: t
            },
            back: {
                // Get origin lang (e.g. item['en'])
                definition: item[o] || "???",
                // Get example sentences
                sentenceTarget: item[t + '_ex'] || "",
                sentenceOrigin: item[o + '_ex'] || ""
            },
            raw: item // Keep original just in case
        };
    }

    getAll() {
        // Return mapped data so games see 'front' and 'back'
        return this.rawList.map(item => this.formatItem(item));
    }

    getFlashcardData() {
        return this.getAll();
    }

    getRandomIndex() {
        if (this.rawList.length === 0) return 0;
        return Math.floor(Math.random() * this.rawList.length);
    }

    findIndexById(id) {
        return this.rawList.findIndex(item => item.id === id);
    }
}

export const vocabService = new VocabService();

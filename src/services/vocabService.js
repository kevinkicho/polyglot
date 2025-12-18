import { db, ref, get, child } from './firebase';
import { settingsService } from './settingsService';

class VocabService {
    constructor() {
        this.list = [];
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
                // Handle Array (from JSON import) or Object (from manual push)
                let rawList = Array.isArray(val) ? val : Object.values(val);
                
                // 1. Remove nulls/empty slots
                rawList = rawList.filter(item => item && typeof item === 'object');
                console.log(`[Vocab] Found ${rawList.length} raw items. Mapping data...`);

                // 2. Map Flat Data -> App Structure
                this.list = rawList.map(item => this.mapItem(item));
                
                // 3. Final Check: Ensure main text exists
                this.list = this.list.filter(item => item.front.main && item.front.main !== "???");

                this.isInitialized = true;
                console.log(`[Vocab] Initialization Complete. ${this.list.length} valid cards ready.`);
            } else {
                console.warn("[Vocab] No data found at '/vocab'. Check Database Import.");
                this.list = [];
            }
        } catch (error) {
            console.error("[Vocab] Fetch Error:", error);
            this.list = [];
        }
    }

    mapItem(item) {
        const settings = settingsService.get();
        const t = settings.targetLang || 'ja'; 
        const o = settings.originLang || 'en';

        // Dynamic Field Access: item['ja'], item['en']
        const frontText = item[t] || "???";
        const backText = item[o] || "???";
        
        // Reading Priority: Furigana > Pinyin > Romaji > Empty
        let subText = item[t + '_furi'] || item[t + '_pin'] || item[t + '_roma'] || "";

        return {
            id: item.id || Math.floor(Math.random() * 9999999),
            front: {
                main: frontText,
                sub: subText,
                type: t
            },
            back: {
                definition: backText,
                sentenceTarget: item[t + '_ex'] || "",
                sentenceOrigin: item[o + '_ex'] || ""
            },
            raw: item // Keep original just in case
        };
    }

    getAll() { return this.list; }
    getFlashcardData() { return this.list; }
    
    getRandomIndex() { 
        if (this.list.length === 0) return 0;
        return Math.floor(Math.random() * this.list.length); 
    }
    
    findIndexById(id) { 
        return this.list.findIndex(item => item.id === id); 
    }
}

export const vocabService = new VocabService();

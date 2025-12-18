import { db } from './firebase'; 
import { ref, get, child } from 'firebase/database';

class VocabService {
    constructor() {
        this.vocabList = [];
        this.isLoaded = false;
    }

    async fetchData() {
        if (this.isLoaded) return;

        try {
            console.log("[Vocab] Fetching...");
            // Guard against Firebase not loading
            if (!db) throw new Error("Firebase DB not initialized");

            const dbRef = ref(db);
            const snapshot = await get(child(dbRef, 'vocab'));

            if (snapshot.exists()) {
                const data = snapshot.val();
                const rawList = Array.isArray(data) ? data : Object.values(data);
                
                // Sanitize and Sort
                this.vocabList = rawList.map(item => ({
                    ...item,
                    id: item.id !== undefined ? parseInt(item.id, 10) : 0
                }));

                this.vocabList.sort((a, b) => a.id - b.id);
                console.log(`[Vocab] Loaded ${this.vocabList.length} items.`);
            } else {
                console.warn("[Vocab] No data found.");
                this.vocabList = [];
            }
            this.isLoaded = true;
        } catch (error) {
            console.error("[Vocab] Error:", error);
            this.vocabList = [];
            this.isLoaded = true;
        }
    }

    getAll() { return this.vocabList || []; }
    
    findIndexById(id) { 
        if(!this.vocabList) return -1;
        return this.vocabList.findIndex(item => item.id == id); 
    }

    getRandomIndex() {
        if (!this.vocabList || this.vocabList.length === 0) return -1;
        return Math.floor(Math.random() * this.vocabList.length);
    }

    // UPDATED: Settings must be passed in. No internal dependency.
    getFlashcardData(settings) {
        if (!this.vocabList) return [];
        
        // Defaults if settings are missing
        const targetLang = settings ? settings.targetLang : 'ja';
        const originLang = settings ? settings.originLang : 'en';
        
        return this.vocabList.map(item => {
            const mainText = item[targetLang] || '...';
            let subText = '', extraText = '';

            if (targetLang === 'ja') {
                extraText = item.ja_furi || ''; 
                subText = item.ja_roma || '';
            } else if (['zh', 'ko', 'ru'].includes(targetLang)) {
                if(targetLang === 'zh') subText = item.zh_pin || '';
                if(targetLang === 'ko') subText = item.ko_roma || '';
                if(targetLang === 'ru') subText = item.ru_tr || '';
            }
            
            const type = (targetLang === 'ja') ? 'JAPANESE' : (['zh', 'ko', 'ru'].includes(targetLang)) ? 'NON_LATIN' : 'WESTERN';
            const definition = item[originLang] || item['en'] || 'Definition unavailable';
            const sentenceTarget = item[targetLang + '_ex'] || '';
            const sentenceOrigin = item[originLang + '_ex'] || '';

            return {
                id: item.id,
                type: type,
                front: { main: mainText, sub: subText, extra: extraText },
                back: { definition: definition, sentenceTarget: sentenceTarget, sentenceOrigin: sentenceOrigin }
            };
        });
    }
}

export const vocabService = new VocabService();

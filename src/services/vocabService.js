import { db, ref, onValue, update } from './firebase';
import { settingsService } from './settingsService';

/**
 * @typedef {Object} VocabFace
 * @property {string} main - Primary text (target or origin language)
 * @property {string} [sub] - Subtitle (furigana, pinyin, romanization)
 * @property {string} [definition] - Definition text
 * @property {string} [sentenceTarget] - Example sentence in target language
 * @property {string} [sentenceOrigin] - Example sentence in origin language
 */

/**
 * @typedef {Object} VocabItem
 * @property {number} id - Unique vocab ID
 * @property {string} firebaseKey - Firebase database key
 * @property {string} [category] - Category label
 * @property {VocabFace} front - Target language face
 * @property {VocabFace} back - Origin language face
 * @property {string} [ja] - Japanese text
 * @property {string} [en] - English text
 * @property {string} [zh] - Chinese text
 * @property {string} [ko] - Korean text
 */

class VocabService {
    constructor() {
        this.vocabList = [];
        this.rawData = []; 
        this.subscribers = [];
        this.isLoaded = false;
        this.unsubscribe = null;
    }

    init() {
        return new Promise((resolve, reject) => {
            // Prevent multiple listeners
            if (this.unsubscribe && this.isLoaded) {
                resolve();
                return;
            }

            console.log("VocabService: Subscribing to realtime updates at 'vocab'...");
            
            // CORRECTED: Targeting 'vocab' based on your JSON structure
            const dbRef = ref(db, 'vocab'); 
            
            this.unsubscribe = onValue(dbRef, (snapshot) => {
                if (snapshot.exists()) {
                    // Data found
                    this.processRawData(snapshot); 
                } else {
                    // No data found at 'vocab'
                    console.warn("VocabService: No data found at 'vocab' node. Check your database import.");
                    this.rawData = [];
                    this.vocabList = [];
                    this.notify();
                }
                
                // Mark as loaded once we get the first response (data or null)
                if (!this.isLoaded) {
                    this.isLoaded = true;
                    resolve(); 
                }
            }, (error) => {
                console.error("VocabService Error:", error);
                if (!this.isLoaded) reject(error);
            });
        });
    }

    processRawData(snapshot) {
        const list = [];
        snapshot.forEach(childSnap => {
            const val = childSnap.val();
            if (val) {
                // Ensure we capture the key and ID
                val.firebaseKey = childSnap.key; 
                // Handle 0 or "0" correctly
                if(val.id !== undefined && val.id !== null) val.id = parseInt(val.id);
                list.push(val);
            }
        });
        
        // Filter out invalid items
        this.rawData = list.filter(item => item && item.id !== undefined && !isNaN(item.id));
        console.log(`VocabService: Loaded ${this.rawData.length} raw items.`);

        const settings = settingsService.get();
        this.remapLanguages(settings.targetLang, settings.originLang);
    }

    remapLanguages(targetCode, originCode) {
        // Map raw data to the shape expected by the UI (front/back)
        this.vocabList = this.rawData.map(item => {
            // Front (Target Language)
            const targetMain = item[targetCode] || "???";
            
            let targetSub = "";
            if (targetCode === 'ja') targetSub = item.ja_furi || item.ja_roma || "";
            else if (targetCode === 'zh') targetSub = item.zh_pin || "";
            else if (targetCode === 'ko') targetSub = item.ko_roma || "";
            else if (targetCode === 'ru') targetSub = item.ru_tr || "";
            
            const frontObj = { 
                main: targetMain, 
                sub: targetSub 
            };

            // Back (Origin Language)
            const originMain = item[originCode] || "???";
            const targetSentence = item[`${targetCode}_ex`] || "";
            const originSentence = item[`${originCode}_ex`] || "";

            const backObj = { 
                main: originMain, 
                definition: originMain, 
                sentenceTarget: targetSentence, 
                sentenceOrigin: originSentence
            };

            return {
                ...item, 
                front: frontObj,
                back: backObj
            };
        });

        this.notify();
    }

    async saveItem(firebaseKey, data) {
        if (!firebaseKey) return;
        try {
            const updates = {};
            Object.keys(data).forEach(field => {
                // Ensure updates target 'vocab'
                updates[`vocab/${firebaseKey}/${field}`] = data[field];
            });
            await update(ref(db), updates);
        } catch (e) {
            console.error("VocabService: Save Failed", e);
            throw e;
        }
    }

    async reload() { return this.init(); }

    /** @returns {boolean} */
    hasData() { return this.isLoaded && this.vocabList.length > 0; }
    /** @returns {VocabItem[]} */
    getAll() { return this.vocabList; }
    /** @param {number} id @returns {number} Index or -1 */
    findIndexById(id) { return this.vocabList.findIndex(item => item.id === id); }
    /** @returns {number} */
    getRandomIndex() {
        if (this.vocabList.length === 0) return 0;
        return Math.floor(Math.random() * this.vocabList.length);
    }
    subscribe(callback) { 
        this.subscribers.push(callback); 
        if(this.isLoaded) callback(this.vocabList);
    }
    notify() { this.subscribers.forEach(cb => cb(this.vocabList)); }
}

export const vocabService = new VocabService();

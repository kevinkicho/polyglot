import { db, ref, onValue, update } from './firebase'; 
import { settingsService } from './settingsService';

class VocabService {
    constructor() {
        this.vocabList = [];
        this.rawData = []; // NEW: Store raw data here to allow re-mapping later
        this.subscribers = [];
        this.isLoaded = false;
        this.unsubscribe = null;
    }

    init() {
        return new Promise((resolve, reject) => {
            if (this.unsubscribe && this.isLoaded) {
                resolve();
                return;
            }

            console.log("VocabService: Subscribing to realtime updates...");
            const dbRef = ref(db, 'vocab');
            
            this.unsubscribe = onValue(dbRef, (snapshot) => {
                if (snapshot.exists()) {
                    this.processRawData(snapshot); // Changed to processRawData
                } else {
                    console.warn("VocabService: No data found.");
                    this.rawData = [];
                    this.vocabList = [];
                    this.notify();
                }
                
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

    // 1. Process Snapshot into Raw Data (Don't map to Front/Back yet)
    processRawData(snapshot) {
        const list = [];
        snapshot.forEach(childSnap => {
            const val = childSnap.val();
            if (val) {
                val.firebaseKey = childSnap.key; 
                if(val.id !== undefined) val.id = parseInt(val.id);
                list.push(val);
            }
        });
        
        this.rawData = list.filter(item => item && item.id !== undefined);
        
        // 2. Immediately map using current settings
        const settings = settingsService.get();
        this.remapLanguages(settings.targetLang, settings.originLang);
    }

    // 3. NEW: The Surgeon! Dynamically builds front/back based on inputs
    remapLanguages(targetCode, originCode) {
        console.log(`VocabService: Remapping for Target: ${targetCode} -> Origin: ${originCode}`);
        
        this.vocabList = this.rawData.map(item => {
            // -- LOGIC FOR FRONT (Target Language) --
            // Dynamically fetch the field matching the code (e.g., item['es'], item['ja'])
            const targetMain = item[targetCode] || "???";
            
            // Handle special sub-text fields (Furigana, Pinyin, etc.)
            let targetSub = "";
            if (targetCode === 'ja') targetSub = item.ja_furi || item.ja_roma || "";
            else if (targetCode === 'zh') targetSub = item.zh_pin || "";
            else if (targetCode === 'ko') targetSub = item.ko_roma || "";
            else if (targetCode === 'ru') targetSub = item.ru_tr || "";
            
            const frontObj = { 
                main: targetMain, 
                sub: targetSub 
            };

            // -- LOGIC FOR BACK (Origin Language) --
            const originMain = item[originCode] || "???";
            
            // Try to find an example sentence for the specific target language
            const targetSentence = item[`${targetCode}_ex`] || "";
            
            // Try to find the origin translation of the example
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

        console.log(`VocabService: Remapped ${this.vocabList.length} items.`);
        this.notify();
    }

    async saveItem(firebaseKey, data) {
        if (!firebaseKey) return;
        try {
            const updates = {};
            Object.keys(data).forEach(field => {
                updates[`vocab/${firebaseKey}/${field}`] = data[field];
            });
            await update(ref(db), updates);
            console.log(`VocabService: Saved item ${firebaseKey}`);
        } catch (e) {
            console.error("VocabService: Save Failed", e);
            throw e;
        }
    }

    // Legacy support
    async reload() { return this.init(); }

    hasData() { return this.isLoaded && this.vocabList.length > 0; }
    getAll() { return this.vocabList; }
    findIndexById(id) { return this.vocabList.findIndex(item => item.id === id); }
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

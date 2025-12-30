import { db, ref, onValue } from './firebase';

class VocabService {
    constructor() {
        this.vocabList = [];
        this.originalData = [];
        this.subscribers = [];
        this.isLoaded = false;
    }

    init() {
        if (this.isLoaded) return;
        const vocabRef = ref(db, 'vocabulary');
        onValue(vocabRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                // Convert object to array if needed and filter out empty entries
                this.originalData = Array.isArray(data) ? data.filter(i=>i) : Object.values(data).filter(i=>i);
                
                // Initial map based on saved settings or defaults
                const saved = localStorage.getItem('polyglot_settings');
                const s = saved ? JSON.parse(saved) : { targetLang: 'ja', originLang: 'en' };
                this.remapLanguages(s.targetLang, s.originLang);
                
                this.isLoaded = true;
            }
        });
    }

    remapLanguages(targetLang, originLang) {
        if (!this.originalData.length) return;

        this.vocabList = this.originalData.map(item => {
            // Get Target Data
            let frontMain = item.word || "";
            let frontSub = item.reading || ""; // Default for JA/ZH

            // Language specific mapping for "Front" (Question/Target)
            if (targetLang === 'en') { frontMain = item.english; frontSub = ""; }
            else if (targetLang === 'ko') { frontMain = item.korean; frontSub = ""; }
            else if (targetLang === 'zh') { frontMain = item.chinese; frontSub = item.pinyin || ""; }
            else if (targetLang === 'ja') { frontMain = item.word; frontSub = item.reading || ""; }
            else if (targetLang === 'ru') { frontMain = item.russian; frontSub = ""; }
            else if (targetLang === 'fr') { frontMain = item.french; frontSub = ""; }
            else if (targetLang === 'it') { frontMain = item.italian; frontSub = ""; }
            else if (targetLang === 'es') { frontMain = item.spanish; frontSub = ""; }
            else if (targetLang === 'pt') { frontMain = item.portuguese; frontSub = ""; }
            else if (targetLang === 'de') { frontMain = item.german; frontSub = ""; }

            // Get Origin Data (Definition/Back)
            let backMain = "";
            let backDef = "";
            
            // Helper to pick field based on lang code
            const getField = (l) => {
                if(l==='en') return item.english;
                if(l==='ja') return item.word;
                if(l==='ko') return item.korean;
                if(l==='zh') return item.chinese;
                if(l==='ru') return item.russian;
                if(l==='fr') return item.french;
                if(l==='it') return item.italian;
                if(l==='es') return item.spanish;
                if(l==='pt') return item.portuguese;
                if(l==='de') return item.german;
                return item.english;
            };

            backDef = getField(originLang);
            backMain = backDef; // Usually same for simple cards

            // Sentences (if available)
            const sentenceTarget = item[`sentence_${targetLang}`] || "";
            const sentenceOrigin = item[`sentence_${originLang}`] || "";

            return {
                id: item.id,
                category: item.category,
                front: { main: frontMain, sub: frontSub },
                back: { main: backMain, definition: backDef, sentenceTarget, sentenceOrigin },
                original: item
            };
        });
        
        // FIX: Notify subscribers (like QuizApp) so they refresh immediately
        this.notify();
    }

    getAll() {
        return this.vocabList;
    }

    getRandomIndex() {
        return Math.floor(Math.random() * this.vocabList.length);
    }
    
    findIndexById(id) {
        return this.vocabList.findIndex(i => i.id === id);
    }

    subscribe(callback) {
        this.subscribers.push(callback);
        if (this.isLoaded) callback(this.vocabList);
    }

    notify() {
        this.subscribers.forEach(cb => cb(this.vocabList));
    }
}

export const vocabService = new VocabService();

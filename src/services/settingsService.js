class SettingsService {
    constructor() {
        this.config = {
            targetLang: 'ja', 
            originLang: 'en',
            fontFamily: 'font-inter', 
            fontWeight: 'font-normal',
            showVocab: true, showReading: true, showSentence: true, showEnglish: false, darkMode: false,
            autoPlay: true,
            quizChoices: 4, quizClickMode: 'double', quizAnswerAudio: true, quizAutoPlayCorrect: true,
            sentencesWordAudio: true, sentAutoPlayCorrect: true,
            blanksChoices: 4, blanksAnswerAudio: true, blanksAutoPlayCorrect: true,
            gameWaitAudio: true,
            dictEnabled: true, dictDuration: '2', dictAudio: true
        };
        
        try {
            const saved = localStorage.getItem('flashcard-settings');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.config = { ...this.config, ...parsed };
            }
        } catch (e) { 
            console.error("Settings Load Error", e); 
        }
    }

    get() { return this.config; }
    setTarget(lang) { this.config.targetLang = lang; this.save(); }
    setOrigin(lang) { this.config.originLang = lang; this.save(); }
    set(key, value) { this.config[key] = value; this.save(); }
    save() { 
        try { 
            localStorage.setItem('flashcard-settings', JSON.stringify(this.config)); 
        } catch (e) { console.error(e); } 
    }
}
export const settingsService = new SettingsService();

const defaultSettings = {
    targetLang: 'ja',
    originLang: 'en',
    darkMode: false,
    autoPlay: true,
    fontFamily: 'font-inter',
    fontWeight: 'font-bold',
    
    // Visuals
    showVocab: true,
    showReading: true,
    showSentence: true,
    showEnglish: true,
    
    // Dictionary
    dictEnabled: true,
    dictAudio: false,
    
    // Games
    quizAnswerAudio: false,
    quizAutoPlayCorrect: true,
    quizWaitAudio: false,
    
    sentencesWordAudio: true,
    sentAutoPlayCorrect: true,
    sentWaitAudio: false,
    
    blanksAnswerAudio: true,
    blanksAutoPlayCorrect: true,
    blanksWaitAudio: false
};

class SettingsService {
    constructor() { this.settings = this.load(); }

    load() {
        try {
            const saved = localStorage.getItem('polyglot_settings');
            if (saved) {
                // Merge saved settings ON TOP of defaults to ensure new keys exist
                return { ...defaultSettings, ...JSON.parse(saved) };
            }
        } catch (e) { console.error(e); }
        return { ...defaultSettings };
    }

    get() { return this.settings; }

    set(key, value) {
        this.settings[key] = value;
        this.save();
    }

    setTarget(lang) { this.set('targetLang', lang); }
    setOrigin(lang) { this.set('originLang', lang); }

    save() {
        try { localStorage.setItem('polyglot_settings', JSON.stringify(this.settings)); } catch (e) {}
    }
}
export const settingsService = new SettingsService();

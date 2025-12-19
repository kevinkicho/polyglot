const defaultSettings = {
    targetLang: 'ja',
    originLang: 'en',
    darkMode: false,
    
    // Audio Defaults (Updated)
    autoPlay: true,     // Default ON
    waitForAudio: true, // Default ON
    volume: 1.0,        // Default Max Volume
    
    // Fonts
    fontFamily: 'notosans',
    fontWeight: 'bold',
    fontSize: 'medium',
    
    // Visuals
    showVocab: true,
    showReading: true,
    showSentence: true,
    showEnglish: true,
    
    // Quiz
    quizChoices: 4,
    quizAnswerAudio: true, 
    quizClickMode: 'single',
    quizAutoPlayCorrect: true,
    quizDoubleClick: true, 
    
    // Sentences
    sentencesWordAudio: true, 
    sentAutoPlayCorrect: true,
    
    // Blanks
    blanksChoices: 4,
    blanksAnswerAudio: true, 
    blanksAutoPlayCorrect: true,
    blanksDoubleClick: true, 
    
    // Dictionary
    dictEnabled: true,
    dictClickAudio: true 
};

class SettingsService {
    constructor() {
        this.settings = this.load();
    }

    load() {
        try {
            const saved = localStorage.getItem('polyglot_settings');
            if (saved) {
                return { ...defaultSettings, ...JSON.parse(saved) };
            }
        } catch (e) {
            console.error("Error loading settings:", e);
        }
        return { ...defaultSettings };
    }

    get() {
        return this.settings;
    }

    set(key, value) {
        this.settings[key] = value;
        this.save();
    }

    setTarget(lang) { this.set('targetLang', lang); }
    setOrigin(lang) { this.set('originLang', lang); }

    save() {
        try {
            localStorage.setItem('polyglot_settings', JSON.stringify(this.settings));
        } catch (e) {
            console.error("Error saving settings:", e);
        }
    }
}

export const settingsService = new SettingsService();

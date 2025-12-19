const defaultSettings = {
    targetLang: 'ja',
    originLang: 'en',
    darkMode: false,
    autoPlay: true,
    
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
    quizAnswerAudio: true, // Default ON
    quizClickMode: 'single',
    quizAutoPlayCorrect: true,
    quizDoubleClick: true, // Default ON
    
    // Sentences
    sentencesWordAudio: true, // Default ON
    sentAutoPlayCorrect: true,
    
    // Blanks
    blanksChoices: 4,
    blanksAnswerAudio: true, // Default ON
    blanksAutoPlayCorrect: true,
    blanksDoubleClick: true, // Default ON
    
    // Dictionary
    dictEnabled: true,
    dictClickAudio: true, // Default ON
    waitForAudio: false 
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

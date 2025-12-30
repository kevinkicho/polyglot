class SettingsService {
    constructor() {
        this.defaults = {
            targetLang: 'ja',
            originLang: 'en',
            darkMode: false,
            
            // Audio Defaults
            autoPlay: true,
            waitForAudio: true,
            clickAudio: true,
            volume: 1.0,
            
            // Flashcard Display
            showVocab: true,
            showSentence: true,
            showEnglish: true,
            
            // Dictionary
            dictEnabled: true,
            dictClickAudio: true, 
            
            // Game Specifics
            quizAnswerAudio: true,
            quizAutoPlayCorrect: true,
            quizDoubleClick: false, // Explicitly false
            
            sentencesWordAudio: true,
            sentencesWinAnim: true,
            
            blanksAnswerAudio: true,
            blanksDoubleClick: false // Explicitly false
        };
        this.settings = this.load();
    }

    load() {
        try {
            const saved = localStorage.getItem('polyglot_settings');
            // Merge saved settings with defaults, but ensure unwanted keys (like old fonts) don't persist if we wanted to strip them
            // For now, simple spread is fine, as unused keys will just be ignored by UI.
            return saved ? { ...this.defaults, ...JSON.parse(saved) } : { ...this.defaults };
        } catch (e) {
            return { ...this.defaults };
        }
    }

    save() {
        localStorage.setItem('polyglot_settings', JSON.stringify(this.settings));
    }

    get() {
        return this.settings;
    }

    set(key, value) {
        this.settings[key] = value;
        this.save();
    }
}

export const settingsService = new SettingsService();

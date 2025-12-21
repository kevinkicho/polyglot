class SettingsService {
    constructor() {
        this.defaults = {
            targetLang: 'ja',
            originLang: 'en',
            darkMode: false,
            
            // Audio Defaults (Always ON since UI removed)
            autoPlay: true,
            waitForAudio: true,
            clickAudio: true,
            volume: 1.0,
            
            // Fonts
            fontFamily: 'notosans',
            fontWeight: 'normal',
            
            // Flashcard Display
            showVocab: true,
            showSentence: true,
            showEnglish: true,
            
            // Dictionary
            dictEnabled: true,
            dictClickAudio: true, // Still used internally
            
            // Game Specifics (Defaults to ON for best experience)
            quizAnswerAudio: true,
            quizAutoPlayCorrect: true,
            quizDoubleClick: false,
            
            sentencesWordAudio: true,
            sentencesWinAnim: true,
            
            blanksAnswerAudio: true,
            blanksDoubleClick: false
        };
        this.settings = this.load();
    }

    load() {
        try {
            const saved = localStorage.getItem('polyglot_settings');
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

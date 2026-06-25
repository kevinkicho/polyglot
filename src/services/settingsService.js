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
            showReading: true,
            showSentence: true,
            showEnglish: true,

            // Game Specifics
            quizAutoPlayCorrect: true,
            quizDoubleClick: false,

            sentencesWordAudio: true,
            sentencesWinAnim: true,

            blanksAnswerAudio: true,
            blanksAutoPlayCorrect: true,
            blanksDoubleClick: false,

            // Effects
            comboEffects: true,

            // AI Tutor
            llmApiUrl: 'http://localhost:11434',
            llmModel: 'gemma4:31b-cloud'
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

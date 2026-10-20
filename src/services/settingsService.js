class SettingsService {
    constructor() {
        this.VERSION = 2; // Bump to force-clear old localStorage settings
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

            // AI Tutor — Ollama Cloud model id (https://docs.ollama.com/cloud)
            llmModel: 'gemma4:31b'
        };
        this.settings = this.load();
    }

    load() {
        try {
            const savedVersion = parseInt(localStorage.getItem('polyglot_settings_version') || '0');
            if (savedVersion < this.VERSION) {
                localStorage.removeItem('polyglot_settings');
                localStorage.setItem('polyglot_settings_version', this.VERSION);
                return { ...this.defaults };
            }
            const saved = localStorage.getItem('polyglot_settings');
            const merged = saved ? { ...this.defaults, ...JSON.parse(saved) } : { ...this.defaults };
            delete merged.llmApiUrl;
            return merged;
        } catch (e) {
            return { ...this.defaults };
        }
    }

    save() {
        localStorage.setItem('polyglot_settings', JSON.stringify(this.settings));
        localStorage.setItem('polyglot_settings_version', this.VERSION);
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

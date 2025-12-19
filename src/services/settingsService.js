const defaultSettings = {
    targetLang: 'ja',
    originLang: 'en',
    darkMode: false,
    autoPlay: true,
    fontFamily: 'font-inter',
    fontWeight: 'font-bold',
    fontSize: 'medium',
    showVocab: true,
    showReading: true,
    showSentence: true,
    showEnglish: true,
    quizChoices: 4,
    quizAnswerAudio: false,
    quizClickMode: 'single',
    quizAutoPlayCorrect: true,
    sentencesWordAudio: true,
    sentAutoPlayCorrect: true,
    blanksChoices: 4,
    blanksAnswerAudio: true,
    blanksAutoPlayCorrect: true,
    dictEnabled: true,
    dictClickAudio: false, // Changed from dictAudio
    waitForAudio: false    // New global setting
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

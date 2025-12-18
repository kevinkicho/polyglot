const defaultSettings = {
    targetLang: 'ja',
    originLang: 'en',
    darkMode: false,
    autoPlay: true,
    fontFamily: 'font-inter',
    fontWeight: 'font-bold',
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
    dictDuration: 3,
    dictAudio: false
};

class SettingsService {
    constructor() {
        this.settings = this.load();
    }

    load() {
        const saved = localStorage.getItem('polyglot_settings');
        return saved ? { ...defaultSettings, ...JSON.parse(saved) } : { ...defaultSettings };
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
        localStorage.setItem('polyglot_settings', JSON.stringify(this.settings));
    }
}

export const settingsService = new SettingsService();

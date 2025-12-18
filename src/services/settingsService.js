class SettingsService {
    constructor() {
        this.config = {
            targetLang: 'ja', originLang: 'en', fontFamily: 'font-inter', fontWeight: 'font-normal',
            // Display
            showVocab: true, showReading: true, showSentence: true, showEnglish: false, darkMode: false,
            // Audio
            autoPlay: true,
            // Quiz
            quizChoices: 4, quizClickMode: 'double', quizAnswerAudio: true, quizAutoPlayCorrect: true,
            // Sentences
            sentencesWordAudio: true, sentAutoPlayCorrect: true,
            // Blanks
            blanksChoices: 4, blanksAnswerAudio: true, blanksAutoPlayCorrect: true,
            // Global Game
            gameWaitAudio: true,
            // Dictionary (NEW)
            dictEnabled: true,
            dictDuration: '2', // '1', '2', '3', 'infinity'
            dictAudio: true
        };
        
        try {
            const saved = localStorage.getItem('flashcard-settings');
            if (saved) this.config = { ...this.config, ...JSON.parse(saved) };
        } catch (e) { console.error("Settings Load Error", e); }
    }

    get() { return this.config; }
    setTarget(lang) { this.config.targetLang = lang; this.save(); }
    setOrigin(lang) { this.config.originLang = lang; this.save(); }
    set(key, value) { this.config[key] = value; this.save(); }
    save() { try { localStorage.setItem('flashcard-settings', JSON.stringify(this.config)); } catch (e) { console.error(e); } }
}
export const settingsService = new SettingsService();

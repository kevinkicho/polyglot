class SettingsService {
    constructor() {
        // Default Settings
        this.config = {
            targetLang: 'ja',
            originLang: 'en',
            font: 'font-inter' // Default font class
        };
        
        // Load from localStorage if available
        const saved = localStorage.getItem('flashcard-settings');
        if (saved) {
            this.config = { ...this.config, ...JSON.parse(saved) };
        }
    }

    get() {
        return this.config;
    }

    setTarget(lang) {
        this.config.targetLang = lang;
        this.save();
    }

    setOrigin(lang) {
        this.config.originLang = lang;
        this.save();
    }

    setFont(fontClass) {
        this.config.font = fontClass;
        this.save();
    }

    save() {
        localStorage.setItem('flashcard-settings', JSON.stringify(this.config));
    }
}

export const settingsService = new SettingsService();

// src/services/settingsService.js

class SettingsService {
    constructor() {
        // Default defaults: Learn Japanese, knowing English
        this.config = {
            targetLang: 'ja',
            originLang: 'en'
        };
    }

    get() {
        return this.config;
    }

    setTarget(lang) {
        this.config.targetLang = lang;
    }

    setOrigin(lang) {
        this.config.originLang = lang;
    }
}

export const settingsService = new SettingsService();

import { settingsService } from './settingsService';

class AudioService {
    constructor() {
        this.synth = window.speechSynthesis;
        this.currentUtterance = null; // Prevent GC on Android
        this.checkTimer = null;
    }

    stop() {
        if (this.synth) {
            this.synth.cancel();
            if (this.checkTimer) clearInterval(this.checkTimer);
        }
    }

    /**
     * Removes punctuation and visual blanks so TTS reads smoothly.
     */
    cleanText(text) {
        if (!text) return "";
        return text
            // Remove Japanese punctuation (Maru, Ten, brackets)
            .replace(/[。、，．！？?.,!「」『』()（）]/g, ' ') 
            // Remove underscores (blanks) so it doesn't say "underscore"
            .replace(/_+/g, ' ')
            // Remove extra spaces created by replacements
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Plays audio and returns a Promise that resolves when audio finishes.
     */
    speak(text, lang = 'en') {
        return new Promise((resolve) => {
            if (!this.synth || !text) {
                resolve();
                return;
            }

            // 1. Sanitize text (Strip punctuation/blanks)
            const safeText = this.cleanText(text);
            if (!safeText) {
                resolve();
                return;
            }

            // 2. Cancel previous audio
            this.stop();

            // 3. Create utterance
            const utterance = new SpeechSynthesisUtterance(safeText);
            utterance.lang = this.formatLang(lang);
            
            // 4. Handle Events
            let hasResolved = false;
            const finish = () => {
                if (!hasResolved) {
                    hasResolved = true;
                    this.currentUtterance = null;
                    if (this.checkTimer) clearInterval(this.checkTimer);
                    resolve();
                }
            };

            utterance.onend = finish;
            utterance.onerror = finish;

            // 5. Garbage Collection Fix
            this.currentUtterance = utterance;

            // 6. Safety Timeout
            const safeTimeout = (safeText.length * 200) + 2000; 
            setTimeout(finish, safeTimeout);

            // 7. Polling Fix
            this.checkTimer = setInterval(() => {
                if (!this.synth.speaking && !this.synth.pending) {
                    finish();
                }
            }, 500);

            // 8. Speak
            this.synth.speak(utterance);
        });
    }

    formatLang(lang) {
        const map = {
            'en': 'en-US',
            'ja': 'ja-JP',
            'zh': 'zh-CN',
            'ko': 'ko-KR',
            'es': 'es-ES',
            'fr': 'fr-FR',
            'de': 'de-DE',
            'it': 'it-IT',
            'ru': 'ru-RU',
            'pt': 'pt-BR'
        };
        return map[lang] || lang;
    }
}

export const audioService = new AudioService();

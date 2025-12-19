import { settingsService } from './settingsService';

class AudioService {
    constructor() {
        this.synth = window.speechSynthesis;
        this.currentUtterance = null;
        this.checkTimer = null;
    }

    stop() {
        if (this.synth) {
            this.synth.cancel();
            if (this.checkTimer) clearInterval(this.checkTimer);
        }
    }

    cleanText(text, lang) {
        if (!text) return "";
        let cleaned = text;

        // Japanese Special Handling: Remove content after middle dot (full or half width)
        if (lang && (lang === 'ja' || lang === 'ja-JP')) {
            // Split by full-width (・) or half-width (･) middle dot and take the first part
            const parts = cleaned.split(/[・･]/);
            if (parts.length > 0) {
                cleaned = parts[0];
            }
        }

        return cleaned
            .replace(/[。、，．！？?.,!「」『』()（）]/g, ' ') 
            .replace(/_+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    speak(text, lang = 'en') {
        return new Promise((resolve) => {
            if (!this.synth || !text) {
                resolve();
                return;
            }

            const safeText = this.cleanText(text, lang);
            if (!safeText) {
                resolve();
                return;
            }

            this.stop();

            const utterance = new SpeechSynthesisUtterance(safeText);
            utterance.lang = this.formatLang(lang);
            
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

            this.currentUtterance = utterance;

            // Safety Timeout
            const safeTimeout = (safeText.length * 200) + 2000; 
            setTimeout(finish, safeTimeout);

            this.synth.speak(utterance);

            // Delay the polling start by 100ms to allow 'speaking' to become true
            setTimeout(() => {
                if (!hasResolved) {
                    this.checkTimer = setInterval(() => {
                        if (!this.synth.speaking && !this.synth.pending) {
                            finish();
                        }
                    }, 500);
                }
            }, 100);
        });
    }

    formatLang(lang) {
        const map = {
            'en': 'en-US', 'ja': 'ja-JP', 'zh': 'zh-CN', 'ko': 'ko-KR',
            'es': 'es-ES', 'fr': 'fr-FR', 'de': 'de-DE', 'it': 'it-IT',
            'ru': 'ru-RU', 'pt': 'pt-BR'
        };
        return map[lang] || lang;
    }
}

export const audioService = new AudioService();

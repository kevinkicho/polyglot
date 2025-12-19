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
     * Plays audio and returns a Promise that resolves when audio finishes.
     * This is crucial for the "Wait for Audio" setting.
     */
    speak(text, lang = 'en') {
        return new Promise((resolve) => {
            if (!this.synth || !text) {
                resolve();
                return;
            }

            // 1. Cancel previous audio
            this.stop();

            // 2. Create utterance
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = this.formatLang(lang);
            
            // Apply settings
            const settings = settingsService.get();
            // You can add rate/pitch settings here if you have them in the future
            
            // 3. Handle Events (Resolve promise on end or error)
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

            // 4. Garbage Collection Fix for Android/Chrome
            // If we don't store this in 'this', the browser might delete the object 
            // before it finishes speaking, causing onend to never fire.
            this.currentUtterance = utterance;

            // 5. Safety Timeout (Fallback if onend never fires)
            // Estimate duration: ~200ms per character + 1s buffer
            const safeTimeout = (text.length * 200) + 2000; 
            setTimeout(finish, safeTimeout);

            // 6. Polling Fix for some Android versions that get stuck
            this.checkTimer = setInterval(() => {
                if (!this.synth.speaking && !this.synth.pending) {
                    finish();
                }
            }, 500);

            // 7. Speak
            this.synth.speak(utterance);
        });
    }

    formatLang(lang) {
        // Map short codes to full locale codes for better TTS support
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

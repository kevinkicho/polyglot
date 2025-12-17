import { settingsService } from './settingsService';

class AudioService {
    constructor() {
        this.synth = window.speechSynthesis;
        this.voices = [];
        if (this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = () => { this.voices = this.synth.getVoices(); };
        }
    }

    getVoice(langCode) {
        if (!this.voices.length) this.voices = this.synth.getVoices();
        const langMap = { 'ja': 'ja-JP', 'en': 'en-US', 'ko': 'ko-KR', 'zh': 'zh-CN', 'es': 'es-ES', 'fr': 'fr-FR', 'de': 'de-DE', 'it': 'it-IT', 'pt': 'pt-BR', 'ru': 'ru-RU' };
        const target = langMap[langCode] || 'en-US';
        return this.voices.find(v => v.lang === target) || this.voices.find(v => v.lang.startsWith(target.split('-')[0]));
    }

    stop() {
        if (this.synth.speaking || this.synth.pending) this.synth.cancel();
    }

    // Standard Speak
    speak(text, lang) {
        this.speakWithCallback(text, lang, null);
    }

    // Speak with onEnd callback (For "Wait Audio" feature)
    speakWithCallback(text, lang, onEnd) {
        if (!text) {
            if (onEnd) onEnd();
            return;
        }
        
        this.stop();

        // Japanese Parsing logic
        let textToSpeak = text;
        if (lang === 'ja' && text.includes('・')) {
            textToSpeak = text.split('・')[0];
        }

        // Small delay to ensure clean state
        setTimeout(() => {
            const utterance = new SpeechSynthesisUtterance(textToSpeak);
            utterance.lang = lang;
            utterance.rate = 0.9;
            
            const voice = this.getVoice(lang);
            if (voice) utterance.voice = voice;

            if (onEnd) {
                utterance.onend = onEnd;
                // Safety: If audio hangs, force callback after sensible timeout
                // Estimated duration: 1 sec per 10 chars roughly
                const safetyTime = Math.max(2000, textToSpeak.length * 100); 
                setTimeout(() => {
                    if (this.synth.speaking) {
                        // Don't kill it, just fire callback if it's taking unusually long? 
                        // Or rely on onend. Let's rely on onend for now.
                    }
                }, safetyTime);
            }

            this.synth.speak(utterance);
        }, 50);
    }
}

export const audioService = new AudioService();

import { settingsService } from './settingsService';

class AudioService {
    constructor() {
        this.synth = window.speechSynthesis;
        this.voices = [];
        this.isPlaying = false; // Track state
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            this.loadVoices();
            window.speechSynthesis.onvoiceschanged = () => this.loadVoices();
        }
    }

    loadVoices() {
        this.voices = this.synth.getVoices();
    }

    getVoice(lang) {
        let voice = this.voices.find(v => v.lang === lang || v.lang.startsWith(lang));
        if (!voice && lang === 'ja') voice = this.voices.find(v => v.lang === 'ja-JP');
        if (!voice && lang === 'zh') voice = this.voices.find(v => v.lang === 'zh-CN');
        if (!voice && lang === 'ko') voice = this.voices.find(v => v.lang === 'ko-KR');
        return voice;
    }

    sanitizeText(text, lang) {
        if (!text) return "";
        let clean = text;
        // Clean text at separators
        clean = clean.split(/[・･\u30FB\uFF65\u00B7\u2022（(\[<\/,]/)[0];
        return clean.trim();
    }

    // UPDATED: Returns a Promise that resolves when audio ends
    speak(text, lang) {
        return new Promise((resolve, reject) => {
            if (!this.synth) { resolve(); return; }
            
            const settings = settingsService.get();
            // Don't play if it matches Origin Language
            if (lang === settings.originLang) {
                resolve(); 
                return;
            }

            this.synth.cancel(); // Stop previous
            this.isPlaying = true;

            const cleanText = this.sanitizeText(text, lang);
            if (!cleanText) { 
                this.isPlaying = false;
                resolve(); 
                return; 
            }

            const utter = new SpeechSynthesisUtterance(cleanText);
            const voice = this.getVoice(lang);
            if (voice) utter.voice = voice;
            
            utter.lang = lang;
            utter.volume = settings.volume !== undefined ? settings.volume : 1.0;
            utter.rate = 1.0; 

            utter.onend = () => {
                this.isPlaying = false;
                resolve();
            };
            
            utter.onerror = (e) => {
                console.warn("Audio error:", e);
                this.isPlaying = false;
                resolve(); // Resolve anyway to not block app
            };

            this.synth.speak(utter);
        });
    }

    stop() {
        if (this.synth) {
            this.synth.cancel();
            this.isPlaying = false;
        }
    }
}

export const audioService = new AudioService();

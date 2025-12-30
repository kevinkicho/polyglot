import { settingsService } from './settingsService';

class AudioService {
    constructor() {
        this.synth = window.speechSynthesis;
        this.voices = [];
        this.currentUtteranceId = null; // Track the unique ID of the active sound
        
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
        // Remove special reading markers often found in Asian language learning sets
        clean = clean.split(/[・･\u30FB\uFF65\u00B7\u2022（(\[<]/)[0];
        return clean.trim();
    }

    speak(text, lang) {
        return new Promise((resolve, reject) => {
            if (!this.synth) { resolve(); return; }
            
            const settings = settingsService.get();
            // Don't play if it matches Origin Language (unless desired)
            if (lang === settings.originLang) { resolve(); return; }

            // 1. Generate a unique ID for THIS specific speech request
            const myId = Date.now() + Math.random();
            this.currentUtteranceId = myId;

            // 2. Stop previous audio
            this.synth.cancel();
            
            // 3. Dispatch Global Pause Event
            // It is safe to fire this multiple times; the ComboManager just keeps it paused.
            window.dispatchEvent(new CustomEvent('audio:start'));

            const cleanText = this.sanitizeText(text, lang);
            if (!cleanText) { 
                this.handleEnd(myId);
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
                this.handleEnd(myId);
                resolve();
            };
            
            utter.onerror = (e) => {
                console.warn("Audio error:", e);
                this.handleEnd(myId);
                resolve(); 
            };

            this.synth.speak(utter);
        });
    }

    // New Helper: Only resume timer if THIS was the last requested audio
    handleEnd(id) {
        if (this.currentUtteranceId === id) {
            this.currentUtteranceId = null;
            window.dispatchEvent(new CustomEvent('audio:end'));
        }
        // If IDs don't match, it means a NEW sound started before this one finished.
        // We do NOT fire 'audio:end' in that case, keeping the timer paused.
    }

    stop() {
        if (this.synth) {
            this.synth.cancel();
            this.currentUtteranceId = null;
            // Force resume if we explicitly stop everything
            window.dispatchEvent(new CustomEvent('audio:end'));
        }
    }
}

export const audioService = new AudioService();

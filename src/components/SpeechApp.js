import { BaseGameComponent } from './BaseGameComponent';

export class SpeechApp extends BaseGameComponent {
    constructor() {
        super();
        this.isListening = false;
        this.recognition = null;
        this.lastTranscript = '';
        this.supportSpeech = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    }

    mount(elementId) {
        super.mount(elementId);
        if (this.supportSpeech) this.initSpeech();
        this.random();
    }

    unmount() {
        if (this.recognition && this.isListening) {
            try { this.recognition.stop(); } catch (e) {}
        }
        this.isListening = false;
        super.unmount();
    }

    initSpeech() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.maxAlternatives = 1;

        this.recognition.onstart = () => { this.isListening = true; this.updateMicVisuals(); };
        this.recognition.onend = () => { this.isListening = false; this.updateMicVisuals(); };
        this.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            this.lastTranscript = transcript;
            this.checkAnswer(transcript);
        };
        this.recognition.onerror = (event) => {
            console.error('Speech error', event.error);
            this.isListening = false;
            this.lastTranscript = "Error: " + event.error;
            this.updateMicVisuals();
        };
    }

    loadGame() {
        const list = this.vocabService.getAll();
        if (!list.length) return;
        this.currentData = list[this.currentIndex];
        this.lastTranscript = '';
        this.isListening = false;
        this.render();
    }

    getLangCode() {
        const map = {
            'en': 'en-US', 'ja': 'ja-JP', 'ko': 'ko-KR', 'zh': 'zh-CN',
            'es': 'es-ES', 'fr': 'fr-FR', 'de': 'de-DE', 'it': 'it-IT',
            'pt': 'pt-PT', 'ru': 'ru-RU'
        };
        return map[this.settingsService.get().targetLang] || 'en-US';
    }

    toggleMic() {
        if (!this.supportSpeech) {
            this.toast.warning("Speech recognition is not supported in this browser. Try Chrome or Edge.");
            return;
        }
        if (this.isListening) {
            this.recognition.stop();
        } else {
            this.recognition.lang = this.getLangCode();
            try { this.recognition.start(); } catch (e) { console.error(e); }
        }
    }

    checkAnswer(transcript) {
        const target = this.currentData.front.main;
        const normalize = (str) => str.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()。、？！]/g, "").replace(/\s{2,}/g, " ");
        const cleanTranscript = normalize(transcript);
        const cleanTarget = normalize(target);
        const isCorrect = cleanTranscript === cleanTarget || (cleanTarget.length > 5 && cleanTarget.includes(cleanTranscript));

        this.render();

        if (isCorrect) {
            this.scoreService.addScore('speech', 20);
            const box = this.container.querySelector('#speech-status-box');
            if (box) {
                box.classList.remove('opacity-0', 'bg-gray-100', 'dark:bg-gray-800');
                box.classList.add('bg-green-100', 'border-green-500', 'text-green-700');
            }
            this.setTimeout(() => this.next(), 1500);
        } else {
            const box = this.container.querySelector('#speech-status-box');
            if (box) {
                box.classList.remove('opacity-0');
                box.classList.add('bg-red-100', 'border-red-500', 'text-red-700', 'shake');
                this.setTimeout(() => box.classList.remove('shake'), 500);
            }
        }
    }

    updateMicVisuals() {
        if (!this.container) return;
        const btn = this.container.querySelector('#mic-btn');
        const ring = this.container.querySelector('#mic-ring');

        if (this.isListening) {
            btn.classList.add('bg-red-500', 'text-white');
            btn.classList.remove('bg-indigo-600');
            ring.classList.remove('hidden');
        } else {
            btn.classList.add('bg-indigo-600');
            btn.classList.remove('bg-red-500', 'text-white');
            ring.classList.add('hidden');
        }
    }

    playHint() {
        this.audioService.speak(this.currentData.front.main, this.settingsService.get().targetLang);
        const box = this.container.querySelector('#speech-q-box');
        if (box) {
            box.classList.add('scale-95', 'ring-4', 'ring-indigo-200');
            this.setTimeout(() => box.classList.remove('scale-95', 'ring-4', 'ring-indigo-200'), 150);
        }
    }

    render() {
        if (!this.container) return;
        if (!this.supportSpeech) {
            this.container.innerHTML = `<div class="h-full flex items-center justify-center text-center p-6 text-gray-500">Your browser does not support Speech Recognition.<br>Please try Google Chrome or Safari.</div>`;
            return;
        }

        const item = this.currentData;
        const meaning = item.back.main || item.back.definition;

        this.container.innerHTML = `
            ${this.renderHeader({ prefix: 'speech', id: item.id, color: 'indigo', showRandom: true })}

            <div class="w-full h-full pt-20 pb-28 px-4 max-w-lg mx-auto flex flex-col gap-6 items-center">
                ${this.renderCategoryPills({ color: 'indigo' })}

                <div id="speech-q-box" class="w-full bg-white dark:bg-dark-card p-6 rounded-3xl shadow-sm text-center border-2 border-indigo-100 hover:border-indigo-300 dark:border-dark-border cursor-pointer transition-all active:scale-95 flex flex-col items-center justify-center gap-2 select-none">
                    <span class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Tap to Listen</span>
                    <h2 class="text-4xl font-black text-gray-800 dark:text-white leading-tight" data-fit="true">${this.textService.smartWrap(item.front.main)}</h2>
                    <p class="text-sm text-gray-500 dark:text-gray-400 mt-2 font-medium">${meaning}</p>
                </div>

                <div class="relative w-full flex-1 flex flex-col items-center justify-center">
                    <div id="mic-ring" class="hidden absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-red-500 rounded-full opacity-20 animate-ping"></div>

                    <button id="mic-btn" class="relative z-10 w-32 h-32 bg-indigo-600 rounded-full shadow-2xl flex items-center justify-center text-white transition-all active:scale-95 hover:shadow-indigo-500/50">
                        <svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/></svg>
                    </button>
                    <p class="mt-6 text-gray-400 font-bold uppercase tracking-widest text-sm">${this.isListening ? 'Listening...' : 'Tap to Speak'}</p>
                </div>

                <div id="speech-status-box" class="w-full min-h-[4rem] bg-gray-100 dark:bg-gray-800 rounded-2xl border-2 border-transparent p-4 text-center transition-all ${this.lastTranscript ? '' : 'opacity-0'}">
                    <p class="text-sm font-bold text-gray-500 dark:text-gray-400">You said:</p>
                    <p class="text-xl font-black italic mt-1 dark:text-white">"${this.lastTranscript || '...'}"</p>
                </div>
            </div>

            ${this.renderFooter({ prefix: 'speech', color: 'indigo' })}
        `;

        this.bindCommonEvents('speech');
        this.bind('#mic-btn', 'click', () => this.toggleMic());
        this.bind('#speech-q-box', 'click', () => this.playHint());

        this.fitTexts([
            ['[data-fit="true"]', 24, 70]
        ]);
    }
}
export const speechApp = new SpeechApp();

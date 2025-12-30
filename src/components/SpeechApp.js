import { vocabService } from '../services/vocabService';
import { settingsService } from '../services/settingsService';
import { audioService } from '../services/audioService';
import { scoreService } from '../services/scoreService';
import { textService } from '../services/textService';

export class SpeechApp {
    constructor() {
        this.container = null;
        this.currentData = null;
        this.currentIndex = 0;
        this.isListening = false;
        this.recognition = null;
        this.categories = [];
        this.currentCategory = 'All';
        this.lastTranscript = '';
        this.supportSpeech = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    }

    mount(elementId) {
        this.container = document.getElementById(elementId);
        if (this.supportSpeech) {
            this.initSpeech();
        }
        this.updateCategories();
        this.random();
    }

    refresh() {
        this.loadGame();
    }

    initSpeech() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.maxAlternatives = 1;

        this.recognition.onstart = () => {
            this.isListening = true;
            this.updateMicVisuals();
        };

        this.recognition.onend = () => {
            this.isListening = false;
            this.updateMicVisuals();
        };

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

    updateCategories() {
        const all = vocabService.getAll();
        const cats = new Set(all.map(i => i.category || 'Uncategorized'));
        this.categories = ['All', ...cats];
    }

    setCategory(cat) {
        this.currentCategory = cat;
        this.random();
    }

    getFilteredList() {
        const all = vocabService.getAll();
        if (this.currentCategory === 'All') return all;
        return all.filter(i => (i.category || 'Uncategorized') === this.currentCategory);
    }

    random() {
        const list = this.getFilteredList();
        if (list.length === 0) return;
        const randItem = list[Math.floor(Math.random() * list.length)];
        this.currentIndex = vocabService.findIndexById(randItem.id);
        this.loadGame();
    }

    next(id = null) {
        if (id !== null) {
            const idx = vocabService.findIndexById(id);
            if (idx !== -1) this.currentIndex = idx;
        } else {
            const list = this.getFilteredList();
            const currentItem = vocabService.getAll()[this.currentIndex];
            let listIdx = list.findIndex(i => i.id === currentItem.id);
            listIdx = (listIdx + 1) % list.length;
            this.currentIndex = vocabService.findIndexById(list[listIdx].id);
        }
        this.loadGame();
    }

    prev() {
        const list = this.getFilteredList();
        const currentItem = vocabService.getAll()[this.currentIndex];
        let listIdx = list.findIndex(i => i.id === currentItem.id);
        listIdx = (listIdx - 1 + list.length) % list.length;
        this.currentIndex = vocabService.findIndexById(list[listIdx].id);
        this.loadGame();
    }

    gotoId(id) {
        const idx = vocabService.findIndexById(parseInt(id)); 
        if (idx !== -1) {
            this.currentIndex = idx;
            this.loadGame();
        } else {
            alert("ID not found");
        }
    }

    loadGame() {
        const list = vocabService.getAll();
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
        return map[settingsService.get().targetLang] || 'en-US';
    }

    toggleMic() {
        if (!this.supportSpeech) {
            alert("Speech recognition is not supported in this browser. Try Chrome or Edge.");
            return;
        }
        if (this.isListening) {
            this.recognition.stop();
        } else {
            this.recognition.lang = this.getLangCode();
            try {
                this.recognition.start();
            } catch(e) { console.error(e); }
        }
    }

    checkAnswer(transcript) {
        const target = this.currentData.front.main;
        const normalize = (str) => str.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()。、？！]/g,"").replace(/\s{2,}/g," ");
        const cleanTranscript = normalize(transcript);
        const cleanTarget = normalize(target);
        const isCorrect = cleanTranscript === cleanTarget || (cleanTarget.length > 5 && cleanTarget.includes(cleanTranscript));

        this.render(); 

        if (isCorrect) {
            scoreService.addScore('speech', 20);
            const box = this.container.querySelector('#speech-status-box');
            if(box) {
                box.classList.remove('opacity-0', 'bg-gray-100', 'dark:bg-gray-800');
                box.classList.add('bg-green-100', 'border-green-500', 'text-green-700');
            }
            setTimeout(() => this.next(), 1500);
        } else {
            const box = this.container.querySelector('#speech-status-box');
            if(box) {
                box.classList.remove('opacity-0');
                box.classList.add('bg-red-100', 'border-red-500', 'text-red-700', 'shake');
                setTimeout(() => box.classList.remove('shake'), 500);
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
        audioService.speak(this.currentData.front.main, settingsService.get().targetLang);
        // Visual feedback for click
        const box = this.container.querySelector('#speech-q-box');
        if(box) {
            box.classList.add('scale-95', 'ring-4', 'ring-indigo-200');
            setTimeout(() => box.classList.remove('scale-95', 'ring-4', 'ring-indigo-200'), 150);
        }
    }

    render() {
        if (!this.container) return;
        if (!this.supportSpeech) {
            this.container.innerHTML = `<div class="h-full flex items-center justify-center text-center p-6 text-gray-500">Your browser does not support Speech Recognition.<br>Please try Google Chrome or Safari.</div>`;
            return;
        }

        const { item } = { item: this.currentData };
        const meaning = item.back.main || item.back.definition;

        const pillsHtml = `
            <div class="w-full overflow-x-auto whitespace-nowrap px-4 pb-2 mb-2 flex gap-2 no-scrollbar">
                ${this.categories.map(cat => `
                    <button class="category-pill px-4 py-1 rounded-full text-sm font-bold border ${this.currentCategory === cat ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-white dark:bg-dark-card text-gray-500 border-gray-200 dark:border-gray-700'}" data-cat="${cat}">
                        ${cat}
                    </button>
                `).join('')}
            </div>
        `;

        this.container.innerHTML = `
            <div class="fixed top-0 left-0 right-0 h-16 z-40 px-4 flex justify-between items-center bg-gray-100/90 dark:bg-dark-bg/90 backdrop-blur-sm border-b border-white/10">
                <div class="flex items-center gap-2">
                    <div class="flex items-center bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-full pl-3 pr-1 py-1 shadow-sm">
                        <span class="text-xs font-bold text-gray-400 mr-2 uppercase">ID</span>
                        <input type="number" id="speech-id-input" value="${item.id}" class="w-12 bg-transparent text-sm font-bold text-gray-700 dark:text-white outline-none text-center appearance-none m-0 p-0">
                        <button id="speech-go-btn" class="ml-1 w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center hover:bg-indigo-200"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg></button>
                    </div>
                    <button class="game-edit-btn bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-full w-8 h-8 flex items-center justify-center shadow-sm text-gray-500 hover:text-indigo-500 active:scale-95 transition-all">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                    </button>
                    <button id="speech-random-btn" class="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-full w-8 h-8 flex items-center justify-center shadow-sm text-gray-500 hover:text-indigo-500 active:scale-95 transition-all">
                        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                    </button>
                </div>
                <div class="flex items-center gap-2">
                    <button id="score-pill" class="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-full px-3 py-1 flex items-center gap-2 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <span class="text-base">🏆</span>
                        <span class="font-black text-gray-700 dark:text-white text-sm global-score-display">${scoreService.todayScore}</span>
                    </button>
                    <button id="speech-close-btn" class="header-icon-btn bg-red-50 text-red-500 rounded-full shadow-sm"><svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
            </div>

            <div class="w-full h-full pt-20 pb-28 px-4 max-w-lg mx-auto flex flex-col gap-6 items-center">
                ${pillsHtml}
                
                <div id="speech-q-box" class="w-full bg-white dark:bg-dark-card p-6 rounded-3xl shadow-sm text-center border-2 border-indigo-100 hover:border-indigo-300 dark:border-dark-border cursor-pointer transition-all active:scale-95 flex flex-col items-center justify-center gap-2 select-none">
                    <span class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Tap to Listen</span>
                    <h2 class="text-4xl font-black text-gray-800 dark:text-white leading-tight" data-fit="true">${textService.smartWrap(item.front.main)}</h2>
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

            <div class="fixed bottom-0 left-0 right-0 p-4 z-40 bg-gradient-to-t from-gray-100 via-gray-100 to-transparent dark:from-dark-bg">
                <div class="max-w-lg mx-auto flex gap-4">
                    <button id="speech-prev-btn" class="flex-1 h-14 bg-white dark:bg-dark-card border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-95 transition-all">
                        <svg class="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg>
                    </button>
                    <button id="speech-next-btn" class="flex-1 h-14 bg-indigo-500 text-white rounded-2xl shadow-lg shadow-indigo-500/30 flex items-center justify-center font-bold tracking-wide active:scale-95 transition-all">
                        <svg class="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>
                    </button>
                </div>
            </div>
        `;

        window.speechApp = this;

        this.container.querySelector('#speech-close-btn').addEventListener('click', () => window.dispatchEvent(new CustomEvent('router:home')));
        this.container.querySelector('#speech-random-btn').addEventListener('click', () => this.random());
        this.container.querySelector('#speech-prev-btn').addEventListener('click', () => this.prev());
        this.container.querySelector('#speech-next-btn').addEventListener('click', () => this.next());
        
        this.container.querySelector('#mic-btn').addEventListener('click', () => this.toggleMic());
        this.container.querySelector('#speech-q-box').addEventListener('click', () => this.playHint());

        this.container.querySelectorAll('.category-pill').forEach(btn => {
            btn.addEventListener('click', (e) => this.setCategory(e.currentTarget.dataset.cat));
        });

        const idInput = this.container.querySelector('#speech-id-input');
        const goBtn = this.container.querySelector('#speech-go-btn');
        goBtn.addEventListener('click', () => this.gotoId(idInput.value));
        idInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') this.gotoId(idInput.value); });
        idInput.addEventListener('click', (e) => e.stopPropagation());

        requestAnimationFrame(() => {
            textService.fitText(this.container.querySelector('[data-fit="true"]'), 24, 70);
        });
    }
}
export const speechApp = new SpeechApp();

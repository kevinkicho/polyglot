import { vocabService } from '../services/vocabService';
import { settingsService } from '../services/settingsService';
import { audioService } from '../services/audioService';
import { textService } from '../services/textService';

export class FlashcardApp {
    constructor() {
        this.container = null;
        this.currentData = null;
        this.currentIndex = 0;
        this.isFlipped = false;
        this.history = [];
    }

    mount(elementId) {
        this.container = document.getElementById(elementId);
        const list = vocabService.getAll();
        if (list && list.length > 0) {
           this.currentIndex = vocabService.getRandomIndex();
        }
        this.render();
    }

    bind(selector, event, handler) {
        if (!this.container) return;
        const el = this.container.querySelector(selector);
        if (el) el.addEventListener(event, (e) => { e.stopPropagation(); handler(e); });
    }

    refresh() {
        this.render();
    }

    loadGame(index) {
        const list = vocabService.getAll();
        if (!list || list.length === 0) {
            this.currentData = null;
        } else {
            this.currentIndex = (index + list.length) % list.length;
            this.currentData = list[this.currentIndex];
            this.isFlipped = false;
            
            if (settingsService.get().autoPlay) {
                setTimeout(() => this.playAudio(), 500);
            }
        }
        this.render();
        if(this.currentData) window.saveGameHistory('flashcard', this.currentData.id);
    }

    next(id = null) {
        if (id !== null) {
             const idx = vocabService.findIndexById(id);
             if(idx !== -1) this.loadGame(idx);
        } else {
             if (this.currentData) this.history.push(this.currentIndex);
             this.loadGame(this.currentIndex + 1);
        }
    }

    prev() {
        if (this.history.length > 0) {
            this.loadGame(this.history.pop());
        } else {
            this.loadGame(this.currentIndex - 1);
        }
    }
    
    goto(id) {
      const idx = vocabService.findIndexById(parseInt(id));
      if(idx !== -1) this.loadGame(idx);
      else alert("ID not found / IDが見つかりません");
    }

    handleCardClick() {
        this.isFlipped = !this.isFlipped;
        this.render();
        
        if (!this.isFlipped) {
             this.playAudio();
        } 
        else if (settingsService.get().autoPlay && settingsService.get().waitForAudio) {
             this.playAudio();
        }
    }

    playAudio() {
        if (!this.currentData) return;
        const s = settingsService.get();
        const lang = this.isFlipped ? s.originLang : s.targetLang;
        const text = this.isFlipped 
            ? (this.currentData.back.main || this.currentData.back.definition) 
            : this.currentData.front.main;
            
        audioService.speak(text, lang);
    }

    render() {
        if (!this.container) return;
        
        if (!this.currentData) {
             const list = vocabService.getAll();
             if(list.length > 0) {
                 this.loadGame(this.currentIndex);
                 return; 
             }
            this.container.innerHTML = '<div class="flex items-center justify-center h-full text-gray-500">No vocabulary data available.</div>';
            return;
        }

        const { front, back, id } = this.currentData;
        const s = settingsService.get();

        this.container.innerHTML = `
            <div class="fixed top-0 left-0 right-0 h-16 z-40 px-4 flex justify-between items-center bg-gray-100/90 dark:bg-dark-bg/90 backdrop-blur-sm border-b border-white/10">
                <div class="flex items-center gap-2">
                    <div class="flex items-center bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-full pl-3 pr-1 py-1 shadow-sm">
                        <span class="bg-indigo-100 text-indigo-600 text-xs font-bold px-2 py-1 rounded-full mr-2">ID</span>
                        <input type="number" id="fc-id-input" value="${id}" class="w-12 bg-transparent text-sm font-bold text-gray-700 dark:text-white outline-none text-center appearance-none m-0 p-0">
                        <button id="fc-go-btn" class="ml-1 w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center hover:bg-indigo-200"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg></button>
                    </div>
                    <button class="game-edit-btn header-icon-btn bg-gray-200 dark:bg-gray-800 rounded-full text-gray-500 hover:text-indigo-600"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg></button>
                </div>
                <button id="fc-close-btn" class="header-icon-btn bg-red-50 text-red-500 rounded-full shadow-sm"><svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>

            <div class="w-full h-full pt-20 pb-28 px-6 flex flex-col items-center justify-center">
                <div class="w-full max-w-md aspect-[3/4] relative perspective group cursor-pointer" id="flashcard-container">
                    <div id="flashcard-card" class="card-inner w-full h-full duration-500 transform-style-3d relative ${this.isFlipped ? 'rotate-y-180' : ''}">
                        
                        <div class="card-face absolute inset-0 backface-hidden bg-white dark:bg-dark-card rounded-3xl shadow-2xl border border-gray-100 dark:border-dark-border flex flex-col justify-between p-6">
                            <div class="flex justify-between items-start">
                                <span class="inline-flex items-center rounded-md bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 text-xs font-bold text-indigo-700 dark:text-indigo-300 ring-1 ring-inset ring-indigo-700/10 uppercase tracking-wider">${s.targetLang}</span>
                                <button class="audio-btn p-2 text-gray-400 hover:text-indigo-500 transition-colors bg-gray-50 dark:bg-gray-800 rounded-full"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg></button>
                            </div>
                            
                            <div class="flex-grow flex flex-col items-center justify-center p-2 overflow-hidden">
                                <h2 class="fc-front-text font-black text-gray-800 dark:text-white text-center leading-tight whitespace-nowrap" data-fit="true">${textService.smartWrap(front.main)}</h2>
                                ${front.sub ? `<p class="fc-front-sub font-medium text-gray-500 dark:text-gray-400 mt-4 text-center whitespace-nowrap" data-fit="true">${front.sub}</p>` : ''}
                            </div>

                            <div class="text-center text-gray-400 text-sm font-bold uppercase tracking-widest">Tap to Flip</div>
                        </div>

                        <div class="card-face absolute inset-0 backface-hidden rotate-y-180 bg-gray-50 dark:bg-dark-bg rounded-3xl shadow-xl border border-gray-200 dark:border-dark-border flex flex-col p-8">
                             <div class="flex justify-between items-start mb-4">
                                <span class="inline-flex items-center rounded-md bg-purple-50 dark:bg-purple-900/30 px-2 py-1 text-xs font-bold text-purple-700 dark:text-purple-300 ring-1 ring-inset ring-purple-700/10 uppercase tracking-wider">${s.originLang}</span>
                                <button class="audio-btn p-2 text-gray-400 hover:text-purple-500 transition-colors bg-white dark:bg-dark-card rounded-full"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg></button>
                            </div>

                            <div class="flex-grow flex flex-col items-center justify-center text-center space-y-6 overflow-hidden">
                                <h2 class="fc-back-text font-black text-indigo-600 dark:text-indigo-400 leading-none whitespace-nowrap" data-fit="true">${textService.smartWrap(back.definition)}</h2>
                                
                                ${back.sentenceTarget && s.showSentence ? `
                                    <div class="w-full p-4 bg-white dark:bg-dark-card rounded-xl border border-gray-100 dark:border-dark-border">
                                        <p class="fc-back-sent text-gray-700 dark:text-white font-bold mb-2 leading-tight whitespace-nowrap" data-fit="true">${back.sentenceTarget}</p>
                                        ${back.sentenceOrigin && s.showEnglish ? `<p class="fc-back-sent-trans text-gray-500 dark:text-gray-400 font-medium leading-tight whitespace-nowrap" data-fit="true">${back.sentenceOrigin}</p>` : ''}
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="fixed bottom-0 left-0 right-0 p-4 z-40 bg-gradient-to-t from-gray-100 via-gray-100 to-transparent dark:from-dark-bg">
                <div class="max-w-lg mx-auto flex gap-4">
                    <button id="fc-prev-btn" class="flex-1 h-14 bg-white dark:bg-dark-card border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-95 transition-all">
                        <svg class="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg>
                    </button>
                    <button id="fc-next-btn" class="flex-1 h-14 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-600/30 flex items-center justify-center font-bold tracking-wide active:scale-95 transition-all">
                        <svg class="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>
                    </button>
                </div>
            </div>
        `;

        this.bind('#fc-close-btn', 'click', () => window.dispatchEvent(new CustomEvent('router:home')));
        this.bind('#flashcard-container', 'click', () => this.handleCardClick());
        this.bind('#fc-prev-btn', 'click', () => this.prev());
        this.bind('#fc-next-btn', 'click', () => this.next());
        
        this.container.querySelectorAll('.audio-btn').forEach(btn => 
            btn.addEventListener('click', (e) => { e.stopPropagation(); this.playAudio(); })
        );
        
        // Navigation Logic Binding
        const idInput = this.container.querySelector('#fc-id-input');
        if(idInput) {
            idInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') this.goto(idInput.value); });
            idInput.addEventListener('click', (e) => e.stopPropagation());
        }
        
        this.bind('#fc-go-btn', 'click', () => {
            const val = this.container.querySelector('#fc-id-input').value;
            this.goto(val);
        });

        requestAnimationFrame(() => {
            if (!this.container) return;
            textService.fitText(this.container.querySelector('.fc-front-text'), 32, 130, true);
            textService.fitText(this.container.querySelector('.fc-back-text'), 24, 90, true);
            this.container.querySelectorAll('.fc-front-sub').forEach(el => textService.fitText(el, 16, 36, true));
            this.container.querySelectorAll('.fc-back-sent').forEach(el => textService.fitText(el, 16, 30, true));
            this.container.querySelectorAll('.fc-back-sent-trans').forEach(el => textService.fitText(el, 14, 26, true));
        });
    }
}

export const flashcardApp = new FlashcardApp();

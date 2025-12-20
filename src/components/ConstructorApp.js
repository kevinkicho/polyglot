import { vocabService } from '../services/vocabService';
import { settingsService } from '../services/settingsService';
import { audioService } from '../services/audioService';
import { scoreService } from '../services/scoreService';
import { textService } from '../services/textService';

export class ConstructorApp {
    constructor() {
        this.container = null;
        this.currentData = null;
        this.currentIndex = 0;
        this.builtWord = []; 
        this.targetChars = []; 
        this.charPool = []; 
        this.isProcessing = false;
    }

    mount(elementId) {
        this.container = document.getElementById(elementId);
        this.random();
    }

    random() {
        this.currentIndex = vocabService.getRandomIndex();
        this.loadGame();
    }

    next(id = null) {
        this.isProcessing = false;
        if (id !== null) {
            const idx = vocabService.findIndexById(id);
            if (idx !== -1) this.currentIndex = idx;
        } else {
            const list = vocabService.getAll();
            this.currentIndex = (this.currentIndex + 1) % list.length;
        }
        this.loadGame();
    }

    prev() {
        this.isProcessing = false;
        const list = vocabService.getAll();
        if (!list.length) return;
        this.currentIndex = (this.currentIndex - 1 + list.length) % list.length;
        this.loadGame();
    }

    gotoId(id) {
        const idx = vocabService.findIndexById(id);
        if (idx !== -1) {
            this.currentIndex = idx;
            this.loadGame();
        } else {
            alert("ID not found");
        }
    }

    loadGame() {
        this.isProcessing = false;
        const list = vocabService.getAll();
        if (!list.length) return;
        const item = list[this.currentIndex];
        
        const targetWord = item.front.main; 
        const originMeaning = item.back.main || item.back.definition;

        this.targetChars = Array.from(targetWord.replace(/\s+/g, '')); 
        this.builtWord = [];
        
        this.charPool = [...this.targetChars]
            .map((char, i) => ({ char, id: i, used: false }))
            .sort(() => 0.5 - Math.random());

        this.currentData = { item, originMeaning };
        this.render();
    }

    handlePoolClick(idx) {
        if (this.isProcessing) return;
        const charObj = this.charPool[idx];
        if (charObj.used) return;

        // Audio for character
        if(settingsService.get().clickAudio || true) { // Always play on click as requested
            audioService.speak(charObj.char, settingsService.get().targetLang);
        }

        this.builtWord.push(charObj);
        charObj.used = true;
        this.render();
        this.checkWin();
    }

    handleBuiltClick(idx) {
        if (this.isProcessing) return;
        const charObj = this.builtWord[idx];
        charObj.used = false;
        this.builtWord.splice(idx, 1);
        this.render();
    }

    playHintAudio() {
        if (this.currentData && this.currentData.item) {
            audioService.speak(this.currentData.item.front.main, settingsService.get().targetLang);
        }
    }

    checkWin() {
        const currentString = this.builtWord.map(c => c.char).join('');
        const targetString = this.targetChars.join('');

        if (currentString === targetString) {
            this.isProcessing = true;
            scoreService.addScore('constructor', 10);
            
            if(settingsService.get().autoPlay) {
                audioService.speak(this.currentData.item.front.main, settingsService.get().targetLang);
            }

            const zone = this.container.querySelector('#constructor-slots');
            zone.classList.add('animate-celebrate', 'border-green-500', 'bg-green-50', 'dark:bg-green-900/20');

            setTimeout(() => this.next(), 1200);
        } else if (this.builtWord.length === this.targetChars.length) {
            const zone = this.container.querySelector('#constructor-slots');
            zone.classList.add('shake', 'border-red-500');
            setTimeout(() => {
                zone.classList.remove('shake', 'border-red-500');
            }, 500);
        }
    }

    render() {
        if (!this.container) return;
        const { item } = this.currentData;

        this.container.innerHTML = `
            <div class="fixed top-0 left-0 right-0 h-16 z-40 px-4 flex justify-between items-center bg-gray-100/90 dark:bg-dark-bg/90 backdrop-blur-sm border-b border-white/10">
                <div class="flex items-center gap-2">
                    <div class="flex items-center bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-full pl-3 pr-1 py-1 shadow-sm">
                        <span class="text-xs font-bold text-gray-400 mr-2 uppercase">ID</span>
                        <input type="number" id="cons-id-input" value="${item.id}" class="w-12 bg-transparent text-sm font-bold text-gray-700 dark:text-white outline-none text-center appearance-none m-0 p-0">
                        <button id="cons-go-btn" class="ml-1 w-6 h-6 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center hover:bg-emerald-200"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg></button>
                    </div>
                    <button id="cons-random-btn" class="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-full w-8 h-8 flex items-center justify-center shadow-sm text-gray-500 hover:text-emerald-500 active:scale-95 transition-all">
                        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                    </button>
                </div>

                <div class="flex items-center gap-2">
                    <button id="score-pill" class="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-full px-3 py-1 flex items-center gap-2 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <span class="text-base">🏆</span>
                        <span class="font-black text-gray-700 dark:text-white text-sm global-score-display">${scoreService.todayScore}</span>
                    </button>
                    <button id="constructor-close-btn" class="header-icon-btn bg-red-50 text-red-500 rounded-full shadow-sm"><svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
            </div>

            <div class="w-full h-full pt-20 pb-28 px-4 max-w-lg mx-auto flex flex-col gap-4">
                <div id="cons-question-box" class="bg-white dark:bg-dark-card p-6 rounded-3xl shadow-sm text-center border-2 border-gray-100 dark:border-dark-border cursor-pointer active:scale-95 transition-transform hover:border-emerald-200 group">
                    <div class="flex items-center justify-center gap-2 mb-2">
                        <span class="text-xs font-bold text-gray-400 uppercase tracking-widest">Construct</span>
                        <svg class="w-4 h-4 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                    </div>
                    <h2 class="text-2xl font-bold text-gray-800 dark:text-white" data-fit="true">${this.currentData.originMeaning}</h2>
                </div>

                <div id="constructor-slots" class="flex flex-wrap justify-center gap-2 min-h-[5rem] p-4 bg-gray-100 dark:bg-dark-bg/50 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 transition-all">
                    ${this.builtWord.map((c, i) => `
                        <button class="built-char w-10 h-12 bg-emerald-500 text-white rounded-lg font-bold text-xl shadow-[0_4px_0_rgb(6,95,70)] transform active:scale-95 active:shadow-none translate-y-0 active:translate-y-1 transition-all" data-index="${i}">${c.char}</button>
                    `).join('')}
                    ${this.builtWord.length === 0 ? '<span class="text-gray-400 text-sm self-center font-medium animate-pulse">Tap letters below</span>' : ''}
                </div>

                <div class="flex-1 overflow-y-auto custom-scrollbar">
                    <div class="grid grid-cols-5 gap-2 pb-4">
                        ${this.charPool.map((c, i) => `
                            <button class="pool-char w-full aspect-square bg-white dark:bg-dark-card border-2 border-gray-200 dark:border-gray-700 rounded-xl font-bold text-xl text-gray-700 dark:text-white shadow-sm hover:border-emerald-400 active:scale-95 transition-all flex items-center justify-center p-0 leading-none ${c.used ? 'opacity-20 pointer-events-none' : ''}" data-index="${i}">
                                ${c.char}
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>

            <div class="fixed bottom-0 left-0 right-0 p-4 z-40 bg-gradient-to-t from-gray-100 via-gray-100 to-transparent dark:from-dark-bg">
                <div class="max-w-lg mx-auto flex gap-4">
                    <button id="cons-prev-btn" class="flex-1 h-14 bg-white dark:bg-dark-card border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-95 transition-all">
                        <svg class="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg>
                    </button>
                    <button id="cons-next-btn" class="flex-1 h-14 bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-500/30 flex items-center justify-center font-bold tracking-wide active:scale-95 transition-all">
                        <svg class="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>
                    </button>
                </div>
            </div>
            <style>.shake{animation:shake 0.4s cubic-bezier(.36,.07,.19,.97) both}@keyframes shake{10%,90%{transform:translate3d(-1px,0,0)}20%,80%{transform:translate3d(2px,0,0)}30%,50%,70%{transform:translate3d(-4px,0,0)}40%,60%{transform:translate3d(4px,0,0)}}</style>
        `;

        this.container.querySelector('#constructor-close-btn').addEventListener('click', () => window.dispatchEvent(new CustomEvent('router:home')));
        this.container.querySelector('#cons-question-box').addEventListener('click', () => this.playHintAudio());
        this.container.querySelector('#cons-prev-btn').addEventListener('click', () => this.prev());
        this.container.querySelector('#cons-next-btn').addEventListener('click', () => this.next());
        this.container.querySelector('#cons-random-btn').addEventListener('click', () => this.random());
        
        const idInput = this.container.querySelector('#cons-id-input');
        const goBtn = this.container.querySelector('#cons-go-btn');
        goBtn.addEventListener('click', () => this.gotoId(idInput.value));
        idInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') this.gotoId(idInput.value); });

        this.container.querySelectorAll('.pool-char').forEach(btn => btn.addEventListener('click', (e) => this.handlePoolClick(parseInt(e.currentTarget.dataset.index))));
        this.container.querySelectorAll('.built-char').forEach(btn => btn.addEventListener('click', (e) => this.handleBuiltClick(parseInt(e.currentTarget.dataset.index))));
        
        requestAnimationFrame(() => {
            this.container.querySelectorAll('[data-fit="true"]').forEach(el => textService.fitText(el));
        });
    }
}
export const constructorApp = new ConstructorApp();

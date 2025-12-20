import { vocabService } from '../services/vocabService';
import { settingsService } from '../services/settingsService';
import { audioService } from '../services/audioService';
import { scoreService } from '../services/scoreService';
import { textService } from '../services/textService';

export class FinderApp {
    constructor() {
        this.container = null;
        this.currentData = null;
        this.isProcessing = false;
    }

    mount(elementId) {
        this.container = document.getElementById(elementId);
        this.random();
    }

    random() {
        const list = vocabService.getAll();
        if (!list || list.length < 9) { 
            if(this.container) this.container.innerHTML = `<div class="p-10 text-center">Not enough vocab (need 9+)</div>`;
            return;
        }
        
        // Pick target
        const target = list[Math.floor(Math.random() * list.length)];
        
        // Pick 8 distractors
        const others = list.filter(i => i.id !== target.id).sort(() => 0.5 - Math.random()).slice(0, 8);
        
        // Mix
        const choices = [target, ...others].sort(() => 0.5 - Math.random());
        
        this.currentData = { target, choices };
        this.isProcessing = false;
        this.render();
    }

    next(id = null) {
        this.isProcessing = false;
        this.random(); // Simple random for now, or implement seq logic like other apps
    }
    prev() { this.random(); }

    handleChoice(id, el) {
        if (this.isProcessing) return;
        
        // Play Audio on Click
        const chosen = this.currentData.choices.find(c => c.id === id);
        if (chosen) audioService.speak(chosen.front.main, settingsService.get().targetLang);

        if (id === this.currentData.target.id) {
            this.isProcessing = true;
            el.classList.remove('bg-white', 'dark:bg-dark-card');
            el.classList.add('bg-green-500', 'text-white', 'border-green-600');
            scoreService.addScore('finder', 10);
            setTimeout(() => this.random(), 1000);
        } else {
            el.classList.add('bg-red-100', 'dark:bg-red-900', 'shake');
            setTimeout(() => el.classList.remove('bg-red-100', 'dark:bg-red-900', 'shake'), 500);
        }
    }

    playHint() {
        // Speak Target Language if auto play
        audioService.speak(this.currentData.target.front.main, settingsService.get().targetLang);
    }

    render() {
        if (!this.container || !this.currentData) return;
        const { target, choices } = this.currentData;
        const prompt = target.back.main || target.back.definition;

        this.container.innerHTML = `
            <div class="fixed top-0 left-0 right-0 h-16 z-40 px-4 flex justify-between items-center bg-gray-100/90 dark:bg-dark-bg/90 backdrop-blur-sm border-b border-white/10">
                <div class="flex items-center gap-2">
                    <div class="text-xl font-black text-rose-500 tracking-tighter">FINDER</div>
                    <button class="game-edit-btn bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-full w-8 h-8 flex items-center justify-center shadow-sm text-gray-500 hover:text-rose-500 active:scale-95 transition-all">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                    </button>
                    <button id="find-random-btn" class="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-full w-8 h-8 flex items-center justify-center shadow-sm text-gray-500 hover:text-rose-500 active:scale-95 transition-all">
                        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                    </button>
                </div>
                <div class="flex items-center gap-2">
                    <button id="score-pill" class="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-full px-3 py-1 flex items-center gap-2 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <span class="text-base">🏆</span>
                        <span class="font-black text-gray-700 dark:text-white text-sm global-score-display">${scoreService.todayScore}</span>
                    </button>
                    <button id="find-close-btn" class="header-icon-btn bg-red-50 text-red-500 rounded-full shadow-sm"><svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
            </div>

            <div class="w-full h-full pt-20 pb-28 px-4 max-w-lg mx-auto flex flex-col gap-4">
                <div class="bg-white dark:bg-dark-card p-4 rounded-2xl shadow-sm text-center border-2 border-gray-100 dark:border-dark-border min-h-[4rem] flex items-center justify-center">
                    <h2 class="text-xl font-bold text-gray-800 dark:text-white leading-tight">${prompt}</h2>
                </div>

                <div class="grid grid-cols-3 gap-2 flex-1">
                    ${choices.map(c => `
                        <button class="find-choice bg-white dark:bg-dark-card border-2 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:border-rose-300 active:scale-95 transition-all p-0 flex items-center justify-center overflow-hidden" data-id="${c.id}">
                            <span class="find-text w-full text-center font-bold text-gray-700 dark:text-white leading-none">${c.front.main}</span>
                        </button>
                    `).join('')}
                </div>
            </div>

            <div class="fixed bottom-0 left-0 right-0 p-4 z-40 bg-gradient-to-t from-gray-100 via-gray-100 to-transparent dark:from-dark-bg">
                <div class="max-w-lg mx-auto flex gap-4">
                    <button id="find-prev-btn" class="flex-1 h-14 bg-white dark:bg-dark-card border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-95 transition-all">
                        <svg class="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg>
                    </button>
                    <button id="find-next-btn" class="flex-1 h-14 bg-rose-500 text-white rounded-2xl shadow-lg shadow-rose-500/30 flex items-center justify-center font-bold tracking-wide active:scale-95 transition-all">
                        <svg class="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>
                    </button>
                </div>
            </div>
        `;

        this.container.querySelector('#find-close-btn').addEventListener('click', () => window.dispatchEvent(new CustomEvent('router:home')));
        this.container.querySelector('#find-random-btn').addEventListener('click', () => this.random());
        this.container.querySelector('#find-prev-btn').addEventListener('click', () => this.prev());
        this.container.querySelector('#find-next-btn').addEventListener('click', () => this.next());
        
        this.container.querySelectorAll('.find-choice').forEach(btn => btn.addEventListener('click', (e) => this.handleChoice(parseInt(e.currentTarget.dataset.id), e.currentTarget)));
        
        requestAnimationFrame(() => textService.fitGroup(this.container.querySelectorAll('.find-text'), 14, 40));
    }
}
export const finderApp = new FinderApp();

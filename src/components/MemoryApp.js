import { vocabService } from '../services/vocabService';
import { settingsService } from '../services/settingsService';
import { audioService } from '../services/audioService';
import { scoreService } from '../services/scoreService';
import { textService } from '../services/textService';

export class MemoryApp {
    constructor() {
        this.container = null;
        this.cards = [];
        this.flippedIndices = [];
        this.isProcessing = false;
        this.matchesFound = 0;
    }

    mount(elementId) {
        this.container = document.getElementById(elementId);
        this.startNewGame();
    }

    startNewGame() {
        this.isProcessing = false;
        this.flippedIndices = [];
        this.matchesFound = 0;
        
        const allVocab = vocabService.getAll();
        if (allVocab.length < 6) {
            if(this.container) this.container.innerHTML = `<div class="p-10 text-center text-gray-500">Not enough vocabulary</div>`;
            return; 
        }

        const gameItems = [...allVocab].sort(() => 0.5 - Math.random()).slice(0, 6);
        
        let deck = [];
        gameItems.forEach(item => {
            deck.push({ id: item.id, type: 'target', text: item.front.main, pairId: item.id, matched: false });
            deck.push({ id: item.id, type: 'origin', text: item.back.main || item.back.definition, pairId: item.id, matched: false });
        });

        this.cards = deck.sort(() => 0.5 - Math.random());
        this.render();
    }

    async handleCardClick(idx) {
        if (this.isProcessing) return;
        if (this.cards[idx].matched) return;
        if (this.flippedIndices.includes(idx)) return; 

        this.flippedIndices.push(idx);
        this.render();

        if (settingsService.get().clickAudio !== false) {
            const c = this.cards[idx];
            const lang = c.type === 'target' ? settingsService.get().targetLang : settingsService.get().originLang;
            audioService.speak(c.text, lang);
        }

        if (this.flippedIndices.length === 2) {
            this.isProcessing = true;
            const idx1 = this.flippedIndices[0];
            const idx2 = this.flippedIndices[1];
            const c1 = this.cards[idx1];
            const c2 = this.cards[idx2];

            if (c1.pairId === c2.pairId) {
                c1.matched = true;
                c2.matched = true;
                this.matchesFound++;
                scoreService.addScore('memory', 10);
                this.flippedIndices = [];
                this.isProcessing = false;
                this.render();
                
                if (this.matchesFound === 6) {
                    setTimeout(() => this.startNewGame(), 1000);
                }
            } else {
                setTimeout(() => {
                    this.flippedIndices = [];
                    this.isProcessing = false;
                    this.render();
                }, 1000);
            }
        }
    }

    next() { this.startNewGame(); }
    prev() { this.startNewGame(); }

    render() {
        if (!this.container) return;
        
        const currentEditId = this.cards.length > 0 ? this.cards[0].pairId : 0;

        this.container.innerHTML = `
            <div class="fixed top-0 left-0 right-0 h-16 z-40 px-4 flex justify-between items-center bg-gray-100/90 dark:bg-dark-bg/90 backdrop-blur-sm border-b border-white/10">
                <div class="flex items-center gap-2">
                    <div class="text-xl font-black text-purple-500 tracking-tighter">MEMORY</div>
                    <button class="game-edit-btn bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-full w-8 h-8 flex items-center justify-center shadow-sm text-gray-500 hover:text-purple-500 active:scale-95 transition-all">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                    </button>
                    <button id="mem-random-btn" class="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-full w-8 h-8 flex items-center justify-center shadow-sm text-gray-500 hover:text-purple-500 active:scale-95 transition-all">
                        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                    </button>
                </div>
                <div class="flex items-center gap-2">
                    <button id="score-pill" class="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-full px-3 py-1 flex items-center gap-2 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <span class="text-base">🏆</span>
                        <span class="font-black text-gray-700 dark:text-white text-sm global-score-display">${scoreService.todayScore}</span>
                    </button>
                    <button id="mem-close-btn" class="header-icon-btn bg-red-50 text-red-500 rounded-full shadow-sm"><svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
            </div>

            <div class="w-full h-full pt-20 pb-4 px-4 max-w-lg mx-auto flex flex-col">
                <div class="grid grid-cols-3 grid-rows-4 gap-2 w-full h-full">
                    ${this.cards.map((c, i) => {
                        const isFlipped = this.flippedIndices.includes(i) || c.matched;
                        
                        const content = isFlipped 
                            ? `<div class="w-full h-full flex items-center justify-center rotate-y-180 p-1"><span class="card-text font-bold text-center leading-tight select-none w-full">${textService.smartWrap(c.text)}</span></div>` 
                            : ``;
                        
                        const bg = isFlipped 
                            ? (c.matched ? 'bg-green-100 dark:bg-green-900/30 border-green-300' : 'bg-white dark:bg-dark-card border-purple-300') 
                            : 'bg-gray-800 border-gray-600 dark:bg-gray-700'; 
                        const txt = isFlipped 
                            ? (c.matched ? 'text-green-700 dark:text-green-300' : 'text-gray-800 dark:text-white') 
                            : '';
                        
                        return `
                        <button class="mem-card relative w-full h-full ${bg} ${txt} border-2 rounded-xl shadow-sm flex items-center justify-center p-0 transition-all duration-300 transform ${isFlipped ? 'rotate-y-180' : ''} active:scale-95 overflow-hidden perspective" data-index="${i}">
                            ${content}
                        </button>
                    `}).join('')}
                </div>
            </div>
        `;

        this.container.querySelector('#mem-close-btn').addEventListener('click', () => window.dispatchEvent(new CustomEvent('router:home')));
        this.container.querySelector('#mem-random-btn').addEventListener('click', () => this.startNewGame());
        
        const editBtn = this.container.querySelector('.game-edit-btn');
        if(editBtn) {
            this.currentData = { item: { id: currentEditId } };
        }

        this.container.querySelectorAll('.mem-card').forEach(btn => btn.addEventListener('click', (e) => this.handleCardClick(parseInt(e.currentTarget.dataset.index))));
        
        // UPDATED: Use Individual fitText
        requestAnimationFrame(() => {
            if(!this.container) return;
            this.container.querySelectorAll('.card-text').forEach(el => textService.fitText(el, 16, 42));
        });
    }
}
export const memoryApp = new MemoryApp();

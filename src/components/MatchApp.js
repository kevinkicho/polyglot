import { vocabService } from '../services/vocabService';
import { settingsService } from '../services/settingsService';
import { audioService } from '../services/audioService';
import { scoreService } from '../services/scoreService';
import { textService } from '../services/textService';

export class MatchApp {
    constructor() {
        this.container = null;
        this.cards = [];
        this.selectedCard = null;
        this.isProcessing = false;
        this.matchesFound = 0;
    }

    mount(elementId) {
        this.container = document.getElementById(elementId);
        this.startNewGame();
    }

    startNewGame() {
        this.isProcessing = false;
        this.selectedCard = null;
        this.matchesFound = 0;
        
        const allVocab = vocabService.getAll();
        if (allVocab.length < 6) return; 

        const gameItems = [...allVocab].sort(() => 0.5 - Math.random()).slice(0, 6);
        
        let deck = [];
        gameItems.forEach(item => {
            deck.push({ id: item.id, type: 'target', text: item.front.main, pairId: item.id });
            deck.push({ id: item.id, type: 'origin', text: item.back.main || item.back.definition, pairId: item.id });
        });

        this.cards = deck.sort(() => 0.5 - Math.random());
        this.render();
    }

    async handleCardClick(idx, el) {
        if (this.isProcessing) return;
        const card = this.cards[idx];
        if (card.matched) return;

        if (settingsService.get().clickAudio !== false && card.text) {
            const lang = card.type === 'target' ? settingsService.get().targetLang : settingsService.get().originLang;
            audioService.speak(card.text, lang);
        }

        if (this.selectedCard && this.selectedCard.idx === idx) {
            el.classList.remove('ring-4', 'ring-indigo-400', 'scale-105', 'bg-indigo-50', 'dark:bg-indigo-900/30');
            this.selectedCard = null;
            return;
        }

        el.classList.add('ring-4', 'ring-indigo-400', 'scale-105', 'bg-indigo-50', 'dark:bg-indigo-900/30');

        if (!this.selectedCard) {
            this.selectedCard = { idx, ...card, el };
        } else {
            this.isProcessing = true;
            const first = this.selectedCard;
            
            if (first.pairId === card.pairId) {
                this.matchesFound++;
                scoreService.addScore('match', 10);
                
                first.el.classList.remove('ring-indigo-400'); el.classList.remove('ring-indigo-400');
                first.el.classList.add('animate-celebrate', 'border-green-500', 'text-green-600');
                el.classList.add('animate-celebrate', 'border-green-500', 'text-green-600');

                this.cards[first.idx].matched = true;
                this.cards[idx].matched = true;

                await new Promise(r => setTimeout(r, 600));
                first.el.classList.add('opacity-0', 'pointer-events-none');
                el.classList.add('opacity-0', 'pointer-events-none');
                
                this.selectedCard = null;
                this.isProcessing = false;
                if (this.matchesFound === 6) setTimeout(() => this.startNewGame(), 500);

            } else {
                first.el.classList.remove('ring-indigo-400'); el.classList.remove('ring-indigo-400');
                first.el.classList.add('bg-red-100', 'dark:bg-red-900/30', 'shake');
                el.classList.add('bg-red-100', 'dark:bg-red-900/30', 'shake');

                const partnerIdx = this.cards.findIndex(c => c.pairId === first.pairId && c.type !== first.type);
                if(partnerIdx !== -1) {
                    const partnerBtn = this.container.querySelector(`[data-index="${partnerIdx}"]`);
                    if(partnerBtn) partnerBtn.classList.add('ring-4', 'ring-yellow-400');
                }

                await new Promise(r => setTimeout(r, 800)); 
                
                first.el.classList.remove('ring-4', 'scale-105', 'bg-indigo-50', 'dark:bg-indigo-900/30', 'bg-red-100', 'dark:bg-red-900/30', 'shake');
                el.classList.remove('ring-4', 'scale-105', 'bg-indigo-50', 'dark:bg-indigo-900/30', 'bg-red-100', 'dark:bg-red-900/30', 'shake');
                
                if(partnerIdx !== -1) {
                    const partnerBtn = this.container.querySelector(`[data-index="${partnerIdx}"]`);
                    if(partnerBtn) partnerBtn.classList.remove('ring-4', 'ring-yellow-400');
                }

                this.selectedCard = null;
                this.isProcessing = false;
            }
        }
    }

    render() {
        if (!this.container) return;
        this.container.innerHTML = `
            <div class="fixed top-0 left-0 right-0 h-16 z-40 px-4 flex justify-between items-center bg-gray-100/90 dark:bg-dark-bg/90 backdrop-blur-sm border-b border-white/10">
                <div class="flex items-center gap-2">
                    <div class="text-xl font-black text-yellow-500 tracking-tighter">MATCH</div>
                    <button id="match-random-btn" class="ml-2 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-full w-8 h-8 flex items-center justify-center shadow-sm text-gray-500 hover:text-yellow-500 active:scale-95 transition-all">
                        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                    </button>
                </div>
                <div class="flex items-center gap-2">
                    <button id="score-pill" class="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-full px-3 py-1 flex items-center gap-2 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <span class="text-base">🏆</span>
                        <span class="font-black text-gray-700 dark:text-white text-sm global-score-display">${scoreService.todayScore}</span>
                    </button>
                    <button id="match-close-btn" class="header-icon-btn bg-red-50 text-red-500 rounded-full shadow-sm"><svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
            </div>
            <div class="w-full h-full pt-20 pb-10 px-4 max-w-lg mx-auto">
                <div class="grid grid-cols-3 gap-2 h-full content-center">
                    ${this.cards.map((c, i) => `
                        <button class="match-card relative w-full aspect-square bg-white dark:bg-dark-card border-2 border-gray-200 dark:border-dark-border rounded-xl shadow-sm flex items-center justify-center p-1 transition-all duration-200 overflow-hidden ${c.matched ? 'opacity-0 pointer-events-none' : 'hover:scale-105 active:scale-95'}" data-index="${i}">
                            <span class="card-text font-bold text-gray-700 dark:text-white text-center leading-tight w-full" style="white-space:normal">${textService.smartWrap(c.text)}</span>
                        </button>
                    `).join('')}
                </div>
            </div>
            <style>.shake{animation:shake 0.4s cubic-bezier(.36,.07,.19,.97) both}@keyframes shake{10%,90%{transform:translate3d(-1px,0,0)}20%,80%{transform:translate3d(2px,0,0)}30%,50%,70%{transform:translate3d(-4px,0,0)}40%,60%{transform:translate3d(4px,0,0)}}</style>
        `;
        this.container.querySelector('#match-close-btn').addEventListener('click', () => window.dispatchEvent(new CustomEvent('router:home')));
        this.container.querySelector('#match-random-btn').addEventListener('click', () => this.startNewGame());
        this.container.querySelectorAll('.match-card').forEach(btn => btn.addEventListener('click', (e) => this.handleCardClick(parseInt(e.currentTarget.dataset.index), e.currentTarget)));
        
        // UPDATED: Use Individual fitText
        requestAnimationFrame(() => {
            if(!this.container) return;
            this.container.querySelectorAll('.card-text').forEach(el => textService.fitText(el, 14, 60, false));
        });
    }
}
export const matchApp = new MatchApp();

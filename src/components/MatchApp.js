import { vocabService } from '../services/vocabService';
import { scoreService } from '../services/scoreService';
import { audioService } from '../services/audioService';
import { settingsService } from '../services/settingsService';
import { textService } from '../services/textService';
import { comboManager } from '../managers/ComboManager';

export class MatchApp {
    constructor() {
        this.container = null;
        this.cards = [];
        this.flippedCards = [];
        this.matchedCount = 0;
        this.isProcessing = false;
    }

    mount(elementId) {
        this.container = document.getElementById(elementId);
        this.startGame();
    }

    startGame() {
        this.isProcessing = false;
        this.flippedCards = [];
        this.matchedCount = 0;
        
        // Get 6 random items
        const all = vocabService.getAll();
        if (all.length < 6) {
            this.container.innerHTML = '<div class="p-10 text-center">Need more vocabulary to play Match (6+).</div>';
            return;
        }
        
        const items = [...all].sort(() => Math.random() - 0.5).slice(0, 6);
        
        // Create 12 cards (6 pairs)
        let deck = [];
        items.forEach(item => {
            // Card A: Front (Target Lang)
            deck.push({ 
                id: item.id, 
                type: 'front', 
                text: item.front.main, 
                pairId: item.id 
            });
            // Card B: Back (Native Lang)
            deck.push({ 
                id: item.id, 
                type: 'back', 
                text: item.back.definition, 
                pairId: item.id 
            });
        });
        
        // Shuffle deck
        deck.sort(() => Math.random() - 0.5);
        this.cards = deck;
        
        this.render();
    }

    handleCardClick(idx, el) {
        if (this.isProcessing) return;
        if (this.flippedCards.includes(idx)) return; // Already flipped
        if (el.classList.contains('matched')) return; // Already matched
        
        // Flip visual
        el.classList.add('bg-indigo-100', 'dark:bg-indigo-900', 'border-indigo-500', 'scale-105');
        el.classList.remove('bg-white', 'dark:bg-dark-card', 'border-gray-200');
        
        this.flippedCards.push(idx);
        
        const cardData = this.cards[idx];
        if (settingsService.get().clickAudio && cardData.type === 'front') {
            audioService.speak(cardData.text, settingsService.get().targetLang);
        }

        if (this.flippedCards.length === 2) {
            this.checkMatch();
        }
    }

    checkMatch() {
        this.isProcessing = true;
        const [idx1, idx2] = this.flippedCards;
        const card1 = this.cards[idx1];
        const card2 = this.cards[idx2];
        const el1 = this.container.querySelectorAll('.match-card')[idx1];
        const el2 = this.container.querySelectorAll('.match-card')[idx2];

        if (card1.pairId === card2.pairId) {
            // MATCH!
            setTimeout(() => {
                el1.classList.add('matched', 'opacity-0', 'pointer-events-none', 'transition-opacity', 'duration-500');
                el2.classList.add('matched', 'opacity-0', 'pointer-events-none', 'transition-opacity', 'duration-500');
                
                scoreService.addScore('match', 20);
                comboManager.increment(); // Streak Up
                
                this.matchedCount += 2;
                this.flippedCards = [];
                this.isProcessing = false;
                
                if (this.matchedCount === this.cards.length) {
                    setTimeout(() => this.startGame(), 800);
                }
            }, 500);
        } else {
            // MISMATCH
            setTimeout(() => {
                el1.classList.add('bg-red-100', 'shake');
                el2.classList.add('bg-red-100', 'shake');
                
                // FIX: Drop 1 Rank instead of Reset
                comboManager.dropRank();

                setTimeout(() => {
                    // Reset Styles
                    el1.className = 'match-card w-full h-24 bg-white dark:bg-dark-card border-2 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm flex items-center justify-center p-2 cursor-pointer transition-all';
                    el2.className = 'match-card w-full h-24 bg-white dark:bg-dark-card border-2 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm flex items-center justify-center p-2 cursor-pointer transition-all';
                    
                    this.flippedCards = [];
                    this.isProcessing = false;
                }, 800);
            }, 500);
        }
    }

    render() {
        if (!this.container) return;
        
        this.container.innerHTML = `
            <div class="fixed top-0 left-0 right-0 h-16 z-40 px-4 flex justify-between items-center bg-gray-100/90 dark:bg-dark-bg/90 backdrop-blur-sm border-b border-white/10">
                <div class="flex items-center gap-2">
                    <span class="text-xl">🎴</span>
                    <span class="font-bold text-gray-700 dark:text-white">Match</span>
                </div>
                <div class="flex items-center gap-2">
                    <button id="score-pill" class="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-full px-3 py-1 flex items-center gap-2 shadow-sm">
                        <span class="text-base">🏆</span>
                        <span class="font-black text-gray-700 dark:text-white text-sm global-score-display">${scoreService.todayScore}</span>
                    </button>
                    <button id="match-close-btn" class="header-icon-btn bg-red-50 text-red-500 rounded-full shadow-sm">
                        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                </div>
            </div>

            <div class="w-full h-full pt-20 pb-10 px-4 max-w-2xl mx-auto">
                <div class="grid grid-cols-3 gap-3">
                    ${this.cards.map((card, idx) => `
                        <div class="match-card w-full h-24 bg-white dark:bg-dark-card border-2 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm flex items-center justify-center p-2 cursor-pointer transition-all active:scale-95" data-idx="${idx}">
                            <span class="text-sm font-bold text-gray-700 dark:text-white text-center leading-tight pointer-events-none select-none">${textService.smartWrap(card.text)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        this.container.querySelector('#match-close-btn').addEventListener('click', () => {
            window.dispatchEvent(new CustomEvent('router:home'));
        });
        
        this.container.querySelectorAll('.match-card').forEach(el => {
            el.addEventListener('click', (e) => this.handleCardClick(parseInt(e.currentTarget.dataset.idx), e.currentTarget));
        });

        // Fit Text
        requestAnimationFrame(() => {
            this.container.querySelectorAll('.match-card span').forEach(span => {
                textService.fitText(span, 12, 20);
            });
        });
    }
}

export const matchApp = new MatchApp();

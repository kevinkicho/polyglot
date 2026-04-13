import { BaseGameComponent } from './BaseGameComponent';
import { comboManager } from '../managers/ComboManager';

export class MatchApp extends BaseGameComponent {
    constructor() {
        super();
        this.cards = [];
        this.flippedCards = [];
        this.matchedCount = 0;
    }

    mount(elementId) {
        super.mount(elementId);
        this.startGame();
    }

    startGame() {
        this.isProcessing = false;
        this.flippedCards = [];
        this.matchedCount = 0;

        const all = this.vocabService.getAll();
        if (all.length < 6) {
            this.renderError('Need more vocabulary to play Match (6+).', 'match');
            return;
        }

        const items = [...all].sort(() => Math.random() - 0.5).slice(0, 6);

        let deck = [];
        items.forEach(item => {
            deck.push({ id: item.id, type: 'front', text: item.front.main, pairId: item.id });
            deck.push({ id: item.id, type: 'back', text: item.back.definition, pairId: item.id });
        });

        deck.sort(() => Math.random() - 0.5);
        this.cards = deck;

        this.render();
    }

    next() { this.startGame(); }
    prev() { this.startGame(); }
    random() { this.startGame(); }

    handleCardClick(idx, el) {
        if (this.isProcessing) return;
        if (this.flippedCards.includes(idx)) return;
        if (el.classList.contains('matched')) return;

        el.classList.add('bg-indigo-100', 'dark:bg-indigo-900', 'border-indigo-500', 'scale-105');
        el.classList.remove('bg-white', 'dark:bg-dark-card', 'border-gray-200');

        this.flippedCards.push(idx);

        const cardData = this.cards[idx];
        if (this.settingsService.get().clickAudio && cardData.type === 'front') {
            this.audioService.speak(cardData.text, this.settingsService.get().targetLang);
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
            this.setTimeout(() => {
                el1.classList.add('matched', 'opacity-0', 'pointer-events-none', 'transition-opacity', 'duration-500');
                el2.classList.add('matched', 'opacity-0', 'pointer-events-none', 'transition-opacity', 'duration-500');

                this.scoreService.addScore('match', 20);
                comboManager.increment();

                this.matchedCount += 2;
                this.flippedCards = [];
                this.isProcessing = false;

                if (this.matchedCount === this.cards.length) {
                    this.setTimeout(() => this.startGame(), 800);
                }
            }, 500);
        } else {
            this.setTimeout(() => {
                el1.classList.add('bg-red-100', 'shake');
                el2.classList.add('bg-red-100', 'shake');

                comboManager.dropRank();

                this.setTimeout(() => {
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
            ${this.renderHeader({ prefix: 'match', title: 'Match', color: 'indigo', showId: false, showRandom: false, showEdit: false })}

            <div class="w-full h-full pt-20 pb-10 px-4 max-w-2xl mx-auto">
                <div class="grid grid-cols-3 gap-3">
                    ${this.cards.map((card, idx) => `
                        <div class="match-card w-full h-24 bg-white dark:bg-dark-card border-2 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm flex items-center justify-center p-2 cursor-pointer transition-all active:scale-95" data-idx="${idx}">
                            <span class="text-sm font-bold text-gray-700 dark:text-white text-center leading-tight pointer-events-none select-none">${this.textService.smartWrap(card.text)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        this.bindCommonEvents('match');

        this.container.querySelectorAll('.match-card').forEach(el => {
            el.addEventListener('click', (e) => this.handleCardClick(parseInt(e.currentTarget.dataset.idx), e.currentTarget));
        });

        this.raf(() => {
            if (!this.container) return;
            this.container.querySelectorAll('.match-card span').forEach(span => {
                this.textService.fitText(span, 12, 20);
            });
        });
    }
}

export const matchApp = new MatchApp();

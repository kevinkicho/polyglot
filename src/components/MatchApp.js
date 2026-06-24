import { BaseGameComponent } from './BaseGameComponent';
import { comboManager } from '../managers/ComboManager';
import { settingsService } from '../services/settingsService';
import { aiService } from '../services/aiService';
import { generateMatchPairs, getStrugglingWords } from '../services/aiContentService';
import { escapeHTML } from '../utils/sanitize';

export class MatchApp extends BaseGameComponent {
    constructor() {
        super();
        this.cards = [];
        this.flippedCards = [];
        this.matchedCount = 0;
        this._abortCtrl = null;
    }

    mount(elementId) {
        super.mount(elementId);
        this.startGame();
    }

    unmount() {
        this._abortCtrl?.abort();
        this._abortCtrl = null;
        super.unmount();
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

        if (aiService.isAvailable()) {
            this.loadAIGame(all);
        }
    }

    next() {
        this._abortCtrl?.abort();
        this._abortCtrl = null;
        this.startGame();
    }
    prev() {
        this._abortCtrl?.abort();
        this._abortCtrl = null;
        this.startGame();
    }
    random() {
        this._abortCtrl?.abort();
        this._abortCtrl = null;
        this.startGame();
    }

    async loadAIGame(all) {
        if (!all || all.length < 4) return;

        this._abortCtrl = new AbortController();
        const ctrl = this._abortCtrl;
        const timeout = setTimeout(() => ctrl.abort(), 15000);

        const struggling = getStrugglingWords(all);
        if (!struggling.length) {
            clearTimeout(timeout);
            this._abortCtrl = null;
            return;
        }

        const targetWord = struggling[Math.floor(Math.random() * struggling.length)];
        const s = this.settingsService.get();

        try {
            const result = await generateMatchPairs(targetWord, s.targetLang, {
                originLang: s.originLang,
                signal: ctrl.signal,
            });

            clearTimeout(timeout);

            if (this._abortCtrl !== ctrl) return;
            this._abortCtrl = null;

            if (!result || !result.pairs || result.pairs.length < 4) return;

            const pairs = result.pairs.slice(0, 6);
            const aiIdBase = Date.now();

            let deck = [];
            pairs.forEach((pair, i) => {
                const pairId = aiIdBase + i;
                deck.push({ id: pairId, type: 'front', text: pair.word, pairId: pairId, aiGenerated: true });
                deck.push({ id: pairId, type: 'back', text: pair.definition, pairId: pairId, aiGenerated: true });
            });

            if (pairs.length < 6) {
                const existingPairIds = new Set(pairs.map(p => p.word.toLowerCase()));
                const localItems = all
                    .filter(item => item.front?.main && item.back?.definition && !existingPairIds.has(item.front.main.toLowerCase()))
                    .sort(() => Math.random() - 0.5);
                let localIdx = 0;
                while (deck.length / 2 < 6 && localIdx < localItems.length) {
                    const item = localItems[localIdx++];
                    const pairId = aiIdBase + pairs.length + (deck.length / 2 - pairs.length);
                    deck.push({ id: item.id, type: 'front', text: item.front.main, pairId: item.id });
                    deck.push({ id: item.id, type: 'back', text: item.back.definition, pairId: item.id });
                }
            }

            deck.sort(() => Math.random() - 0.5);

            if (this.isProcessing) return;

            this.flippedCards = [];
            this.matchedCount = 0;
            this.cards = deck;
            this.render();
        } catch (err) {
            clearTimeout(timeout);
            this._abortCtrl = null;
        }
    }

    handleCardClick(idx, el) {
        if (this.isProcessing) return;
        if (this.flippedCards.includes(idx)) return;
        if (el.classList.contains('matched')) return;

        el.classList.add('bg-indigo-100', 'dark:bg-indigo-900', 'border-indigo-500', 'scale-105');
        el.classList.remove('bg-white', 'dark:bg-dark-card', 'border-gray-200', 'dark:border-gray-700');

        this.flippedCards.push(idx);

        const cardData = this.cards[idx];
        if (this.settingsService.get().clickAudio && cardData.type === 'front') {
            this.audioService.speak(cardData.text, this.settingsService.get().targetLang);
        }

        if (this.flippedCards.length === 2) {
            this.checkMatch();
        }
    }

    _resetCard(el) {
        el.classList.remove('bg-indigo-100', 'dark:bg-indigo-900', 'border-indigo-500', 'scale-105', 'bg-red-100', 'dark:bg-red-900/30', 'shake');
        el.classList.add('bg-white', 'dark:bg-dark-card', 'border-gray-200', 'dark:border-gray-700');
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
                if (settingsService.get().comboEffects !== false) comboManager.increment();

                this.matchedCount += 2;
                this.flippedCards = [];
                this.isProcessing = false;

                if (this.matchedCount === this.cards.length) {
                    this.setTimeout(() => this.startGame(), 800);
                }
            }, 500);
        } else {
            this.setTimeout(() => {
                el1.classList.add('bg-red-100', 'dark:bg-red-900/30', 'shake');
                el2.classList.add('bg-red-100', 'dark:bg-red-900/30', 'shake');

                if (settingsService.get().comboEffects !== false) comboManager.dropRank();

                this.setTimeout(() => {
                    this._resetCard(el1);
                    this._resetCard(el2);

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

            <div class="w-full h-full pt-[4.5rem] landscape:pt-[4rem] pb-3 landscape:pb-1 px-3 max-w-2xl md:max-w-4xl mx-auto flex flex-col overflow-hidden">
                <div class="grid grid-cols-3 grid-rows-4 landscape:grid-cols-4 landscape:grid-rows-3 gap-2 landscape:gap-2.5 md:gap-3 w-full flex-1 min-h-0">
                    ${this.cards.map((card, idx) => `
                        <div class="match-card w-full h-full min-h-0 bg-white dark:bg-dark-card border-2 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm flex items-center justify-center p-1 cursor-pointer transition-all active:scale-95 overflow-hidden" data-idx="${idx}">
                            <span class="match-text font-bold text-gray-700 dark:text-white text-center leading-tight pointer-events-none select-none w-full">${card.aiGenerated ? escapeHTML(card.text) : this.textService.smartWrap(card.text)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        this.bindCommonEvents('match');

        this.container.querySelectorAll('.match-card').forEach(el => {
            el.addEventListener('click', (e) => this.handleCardClick(parseInt(e.currentTarget.dataset.idx), e.currentTarget));
        });

        this.fitTexts([
            ['.match-text', 14, 48]
        ]);
    }
}

export const matchApp = new MatchApp();
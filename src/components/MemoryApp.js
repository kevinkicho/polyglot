import { BaseGameComponent } from './BaseGameComponent';
import { aiService } from '../services/aiService';
import { generateMemoryPairs, getStrugglingWords } from '../services/aiContentService';
import { escapeHTML } from '../utils/sanitize';

export class MemoryApp extends BaseGameComponent {
    constructor() {
        super();
        this.cards = [];
        this.flippedIndices = [];
        this.matchesFound = 0;
        this._abortCtrl = null;
    }

    mount(elementId) {
        super.mount(elementId);
        this.startNewGame();
    }

    unmount() {
        this._abortCtrl?.abort();
        this._abortCtrl = null;
        super.unmount();
    }

    startNewGame() {
        this.isProcessing = false;
        this.flippedIndices = [];
        this.matchesFound = 0;

        const list = this.getFilteredList();
        if (list.length < 6) {
            this.renderError('Not enough vocabulary for this category (need 6+)', 'mem');
            return;
        }

        const gameItems = [...list].sort(() => 0.5 - Math.random()).slice(0, 6);

        let deck = [];
        gameItems.forEach(item => {
            deck.push({ id: item.id, type: 'target', text: item.front.main, pairId: item.id, matched: false });
            deck.push({ id: item.id, type: 'origin', text: item.back.main || item.back.definition, pairId: item.id, matched: false });
        });

        this.cards = deck.sort(() => 0.5 - Math.random());
        this.render();

        if (aiService.isAvailable()) {
            this.loadAIGame(list);
        }
    }

    next() {
        this._abortCtrl?.abort();
        this._abortCtrl = null;
        this.startNewGame();
    }
    prev() {
        this._abortCtrl?.abort();
        this._abortCtrl = null;
        this.startNewGame();
    }
    random() {
        this._abortCtrl?.abort();
        this._abortCtrl = null;
        this.startNewGame();
    }

    async loadAIGame(list) {
        if (!list || list.length < 4) return;

        this._abortCtrl = new AbortController();
        const ctrl = this._abortCtrl;
        const timeout = setTimeout(() => ctrl.abort(), 15000);

        const struggling = getStrugglingWords(list);
        if (!struggling.length) {
            clearTimeout(timeout);
            this._abortCtrl = null;
            return;
        }

        const targetWord = struggling[Math.floor(Math.random() * struggling.length)];
        const s = this.settingsService.get();

        try {
            const result = await generateMemoryPairs(targetWord, s.targetLang, {
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
                deck.push({ id: pairId, type: 'target', text: pair.word, pairId: pairId, matched: false, aiGenerated: true });
                deck.push({ id: pairId, type: 'origin', text: pair.translation, pairId: pairId, matched: false, aiGenerated: true });
            });

            if (pairs.length < 6) {
                const existingWords = new Set(pairs.map(p => p.word.toLowerCase()));
                const localItems = list
                    .filter(item => item.front?.main && !existingWords.has(item.front.main.toLowerCase()))
                    .sort(() => Math.random() - 0.5);
                let localIdx = 0;
                while (deck.length / 2 < 6 && localIdx < localItems.length) {
                    const item = localItems[localIdx++];
                    deck.push({ id: item.id, type: 'target', text: item.front.main, pairId: item.id, matched: false });
                    deck.push({ id: item.id, type: 'origin', text: item.back.main || item.back.definition, pairId: item.id, matched: false });
                }
            }

            deck.sort(() => 0.5 - Math.random());

            if (this.isProcessing) return;

            this.flippedIndices = [];
            this.matchesFound = 0;
            this.cards = deck;
            this.render();
        } catch (err) {
            clearTimeout(timeout);
            this._abortCtrl = null;
        }
    }

    setCategory(cat) {
        this.currentCategory = cat;
        this.startNewGame();
    }

    async handleCardClick(idx) {
        if (this.isProcessing) return;
        if (this.cards[idx].matched) return;
        if (this.flippedIndices.includes(idx)) return;

        this.flippedIndices.push(idx);
        this.render();

        if (this.settingsService.get().clickAudio !== false) {
            const c = this.cards[idx];
            if (c.type === 'target') {
                this.audioService.speak(c.text, this.settingsService.get().targetLang);
            }
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
                this.scoreService.addScore('memory', 10);
                this.flippedIndices = [];
                this.isProcessing = false;
                this.render();

                if (this.matchesFound === 6) {
                    this.setTimeout(() => this.startNewGame(), 1000);
                }
            } else {
                this.setTimeout(() => {
                    this.flippedIndices = [];
                    this.isProcessing = false;
                    this.render();
                }, 1000);
            }
        }
    }

    render() {
        if (!this.container) return;

        const currentEditId = this.cards.length > 0 ? this.cards[0].pairId : 0;

        this.container.innerHTML = `
            ${this.renderHeader({ prefix: 'mem', title: 'MEMORY', color: 'purple', showRandom: true, showId: false })}

            <div class="w-full h-full pt-[4.5rem] landscape:pt-[4rem] pb-3 landscape:pb-1 px-3 max-w-2xl md:max-w-4xl mx-auto flex flex-col overflow-hidden">
                ${this.renderCategoryPills({ color: 'purple' })}
                <div class="grid grid-cols-3 grid-rows-4 landscape:grid-cols-4 landscape:grid-rows-3 gap-2 landscape:gap-2.5 md:gap-3 w-full flex-1 min-h-0">
                    ${this.cards.map((c, i) => {
                        const isFlipped = this.flippedIndices.includes(i) || c.matched;

                        const content = isFlipped
                            ? `<div class="w-full h-full flex items-center justify-center rotate-y-180 p-1"><span class="card-text font-bold text-center leading-tight select-none w-full">${c.aiGenerated ? escapeHTML(c.text) : this.textService.smartWrap(c.text)}</span></div>`
                            : ``;

                        const bg = isFlipped
                            ? (c.matched ? 'bg-green-100 dark:bg-green-900/30 border-green-300' : 'bg-white dark:bg-dark-card border-purple-300')
                            : 'bg-gray-800 border-gray-600 dark:bg-gray-700';
                        const txt = isFlipped
                            ? (c.matched ? 'text-green-700 dark:text-green-300' : 'text-gray-800 dark:text-white')
                            : '';

                        return `
                        <button class="mem-card relative w-full h-full min-h-0 ${bg} ${txt} border-2 rounded-xl shadow-sm flex items-center justify-center p-0 transition-all duration-300 transform ${isFlipped ? 'rotate-y-180' : ''} active:scale-95 overflow-hidden perspective" data-index="${i}">
                            ${content}
                        </button>
                    `;
                    }).join('')}
                </div>
            </div>
        `;

        this.bindCommonEvents('mem');

        const editBtn = this.container.querySelector('.game-edit-btn');
        if (editBtn) {
            this.currentData = { item: { id: currentEditId } };
        }

        this.container.querySelectorAll('.mem-card').forEach(btn => btn.addEventListener('click', (e) => this.handleCardClick(parseInt(e.currentTarget.dataset.index))));

        this.fitTexts([
            ['.card-text', 16, 42]
        ]);
    }
}
export const memoryApp = new MemoryApp();
import { BaseGameComponent } from './BaseGameComponent';

export class MemoryApp extends BaseGameComponent {
    constructor() {
        super();
        this.cards = [];
        this.flippedIndices = [];
        this.matchesFound = 0;
    }

    mount(elementId) {
        super.mount(elementId);
        this.startNewGame();
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

    next() { this.startNewGame(); }
    prev() { this.startNewGame(); }
    random() { this.startNewGame(); }

    render() {
        if (!this.container) return;

        const currentEditId = this.cards.length > 0 ? this.cards[0].pairId : 0;

        this.container.innerHTML = `
            ${this.renderHeader({ prefix: 'mem', title: 'MEMORY', color: 'purple', showRandom: true, showId: false })}

            <div class="w-full h-full pt-20 pb-4 px-4 max-w-lg mx-auto flex flex-col">
                ${this.renderCategoryPills({ color: 'purple' })}
                <div class="grid grid-cols-3 grid-rows-4 gap-2 w-full h-full">
                    ${this.cards.map((c, i) => {
                        const isFlipped = this.flippedIndices.includes(i) || c.matched;

                        const content = isFlipped
                            ? `<div class="w-full h-full flex items-center justify-center rotate-y-180 p-1"><span class="card-text font-bold text-center leading-tight select-none w-full">${this.textService.smartWrap(c.text)}</span></div>`
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

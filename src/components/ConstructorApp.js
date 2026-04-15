import { BaseGameComponent } from './BaseGameComponent';

export class ConstructorApp extends BaseGameComponent {
    constructor() {
        super();
        this.builtChars = [];
        this.charPool = [];
    }

    mount(elementId) {
        super.mount(elementId);
        this.random();
    }

    loadGame() {
        this.isProcessing = false;
        const list = this.vocabService.getAll();
        if (!list.length) return;
        const item = list[this.currentIndex];

        let targetText = item.front.main;
        const separatorRegex = /[\/·・･,、。.\s]+/;
        const variations = targetText.split(separatorRegex).filter(v => v.trim().length > 0);

        let selectedVariation = targetText;
        if (variations.length > 0) {
            selectedVariation = variations[Math.floor(Math.random() * variations.length)];
        }

        const forbiddenChars = /[\/·・･,、。.\s\t\n]/;
        const chars = selectedVariation.split('').filter(c => !forbiddenChars.test(c));
        const cleanTargetWord = chars.join('');

        this.charPool = chars.map((char, i) => ({ char, id: i, used: false })).sort(() => 0.5 - Math.random());
        this.builtChars = [];
        this.currentData = { item, chars, targetWord: cleanTargetWord, displayWord: selectedVariation };

        this.render();
    }

    handlePoolClick(poolIdx) {
        if (this.isProcessing) return;
        const c = this.charPool[poolIdx];
        if (c.used) return;

        if (this.settingsService.get().clickAudio !== false) {
            this.audioService.speak(c.char, this.settingsService.get().targetLang);
        }

        this.builtChars.push(poolIdx);
        c.used = true;

        this.updateTileState(poolIdx, true);
        this.updateSlots();
        this.checkWin();
    }

    handleBuiltClick(builtPos) {
        if (this.isProcessing) return;
        const poolIdx = this.builtChars[builtPos];

        this.charPool[poolIdx].used = false;
        this.builtChars.splice(builtPos, 1);

        this.updateTileState(poolIdx, false);
        this.updateSlots();
    }

    updateTileState(poolIdx, isUsed) {
        if (!this.container) return;
        const btn = this.container.querySelector(`.choice-tile[data-index="${poolIdx}"]`);
        if (btn) {
            if (isUsed) btn.classList.add('opacity-20', 'pointer-events-none');
            else btn.classList.remove('opacity-20', 'pointer-events-none');
        }
    }

    updateSlots() {
        const slotsContainer = this.container ? this.container.querySelector('#const-slots') : null;
        if (!slotsContainer) return;

        if (this.builtChars.length === 0) {
            slotsContainer.innerHTML = '<span class="text-gray-400 text-sm self-center font-medium animate-pulse w-full text-center">Tap words below</span>';
        } else {
            slotsContainer.innerHTML = this.builtChars.map((poolIdx, i) => `
                <button class="bg-emerald-500 text-white rounded-lg px-4 py-2 font-black text-xl shadow-md active:scale-95 min-w-[3rem]" data-pos="${i}">${this.charPool[poolIdx].char}</button>
            `).join('');

            slotsContainer.querySelectorAll('[data-pos]').forEach(btn =>
                btn.addEventListener('click', (e) => this.handleBuiltClick(parseInt(e.currentTarget.dataset.pos)))
            );
        }
    }

    checkWin() {
        const currentStr = this.builtChars.map(idx => this.charPool[idx].char).join('');
        if (currentStr === this.currentData.targetWord) {
            this.isProcessing = true;
            this.recordAnswer(this.currentData.item.id, true);
            this.scoreService.addScore('constructor', 10);
            if (this.settingsService.get().autoPlay) {
                this.audioService.speak(this.currentData.displayWord, this.settingsService.get().targetLang);
            }
            const zone = this.container.querySelector('#const-slots');
            if (zone) zone.classList.add('animate-celebrate', 'border-green-500', 'bg-green-50', 'dark:bg-green-900/20');
            this.setTimeout(() => this.transitionTo(() => this.next()), 1000);
        }
    }

    playHint() {
        this.audioService.speak(this.currentData.displayWord, this.settingsService.get().targetLang);
    }

    render() {
        if (!this.container) return;
        const { item } = this.currentData;
        const originText = item.back.main || item.back.definition;

        const charCount = this.charPool.length;
        const gridCols = Math.max(4, Math.ceil(charCount / 2.2));

        let scrollPos = 0;
        const scrollContainer = this.container.querySelector('.flex-1.overflow-y-auto');
        if (scrollContainer) scrollPos = scrollContainer.scrollTop;

        this.container.innerHTML = `
            ${this.renderHeader({ prefix: 'const', id: item.id, color: 'emerald', showRandom: true })}

            <div class="w-full h-full pt-20 landscape:pt-12 pb-28 landscape:pb-14 px-4 landscape:px-3 max-w-6xl mx-auto flex flex-col gap-6 landscape:gap-2">
                ${this.renderCategoryPills({ color: 'emerald' })}
                ${this.renderSplitLayout(
                    `<div id="const-question-box" class="bg-white dark:bg-dark-card p-4 landscape:p-2 rounded-3xl landscape:rounded-2xl shadow-sm border-2 border-gray-100 dark:border-dark-border cursor-pointer active:scale-95 transition-transform hover:border-emerald-200 group flex flex-col h-32 landscape:h-auto landscape:flex-none justify-center items-center">
                        <span class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 opacity-20">Build</span>
                        <h2 class="font-bold text-gray-800 dark:text-white w-full text-center flex-1 flex items-center justify-center whitespace-nowrap" data-fit="true">${this.textService.smartWrap(originText)}</h2>
                    </div>
                    <div id="const-slots" class="flex flex-wrap justify-center gap-2 landscape:gap-1 min-h-[4rem] landscape:min-h-[3rem] p-3 landscape:p-2 bg-gray-100 dark:bg-dark-bg/50 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 transition-all flex-1">
                    </div>`,
                    `<div class="flex-1 overflow-y-auto custom-scrollbar min-h-0">
                        <div class="grid gap-1 pb-4 landscape:pb-1 content-start" style="grid-template-columns: repeat(${gridCols}, minmax(0, 1fr))">
                            ${this.charPool.map((c, i) => `
                                <button class="choice-tile bg-white dark:bg-dark-card border-2 border-gray-200 dark:border-gray-700 rounded-xl aspect-square font-black text-gray-700 dark:text-white shadow-sm hover:border-emerald-400 active:scale-95 transition-all p-0 flex items-center justify-center overflow-hidden ${c.used ? 'opacity-20 pointer-events-none' : ''}" data-index="${i}">
                                    <span class="tile-text w-full text-center leading-none whitespace-nowrap">${c.char}</span>
                                </button>
                            `).join('')}
                        </div>
                    </div>`
                )}
            </div>

            ${this.renderFooter({ prefix: 'const', color: 'emerald' })}
        `;

        this.bindCommonEvents('const');
        this.bind('#const-question-box', 'click', () => this.playHint());
        this.container.querySelectorAll('.choice-tile').forEach(btn => btn.addEventListener('click', (e) => this.handlePoolClick(parseInt(e.currentTarget.dataset.index))));

        this.updateSlots();

        const newScrollContainer = this.container.querySelector('.flex-1.overflow-y-auto');
        if (newScrollContainer && scrollPos) newScrollContainer.scrollTop = scrollPos;

        this.fitTexts([
            ['[data-fit="true"]', 20, 60],
            ['.tile-text', 28, 64]
        ]);
    }
}
export const constructorApp = new ConstructorApp();

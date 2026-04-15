import { BaseGameComponent } from './BaseGameComponent';

export class SentencesApp extends BaseGameComponent {
    constructor() {
        super();
        this.builtIndices = [];
        this.wordPool = [];
    }

    mount(elementId) {
        super.mount(elementId);
        this.random();
    }

    random() {
        this.currentIndex = this.vocabService.getRandomIndex();
        this.loadGame();
    }

    next(id = null) {
        this.isProcessing = false;
        if (id !== null) {
            const idx = this.vocabService.findIndexById(id);
            if (idx !== -1) this.currentIndex = idx;
        } else {
            const list = this.vocabService.getAll();
            this.currentIndex = (this.currentIndex + 1) % list.length;
        }
        this.loadGame();
    }

    prev() {
        const list = this.vocabService.getAll();
        this.currentIndex = (this.currentIndex - 1 + list.length) % list.length;
        this.loadGame();
    }

    loadGame() {
        this.isProcessing = false;
        const list = this.vocabService.getAll();
        if (!list.length) return;
        const item = list[this.currentIndex];

        let sentence = item.back.sentenceTarget || item.front.main;

        let parts;
        if (this.settingsService.get().targetLang === 'ja') {
            parts = this.textService.tokenizeJapanese(sentence);
        } else {
            parts = sentence.split(/([\s,.!?、。]+)/).filter(s => s.trim().length > 0);
        }

        parts = parts.filter(p => !/^[\.,、。!?]+$/.test(p.trim()));

        this.wordPool = parts.map((word, i) => ({ word, id: i, used: false })).sort(() => 0.5 - Math.random());
        this.builtIndices = [];
        this.currentData = { item, parts, sentence };
        this.render();
    }

    handlePoolClick(poolIdx) {
        if (this.isProcessing) return;
        const w = this.wordPool[poolIdx];
        if (w.used) return;

        if (this.settingsService.get().sentencesWordAudio) {
            this.audioService.speak(w.word, this.settingsService.get().targetLang);
        }

        this.builtIndices.push(poolIdx);
        w.used = true;

        this.updateTileVisuals(poolIdx, true);
        this.updateSlots();
        this.checkWin();
    }

    handleBuiltClick(builtPos) {
        if (this.isProcessing) return;
        const poolIdx = this.builtIndices[builtPos];

        this.wordPool[poolIdx].used = false;
        this.builtIndices.splice(builtPos, 1);

        this.updateTileVisuals(poolIdx, false);
        this.updateSlots();
    }

    updateTileVisuals(poolIdx, isUsed) {
        if (!this.container) return;
        const btn = this.container.querySelector(`button[data-index="${poolIdx}"]`);
        if (btn) {
            if (isUsed) btn.classList.add('opacity-20', 'pointer-events-none');
            else btn.classList.remove('opacity-20', 'pointer-events-none');
        }
    }

    updateSlots() {
        const slotContainer = this.container ? this.container.querySelector('#sent-slots') : null;
        if (!slotContainer) return;

        if (this.builtIndices.length === 0) {
            slotContainer.innerHTML = '<span class="text-gray-400 text-sm self-center font-medium animate-pulse w-full text-center">Tap words below</span>';
        } else {
            const isLong = this.wordPool.length > 10;
            const sizeClass = isLong ? 'text-lg px-2 py-1' : 'text-xl px-3 py-2';

            slotContainer.innerHTML = this.builtIndices.map((poolIdx, i) => `
                <button class="bg-pink-500 text-white rounded-lg font-bold shadow-md active:scale-95 whitespace-nowrap ${sizeClass}" data-pos="${i}">${this.wordPool[poolIdx].word}</button>
            `).join('');

            slotContainer.querySelectorAll('[data-pos]').forEach(btn =>
                btn.addEventListener('click', (e) => this.handleBuiltClick(parseInt(e.currentTarget.dataset.pos)))
            );
        }
    }

    async checkWin() {
        const currentStr = this.builtIndices.map(idx => this.wordPool[idx].word).join('');
        const targetStr = this.currentData.parts.join('');

        const clean = (s) => s.replace(/[\s\.,、。!?]/g, '');

        if (clean(currentStr) === clean(targetStr)) {
            this.isProcessing = true;
            this.scoreService.addScore('sentences', 10);

            if (this.settingsService.get().autoPlay) {
                await this.audioService.speak(this.currentData.sentence, this.settingsService.get().targetLang);
            }

            const zone = this.container.querySelector('#sent-slots');
            if (this.settingsService.get().sentencesWinAnim) {
                if (zone) zone.classList.add('animate-celebrate', 'border-green-500', 'bg-green-50', 'dark:bg-green-900/20');
            }
            this.setTimeout(() => this.transitionTo(() => this.next()), 500);
        }
    }

    playHint() {
        this.audioService.speak(this.currentData.sentence, this.settingsService.get().targetLang);
    }

    render() {
        if (!this.container) return;
        const { item } = this.currentData;
        const originText = item.back.sentenceOrigin || item.back.main || item.back.definition;

        const count = this.wordPool.length;
        let btnHeight = 'min-h-[5rem]';
        let textSize = 'text-3xl';
        let padding = 'px-4 py-3';

        if (count > 12) { btnHeight = 'min-h-[3rem]'; textSize = 'text-lg'; padding = 'px-2 py-1'; }
        else if (count > 8) { btnHeight = 'min-h-[4rem]'; textSize = 'text-2xl'; padding = 'px-3 py-2'; }

        this.container.innerHTML = `
            ${this.renderHeader({ prefix: 'sent', id: item.id, color: 'pink', showRandom: true })}

            <div class="w-full h-full pt-20 landscape:pt-12 pb-28 landscape:pb-14 px-4 landscape:px-3 max-w-6xl mx-auto flex flex-col gap-4 landscape:gap-2">
                ${this.renderSplitLayout(
                    `<div id="sent-question-box" class="bg-white dark:bg-dark-card p-4 landscape:p-2 rounded-3xl landscape:rounded-2xl shadow-sm text-center border-2 border-gray-100 dark:border-dark-border cursor-pointer active:scale-95 transition-transform hover:border-pink-200 group">
                        <h2 class="text-xl landscape:text-base font-bold text-gray-800 dark:text-white mt-1" data-fit="true">${this.textService.smartWrap(originText)}</h2>
                    </div>
                    <div id="sent-slots" class="flex flex-wrap justify-center content-start gap-2 landscape:gap-1 min-h-[5rem] landscape:min-h-[3rem] p-4 landscape:p-2 bg-gray-100 dark:bg-dark-bg/50 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 transition-all overflow-y-auto custom-scrollbar flex-1">
                    </div>`,
                    `<div class="flex-1 overflow-y-auto custom-scrollbar min-h-0">
                        <div class="flex flex-wrap justify-center gap-2 landscape:gap-1 pb-4 landscape:pb-1">
                            ${this.wordPool.map((w, i) => `
                                <button class="flex-grow bg-white dark:bg-dark-card border-2 border-gray-200 dark:border-gray-700 rounded-xl ${padding} ${btnHeight} landscape:min-h-0 landscape:py-1 ${textSize} landscape:text-base font-bold text-gray-700 dark:text-white shadow-sm hover:border-pink-400 active:scale-95 transition-all whitespace-nowrap flex items-center justify-center ${w.used ? 'opacity-20 pointer-events-none' : ''}" data-index="${i}">
                                    <span class="w-full text-center">${w.word}</span>
                                </button>
                            `).join('')}
                        </div>
                    </div>`
                )}
            </div>

            ${this.renderFooter({ prefix: 'sent', color: 'pink' })}
        `;

        this.bindCommonEvents('sent');
        this.bind('#sent-question-box', 'click', () => this.playHint());

        this.container.querySelectorAll('button[data-index]').forEach(btn => btn.addEventListener('click', (e) => this.handlePoolClick(parseInt(e.currentTarget.dataset.index))));

        this.updateSlots();

        this.fitTexts([
            ['[data-fit="true"]', 14, 80]
        ]);
    }
}
export const sentencesApp = new SentencesApp();

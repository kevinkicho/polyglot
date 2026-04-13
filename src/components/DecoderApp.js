import { BaseGameComponent } from './BaseGameComponent';

export class DecoderApp extends BaseGameComponent {
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
        const forbiddenChars = /[\/·・･,、。.\s\t\n]/;
        const chars = targetText.split('').filter(c => !forbiddenChars.test(c));
        const cleanTargetWord = chars.join('');

        this.charPool = chars.map((char, i) => ({ char, id: i, used: false })).sort(() => 0.5 - Math.random());
        this.builtChars = [];
        this.currentData = { item, chars, targetWord: cleanTargetWord };

        this.render();
        this.setTimeout(() => this.playAudio(), 300);
    }

    playAudio() {
        this.audioService.speak(this.currentData.item.front.main, this.settingsService.get().targetLang);
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
        const slotsContainer = this.container ? this.container.querySelector('#dec-slots') : null;
        if (!slotsContainer) return;

        if (this.builtChars.length === 0) {
            slotsContainer.innerHTML = '<span class="text-gray-400 text-sm self-center font-medium animate-pulse w-full text-center">Listen & Tap Tiles</span>';
        } else {
            slotsContainer.innerHTML = this.builtChars.map((poolIdx, i) => `
                <button class="bg-blue-500 text-white rounded-lg px-4 py-2 font-black text-xl shadow-md active:scale-95 min-w-[3rem]" data-pos="${i}">${this.charPool[poolIdx].char}</button>
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
            this.scoreService.addScore('decoder', 10);

            this.audioService.speak(this.currentData.item.front.main, this.settingsService.get().targetLang);

            const zone = this.container.querySelector('#dec-slots');
            if (zone) zone.classList.add('animate-celebrate', 'border-green-500', 'bg-green-50', 'dark:bg-green-900/20');

            const qBox = this.container.querySelector('#dec-q-box-content');
            if (qBox) {
                qBox.innerHTML = `<h2 class="text-4xl font-black text-indigo-600 dark:text-white animate-celebrate">${this.currentData.item.front.main}</h2>`;
            }

            this.setTimeout(() => this.next(), 1200);
        }
    }

    render() {
        if (!this.container) return;
        const { item } = this.currentData;

        const charCount = this.charPool.length;
        const gridCols = Math.max(4, Math.ceil(charCount / 2.2));

        this.container.innerHTML = `
            ${this.renderHeader({ prefix: 'dec', id: item.id, color: 'blue', showRandom: true })}

            <div class="w-full h-full pt-20 pb-28 px-4 max-w-lg mx-auto flex flex-col gap-6">
                ${this.renderCategoryPills({ color: 'blue' })}

                <div id="dec-q-box" class="bg-white dark:bg-dark-card p-4 rounded-3xl shadow-sm border-2 border-gray-100 dark:border-dark-border cursor-pointer active:scale-95 transition-transform hover:border-blue-200 group flex flex-col h-40 justify-center items-center">
                    <div id="dec-q-box-content" class="flex flex-col items-center gap-3">
                        <div class="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-500 animate-pulse">
                            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>
                        </div>
                        <span class="text-xs font-bold text-gray-400 uppercase tracking-widest">Tap to Replay</span>
                    </div>
                </div>

                <div id="dec-slots" class="flex flex-wrap justify-center gap-2 min-h-[4rem] p-3 bg-gray-100 dark:bg-dark-bg/50 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 transition-all">
                </div>

                <div class="flex-1 overflow-y-auto custom-scrollbar">
                    <div class="grid gap-1 pb-4 content-start" style="grid-template-columns: repeat(${gridCols}, minmax(0, 1fr))">
                        ${this.charPool.map((c, i) => `
                            <button class="choice-tile bg-white dark:bg-dark-card border-2 border-gray-200 dark:border-gray-700 rounded-xl aspect-square font-black text-gray-700 dark:text-white shadow-sm hover:border-blue-400 active:scale-95 transition-all p-0 flex items-center justify-center overflow-hidden ${c.used ? 'opacity-20 pointer-events-none' : ''}" data-index="${i}">
                                <span class="tile-text w-full text-center leading-none whitespace-nowrap">${c.char}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>

            ${this.renderFooter({ prefix: 'dec', color: 'blue' })}
        `;

        this.bindCommonEvents('dec');
        this.bind('#dec-q-box', 'click', () => this.playAudio());
        this.container.querySelectorAll('.choice-tile').forEach(btn => btn.addEventListener('click', (e) => this.handlePoolClick(parseInt(e.currentTarget.dataset.index))));

        this.updateSlots();

        this.fitTexts([
            ['.tile-text', 28, 64]
        ]);
    }
}
export const decoderApp = new DecoderApp();

import { BaseGameComponent } from './BaseGameComponent';

export class WritingApp extends BaseGameComponent {
    constructor() {
        super();
    }

    mount(elementId) {
        super.mount(elementId);
        this.random();
    }

    loadGame() {
        this.isProcessing = false;
        const list = this.vocabService.getAll();
        if (!list.length) return;
        this.currentData = list[this.currentIndex];
        this.render();
    }

    revealAnswer() {
        const input = document.getElementById('writing-input');
        if (input && this.currentData) {
            input.value = this.currentData.front.main;
            input.focus();
        }
    }

    checkAnswer() {
        if (this.isProcessing) return;
        const input = document.getElementById('writing-input');
        if (!input) return;

        const guess = input.value.trim().toLowerCase();
        const correctFull = this.currentData.front.main.toLowerCase();

        const variations = correctFull.split(/[・･,、.。]+/);
        const isCorrect = (guess === correctFull) || variations.some(v => v.trim() === guess);

        this.recordAnswer(this.currentData.id, isCorrect);
        if (isCorrect) {
            this.isProcessing = true;
            input.classList.remove('bg-gray-100', 'dark:bg-gray-800');
            input.classList.add('bg-white', 'text-green-600', 'border-yellow-400', 'ring-4', 'ring-yellow-400', 'animate-celebrate');

            this.scoreService.addScore('writing', 10);
            if (this.settingsService.get().autoPlay) this.audioService.speak(this.currentData.front.main, this.settingsService.get().targetLang);
            this.setTimeout(() => this.transitionTo(() => this.next()), 1000);
        } else {
            input.classList.add('bg-red-100', 'text-red-800', 'shake');
            this.setTimeout(() => input.classList.remove('shake', 'bg-red-100', 'text-red-800'), 500);
        }
    }

    playHint() {
        this.audioService.speak(this.currentData.front.main, this.settingsService.get().targetLang);
    }

    render() {
        if (!this.container) return;
        const originText = this.currentData.back.main || this.currentData.back.definition;

        this.container.innerHTML = `
            ${this.renderHeader({ prefix: 'write', id: this.currentData.id, color: 'cyan', showRandom: true })}

            <div class="w-full h-full pt-20 landscape:pt-12 pb-40 landscape:pb-14 px-6 landscape:px-3 max-w-6xl mx-auto flex flex-col justify-center gap-6 landscape:gap-2">
                ${this.renderCategoryPills({ color: 'cyan' })}
                ${this.renderSplitLayout(
                    `<div id="write-q-box" class="bg-white dark:bg-dark-card p-4 landscape:p-3 rounded-3xl landscape:rounded-2xl shadow-sm text-center border-2 border-gray-100 dark:border-dark-border cursor-pointer active:scale-95 transition-transform hover:border-cyan-200 group relative flex-1 flex flex-col justify-center min-h-0 overflow-hidden">
                        <div class="absolute top-2 right-2 text-cyan-500 opacity-20"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg></div>
                        <span class="text-xs font-bold text-gray-400 uppercase tracking-widest opacity-20">Translate</span>
                        <h2 class="write-text font-black text-gray-800 dark:text-white mt-1 leading-tight w-full flex-1 flex items-center justify-center min-h-0 overflow-hidden">${this.textService.smartWrap(originText)}</h2>
                    </div>`,
                    `<div class="flex flex-col gap-4 landscape:gap-2 justify-center flex-1">
                        <div class="relative w-full">
                            <input type="text" id="writing-input" class="w-full h-16 landscape:h-12 px-6 rounded-2xl bg-gray-100 dark:bg-gray-800 border-2 border-transparent focus:border-cyan-500 outline-none text-2xl landscape:text-lg font-bold text-center text-gray-800 dark:text-white shadow-inner transition-all z-10" placeholder="Type here..." autocomplete="off">
                            <button id="write-hint-btn" class="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-yellow-400 transition-colors">
                                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>
                            </button>
                        </div>
                        <button id="write-submit-btn" class="w-full h-16 landscape:h-12 bg-cyan-500 text-white rounded-2xl font-black text-xl landscape:text-lg shadow-lg shadow-cyan-500/30 active:scale-95 transition-all">CHECK</button>
                    </div>`
                )}
            </div>

            ${this.renderFooter({ prefix: 'write', color: 'cyan' })}
        `;

        this.bindCommonEvents('write');
        this.bind('#write-submit-btn', 'click', () => this.checkAnswer());
        this.bind('#write-hint-btn', 'click', () => this.revealAnswer());
        this.bind('#write-q-box', 'click', () => this.playHint());

        const textInput = this.container.querySelector('#writing-input');
        if (textInput) {
            textInput.addEventListener('keydown', (e) => e.stopPropagation());
            textInput.addEventListener('keypress', (e) => {
                e.stopPropagation();
                if (e.key === 'Enter') this.checkAnswer();
            });
        }

        this.raf(() => {
            if (!this.container) return;
            const qText = this.container.querySelector('.write-text');
            if (qText && qText.parentElement) {
                qText.style.height = qText.parentElement.clientHeight + 'px';
                this.textService.fitText(qText, 30, 80);
                qText.style.display = 'flex';
                qText.style.flexDirection = 'column';
                qText.style.alignItems = 'center';
                qText.style.justifyContent = 'center';
            }
        });
    }
}
export const writingApp = new WritingApp();

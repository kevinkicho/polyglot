import { BaseGameComponent } from './BaseGameComponent';

export class ReverseApp extends BaseGameComponent {
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
        const target = list[this.currentIndex];

        const others = list.filter(i => i.id !== target.id).sort(() => 0.5 - Math.random()).slice(0, 3);
        const choices = [target, ...others].sort(() => 0.5 - Math.random());

        this.currentData = { target, choices };
        this.render();
    }

    handleChoice(id, el) {
        if (this.isProcessing) return;

        const chosen = this.currentData.choices.find(c => c.id === id);
        if (chosen) this.audioService.speak(chosen.front.main, this.settingsService.get().targetLang);

        this.isProcessing = true;
        const isCorrect = id === this.currentData.target.id;
        this.recordAnswer(this.currentData.target.id, isCorrect);

        if (isCorrect) {
            el.classList.replace('bg-white', 'bg-green-500');
            el.classList.replace('dark:bg-dark-card', 'bg-green-500');
            el.classList.add('text-white', 'border-green-600', 'animate-celebrate');
            this.scoreService.addScore('reverse', 10);
            this.setTimeout(() => this.transitionTo(() => this.next()), 1000);
        } else {
            el.classList.replace('bg-white', 'bg-red-500');
            el.classList.replace('dark:bg-dark-card', 'bg-red-500');
            el.classList.add('text-white', 'border-red-600', 'shake');
            this.setTimeout(() => {
                this.isProcessing = false;
                el.classList.remove('shake');
                el.classList.replace('bg-red-500', 'bg-white');
                el.classList.replace('bg-red-500', 'dark:bg-dark-card');
                el.classList.remove('text-white', 'border-red-600');
            }, 500);
        }
    }

    playHint() {
        this.audioService.speak(this.currentData.target.front.main, this.settingsService.get().targetLang);
    }

    render() {
        if (!this.container) return;
        const { target, choices } = this.currentData;
        const originText = target.back.main || target.back.definition;

        this.container.innerHTML = `
            ${this.renderHeader({ prefix: 'rev', id: target.id, color: 'indigo', showRandom: true })}

            <div class="w-full h-full pt-20 landscape:pt-12 pb-28 landscape:pb-14 px-4 landscape:px-3 max-w-6xl mx-auto flex flex-col gap-6 landscape:gap-2 justify-center">
                ${this.renderCategoryPills({ color: 'indigo' })}
                ${this.renderSplitLayout(
                    `<div id="rev-q-box" class="bg-white dark:bg-dark-card p-4 landscape:p-3 rounded-3xl landscape:rounded-2xl shadow-sm text-center border-2 border-gray-100 dark:border-dark-border cursor-pointer active:scale-95 transition-transform hover:border-indigo-200 group flex-1 flex flex-col min-h-0 overflow-hidden">
                        <div class="flex items-center justify-center gap-2 mb-1 opacity-20 shrink-0">
                            <span class="text-xs font-bold text-gray-400 uppercase tracking-widest">Select Translation</span>
                            <svg class="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                        </div>
                        <div class="flex-1 min-h-0 flex items-center justify-center overflow-hidden">
                            <h2 class="question-text font-black text-gray-800 dark:text-white leading-tight w-full text-center">${this.textService.smartWrap(originText)}</h2>
                        </div>
                    </div>`,
                    `<div class="grid grid-cols-2 gap-3 landscape:gap-1.5 flex-1 min-h-0">
                        ${choices.map(c => `
                            <button class="choice-btn bg-white dark:bg-dark-card border-2 border-gray-100 dark:border-dark-border p-1 rounded-2xl landscape:rounded-xl shadow-sm hover:shadow-md text-xl landscape:text-base font-bold text-gray-700 dark:text-white transition-all active:scale-98 text-center flex flex-col items-center justify-center whitespace-nowrap overflow-hidden w-full h-full" data-id="${c.id}">
                                <span class="choice-text w-full px-1">${this.textService.smartWrap(c.front.main)}</span>
                            </button>
                        `).join('')}
                    </div>`
                )}
            </div>

            ${this.renderFooter({ prefix: 'rev', color: 'indigo' })}
        `;

        this.bindCommonEvents('rev');
        this.bind('#rev-q-box', 'click', () => this.playHint());
        this.container.querySelectorAll('.choice-btn').forEach(btn => btn.addEventListener('click', (e) => this.handleChoice(parseInt(e.currentTarget.dataset.id), e.currentTarget)));

        this.raf(() => {
            if (!this.container) return;
            // Give question-text a real height from its parent so fitText can constrain
            const qText = this.container.querySelector('.question-text');
            if (qText && qText.parentElement) {
                qText.style.height = qText.parentElement.clientHeight + 'px';
                this.textService.fitText(qText, 20, 80);
                // Restore vertical centering after fitText overrides display
                qText.style.display = 'flex';
                qText.style.flexDirection = 'column';
                qText.style.alignItems = 'center';
                qText.style.justifyContent = 'center';
            }
            this.container.querySelectorAll('.choice-text').forEach(el => {
                this.textService.fitText(el, 22, 60);
            });
        });
    }
}
export const reverseApp = new ReverseApp();

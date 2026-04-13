import { BaseGameComponent } from './BaseGameComponent';
import { escapeHTML } from '../utils/sanitize';

export class FinderApp extends BaseGameComponent {
    constructor() {
        super();
    }

    mount(elementId) {
        super.mount(elementId);
        this.random();
    }

    loadGame() {
        const list = this.vocabService.getAll();
        if (!list || list.length < 9) {
            this.renderError('Not enough vocab (need 9+)', 'find');
            return;
        }

        const target = list[this.currentIndex];
        const others = list.filter(i => i.id !== target.id).sort(() => 0.5 - Math.random()).slice(0, 8);
        const choices = [target, ...others].sort(() => 0.5 - Math.random());

        this.currentData = { target, choices };
        this.isProcessing = false;
        this.render();
    }

    handleChoice(id, el) {
        if (this.isProcessing) return;

        const chosen = this.currentData.choices.find(c => c.id === id);
        if (chosen) this.audioService.speak(chosen.front.main, this.settingsService.get().targetLang);

        const isCorrect = id === this.currentData.target.id;
        this.recordAnswer(this.currentData.target.id, isCorrect);
        if (isCorrect) {
            this.isProcessing = true;
            el.classList.remove('bg-white', 'dark:bg-dark-card');
            el.classList.add('bg-green-500', 'text-white', 'border-green-600');
            this.scoreService.addScore('finder', 10);
            this.setTimeout(() => this.next(), 1000);
        } else {
            el.classList.add('bg-red-100', 'dark:bg-red-900', 'shake');
            this.setTimeout(() => el.classList.remove('bg-red-100', 'dark:bg-red-900', 'shake'), 500);
        }
    }

    playHint() {
        this.audioService.speak(this.currentData.target.front.main, this.settingsService.get().targetLang);
    }

    render() {
        if (!this.container || !this.currentData) return;
        const { target, choices } = this.currentData;
        const prompt = target.back.main || target.back.definition;

        this.container.innerHTML = `
            ${this.renderHeader({ prefix: 'find', id: target.id, color: 'rose', showRandom: true })}

            <div class="w-full h-full pt-20 pb-28 px-4 max-w-lg mx-auto flex flex-col gap-4">
                ${this.renderCategoryPills({ color: 'rose' })}
                <div class="bg-white dark:bg-dark-card p-4 rounded-2xl shadow-sm text-center border-2 border-gray-100 dark:border-dark-border min-h-[4rem] flex items-center justify-center">
                    <h2 class="text-xl font-bold text-gray-800 dark:text-white leading-tight">${escapeHTML(prompt)}</h2>
                </div>

                <div class="grid grid-cols-3 gap-2 flex-1">
                    ${choices.map(c => `
                        <button class="find-choice bg-white dark:bg-dark-card border-2 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:border-rose-300 active:scale-95 transition-all p-1 flex items-center justify-center overflow-hidden" data-id="${c.id}">
                            <span class="find-text w-full text-center font-bold text-gray-700 dark:text-white leading-none">${this.textService.smartWrap(c.front.main.replace(/\.$/, ''))}</span>
                        </button>
                    `).join('')}
                </div>
            </div>

            ${this.renderFooter({ prefix: 'find', color: 'rose' })}
        `;

        this.bindCommonEvents('find');
        this.container.querySelectorAll('.find-choice').forEach(btn => btn.addEventListener('click', (e) => this.handleChoice(parseInt(e.currentTarget.dataset.id), e.currentTarget)));

        this.fitTexts([
            ['.find-text', 18, 55]
        ]);
    }
}
export const finderApp = new FinderApp();

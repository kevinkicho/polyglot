import { BaseGameComponent } from './BaseGameComponent';
import { escapeHTML } from '../utils/sanitize';
import { aiService } from '../services/aiService';
import { generateFinderExercise, getStrugglingWords } from '../services/aiContentService';

export class FinderApp extends BaseGameComponent {
    constructor() {
        super();
        this.aiPrompt = '';
        this._abortCtrl = null;
    }

    mount(elementId) {
        super.mount(elementId);
        this.random();
    }

    unmount() {
        this._abortCtrl?.abort();
        this._abortCtrl = null;
        super.unmount();
    }

    next(id = null) {
        this.isProcessing = false;
        this._abortCtrl?.abort();
        this._abortCtrl = null;
        super.next(id);
    }

    prev() {
        this._abortCtrl?.abort();
        this._abortCtrl = null;
        const list = this.vocabService.getAll();
        this.currentIndex = (this.currentIndex - 1 + list.length) % list.length;
        this.loadGame();
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
        this.aiPrompt = '';
        this.render();

        if (aiService.isAvailable()) {
            this.loadAIGame(list);
        }
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
            const result = await generateFinderExercise(targetWord, s.targetLang, {
                originLang: s.originLang,
                signal: ctrl.signal,
            });

            clearTimeout(timeout);

            if (this._abortCtrl !== ctrl) return;
            this._abortCtrl = null;

            if (!result || !result.prompt || !result.choices || result.choices.length < 4) return;

            const newIndex = list.findIndex(i => i.id === targetWord.id);
            if (newIndex !== -1) this.currentIndex = newIndex;

            const aiChoices = result.choices.slice(0, 9);
            const paddedChoices = aiChoices.map(word => {
                const match = list.find(item => item.front?.main === word);
                if (match) {
                    return { id: match.id, front: match.front, back: match.back, _aiWord: word };
                }
                return { id: -Date.now() - Math.floor(Math.random() * 10000), front: { main: word }, back: { main: word, definition: result.correctMeaning }, _aiWord: word };
            });

            while (paddedChoices.length < 9 && paddedChoices.length < list.length) {
                const remaining = list.filter(item => !paddedChoices.some(c => c.id === item.id));
                if (!remaining.length) break;
                paddedChoices.push({ id: remaining[0].id, front: remaining[0].front, back: remaining[0].back });
            }

            for (let i = paddedChoices.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [paddedChoices[i], paddedChoices[j]] = [paddedChoices[j], paddedChoices[i]];
            }

            this.aiPrompt = result.prompt;
            this.currentData = { target: targetWord, choices: paddedChoices };
            this.isProcessing = false;
            this.render();
        } catch (err) {
            clearTimeout(timeout);
            this._abortCtrl = null;
        }
    }

    handleChoice(id, el) {
        if (this.isProcessing) return;

        const chosen = this.currentData.choices.find(c => c.id === id);
        if (chosen) this.audioService.speak(chosen.front?.main || chosen._aiWord || '', this.settingsService.get().targetLang);

        const isCorrect = id === this.currentData.target.id;
        this.recordAnswer(this.currentData.target.id, isCorrect);
        if (isCorrect) {
            this.isProcessing = true;
            el.classList.remove('bg-white', 'dark:bg-dark-card');
            el.classList.add('bg-green-500', 'text-white', 'border-green-600');
            this.scoreService.addScore('finder', 10);
            this.setTimeout(() => this.transitionTo(() => this.next()), 1000);
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
        const prompt = this.aiPrompt || (target.back.main || target.back.definition);

        this.container.innerHTML = `
            ${this.renderHeader({ prefix: 'find', id: target.id, color: 'rose', showRandom: true })}

            <div class="w-full h-full pt-20 landscape:pt-12 pb-28 landscape:pb-14 px-4 landscape:px-3 max-w-6xl mx-auto flex flex-col gap-4 landscape:gap-2">
                ${this.renderCategoryPills({ color: 'rose' })}
                ${this.renderSplitLayout(
                    `<div class="bg-white dark:bg-dark-card p-3 landscape:p-2 rounded-2xl shadow-sm text-center border-2 border-gray-100 dark:border-dark-border flex items-center justify-center flex-1 min-h-0 overflow-hidden">
                        <h2 class="find-prompt font-bold text-gray-800 dark:text-white leading-tight w-full h-full flex items-center justify-center overflow-hidden">${this.aiPrompt ? escapeHTML(prompt) : this.textService.smartWrap(prompt)}</h2>
                    </div>`,
                    `<div class="grid grid-cols-3 grid-rows-3 gap-2 landscape:gap-1.5 flex-1 min-h-0">
                        ${choices.map(c => `
                            <button class="find-choice bg-white dark:bg-dark-card border-2 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:border-rose-300 active:scale-95 transition-all p-2 min-h-[48px] flex items-center justify-center overflow-hidden" data-id="${c.id}">
                                <span class="find-text w-full text-center font-bold text-gray-700 dark:text-white leading-none">${c._aiWord ? escapeHTML(c._aiWord) : this.textService.smartWrap(c.front.main.replace(/\.$/, ''))}</span>
                            </button>
                        `).join('')}
                    </div>`
                )}
            </div>

            ${this.renderFooter({ prefix: 'find', color: 'rose' })}
        `;

        this.bindCommonEvents('find');
        this.container.querySelectorAll('.find-choice').forEach(btn => btn.addEventListener('click', (e) => this.handleChoice(parseInt(e.currentTarget.dataset.id), e.currentTarget)));

        this.fitTexts([
            ['.find-prompt', 16, 48],
            ['.find-text', 10, 42]
        ]);
    }
}
export const finderApp = new FinderApp();
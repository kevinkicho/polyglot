import { BaseGameComponent } from './BaseGameComponent';
import { quizService } from '../services/quizService';
import { comboManager } from '../managers/ComboManager';
import { settingsService } from '../services/settingsService';
import { aiService } from '../services/aiService';
import { generateQuizQuestion, getStrugglingWords } from '../services/aiContentService';
import { escapeHTML } from '../utils/sanitize';

export class QuizApp extends BaseGameComponent {
    constructor() {
        super();
        this.selectedAnswerId = null;
        this.aiQuestion = null;
        this.aiChoices = [];
        this.aiCorrectIndex = -1;
        this._abortCtrl = null;
    }

    mount(elementId) {
        super.mount(elementId);
        if (!this.currentData) this.random();
        else this.render();
    }

    unmount() {
        this._abortCtrl?.abort();
        this._abortCtrl = null;
        super.unmount();
    }

    refresh() {
        this._abortCtrl?.abort();
        this._abortCtrl = null;
        if (this.currentData && this.currentData.target) {
            this.currentData = quizService.generateQuestion(this.currentData.target.id);
            this.aiQuestion = null;
            this.aiChoices = [];
            this.aiCorrectIndex = -1;
            this.render();
        } else {
            this.random();
        }
    }

    random() {
        const list = this.getFilteredList();
        if (!list || list.length < 4) { this.renderError('Not enough vocabulary in this category (need 4+).', 'quiz'); return; }

        this.isProcessing = false;
        this.selectedAnswerId = null;
        this.audioService.stop();

        const target = list[Math.floor(Math.random() * list.length)];
        this.currentData = quizService.generateQuestion(target.id);
        this.aiQuestion = null;
        this.aiChoices = [];
        this.aiCorrectIndex = -1;

        this.render();

        if (aiService.isAvailable()) {
            this.loadAIQuestion(list);
        }
    }

    next(id = null) {
        this.isProcessing = false;
        this.selectedAnswerId = null;
        this.audioService.stop();
        this._abortCtrl?.abort();
        this._abortCtrl = null;

        const list = this.getFilteredList();
        if (list.length === 0) return;

        if (id === null && this.currentData) {
            const currentItem = this.vocabService.getAll().find(v => v.id === this.currentData.target.id);
            let listIdx = list.findIndex(i => i.id === currentItem.id);
            if (listIdx === -1) listIdx = 0;
            else listIdx = (listIdx + 1) % list.length;
            id = list[listIdx].id;
        }

        this.currentData = quizService.generateQuestion(id);
        this.aiQuestion = null;
        this.aiChoices = [];
        this.aiCorrectIndex = -1;
        if (this.currentData && window.saveGameHistory) window.saveGameHistory('quiz', this.currentData.target.id);
        this.render();

        if (aiService.isAvailable()) {
            this.loadAIQuestion(list);
        }
    }

    prev() {
        this._abortCtrl?.abort();
        this._abortCtrl = null;
        if (this.currentData) {
            const list = this.getFilteredList();
            if (list.length === 0) return;

            const currentItem = this.vocabService.getAll().find(v => v.id === this.currentData.target.id);
            let listIdx = list.findIndex(i => i.id === currentItem.id);
            if (listIdx === -1) listIdx = 0;
            else listIdx = (listIdx - 1 + list.length) % list.length;

            this.next(list[listIdx].id);
        }
    }

    async loadAIQuestion(list) {
        if (!this.currentData || !this.currentData.target) return;

        this._abortCtrl = new AbortController();
        const ctrl = this._abortCtrl;
        const timeout = setTimeout(() => ctrl.abort(), 15000);

        const struggling = getStrugglingWords(list);
        if (!struggling.length) {
            clearTimeout(timeout);
            this._abortCtrl = null;
            return;
        }

        const target = this.currentData.target;
        const others = list.filter(i => i.id !== target.id).sort(() => 0.5 - Math.random()).slice(0, 3);
        const s = this.settingsService.get();

        try {
            const result = await generateQuizQuestion(target, others, s.targetLang, {
                originLang: s.originLang,
                signal: ctrl.signal,
            });

            clearTimeout(timeout);

            if (this._abortCtrl !== ctrl) return;
            this._abortCtrl = null;

            if (!result) return;

            const targetId = target.id;

            const aiChoiceItems = result.choices.map((choiceText, i) => {
                if (i === result.correctIndex) {
                    return { id: targetId, front: target.front, back: target.back, _aiChoiceText: choiceText };
                }
                const match = others.find(o => (o.back?.definition || o.back?.main) === choiceText);
                if (match) {
                    return { id: match.id, front: match.front, back: match.back, _aiChoiceText: choiceText };
                }
                return { id: -(i + 1), front: { main: choiceText }, back: { main: choiceText, definition: choiceText }, _aiChoiceText: choiceText };
            });

            for (let i = aiChoiceItems.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [aiChoiceItems[i], aiChoiceItems[j]] = [aiChoiceItems[j], aiChoiceItems[i]];
            }

            const newCorrectIndex = aiChoiceItems.findIndex(c => c.id === targetId);

            this.aiQuestion = result.question;
            this.aiChoices = aiChoiceItems;
            this.aiCorrectIndex = newCorrectIndex;

            this.currentData = { target, choices: aiChoiceItems };
            this.render();
        } catch (err) {
            clearTimeout(timeout);
            this._abortCtrl = null;
        }
    }

    handleKeyPress(e) {
        if (this.isProcessing) return;
        const num = parseInt(e.key);
        if (num >= 1 && num <= 4) {
            e.preventDefault();
            const btns = this.container?.querySelectorAll('.quiz-option');
            if (btns && btns[num - 1]) {
                const btn = btns[num - 1];
                const text = btn.querySelector('.quiz-choice-text')?.innerText || '';
                this.handleOptionClick(parseInt(btn.dataset.id), btn, text);
            }
        }
    }

    handleOptionClick(id, el, choiceText) {
        if (this.isProcessing || window.wasLongPress) return;
        const settings = this.settingsService.get();
        if (settings.quizDoubleClick) {
            if (this.selectedAnswerId !== id) {
                this.selectedAnswerId = id;
                this.container.querySelectorAll('.quiz-option').forEach(b => {
                    b.classList.remove('border-yellow-400', 'ring-2', 'ring-yellow-400');
                    b.classList.add('border-transparent');
                });
                el.classList.remove('border-transparent');
                el.classList.add('border-yellow-400', 'ring-2', 'ring-yellow-400');
                return;
            }
        }
        this.submitAnswer(id, el);
    }

    async submitAnswer(id, el) {
        this.isProcessing = true;
        const correct = this.currentData.target.id === id;
        el.classList.remove('border-transparent', 'border-yellow-400', 'ring-2', 'ring-yellow-400');
        this.recordAnswer(this.currentData.target.id, correct);
        if (correct) {
            el.classList.add('bg-green-500', 'border-green-600', 'text-white');
            el.classList.remove('bg-white', 'dark:bg-dark-card', 'text-gray-700', 'dark:text-white');
            this.scoreService.addScore('quiz', 10);
        } else {
            el.classList.add('bg-red-500', 'border-red-600', 'text-white');
            el.classList.remove('bg-white', 'dark:bg-dark-card', 'text-gray-700', 'dark:text-white');
            if (settingsService.get().comboEffects !== false) comboManager.dropRank();

            if (this.aiCorrectIndex >= 0) {
                const correctBtn = this.container?.querySelectorAll('.quiz-option')[this.aiCorrectIndex];
                if (correctBtn) {
                    correctBtn.classList.add('bg-green-500', 'border-green-600', 'text-white');
                    correctBtn.classList.remove('bg-white', 'dark:bg-dark-card', 'text-gray-700', 'dark:text-white');
                }
            }
        }
        if (correct) {
            const fullText = this.currentData.target.front.main;
            const s = this.settingsService.get();
            if (s.quizAutoPlayCorrect) {
                if (s.waitForAudio) {
                    await this.audioService.speak(fullText, s.targetLang);
                    this.transitionTo(() => this.next());
                } else {
                    this.audioService.speak(fullText, s.targetLang);
                    this.setTimeout(() => this.transitionTo(() => this.next()), 1000);
                }
            } else {
                this.setTimeout(() => this.transitionTo(() => this.next()), 1000);
            }
        } else {
            this.isProcessing = false;
            this.selectedAnswerId = null;
        }
    }



    render() {
        if (!this.container) return;
        if (!this.currentData) { this.renderError('Not enough vocabulary in this category (need 4+).', 'quiz'); return; }
        const { target, choices } = this.currentData;

        const questionText = this.aiQuestion || target.front.main;

        this.container.innerHTML = `
            ${this.renderHeader({ prefix: 'quiz', id: target.id, color: 'purple', showRandom: true })}

            <div class="w-full h-full pt-20 landscape:pt-12 pb-28 landscape:pb-14 px-4 landscape:px-3 max-w-6xl mx-auto flex flex-col gap-4 landscape:gap-2">
                ${this.renderCategoryPills({ color: 'indigo' })}

                ${this.renderSplitLayout(
                    `<div id="quiz-question-box" class="flex-1 min-h-[120px] w-full bg-white dark:bg-dark-card rounded-[2rem] landscape:rounded-2xl shadow-xl border-2 border-indigo-100 dark:border-dark-border p-1 flex flex-col items-center justify-center overflow-hidden">
                        <span class="quiz-question-text font-semibold text-gray-800 dark:text-white text-center leading-tight w-full break-words" data-fit="true">${this.aiQuestion ? escapeHTML(questionText) : this.textService.smartWrap(questionText)}</span>
                        ${this.aiQuestion ? `<span class="text-xs text-gray-400 dark:text-gray-500 mt-1">${escapeHTML(target.front.main)}</span>` : ''}
                    </div>`,
                    `<div class="flex-1 grid grid-cols-2 grid-rows-2 gap-3 landscape:gap-1.5 min-h-0">
                        ${choices.map((c, i) => `
                            <button class="quiz-option bg-white dark:bg-dark-card border-2 border-transparent rounded-2xl landscape:rounded-xl shadow-sm hover:shadow-md flex flex-col justify-center items-center p-2 landscape:p-1 overflow-hidden w-full h-full" data-id="${c.id}" data-index="${i}">
                                <div class="quiz-choice-text text-lg font-normal text-gray-700 dark:text-white text-center leading-tight w-full">${c._aiChoiceText ? escapeHTML(c._aiChoiceText) : this.textService.smartWrap(c.back.definition)}</div>
                            </button>
                        `).join('')}
                    </div>`,
                    { leftClass: 'portrait:h-[55%] landscape:justify-center' }
                )}
            </div>

            ${this.renderFooter({ prefix: 'quiz', color: 'indigo' })}
        `;

        this.bindCommonEvents('quiz');

        this.bind('#quiz-question-box', 'click', () => {
            if (!this.isProcessing && !window.wasLongPress) {
                this.audioService.stop();
                this.audioService.speak(target.front.main, this.settingsService.get().targetLang);
            }
        });

        this.bind('#quiz-id-input', 'change', (e) => {
            const newId = parseInt(e.target.value);
            this.vocabService.findIndexById(newId) !== -1 ? this.next(newId) : this.toast.warning('ID not found');
        });

        this.bind('.quiz-option', 'click', (e, el) => {
            const text = el.querySelector('.quiz-choice-text').innerText;
            this.handleOptionClick(parseInt(el.dataset.id), el, text);
        });

        this.raf(() => {
            if (!this.container) return;
            this.textService.fitText(this.container.querySelector('.quiz-question-text'), 24, 150);
            this.container.querySelectorAll('.quiz-choice-text').forEach(el => {
                this.textService.fitText(el, 14, 55);
            });
        });

        if (this.settingsService.get().autoPlay) this.setTimeout(() => this.audioService.speak(target.front.main, this.settingsService.get().targetLang), 300);
    }
}
export const quizApp = new QuizApp();
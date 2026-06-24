import { BaseGameComponent } from './BaseGameComponent';
import { aiService } from '../services/aiService';
import { generateTrueFalseStatement, getStrugglingWords } from '../services/aiContentService';
import { escapeHTML } from '../utils/sanitize';

export class TrueFalseApp extends BaseGameComponent {
    constructor() {
        super();
        this.isCorrectPair = false;
        this.aiStatement = '';
        this.aiExplanation = '';
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

    loadGame() {
        this.isProcessing = false;
        this.aiStatement = '';
        this.aiExplanation = '';
        const list = this.vocabService.getAll();
        if (!list.length) return;
        const correctItem = list[this.currentIndex];
        this.isCorrectPair = Math.random() > 0.5;
        let displayMeaning = "";
        if (this.isCorrectPair) {
            displayMeaning = correctItem.back.main || correctItem.back.definition;
        } else {
            let distractor = list[Math.floor(Math.random() * list.length)];
            while (distractor.id === correctItem.id && list.length > 1) {
                distractor = list[Math.floor(Math.random() * list.length)];
            }
            displayMeaning = distractor.back.main || distractor.back.definition;
        }
        this.currentData = { item: correctItem, displayMeaning };
        this.render();

        if (aiService.isAvailable()) {
            this.loadAIGame(list);
        }
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
        super.prev();
    }

    async loadAIGame(list) {
        if (!this.currentData || !this.currentData.item) return;

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
            const result = await generateTrueFalseStatement(targetWord, s.targetLang, {
                originLang: s.originLang,
                signal: ctrl.signal,
            });

            clearTimeout(timeout);

            if (this._abortCtrl !== ctrl) return;
            this._abortCtrl = null;

            if (!result) return;

            this.isCorrectPair = result.isTrue;
            this.aiStatement = result.statement;
            this.aiExplanation = result.explanation || '';

            const correctItem = targetWord;
            const newIndex = list.findIndex(i => i.id === targetWord.id);
            if (newIndex !== -1) this.currentIndex = newIndex;
            let displayMeaning;
            if (result.isTrue) {
                displayMeaning = correctItem.back.main || correctItem.back.definition;
            } else {
                const others = list.filter(i => i.id !== targetWord.id);
                const distractor = others.length > 0 ? others[Math.floor(Math.random() * others.length)] : correctItem;
                displayMeaning = distractor.back.main || distractor.back.definition;
            }

            this.currentData = { item: correctItem, displayMeaning };
            this.render();
        } catch (err) {
            clearTimeout(timeout);
            this._abortCtrl = null;
        }
    }

    handleKeyPress(e) {
        if (this.isProcessing) return;
        if (e.key === 'y' || e.key === 'Y') { e.preventDefault(); this.handleGuess(true); }
        else if (e.key === 'n' || e.key === 'N') { e.preventDefault(); this.handleGuess(false); }
    }

    playAudio() {
        this.audioService.speak(this.currentData.item.front.main, this.settingsService.get().targetLang);
    }

    handleGuess(userGuessedTrue) {
        if (this.isProcessing) return;
        this.isProcessing = true;
        const correct = (userGuessedTrue === this.isCorrectPair);
        this.recordAnswer(this.currentData.item.id, correct);

        const box = this.container.querySelector('#tf-card');
        const meaningEl = this.container.querySelector('.meaning-text');
        const correctMeaning = this.currentData.item.back.main || this.currentData.item.back.definition;

        if (correct) {
            this.scoreService.addScore('truefalse', 10);
            if (this.settingsService.get().autoPlay) this.playAudio();

            box.classList.add('animate-celebrate', 'border-green-500', 'bg-green-50', 'dark:bg-green-900/20');

            if (!userGuessedTrue && !this.isCorrectPair) {
                if(meaningEl) {
                    meaningEl.innerHTML = `
                        <div class="text-gray-400 text-sm mb-1 line-through opacity-50">${this.aiStatement ? escapeHTML(this.currentData.displayMeaning) : this.textService.smartWrap(this.currentData.displayMeaning)}</div>
                        <span class="font-black text-indigo-600 dark:text-indigo-400 block text-4xl animate-celebrate">${this.textService.smartWrap(correctMeaning)}</span>
                        <span class="block text-xs font-bold text-green-500 mt-2 uppercase tracking-widest">Correct Meaning</span>
                    `;
                }
                this.setTimeout(() => this.transitionTo(() => this.next()), 2000);
            } else {
                this.setTimeout(() => this.transitionTo(() => this.next()), 800);
            }
        } else {
            box.classList.add('shake', 'border-red-500', 'bg-red-50', 'dark:bg-red-900/20');

            if(meaningEl) {
                if (this.isCorrectPair) {
                    meaningEl.style.color = '#EF4444';
                    meaningEl.innerHTML = `
                        <span class="font-black text-4xl block">${this.textService.smartWrap(correctMeaning)}</span>
                        <span class="block text-xs font-bold text-red-500 mt-2 uppercase tracking-widest">It was correct!</span>
                        ${this.aiExplanation ? `<span class="block text-xs text-gray-500 mt-1">${escapeHTML(this.aiExplanation)}</span>` : ''}
                    `;
                } else {
                    meaningEl.style.color = '#EF4444';
                    meaningEl.innerHTML = `
                        <span class="line-through opacity-50 text-sm block">${this.aiStatement ? escapeHTML(this.currentData.displayMeaning) : this.textService.smartWrap(this.currentData.displayMeaning)}</span>
                        <span class="font-black text-indigo-600 dark:text-indigo-400 block mt-2 text-4xl">${this.textService.smartWrap(correctMeaning)}</span>
                        <span class="block text-xs font-bold text-red-500 mt-2 uppercase tracking-widest">Wrong! Actual meaning:</span>
                        ${this.aiExplanation ? `<span class="block text-xs text-gray-500 mt-1">${escapeHTML(this.aiExplanation)}</span>` : ''}
                    `;
                }
            }

            this.setTimeout(() => {
                box.classList.remove('shake', 'border-red-500', 'bg-red-50', 'dark:bg-red-900/20');
                this.isProcessing = false;
            }, 2500);
        }
    }

    render() {
        if (!this.container) return;
        const { item, displayMeaning } = this.currentData;

        const statementText = this.aiStatement || displayMeaning;

        this.container.innerHTML = `
            ${this.renderHeader({ prefix: 'tf', id: item.id, color: 'orange', showRandom: true })}

            <div class="w-full h-full pt-20 landscape:pt-12 pb-28 landscape:pb-14 px-6 landscape:px-3 max-w-6xl mx-auto flex flex-col items-center justify-center gap-6 landscape:gap-2">
                ${this.renderCategoryPills({ color: 'orange' })}
                ${this.renderSplitLayout(
                    `<div id="tf-card" class="w-full bg-white dark:bg-dark-card border-4 border-gray-100 dark:border-dark-border rounded-[2rem] landscape:rounded-2xl p-4 landscape:p-3 shadow-xl text-center flex flex-col items-center gap-3 landscape:gap-2 transition-all duration-300 flex-1 min-h-0 overflow-hidden">
                        <div class="w-full flex-1 min-h-0 flex items-center justify-center overflow-hidden" id="tf-q-box">
                            <h1 class="question-text font-black text-gray-800 dark:text-white leading-tight cursor-pointer active:scale-95 transition-transform w-full h-full flex items-center justify-center overflow-hidden">${this.textService.smartWrap(item.front.main)}</h1>
                        </div>
                        <div class="w-full pt-2 border-t border-gray-100 dark:border-gray-700 shrink-0">
                            <h2 class="meaning-text font-bold text-gray-600 dark:text-gray-300 leading-tight w-full">${this.aiStatement ? escapeHTML(statementText) : this.textService.smartWrap(statementText)}</h2>
                        </div>
                    </div>`,
                    `<div class="flex landscape:flex-col gap-4 landscape:gap-3 w-full landscape:justify-center landscape:h-full">
                         <button id="btn-false" class="flex-1 bg-transparent border-4 border-red-500 text-red-500 rounded-2xl font-black active:scale-95 transition-transform hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center overflow-hidden min-h-0 p-2" aria-label="No, incorrect match"><span class="tf-btn-text">NO</span></button>
                         <button id="btn-true" class="flex-1 bg-transparent border-4 border-green-500 text-green-500 rounded-2xl font-black active:scale-95 transition-transform hover:bg-green-50 dark:hover:bg-green-900/20 flex items-center justify-center overflow-hidden min-h-0 p-2" aria-label="Yes, correct match"><span class="tf-btn-text">YES</span></button>
                    </div>`,
                    { rightClass: 'items-center' }
                )}
            </div>

            ${this.renderFooter({ prefix: 'tf', color: 'orange' })}
        `;

        this.bindCommonEvents('tf');
        this.bind('#tf-q-box', 'click', () => this.playAudio());
        this.bind('#btn-true', 'click', () => this.handleGuess(true));
        this.bind('#btn-false', 'click', () => this.handleGuess(false));

        this.raf(() => {
            if (!this.container) return;
            const qText = this.container.querySelector('.question-text');
            if (qText && qText.parentElement) {
                qText.style.height = qText.parentElement.clientHeight + 'px';
                this.textService.fitText(qText, 20, 80);
                qText.style.display = 'flex';
                qText.style.flexDirection = 'column';
                qText.style.alignItems = 'center';
                qText.style.justifyContent = 'center';
            }
            this.container.querySelectorAll('.meaning-text').forEach(el => this.textService.fitText(el, 18, 60));
            this.container.querySelectorAll('.tf-btn-text').forEach(el => this.textService.fitText(el, 24, 72));
        });
    }
}
export const trueFalseApp = new TrueFalseApp();
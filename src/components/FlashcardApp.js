import { BaseGameComponent } from './BaseGameComponent';
import { escapeHTML } from '../utils/sanitize';
import { aiService } from '../services/aiService';
import { generateFlashcardContent, getStrugglingWords } from '../services/aiContentService';

export class FlashcardApp extends BaseGameComponent {
    constructor() {
        super();
        this.isFlipped = false;
        this.history = [];
        this.aiHint = '';
        this.aiCulturalNote = '';
        this.aiExampleSentence = '';
        this.aiExampleTranslation = '';
        this._abortCtrl = null;
    }

    mount(elementId) {
        super.mount(elementId);
        const list = this.vocabService.getAll();
        if (list && list.length > 0) {
            if (!this.currentData) {
                this.currentIndex = this.vocabService.getRandomIndex();
            }
        }
        this.render();
    }

    unmount() {
        this._abortCtrl?.abort();
        this._abortCtrl = null;
        super.unmount();
    }

    refresh() {
        this._abortCtrl?.abort();
        this._abortCtrl = null;
        this.aiHint = '';
        this.aiCulturalNote = '';
        this.aiExampleSentence = '';
        this.aiExampleTranslation = '';
        if (this.container && !this.container.classList.contains('hidden')) {
            this.loadGame(this.currentIndex);
        }
    }

    loadGame(index) {
        const list = this.vocabService.getAll();
        if (!list || list.length === 0) {
            this.currentData = null;
        } else {
            this.currentIndex = (index + list.length) % list.length;
            this.currentData = list[this.currentIndex];
            this.isFlipped = false;
            this.aiHint = '';
            this.aiCulturalNote = '';
            this.aiExampleSentence = '';
            this.aiExampleTranslation = '';

            if (this.settingsService.get().autoPlay) {
                this.setTimeout(() => this.playAudio(), 500);
            }
        }
        this.render();
        if (this.currentData) this.saveHistory('flashcard', this.currentData.id);

        if (aiService.isAvailable() && this.currentData) {
            this.loadAIContent(list);
        }
    }

    next(id = null) {
        this._abortCtrl?.abort();
        this._abortCtrl = null;
        if (id !== null) {
            const idx = this.vocabService.findIndexById(id);
            if (idx !== -1) this.loadGame(idx);
        } else {
            if (this.currentData) this.history.push(this.currentIndex);
            this.loadGame(this.currentIndex + 1);
        }
    }

    prev() {
        this._abortCtrl?.abort();
        this._abortCtrl = null;
        if (this.history.length > 0) {
            this.loadGame(this.history.pop());
        } else {
            this.loadGame(this.currentIndex - 1);
        }
    }

    goto(id) {
        this._abortCtrl?.abort();
        this._abortCtrl = null;
        const idx = this.vocabService.findIndexById(parseInt(id));
        if (idx !== -1) this.loadGame(idx);
        else this.toast.warning("ID not found / IDが見つかりません");
    }

    gotoId(id) {
        this.goto(id);
    }

    async loadAIContent(list) {
        if (!this.currentData) return;

        this._abortCtrl = new AbortController();
        const ctrl = this._abortCtrl;
        const timeout = setTimeout(() => ctrl.abort(), 15000);

        const struggling = getStrugglingWords(list);
        const target = this.currentData;

        const useStruggling = struggling.length > 0 && struggling.some(s => s.id === target.id);
        const wordToUse = useStruggling
            ? struggling[Math.floor(Math.random() * struggling.length)]
            : target;

        const s = this.settingsService.get();

        try {
            const result = await generateFlashcardContent(wordToUse, s.targetLang, {
                originLang: s.originLang,
                signal: ctrl.signal,
            });

            clearTimeout(timeout);

            if (this._abortCtrl !== ctrl) return;
            this._abortCtrl = null;

            if (!result) return;

            this.aiHint = result.hint || '';
            this.aiCulturalNote = result.culturalNote || '';
            this.aiExampleSentence = result.exampleSentence || '';
            this.aiExampleTranslation = result.exampleTranslation || '';

            if (wordToUse.id !== target.id) {
                const newIndex = list.findIndex(i => i.id === wordToUse.id);
                if (newIndex !== -1) this.currentIndex = newIndex;
                this.currentData = list[this.currentIndex];
            }

            this.render();
        } catch (err) {
            clearTimeout(timeout);
            this._abortCtrl = null;
        }
    }

    handleKeyPress(e) {
        if (e.key === ' ') { e.preventDefault(); this.handleCardClick(); }
    }

    handleCardClick() {
        this.isFlipped = !this.isFlipped;
        this.render();

        if (!this.isFlipped) {
            this.playAudio();
        } else if (this.settingsService.get().autoPlay && this.settingsService.get().waitForAudio) {
            this.playAudio();
        }
    }

    playAudio() {
        if (!this.currentData) return;
        const s = this.settingsService.get();
        const lang = this.isFlipped ? s.originLang : s.targetLang;
        const text = this.isFlipped
            ? (this.currentData.back.main || this.currentData.back.definition)
            : this.currentData.front.main;

        this.audioService.speak(text, lang);
    }

    render() {
        if (!this.container) return;

        if (!this.currentData) {
            const list = this.vocabService.getAll();
            if (list.length > 0) {
                this.loadGame(this.currentIndex);
                return;
            }
            this.container.innerHTML = '<div class="flex items-center justify-center h-full text-gray-500">No vocabulary data available.</div>';
            return;
        }

        const { front, back, id } = this.currentData;
        const s = this.settingsService.get();

        let aiContentHtml = '';
        if (this.aiHint || this.aiExampleSentence || this.aiCulturalNote) {
            aiContentHtml = '<div class="mt-2 space-y-1.5 w-full">';
            if (this.aiHint) {
                aiContentHtml += `<div class="flex items-start gap-1.5"><span class="text-indigo-500 text-xs font-bold uppercase shrink-0">Hint</span><span class="text-gray-500 dark:text-gray-400 text-xs leading-tight">${escapeHTML(this.aiHint)}</span></div>`;
            }
            if (this.aiExampleSentence) {
                aiContentHtml += `<div class="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-2"><p class="text-xs font-bold text-indigo-600 dark:text-indigo-400 leading-tight">${escapeHTML(this.aiExampleSentence)}</p>`;
                if (this.aiExampleTranslation) {
                    aiContentHtml += `<p class="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-tight">${escapeHTML(this.aiExampleTranslation)}</p>`;
                }
                aiContentHtml += '</div>';
            }
            if (this.aiCulturalNote) {
                aiContentHtml += `<div class="flex items-start gap-1.5"><span class="text-purple-500 text-xs font-bold uppercase shrink-0">Note</span><span class="text-gray-500 dark:text-gray-400 text-xs leading-tight">${escapeHTML(this.aiCulturalNote)}</span></div>`;
            }
            aiContentHtml += '</div>';
        }

        this.container.innerHTML = `
            ${this.renderHeader({ prefix: 'fc', id, color: 'indigo', showRandom: false, showScore: false })}

            <div class="w-full h-full pt-20 landscape:pt-12 pb-28 landscape:pb-14 px-4 landscape:px-3 flex flex-col items-center justify-center">
                <div class="w-full max-w-lg md:max-w-2xl h-full max-h-[75vh] relative perspective group cursor-pointer" id="flashcard-container">
                    <div id="flashcard-card" class="card-inner w-full h-full duration-500 transform-style-3d relative ${this.isFlipped ? 'rotate-y-180' : ''}">

                        <div class="card-face absolute inset-0 backface-hidden bg-white dark:bg-dark-card rounded-3xl shadow-2xl border border-gray-100 dark:border-dark-border flex flex-col p-4 landscape:p-3">
                            <div class="flex justify-between items-center">
                                <span class="inline-flex items-center rounded-md bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 text-xs font-bold text-indigo-700 dark:text-indigo-300 ring-1 ring-inset ring-indigo-700/10 uppercase tracking-wider">${s.targetLang}</span>
                                <button class="audio-btn p-2 text-gray-400 hover:text-indigo-500 transition-colors bg-gray-50 dark:bg-gray-800 rounded-full"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg></button>
                            </div>

                            <div class="flex-1 w-full flex flex-col items-center justify-center overflow-hidden">
                                <h2 class="fc-front-text opacity-0 transition-opacity duration-300 font-black text-gray-800 dark:text-white text-center leading-tight whitespace-nowrap" data-fit="true">${this.textService.smartWrap(front.main)}</h2>
                                ${front.sub && s.showReading !== false ? `<p class="fc-front-sub font-medium text-gray-500 dark:text-gray-400 mt-2 text-center whitespace-nowrap" data-fit="true">${escapeHTML(front.sub)}</p>` : ''}
                            </div>

                            <div class="text-center text-gray-400 text-xs font-bold uppercase tracking-widest">Tap to Flip</div>
                        </div>

                        <div class="card-face absolute inset-0 backface-hidden rotate-y-180 bg-gray-50 dark:bg-dark-bg rounded-3xl shadow-xl border border-gray-200 dark:border-dark-border flex flex-col p-4 landscape:p-3">
                             <div class="flex justify-between items-center mb-2">
                                <span class="inline-flex items-center rounded-md bg-purple-50 dark:bg-purple-900/30 px-2 py-1 text-xs font-bold text-purple-700 dark:text-purple-300 ring-1 ring-inset ring-purple-700/10 uppercase tracking-wider">${s.originLang}</span>
                                <button class="audio-btn p-2 text-gray-400 hover:text-purple-500 transition-colors bg-white dark:bg-dark-card rounded-full"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg></button>
                            </div>

                            <div class="flex-1 w-full flex flex-col items-center justify-center text-center space-y-3 overflow-hidden overflow-y-auto">
                                <h2 class="fc-back-text opacity-0 transition-opacity duration-300 font-black text-indigo-600 dark:text-indigo-400 leading-none whitespace-nowrap" data-fit="true">${this.textService.smartWrap(back.definition)}</h2>

                                ${back.sentenceTarget && s.showSentence ? `
                                    <div class="w-full p-3 bg-white dark:bg-dark-card rounded-xl border border-gray-100 dark:border-dark-border">
                                        <p class="fc-back-sent opacity-0 transition-opacity duration-300 text-gray-700 dark:text-white font-bold mb-1 leading-tight whitespace-nowrap" data-fit="true">${escapeHTML(back.sentenceTarget)}</p>
                                        ${back.sentenceOrigin && s.showEnglish ? `<p class="fc-back-sent-trans text-gray-500 dark:text-gray-400 font-medium leading-tight whitespace-nowrap" data-fit="true">${escapeHTML(back.sentenceOrigin)}</p>` : ''}
                                    </div>
                                ` : ''}

                                ${aiContentHtml}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            ${this.renderFooter({ prefix: 'fc', color: 'indigo' })}
        `;

        this.bindCommonEvents('fc');
        this.bind('#flashcard-container', 'click', () => this.handleCardClick());

        this.container.querySelectorAll('.audio-btn').forEach(btn =>
            btn.addEventListener('click', (e) => { e.stopPropagation(); this.playAudio(); })
        );

        this.raf(() => {
            if (!this.container) return;
            const ft = this.container.querySelector('.fc-front-text');
            const fs = this.container.querySelector('.fc-front-sub');
            const bt = this.container.querySelector('.fc-back-text');
            const bs = this.container.querySelector('.fc-back-sent');

            if (ft) {
                const parentH = ft.parentElement.clientHeight;
                const subH = fs ? 40 : 0;
                ft.style.height = `${parentH - subH}px`;
                this.textService.fitText(ft, 24, 200);
                ft.style.height = '';
                ft.classList.remove('opacity-0');
            }
            if (fs) this.textService.fitText(fs, 16, 50);

            if (bt) {
                const parentH = bt.parentElement.clientHeight;
                const sentBox = bt.parentElement.querySelector('.w-full.p-3');
                const sentH = sentBox ? sentBox.offsetHeight + 16 : 0;
                bt.style.height = `${parentH - sentH}px`;
                this.textService.fitText(bt, 24, 150);
                bt.style.height = '';
                bt.classList.remove('opacity-0');
            }

            if (bs) { this.textService.fitText(bs, 16, 30); bs.classList.remove('opacity-0'); }
            this.container.querySelectorAll('.fc-back-sent-trans').forEach(el => this.textService.fitText(el, 14, 26));
        });
    }
}

export const flashcardApp = new FlashcardApp();
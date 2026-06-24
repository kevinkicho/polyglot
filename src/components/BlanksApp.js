import { BaseGameComponent } from './BaseGameComponent';
import { blanksService } from '../services/blanksService';
import { escapeHTML } from '../utils/sanitize';
import { aiService } from '../services/aiService';
import { generateBlankQuestion, getStrugglingWords } from '../services/aiContentService';

export class BlanksApp extends BaseGameComponent {
    constructor() {
        super();
        this.selectedAnswerId = null;
        this.playbackId = 0;
        this._aiGameId = 0;
    }

    next(id = null) {
        this._cancelAI();
        super.next(id);
    }

    prev() {
        this._cancelAI();
        super.prev();
    }

    random() {
        this._cancelAI();
        super.random();
    }

    mount(elementId) {
        super.mount(elementId);
        if (aiService.isAvailable()) {
            this.loadAIGame();
        } else {
            this.random();
        }
    }

    unmount() {
        this._cancelAI();
        super.unmount();
    }

    _cancelAI() {
        if (this._abortCtrl) {
            this._abortCtrl.abort();
            this._abortCtrl = null;
        }
        this._aiGameId++;
    }

    async loadAIGame() {
        const list = this.vocabService.getAll();
        if (!list || !list.length) { this.loadGame(); return; }

        if (!aiService.isAvailable()) { this.loadGame(); return; }

        const struggling = getStrugglingWords(list);
        if (!struggling.length) { this.loadGame(); return; }

        this._aiGameId++;
        const gameId = this._aiGameId;

        this.renderLoading();

        try {
            const abortCtrl = new AbortController();
            const timeout = setTimeout(() => abortCtrl.abort(), 15000);
            this._abortCtrl = abortCtrl;

            const candidates = struggling.sort(() => 0.5 - Math.random()).slice(0, 3);
            const s = this.settingsService.get();
            const eligibleOthers = list.filter(i => i.front?.main);

            const promises = candidates.map(word =>
                generateBlankQuestion(word, s.targetLang, { originLang: s.originLang, signal: abortCtrl.signal })
                    .then(q => ({ word, q }))
            );
            const settled = await Promise.allSettled(promises);
            clearTimeout(timeout);
            this._abortCtrl = null;
            const results = [];

            for (const res of settled) {
                if (res.status !== 'fulfilled' || !res.value.q) continue;
                const { word, q } = res.value;
                const others = eligibleOthers.filter(i => i.id !== word.id).sort(() => 0.5 - Math.random()).slice(0, 3);
                if (others.length < 3) continue;
                const choices = [word, ...others].sort(() => 0.5 - Math.random());
                results.push({
                    target: word,
                    choices,
                    sentence: q.sentence,
                    blankedSentence: q.blankedSentence,
                    answerWord: word.front?.main || '',
                    hint: q.hint,
                    culturalNote: q.culturalNote,
                    aiGenerated: true,
                });
            }

            if (this._aiGameId !== gameId) {
                this.loadGame();
                return;
            }

            if (!results.length) { this.loadGame(); return; }

            const chosen = results[Math.floor(Math.random() * results.length)];
            this.currentData = chosen;
            this.currentIndex = list.findIndex(i => i.id === chosen.target.id);
            if (this.currentIndex === -1) this.currentIndex = 0;

            if (window.saveGameHistory) {
                window.saveGameHistory('blanks', chosen.target.id);
            }
            this.render();
        } catch (err) {
            this._abortCtrl = null;
            if (this._aiGameId === gameId) this.loadGame();
        }
    }

    renderLoading() {
        if (!this.container) return;
        this.container.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full pt-20 px-6 text-center">
                <div class="w-10 h-10 border-4 border-indigo-200 dark:border-indigo-800 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin mb-4"></div>
                <div class="text-sm font-bold text-gray-400 dark:text-gray-500">Generating question...</div>
            </div>`;
    }

    async playBlankedSentence() {
        if (!this.currentData) return;
        this.playbackId++;
        const currentPid = this.playbackId;
        const { sentence } = this.currentData;
        const lang = this.settingsService.get().targetLang;
        if (!sentence) return;
        const parts = sentence.split(/_+/);
        if (parts.length > 1) {
            if (parts[0].trim()) await this.audioService.speak(parts[0], lang);
            if (this.playbackId !== currentPid) return;
            await new Promise(r => setTimeout(r, 800));
            if (this.playbackId !== currentPid) return;
            if (parts[1].trim()) await this.audioService.speak(parts[1], lang);
        } else {
            await this.audioService.speak(sentence, lang);
        }
    }

    handleOptionClick(id, el, choiceText) {
        if (this.isProcessing || window.wasLongPress) return;
        const settings = this.settingsService.get();
        const isConfirmationClick = (settings.blanksDoubleClick && this.selectedAnswerId === id);

        if (!isConfirmationClick && (settings.blanksAnswerAudio || settings.blanksDoubleClick)) {
            this.audioService.speak(choiceText, settings.targetLang);
        }
        if (settings.blanksDoubleClick) {
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
        if (correct) {
            el.classList.add('bg-green-500', 'border-green-600', 'text-white');
            el.classList.remove('bg-white', 'dark:bg-dark-card', 'text-gray-700', 'dark:text-white');
            this.scoreService.addScore('blanks', 10);
        } else {
            el.classList.add('bg-red-500', 'border-red-600', 'text-white');
            el.classList.remove('bg-white', 'dark:bg-dark-card', 'text-gray-700', 'dark:text-white');
        }
        if (correct) {
            const answerWord = this.currentData.answerWord;
            const fullSentence = this.currentData.sentence || this.currentData.target.back.sentenceTarget;
            const qBox = document.getElementById('blanks-question-box');
            if (qBox) {
                const pill = qBox.querySelector('.blank-pill');
                if (pill) {
                    pill.textContent = answerWord;
                    pill.classList.remove('border-dashed', 'bg-indigo-50', 'text-transparent', 'w-16', 'h-10');
                    pill.classList.add('text-indigo-600', 'dark:text-indigo-400', 'scale-110', 'px-2', 'h-auto');
                }
            }
            const s = this.settingsService.get();
            if (s.blanksAutoPlayCorrect) {
                if (s.waitForAudio) { await this.audioService.speak(fullSentence, s.targetLang); this.transitionTo(() => this.next()); }
                else { await this.audioService.speak(fullSentence, s.targetLang); this.setTimeout(() => this.transitionTo(() => this.next()), 500); }
            } else { this.setTimeout(() => this.transitionTo(() => this.next()), 1000); }
        } else {
            this.isProcessing = false;
            this.selectedAnswerId = null;
        }
    }

    render() {
        if (!this.container) return;
        if (!this.currentData || !this.currentData.target) {
            if (this.vocabService.getAll().length > 0) { this.loadGame(); } else { this.renderError('No Data Available', 'blanks'); }
            return;
        }

        const { target, choices, sentence, blankedSentence, answerWord, hint, culturalNote, aiGenerated } = this.currentData;
        let rawSentence = aiGenerated ? (blankedSentence || sentence || '') : (sentence || blankedSentence || "");
        const s = this.settingsService.get();
        const originLangKey = `${s.originLang}_ex`;
        let translationText = target[originLangKey] || target.back.sentenceOrigin || target.back.definition || "";
        if (hint && aiGenerated) translationText = hint;

        if (!rawSentence.includes('_') && answerWord) {
            rawSentence = rawSentence.replace(answerWord, '______');
        }

        const pillHtml = `<span class="blank-pill inline-flex items-center justify-center border-2 border-dashed border-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 dark:border-indigo-700 rounded-lg mx-1 w-16 h-10 align-middle text-transparent transition-all duration-300 overflow-hidden select-none"><span class="text-indigo-300 dark:text-indigo-700 text-sm font-bold">?</span></span>`;

        // Smart sentence breaking: split into phrase chunks at natural language boundaries
        const chunks = this.textService.smartSentenceBreak(rawSentence);
        const displayHtml = chunks.map(chunk => {
            const hasBlank = /_+/.test(chunk);
            let html;
            if (hasBlank) {
                html = chunk.split(/_+/).map(p => escapeHTML(p)).join(pillHtml);
            } else {
                html = escapeHTML(chunk);
            }
            return `<span class="phrase-chunk">${html}</span>`;
        }).join(' ');

        const jaClass = s.targetLang === 'ja' ? 'text-ja-wrap' : '';

        this.container.innerHTML = `
            ${this.renderHeader({ prefix: 'blanks', id: target.id, color: 'teal', showRandom: true })}

            <div class="w-full h-full pt-20 landscape:pt-12 pb-28 landscape:pb-14 px-4 landscape:px-3 max-w-6xl mx-auto flex flex-col gap-4 landscape:gap-2">
                ${this.renderSplitLayout(
                    `<div id="blanks-question-box" class="w-full flex-1 bg-white dark:bg-dark-card rounded-[2rem] landscape:rounded-2xl shadow-xl border-2 border-indigo-100 dark:border-dark-border p-4 landscape:p-2 flex flex-col relative cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                         <div class="w-full py-2 px-1 text-center flex-none min-h-[2rem] flex items-center justify-center">
                             <span class="question-text text-sm landscape:text-xs font-bold text-gray-500 dark:text-gray-400">${escapeHTML(translationText)}</span>
                         </div>
                         <div class="flex-grow flex items-center justify-center p-4 landscape:p-2">
                             <div class="sentence-text text-2xl md:text-3xl landscape:text-xl font-medium text-gray-800 dark:text-white text-center leading-relaxed w-full ${jaClass}">${displayHtml}</div>
                         </div>
                         ${culturalNote ? `<div class="flex-none px-2 pb-1 text-center"><span class="text-[10px] landscape:text-[9px] text-gray-400 dark:text-gray-500 italic">${escapeHTML(culturalNote)}</span></div>` : ''}
                     </div>`,
                    `<div class="w-full flex-1 grid grid-cols-2 grid-rows-2 gap-2 landscape:gap-1.5 min-h-0">
                        ${choices.map(c => `
                            <button class="quiz-option bg-white dark:bg-dark-card border-2 border-transparent rounded-2xl landscape:rounded-xl shadow-sm hover:shadow-md flex items-center justify-center p-2 landscape:p-1 overflow-hidden" data-id="${c.id}">
                                <div class="option-text font-bold text-gray-700 dark:text-white text-center leading-tight whitespace-nowrap w-full" data-fit="true">${this.textService.smartWrap(c.front.main)}</div>
                            </button>
                        `).join('')}
                    </div>`
                )}
            </div>

            <div class="fixed bottom-0 left-0 right-0 p-6 landscape:p-1.5 z-40 bg-gradient-to-t from-gray-100 via-gray-100 to-transparent dark:from-dark-bg"><div class="max-w-md mx-auto flex gap-4 landscape:gap-2"><button id="blanks-prev-btn" class="flex-1 h-16 landscape:h-9 bg-white border border-gray-200 rounded-3xl landscape:rounded-xl shadow-sm flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 landscape:h-5 landscape:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg></button><button id="blanks-next-btn" class="flex-1 h-16 landscape:h-9 bg-indigo-600 text-white rounded-3xl landscape:rounded-xl shadow-xl flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 landscape:h-5 landscape:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg></button></div></div>
        `;

        this.bindCommonEvents('blanks');

        this.bind('#blanks-question-box', 'click', () => {
            if (!this.isProcessing && !window.wasLongPress) {
                this.audioService.stop();
                this.playBlankedSentence();
            }
        });

        this.container.querySelectorAll('.quiz-option').forEach(btn => btn.addEventListener('click', (e) => {
            const text = btn.querySelector('.option-text').innerText;
            this.handleOptionClick(parseInt(e.currentTarget.dataset.id), e.currentTarget, text);
        }));

        this.raf(() => {
            if (!this.container) return;
            this.textService.fitText(this.container.querySelector('.question-text'), 12, 18);
            this.textService.fitSentence(this.container.querySelector('.sentence-text'), 14, 42);
            this.container.querySelectorAll('.option-text').forEach(el => {
                this.textService.fitText(el, 16, 42);
            });
        });

        if (s.autoPlay) {
            this.setTimeout(() => this.playBlankedSentence(), 300);
        }
    }
}
export const blanksApp = new BlanksApp();

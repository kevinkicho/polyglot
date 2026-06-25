import { BaseGameComponent } from './BaseGameComponent';
import { aiService } from '../services/aiService';
import { generateListeningPassage, generateComprehensionQuestions, generateCulturalNote, getStrugglingWords } from '../services/aiContentService';
import { escapeHTML } from '../utils/sanitize';

export class ListeningApp extends BaseGameComponent {
    constructor() {
        super();
        this.isPlaying = false;
        this.passageText = '';
        this.userTranscript = '';
        this.comprehensionQuestions = [];
        this.currentQuestionIndex = 0;
        this.comprehensionScore = 0;
        this.difficulty = 1;
        this.hintLevel = 0;
        this.culturalNote = null;
        this.mnemonic = null;
        this.phase = 'loading';
        this._abortCtrl = null;
        this._compAbortCtrl = null;
        this._cultureAbortCtrl = null;
    }

    mount(elementId) {
        super.mount(elementId);
        if (!this.currentData) this.random();
        else this.render();
    }

    playAudio() {
        if (this.currentData && this.currentData.target) {
            this.isPlaying = true;
            this.renderButtonState();
            const text = this.passageText || this.currentData.target.front.main;
            this.audioService.speak(text, this.settingsService.get().targetLang)
                .then(() => {
                    this.isPlaying = false;
                    this.renderButtonState();
                });
        }
    }

    async loadGame() {
        this.isProcessing = false;
        this.comprehensionQuestions = [];
        this.currentQuestionIndex = 0;
        this.comprehensionScore = 0;
        this.culturalNote = null;
        const list = this.vocabService.getAll();
        if (!list || !list.length) return;

        if (aiService.isAvailable()) {
            await this.loadAIGame(list);
        } else {
            this.loadLocalGame(list);
        }
    }

    loadLocalGame(list) {
        const target = list[this.currentIndex];
        const others = list.filter(i => i.id !== target.id).sort(() => 0.5 - Math.random()).slice(0, 3);
        const choices = [target, ...others].sort(() => 0.5 - Math.random());

        this.currentData = { target, choices };
        this.passageText = '';
        this.phase = 'choices';
        this.render();
        if (this.settingsService.get().autoPlay) this.setTimeout(() => this.playAudio(), 500);
    }

    async loadAIGame(list) {
        this._abortCtrl = new AbortController();
        const ctrl = this._abortCtrl;
        const timeout = setTimeout(() => ctrl.abort(), 15000);

        this.phase = 'loading';
        this.renderLoading();

        const struggling = getStrugglingWords(list);
        if (!struggling.length) {
            clearTimeout(timeout);
            this._abortCtrl = null;
            this.loadLocalGame(list);
            return;
        }

        const targetWord = struggling[Math.floor(Math.random() * struggling.length)];
        const s = this.settingsService.get();

        try {
            const result = await generateListeningPassage(targetWord, s.targetLang, {
                originLang: s.originLang,
                signal: ctrl.signal,
            });

            clearTimeout(timeout);

            if (this._abortCtrl !== ctrl) return;
            this._abortCtrl = null;

            if (!result) {
                this.loadLocalGame(list);
                return;
            }

            const others = list.filter(i => i.id !== targetWord.id && i.front?.main).sort(() => 0.5 - Math.random()).slice(0, 3);
            const wrongChoices = (result.wrongAnswers || []).slice(0, 3);
            let choices;

            if (others.length >= 3) {
                const correctChoice = { id: targetWord.id, front: targetWord.front, back: targetWord.back };
                const distractorChoices = others.slice(0, 3).map(o => ({ id: o.id, front: o.front, back: o.back }));
                choices = [correctChoice, ...distractorChoices].sort(() => 0.5 - Math.random());
            } else {
                const correctChoice = { id: targetWord.id, front: targetWord.front, back: targetWord.back };
                const fallbacks = list.filter(i => i.id !== targetWord.id).sort(() => 0.5 - Math.random()).slice(0, 3);
                choices = [correctChoice, ...fallbacks].sort(() => 0.5 - Math.random());
            }

            this.currentData = { target: targetWord, choices };
            this.passageText = result.passage;
            this.culturalNote = result.contextClue || null;
            this.phase = 'passage';

            this.render();
            this.audioService.speak(result.passage, s.targetLang);
        } catch (err) {
            clearTimeout(timeout);
            this._abortCtrl = null;
            this.loadLocalGame(list);
        }
    }

    submitTranscript() {
        const input = this.container?.querySelector('#transcript-input');
        if (!input) return;
        this.userTranscript = input.value.trim();
        if (!this.userTranscript || !this.passageText) return;
        this.phase = 'transcript-submitted';
        this.render();
    }

    async loadComprehensionQuestions() {
        if (!this.passageText || !aiService.isAvailable()) {
            this.phase = 'choices';
            this.render();
            return;
        }

        this._compAbortCtrl = new AbortController();
        const compCtrl = this._compAbortCtrl;
        const timeout = setTimeout(() => compCtrl.abort(), 15000);

        this.phase = 'loading-questions';
        this.renderLoading('Generating questions...');

        try {
            const s = this.settingsService.get();
            const questions = await generateComprehensionQuestions(this.passageText, s.targetLang, {
                originLang: s.originLang,
                signal: compCtrl.signal,
            });

            clearTimeout(timeout);

            if (this._compAbortCtrl !== compCtrl) return;
            this._compAbortCtrl = null;

            if (questions && questions.length > 0) {
                this.comprehensionQuestions = questions;
                this.currentQuestionIndex = 0;
                this.comprehensionScore = 0;
                this.phase = 'comprehension';
            } else {
                this.phase = 'choices';
            }

            this.render();
        } catch (err) {
            clearTimeout(timeout);
            this._compAbortCtrl = null;
            this.phase = 'choices';
            this.render();
        }
    }

    handleComprehensionAnswer(choiceIndex) {
        if (this.isProcessing) return;
        this.isProcessing = true;

        const question = this.comprehensionQuestions[this.currentQuestionIndex];
        if (!question) return;

        const isCorrect = choiceIndex === question.correctIndex;
        if (isCorrect) this.comprehensionScore++;

        const buttons = this.container?.querySelectorAll('.comp-choice-btn');
        buttons?.forEach((btn, i) => {
            btn.disabled = true;
            if (i === question.correctIndex) {
                btn.classList.remove('bg-white', 'dark:bg-dark-card');
                btn.classList.add('bg-green-500', 'text-white', 'border-green-600');
            } else if (i === choiceIndex && !isCorrect) {
                btn.classList.remove('bg-white', 'dark:bg-dark-card');
                btn.classList.add('bg-red-500', 'text-white', 'border-red-600');
            }
        });

        this.setTimeout(() => {
            this.isProcessing = false;
            if (this.currentQuestionIndex < this.comprehensionQuestions.length - 1) {
                this.currentQuestionIndex++;
                this.render();
            } else {
                this.phase = 'comprehension-results';
                this.render();
            }
        }, 1200);
    }

    async showCulturalNote() {
        if (!this.passageText || !aiService.isAvailable()) return;

        this._cultureAbortCtrl = new AbortController();
        const cultureCtrl = this._cultureAbortCtrl;
        const timeout = setTimeout(() => cultureCtrl.abort(), 15000);

        const noteEl = this.container?.querySelector('#cultural-note-area');
        if (noteEl) {
            noteEl.innerHTML = `<div class="flex items-center justify-center py-3"><div class="w-6 h-6 border-3 border-indigo-200 dark:border-indigo-800 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin"></div><span class="ml-2 text-sm text-gray-400">Loading note...</span></div>`;
        }

        try {
            const s = this.settingsService.get();
            const note = await generateCulturalNote(this.passageText, s.targetLang, {
                originLang: s.originLang,
                signal: cultureCtrl.signal,
            });

            clearTimeout(timeout);

            if (this._cultureAbortCtrl !== cultureCtrl) return;
            this._cultureAbortCtrl = null;

            if (noteEl) {
                if (note && note.note) {
                    this.culturalNote = note;
                    noteEl.innerHTML = `
                        <div class="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 rounded-xl p-4 mt-2">
                            <div class="text-sm font-bold text-indigo-600 dark:text-indigo-400 mb-1">Cultural Note</div>
                            <div class="text-sm text-gray-700 dark:text-gray-300">${escapeHTML(note.note)}</div>
                            ${note.relatedPhrase ? `<div class="mt-2 text-sm text-indigo-500 dark:text-indigo-300 font-medium">💬 ${escapeHTML(note.relatedPhrase)}</div>` : ''}
                        </div>`;
                } else {
                    noteEl.innerHTML = `<div class="text-sm text-gray-400 py-2">Could not generate a cultural note.</div>`;
                }
            }

            const btn = this.container?.querySelector('#show-cultural-note-btn');
            if (btn) btn.disabled = true;
        } catch (err) {
            clearTimeout(timeout);
            this._cultureAbortCtrl = null;
            if (noteEl) {
                noteEl.innerHTML = `<div class="text-sm text-gray-400 py-2">Could not generate a cultural note.</div>`;
            }
        }
    }

    unmount() {
        this._abortCtrl?.abort();
        this._abortCtrl = null;
        this._compAbortCtrl?.abort();
        this._compAbortCtrl = null;
        this._cultureAbortCtrl?.abort();
        this._cultureAbortCtrl = null;
        super.unmount();
    }

    renderLoading(message = 'Generating passage...') {
        if (!this.container) return;
        this.container.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full pt-20 px-6 text-center">
                <div class="w-10 h-10 border-4 border-indigo-200 dark:border-indigo-800 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin mb-4"></div>
                <div class="text-sm font-bold text-gray-400 dark:text-gray-500">${escapeHTML(message)}</div>
            </div>`;
    }

    handleChoice(id, el) {
        if (this.isProcessing) return;
        this.isProcessing = true;

        const isCorrect = id === this.currentData.target.id;
        this.recordAnswer(this.currentData.target.id, isCorrect);
        if (isCorrect) {
            el.classList.remove('bg-white', 'dark:bg-dark-card');
            el.classList.add('bg-green-500', 'text-white', 'border-green-600');
            this.scoreService.addScore('listening', 10);
            el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.05)', offset: 0.5 }, { transform: 'scale(1)' }], { duration: 300 });
            this.setTimeout(() => this.transitionTo(() => this.next()), 1000);
        } else {
            el.classList.remove('bg-white', 'dark:bg-dark-card');
            el.classList.add('bg-red-500', 'text-white', 'border-red-600');
            el.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-5px)', offset: 0.2 }, { transform: 'translateX(5px)', offset: 0.4 }, { transform: 'translateX(-5px)', offset: 0.6 }, { transform: 'translateX(5px)', offset: 0.8 }, { transform: 'translateX(0)' }], { duration: 400 });
            this.isProcessing = false;
        }
    }

    renderButtonState() {
        if (!this.container) return;
        const btn = this.container.querySelector('#listening-play-btn');
        const icon = this.container.querySelector('#listening-play-icon');
        if (!btn || !icon) return;
        if (this.isPlaying) { btn.classList.add('ring-4', 'ring-indigo-300', 'scale-110'); icon.classList.add('animate-pulse'); }
        else { btn.classList.remove('ring-4', 'ring-indigo-300', 'scale-110'); icon.classList.remove('animate-pulse'); }
    }

    next(id = null) {
        this.isProcessing = false;
        this.audioService.stop();
        this._abortCtrl?.abort();
        this._abortCtrl = null;
        this._compAbortCtrl?.abort();
        this._compAbortCtrl = null;
        this._cultureAbortCtrl?.abort();
        this._cultureAbortCtrl = null;
        super.next(id);
    }

    prev() {
        this.isProcessing = false;
        this.audioService.stop();
        this._abortCtrl?.abort();
        this._abortCtrl = null;
        this._compAbortCtrl?.abort();
        this._compAbortCtrl = null;
        this._cultureAbortCtrl?.abort();
        this._cultureAbortCtrl = null;
        super.prev();
    }

    render() {
        if (!this.container || !this.currentData) return;

        switch (this.phase) {
            case 'passage': this.renderPassage(); break;
            case 'transcript': this.renderTranscript(); break;
            case 'transcript-submitted': this.renderTranscriptResult(); break;
            case 'loading-questions': break;
            case 'comprehension': this.renderComprehension(); break;
            case 'comprehension-results': this.renderComprehensionResults(); break;
            default: this.renderChoices(); break;
        }
    }

    renderPassage() {
        const { target } = this.currentData;
        this.renderChoices(true);
    }

    renderTranscript() {
        const { target } = this.currentData;
        this.container.innerHTML = `
            ${this.renderHeader({ prefix: 'listening', id: target.id, color: 'indigo', showRandom: true })}
            <div class="w-full h-full pt-20 landscape:pt-12 pb-10 landscape:pb-4 px-6 landscape:px-3 max-w-6xl mx-auto flex flex-col justify-center">
                ${this.renderCategoryPills({ color: 'indigo' })}
                <div class="flex-1 flex flex-col items-center justify-center gap-4">
                    <button id="listening-play-btn" class="w-20 h-20 landscape:w-16 landscape:h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-2xl flex items-center justify-center transform transition-all active:scale-95 hover:shadow-indigo-500/50">
                        <svg id="listening-play-icon" xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 landscape:h-8 landscape:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        </svg>
                    </button>
                    <p class="text-xs text-gray-400 font-bold uppercase tracking-widest animate-pulse">Replay Audio</p>
                    <textarea id="transcript-input" rows="3" class="w-full max-w-lg mx-auto p-4 rounded-2xl border-2 border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card text-gray-700 dark:text-white text-base focus:outline-none focus:border-indigo-400 resize-none" placeholder="Type what you heard..."></textarea>
                    <button id="submit-transcript-btn" class="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg hover:bg-indigo-700 active:scale-95 transition-all">Submit</button>
                </div>
            </div>`;
        this.bindCommonEvents('listening');
        this.bind('#listening-play-btn', 'click', () => this.playAudio());
        this.bind('#submit-transcript-btn', 'click', () => this.submitTranscript());
    }

    renderTranscriptResult() {
        const { target } = this.currentData;
        const userText = this.userTranscript;
        const correctText = this.passageText;

        this.container.innerHTML = `
            ${this.renderHeader({ prefix: 'listening', id: target.id, color: 'indigo', showRandom: true })}
            <div class="w-full h-full pt-20 landscape:pt-12 pb-10 landscape:pb-4 px-6 landscape:px-3 max-w-6xl mx-auto flex flex-col justify-center">
                ${this.renderCategoryPills({ color: 'indigo' })}
                <div class="flex-1 flex flex-col gap-4 overflow-y-auto">
                    <div class="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-2xl p-4">
                        <div class="text-xs font-bold text-green-600 dark:text-green-400 mb-1 uppercase tracking-wider">Correct</div>
                        <div class="text-base text-gray-700 dark:text-gray-200">${escapeHTML(correctText)}</div>
                    </div>
                    <div class="bg-white dark:bg-dark-card border-2 border-gray-100 dark:border-dark-border rounded-2xl p-4">
                        <div class="text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Your Answer</div>
                        <div class="text-base text-gray-700 dark:text-gray-200">${escapeHTML(userText)}</div>
                    </div>
                    ${this.culturalNote ? `<div class="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-2xl p-4">
                        <div class="text-xs font-bold text-indigo-500 mb-1 uppercase tracking-wider">Hint</div>
                        <div class="text-sm text-gray-600 dark:text-gray-300">${escapeHTML(typeof this.culturalNote === 'string' ? this.culturalNote : this.culturalNote.note)}</div>
                    </div>` : ''}
                    <div class="flex flex-col gap-2 mt-2">
                        ${aiService.isAvailable() && this.passageText ? `<button id="start-comprehension-btn" class="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg hover:bg-indigo-700 active:scale-95 transition-all">Test Comprehension</button>` : ''}
                        <button id="skip-to-choices-btn" class="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-2xl font-bold hover:bg-gray-300 dark:hover:bg-gray-600 active:scale-95 transition-all">Skip to Word Choices</button>
                    </div>
                </div>
            </div>`;
        this.bindCommonEvents('listening');
        this.bind('#start-comprehension-btn', 'click', () => this.loadComprehensionQuestions());
        this.bind('#skip-to-choices-btn', 'click', () => { this.phase = 'choices'; this.render(); });
    }

    renderComprehension() {
        const { target } = this.currentData;
        const question = this.comprehensionQuestions[this.currentQuestionIndex];
        if (!question) { this.phase = 'choices'; this.render(); return; }

        const qNum = this.currentQuestionIndex + 1;
        const total = this.comprehensionQuestions.length;

        this.container.innerHTML = `
            ${this.renderHeader({ prefix: 'listening', id: target.id, color: 'indigo', showRandom: true })}
            <div class="w-full h-full pt-20 landscape:pt-12 pb-10 landscape:pb-4 px-6 landscape:px-3 max-w-6xl mx-auto flex flex-col justify-center">
                ${this.renderCategoryPills({ color: 'indigo' })}
                <div class="flex-1 flex flex-col items-center justify-center gap-4">
                    <div class="text-sm font-bold text-indigo-500">Question ${qNum} of ${total}</div>
                    <div class="text-lg font-bold text-gray-700 dark:text-white text-center px-4">${escapeHTML(question.question)}</div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-2 w-full max-w-lg">
                        ${question.choices.map((choice, i) => `
                            <button class="comp-choice-btn bg-white dark:bg-dark-card border-2 border-gray-100 dark:border-dark-border p-4 rounded-2xl shadow-sm hover:shadow-md text-base font-bold text-gray-700 dark:text-white transition-all active:scale-95 text-left" data-index="${i}">
                                <span class="w-full text-center block">${escapeHTML(choice)}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>`;
        this.bindCommonEvents('listening');
        this.container.querySelectorAll('.comp-choice-btn').forEach(btn => {
            btn.addEventListener('click', () => this.handleComprehensionAnswer(parseInt(btn.dataset.index)));
        });
    }

    renderComprehensionResults() {
        const { target } = this.currentData;
        const total = this.comprehensionQuestions.length;
        const pct = total ? Math.round((this.comprehensionScore / total) * 100) : 0;

        this.container.innerHTML = `
            ${this.renderHeader({ prefix: 'listening', id: target.id, color: 'indigo', showRandom: true })}
            <div class="w-full h-full pt-20 landscape:pt-12 pb-10 landscape:pb-4 px-6 landscape:px-3 max-w-6xl mx-auto flex flex-col justify-center">
                ${this.renderCategoryPills({ color: 'indigo' })}
                <div class="flex-1 flex flex-col items-center justify-center gap-4">
                    <div class="text-4xl font-black ${pct >= 70 ? 'text-green-500' : pct >= 40 ? 'text-yellow-500' : 'text-red-500'}">${pct}%</div>
                    <div class="text-lg font-bold text-gray-600 dark:text-gray-300">${this.comprehensionScore} / ${total} correct</div>
                    <div id="cultural-note-area"></div>
                    ${aiService.isAvailable() && this.passageText ? `<button id="show-cultural-note-btn" class="px-6 py-3 bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 rounded-2xl font-bold hover:bg-indigo-200 dark:hover:bg-indigo-800 active:scale-95 transition-all">Show Cultural Note</button>` : ''}
                    <button id="continue-to-choices-btn" class="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg hover:bg-indigo-700 active:scale-95 transition-all">Continue to Word Choices</button>
                </div>
            </div>`;
        this.bindCommonEvents('listening');
        this.bind('#continue-to-choices-btn', 'click', () => { this.phase = 'choices'; this.render(); });
        this.bind('#show-cultural-note-btn', 'click', () => this.showCulturalNote());
    }

    renderChoices(showTranscriptOption = false) {
        const { target, choices } = this.currentData;
        const getLabel = (item) => item.back.definition || item.back.main || "???";

        let transcriptBtnHtml = '';
        if (showTranscriptOption && this.passageText) {
            transcriptBtnHtml = `<button id="transcribe-btn" class="px-4 py-2 bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 rounded-xl text-sm font-bold hover:bg-purple-200 dark:hover:bg-purple-800 active:scale-95 transition-all mb-3">Type What You Heard</button>`;
        }

        this.container.innerHTML = `
            ${this.renderHeader({ prefix: 'listening', id: target.id, color: 'indigo', showRandom: true })}

            <div class="w-full h-full pt-20 landscape:pt-12 pb-10 landscape:pb-4 px-6 landscape:px-3 max-w-6xl mx-auto flex flex-col justify-center">
                ${this.renderCategoryPills({ color: 'indigo' })}
                ${this.renderSplitLayout(
                    `<div class="flex-1 flex flex-col items-center justify-center">
                        <button id="listening-play-btn" class="w-32 h-32 landscape:w-20 landscape:h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-2xl flex items-center justify-center transform transition-all active:scale-95 hover:shadow-indigo-500/50">
                            <svg id="listening-play-icon" xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 landscape:h-10 landscape:w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                            </svg>
                        </button>
                        <p class="mt-4 landscape:mt-2 text-gray-400 font-bold uppercase tracking-widest text-xs animate-pulse">Tap to Listen</p>
                        ${transcriptBtnHtml}
                    </div>`,
                    `<div class="grid grid-cols-1 md:grid-cols-2 gap-2 landscape:gap-1.5 pb-8 landscape:pb-2 w-full landscape:justify-center landscape:content-center landscape:h-full">
                        ${choices.map(c => `
                            <button class="choice-btn bg-white dark:bg-dark-card border-2 border-gray-100 dark:border-dark-border p-4 landscape:p-2 rounded-2xl landscape:rounded-xl shadow-sm hover:shadow-md text-xl landscape:text-base font-bold text-gray-700 dark:text-white transition-all active:scale-95 text-left flex items-center overflow-hidden" data-id="${c.id}">
                                <span class="choice-text w-full px-2 leading-relaxed text-center">${this.textService.smartWrap(getLabel(c))}</span>
                            </button>
                        `).join('')}
                    </div>`
                )}
            </div>
        `;

        this.bindCommonEvents('listening');
        this.bind('#listening-play-btn', 'click', () => this.playAudio());
        this.container.querySelectorAll('.choice-btn').forEach(btn => btn.addEventListener('click', (e) => this.handleChoice(parseInt(e.currentTarget.dataset.id), e.currentTarget)));

        if (showTranscriptOption && this.passageText) {
            this.bind('#transcribe-btn', 'click', () => { this.phase = 'transcript'; this.render(); });
        }

        this.fitTexts([
            ['.choice-text', 18, 45]
        ]);
    }
}
export const listeningApp = new ListeningApp();
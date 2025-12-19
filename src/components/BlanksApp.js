import { vocabService } from '../services/vocabService';
import { blanksService } from '../services/blanksService';
import { textService } from '../services/textService';
import { audioService } from '../services/audioService';
import { settingsService } from '../services/settingsService';
import { scoreService } from '../services/scoreService'; // New Import

export class BlanksApp {
    constructor() { 
        this.container = null; 
        this.currentData = null; 
        this.isProcessing = false;
        this.selectedAnswerId = null;
        this.playbackId = 0; 
    }

    mount(elementId) { 
        this.container = document.getElementById(elementId); 
        if(!this.currentData) this.random(); 
        else this.render(); 
    }

    bind(selector, event, handler) {
        if (!this.container) return;
        const el = this.container.querySelector(selector);
        if (el) el.addEventListener(event, handler);
    }

    random() { 
        this.isProcessing = false;
        this.selectedAnswerId = null;
        audioService.stop();
        this.currentData = blanksService.generateQuestion(null); 
        this.render(); 
    }
    
    next(id = null) { 
        this.isProcessing = false;
        this.selectedAnswerId = null;
        audioService.stop();
        if(id===null && this.currentData) {
            const l=vocabService.getAll(); 
            const currentId = this.currentData.target ? this.currentData.target.id : 0;
            const i=vocabService.findIndexById(currentId);
            id=l[(i+1)%l.length].id;
        }
        this.currentData=blanksService.generateQuestion(id);
        if(this.currentData && this.currentData.target && window.saveGameHistory) {
            window.saveGameHistory('blanks', this.currentData.target.id);
        }
        this.render();
    }
    
    prev() { 
        if(this.currentData && this.currentData.target) { 
            const l=vocabService.getAll(); 
            const i=vocabService.findIndexById(this.currentData.target.id); 
            this.next(l[(i-1+l.length)%l.length].id); 
        } 
    }

    renderError() {
        if (this.container) {
            this.container.innerHTML = `<div class="p-10 text-center text-white pt-24">No Data.</div>`;
            this.bind('#blanks-close-err', 'click', () => window.dispatchEvent(new CustomEvent('router:home')));
        }
    }

    async playBlankedSentence() {
        this.playbackId++;
        const currentPid = this.playbackId;

        const { sentence } = this.currentData;
        const lang = settingsService.get().targetLang;
        
        if (!sentence) return;
        const parts = sentence.split(/_+/);

        if (parts.length > 1) {
            if (parts[0].trim()) await audioService.speak(parts[0], lang);
            if (this.playbackId !== currentPid) return; 
            
            await new Promise(r => setTimeout(r, 800));
            if (this.playbackId !== currentPid) return; 
            
            if (parts[1].trim()) await audioService.speak(parts[1], lang);
        } else {
            await audioService.speak(sentence, lang);
        }
    }

    handleOptionClick(id, el, choiceText) {
        if (this.isProcessing || window.wasLongPress) return;

        const settings = settingsService.get();

        const isConfirmationClick = (settings.blanksDoubleClick && this.selectedAnswerId === id);

        if (!isConfirmationClick && (settings.blanksAnswerAudio || settings.blanksDoubleClick)) {
            audioService.speak(choiceText, settings.targetLang);
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
            // SCORING: +10 on win
            scoreService.addScore('blanks', 10);
        } else {
            el.classList.add('bg-red-500', 'border-red-600', 'text-white');
            el.classList.remove('bg-white', 'dark:bg-dark-card', 'text-gray-700', 'dark:text-white');
        }

        if(correct) {
            const answerWord = this.currentData.answerWord;
            const fullSentence = this.currentData.target.back.sentenceTarget;

            const qBox = document.getElementById('blanks-question-box');
            if(qBox) {
                const pillText = qBox.querySelector('.pill-text');
                const pillSpan = qBox.querySelector('.blank-pill');
                if (pillText && pillSpan) {
                    pillText.classList.remove('text-transparent');
                    pillText.classList.add('text-indigo-600', 'dark:text-indigo-400');
                    pillSpan.classList.remove('border-b-2', 'border-gray-400', 'dark:border-gray-600');
                    pillSpan.classList.add('scale-110', 'transition-transform');
                }
            }

            const s = settingsService.get();
            if (s.blanksAutoPlayCorrect) {
                if (s.waitForAudio) {
                    await audioService.speak(fullSentence, s.targetLang);
                    this.next();
                } else {
                    audioService.speak(fullSentence, s.targetLang);
                    setTimeout(() => this.next(), 1500);
                }
            } else {
                setTimeout(() => this.next(), 1000);
            }
        } else {
            this.isProcessing = false;
            this.selectedAnswerId = null;
        }
    }

    render() {
        if(!this.container) return;
        if(!this.currentData || !this.currentData.target) { this.renderError(); return; }
        
        const { target, choices, sentence, blankedSentence, answerWord } = this.currentData;
        const rawSentence = sentence || blankedSentence || "";
        
        const s = settingsService.get();
        const originLangKey = `${s.originLang}_ex`; 
        
        const translationText = target[originLangKey] 
            || target.back.sentenceOrigin 
            || target.back.definition 
            || "Fill in the blank";
        
        const pillHtml = `<span class="blank-pill inline-block border-b-2 border-gray-400 dark:border-gray-600 mx-1"><span class="pill-text text-transparent font-bold">${answerWord}</span></span>`;
        
        const displayHtml = rawSentence.replace(/_+/g, pillHtml);
        
        this.container.innerHTML = `
            <div class="fixed top-0 left-0 right-0 h-16 z-40 px-4 flex justify-between items-center bg-gray-100/90 dark:bg-dark-bg/90 backdrop-blur-sm border-b border-white/10">
                <div class="flex items-center gap-2"><div class="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-full pl-1 pr-3 py-1 flex items-center shadow-sm"><span class="bg-teal-100 text-teal-600 text-xs font-bold px-2 py-1 rounded-full mr-2">ID</span><input type="number" id="blanks-id-input" class="w-12 bg-transparent border-none text-center font-bold text-gray-700 dark:text-white text-sm p-0" value="${target.id}"></div>
                <button class="game-edit-btn header-icon-btn bg-gray-200 dark:bg-gray-800 rounded-full text-gray-500 hover:text-indigo-600"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg></button></div>
                <div class="flex items-center gap-2">
                    <button id="score-pill" class="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-full px-3 py-1 flex items-center gap-2 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <span class="text-base">🏆</span>
                        <span class="font-black text-gray-700 dark:text-white text-sm global-score-display">${scoreService.todayScore}</span>
                    </button>

                    <button id="blanks-random-btn" class="header-icon-btn bg-white dark:bg-dark-card border border-gray-200 rounded-xl text-indigo-500 shadow-sm"><svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg></button>
                    <button id="blanks-close-btn" class="header-icon-btn bg-red-50 text-red-500 rounded-full shadow-sm"><svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
                </div>
            </div>
            <div class="w-full h-full pt-20 pb-28 px-4 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
                <div id="blanks-question-box" class="w-full h-full bg-white dark:bg-dark-card rounded-[2rem] shadow-xl border-2 border-indigo-100 dark:border-dark-border p-4 flex flex-col relative cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <div class="w-full py-2 px-1 text-center border-b border-gray-100 dark:border-white/5 flex-none min-h-[3rem] flex items-center justify-center">
                        <span class="text-sm font-bold text-gray-500 dark:text-gray-400" data-fit="true" data-wrap="true" data-type="hint">${translationText}</span>
                    </div>
                    <div class="flex-grow flex items-center justify-center p-4">
                        <div class="text-2xl md:text-3xl font-medium text-gray-800 dark:text-white text-center leading-relaxed w-full" data-fit="true" data-wrap="true">${displayHtml}</div>
                    </div>
                </div>
                <div class="w-full h-full grid grid-cols-2 grid-rows-2 gap-3">
                    ${choices.map(c => `<button class="quiz-option bg-white dark:bg-dark-card border-2 border-transparent rounded-2xl shadow-sm hover:shadow-md flex items-center justify-center" data-id="${c.id}"><div class="text-lg font-bold text-gray-700 dark:text-white text-center" data-fit="true">${c.front.main}</div></button>`).join('')}
                </div>
            </div>
            <div class="fixed bottom-0 left-0 right-0 p-6 z-40 bg-gradient-to-t from-gray-100 via-gray-100 to-transparent dark:from-dark-bg"><div class="max-w-md mx-auto flex gap-4"><button id="blanks-prev-btn" class="flex-1 h-16 bg-white border border-gray-200 rounded-3xl shadow-sm flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg></button><button id="blanks-next-btn" class="flex-1 h-16 bg-indigo-600 text-white rounded-3xl shadow-xl flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg></button></div></div>
        `;

        this.bind('#blanks-next-btn', 'click', () => this.next());
        this.bind('#blanks-prev-btn', 'click', () => this.prev());
        this.bind('#blanks-random-btn', 'click', () => this.random());
        this.bind('#blanks-close-btn', 'click', () => window.dispatchEvent(new CustomEvent('router:home')));
        this.bind('#blanks-id-input', 'change', (e) => { const newId = parseInt(e.target.value); vocabService.findIndexById(newId) !== -1 ? this.next(newId) : alert('ID not found'); });
        
        this.bind('#blanks-question-box', 'click', () => {
            if (!this.isProcessing && !window.wasLongPress) {
                audioService.stop();
                this.playBlankedSentence();
            }
        });

        this.container.querySelectorAll('.quiz-option').forEach(btn => btn.addEventListener('click', (e) => {
            const text = btn.querySelector('[data-fit="true"]').innerText;
            this.handleOptionClick(parseInt(e.currentTarget.dataset.id), e.currentTarget, text);
        }));
        
        requestAnimationFrame(() => this.container.querySelectorAll('[data-fit="true"]').forEach(el => textService.fitText(el)));

        if (settingsService.get().autoPlay) {
            setTimeout(() => this.playBlankedSentence(), 300);
        }
    }
}
export const blanksApp = new BlanksApp();

import { blanksService } from '../services/blanksService';
import { textService } from '../services/textService';
import { audioService } from '../services/audioService';
import { settingsService } from '../services/settingsService';
import { vocabService } from '../services/vocabService';

export class BlanksApp {
    constructor() { this.container = null; this.currentData = null; this.isAnswered = false; }
    mount(elementId) { this.container = document.getElementById(elementId); this.next(); }
    
    next(specificId = null) { 
        this.isAnswered = false; audioService.stop();
        
        // [FIX] Verify Data Existence
        const allVocab = vocabService.getAll();
        if (!allVocab || allVocab.length < 4) {
            this.renderError("Not enough data to play.");
            return;
        }

        if (specificId === null && this.currentData) {
             const idx = vocabService.findIndexById(this.currentData.target.id);
             let found = false;
             let nextIdx = idx;
             // Try next 10 items to find one with a sentence
             for(let i=0; i<allVocab.length; i++) {
                 nextIdx = (nextIdx + 1) % allVocab.length;
                 const q = blanksService.generateQuestion(allVocab[nextIdx].id);
                 if (q) { this.currentData = q; found = true; break; }
             }
             if(!found) this.currentData = blanksService.generateQuestion(); 
        } else {
             this.currentData = blanksService.generateQuestion(specificId); 
        }
        
        if(!this.currentData) { 
            this.renderError("Could not find a valid sentence.");
            return; 
        } 
        this.render(); 
    }

    renderError(msg) {
        if(!this.container) return;
        this.container.innerHTML = `<div class="flex flex-col items-center justify-center h-full p-8 text-center"><h2 class="text-xl font-bold text-gray-400">Error</h2><p class="text-gray-500">${msg}</p><button id="blanks-back-btn" class="mt-4 px-4 py-2 bg-gray-200 rounded">Back</button></div>`;
        document.getElementById('blanks-back-btn').addEventListener('click', () => window.dispatchEvent(new CustomEvent('router:home')));
    }

    prev() { 
        audioService.stop();
        const list = vocabService.getAll();
        if(!list || list.length === 0) return;
        let idx = vocabService.findIndexById(this.currentData.target.id);
        for(let i=0; i<list.length; i++) {
             idx = (idx - 1 + list.length) % list.length;
             const q = blanksService.generateQuestion(list[idx].id);
             if (q) { this.currentData = q; this.render(); return; }
        }
    }

    playAudio(full = false) {
        const settings = settingsService.get();
        if (full) {
            audioService.speak(this.currentData.cleanSentence, settings.targetLang);
        } else {
            const parts = this.currentData.sentence.split('_______');
            if (parts.length > 1) {
                audioService.speak(parts[0], settings.targetLang);
                const delay = (parts[0].length * 150) + 1000; 
                setTimeout(() => audioService.speak(parts[1], settings.targetLang), delay);
            } else {
                audioService.speak(this.currentData.sentence, settings.targetLang);
            }
        }
    }

    handleAnswer(selectedId, buttonElement) {
        if (this.isAnswered) return;
        const settings = settingsService.get();
        if (settings.blanksAnswerAudio) {
             const choice = this.currentData.choices.find(c => c.id === selectedId);
             audioService.speak(choice.front.main, settings.targetLang);
        }

        this.isAnswered = true;
        const correctId = this.currentData.target.id;
        const isCorrect = selectedId === correctId;
        const questionBox = document.getElementById('blanks-question-box');
        const questionText = document.getElementById('blanks-question-text');
        const blankText = document.getElementById('blank-text');
        const blankSlot = document.getElementById('blank-slot');

        buttonElement.className = 'quiz-option relative w-full h-full p-2 rounded-2xl shadow-lg flex items-center justify-center transition-all border-2';

        if (isCorrect) {
            buttonElement.classList.add('bg-green-500', 'text-white', 'border-green-600', 'animate-success-pulse');
            questionBox.classList.remove('bg-white', 'dark:bg-dark-card', 'border-indigo-100', 'dark:border-dark-border');
            questionBox.classList.add('bg-green-500', 'border-green-600', 'shadow-xl');
            questionText.classList.remove('text-gray-800', 'dark:text-white');
            questionText.classList.add('text-white');

            if(blankText) blankText.classList.remove('invisible');
            if(blankSlot) {
                blankSlot.classList.remove('border-b-4', 'border-dashed');
                blankSlot.classList.add('text-green-200', 'font-black');
            }

            if (settings.blanksAutoPlayCorrect) {
                const textToSpeak = this.currentData.cleanSentence; 
                if (settings.gameWaitAudio && textToSpeak) {
                    audioService.speakWithCallback(textToSpeak, settings.targetLang, () => setTimeout(() => this.next(), 500));
                } else {
                    if (textToSpeak) audioService.speak(textToSpeak, settings.targetLang);
                    setTimeout(() => this.next(), 2000);
                }
            } else {
                setTimeout(() => this.next(), 1000);
            }
            this.container.querySelectorAll('.quiz-option').forEach(btn => btn.disabled = true);
        } else {
            buttonElement.classList.add('bg-red-500', 'text-white', 'border-red-600', 'animate-shake', 'opacity-50', 'cursor-not-allowed');
            buttonElement.disabled = true;
            this.isAnswered = false; 
        }
    }

    render() {
        if (!this.container || !this.currentData) return;
        const { target, sentence, answerWord, choices } = this.currentData;
        const settings = settingsService.get();
        const fontClass = settings.targetLang === 'ja' ? 'font-jp' : '';
        let gridClass = choices.length === 2 ? 'grid-cols-1 grid-rows-2' : choices.length === 3 ? 'grid-cols-1 grid-rows-3' : 'grid-cols-2 grid-rows-2';

        const parts = sentence.split('_______');
        const pre = parts[0] || '';
        const post = parts[1] || '';
        const blankHTML = `<span id="blank-slot" class="inline-block border-b-4 border-dashed border-indigo-400 min-w-[2em] text-center mx-1"><span id="blank-text" class="invisible">${answerWord}</span></span>`;
        const renderedSentence = pre + blankHTML + post;

        this.container.innerHTML = `
            <div class="fixed top-0 left-0 right-0 h-16 z-40 px-4 flex justify-between items-center bg-gray-100/90 dark:bg-dark-bg/90 backdrop-blur-sm">
                <div class="flex items-center"><div class="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-full pl-1 pr-3 py-1 flex items-center shadow-sm"><span class="bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wider mr-2">ID</span><input type="number" id="blanks-id-input" class="w-12 bg-transparent border-none text-center font-mono font-bold text-gray-700 dark:text-white focus:ring-0 outline-none text-sm p-0" value="${target.id}"></div></div>
                <div class="flex items-center gap-3"><button id="blanks-random-btn" class="w-10 h-10 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl flex items-center justify-center text-indigo-500 dark:text-dark-primary shadow-sm active:scale-90 transition-transform"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg></button><button id="blanks-close-btn" class="w-10 h-10 bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 rounded-full flex items-center justify-center shadow-sm active:scale-90 transition-transform"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg></button></div>
            </div>
            <div class="w-full h-full pt-20 pb-28 px-4 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 grid-rows-[1fr_1fr] md:grid-rows-1 gap-4">
                <div id="blanks-question-box" class="w-full h-full bg-white dark:bg-dark-card rounded-[2rem] shadow-xl dark:shadow-none border-2 border-indigo-100 dark:border-dark-border p-8 flex flex-col items-center justify-center relative overflow-hidden cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 active:scale-[0.99] transition-all">
                    <span class="absolute top-6 w-full text-center text-[10px] font-black uppercase tracking-widest opacity-30 dark:text-gray-400">Fill in the blank</span>
                    <div class="flex-grow w-full flex items-center justify-center overflow-hidden px-4">
                        <p id="blanks-question-text" class="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white leading-relaxed text-center ${fontClass}" data-fit="true">${renderedSentence}</p>
                    </div>
                    <p class="mt-4 text-gray-500 dark:text-gray-400 italic text-center w-full">${target.back?.sentenceOrigin || ''}</p>
                </div>
                <div class="w-full h-full grid ${gridClass} gap-3">
                    ${choices.map(choice => `<button class="quiz-option relative w-full h-full p-2 bg-white dark:bg-dark-card border-2 border-gray-100 dark:border-dark-border rounded-2xl shadow-sm hover:shadow-md active:scale-[0.98] transition-all flex items-center justify-center group overflow-hidden" data-id="${choice.id}"><div class="text-xl font-black text-gray-800 dark:text-white leading-none text-center ${fontClass}" data-fit="true">${choice.front.main}</div></button>`).join('')}
                </div>
            </div>
            <div class="fixed bottom-0 left-0 right-0 p-6 z-40 bg-gradient-to-t from-gray-100 via-gray-100 to-transparent dark:from-dark-bg dark:via-dark-bg">
                <div class="max-w-md mx-auto flex gap-4">
                    <button id="blanks-prev-btn" class="flex-1 h-16 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border text-gray-400 dark:text-gray-500 rounded-3xl shadow-sm active:scale-95 transition-all flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" /></svg></button>
                    <button id="blanks-next-btn" class="flex-1 h-16 bg-indigo-600 dark:bg-dark-primary text-white border border-transparent rounded-3xl shadow-xl shadow-indigo-200 dark:shadow-none active:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" /></svg></button>
                </div>
            </div>
        `;

        requestAnimationFrame(() => {
            const fitElements = this.container.querySelectorAll('[data-fit="true"]');
            fitElements.forEach(el => textService.fitText(el));
            const qText = document.getElementById('blanks-question-text');
            if (qText) qText.innerHTML = textService.formatSentence(renderedSentence, settings.targetLang);
        });

        if(settings.autoPlay) setTimeout(() => this.playAudio(), 300);

        this.container.querySelectorAll('.quiz-option').forEach(btn => { btn.addEventListener('click', (e) => this.handleAnswer(parseInt(e.currentTarget.getAttribute('data-id')), e.currentTarget)); });
        document.getElementById('blanks-question-box').addEventListener('click', () => this.playAudio(true)); 
        document.getElementById('blanks-random-btn').addEventListener('click', () => this.next(null));
        document.getElementById('blanks-close-btn').addEventListener('click', () => { audioService.stop(); window.dispatchEvent(new CustomEvent('router:home')); });
        document.getElementById('blanks-id-input').addEventListener('change', (e) => { const newId = parseInt(e.target.value); vocabService.findIndexById(newId) !== -1 ? this.next(newId) : alert('ID not found'); });
    }
}
export const blanksApp = new BlanksApp();

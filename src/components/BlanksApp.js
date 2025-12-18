import { blanksService } from '../services/blanksService';
import { textService } from '../services/textService';
import { audioService } from '../services/audioService';
import { settingsService } from '../services/settingsService';
import { vocabService } from '../services/vocabService';

export class BlanksApp {
    constructor() { 
        this.container = null; 
        this.currentData = null; 
        this.isAnswered = false; 
    }
    
    mount(elementId) { 
        this.container = document.getElementById(elementId); 
        if (!this.currentData) this.random();
        else this.render();
    }

    bind(selector, event, handler) {
        if (!this.container) return;
        const el = this.container.querySelector(selector);
        if (el) el.addEventListener(event, handler);
    }

    random() { 
        this.isAnswered = false; 
        audioService.stop(); 
        const list = vocabService.getAll();
        if(!list || list.length < 4) { this.renderError(); return; }
        
        this.currentData = blanksService.generateQuestion(null);
        this.render(); 
    }

    next(id = null) {
        this.isAnswered = false; 
        audioService.stop();
        
        if (id) {
            this.currentData = blanksService.generateQuestion(id);
        } else {
            const list = vocabService.getAll(); 
            if(!list || list.length < 4) { this.renderError(); return; }
            
            if (this.currentData && this.currentData.target) {
                const idx = vocabService.findIndexById(this.currentData.target.id);
                this.currentData = blanksService.generateQuestion(list[(idx + 1) % list.length].id);
            } else {
                this.currentData = blanksService.generateQuestion(null);
            }
        }
        
        if (this.currentData && window.saveGameHistory) window.saveGameHistory('blanks', this.currentData.target.id);
        this.render();
    }

    prev() { 
        const list = vocabService.getAll();
        if(!list || list.length === 0) return;
        if(this.currentData && this.currentData.target) {
            const idx = vocabService.findIndexById(this.currentData.target.id);
            this.next(list[(idx - 1 + list.length) % list.length].id);
        }
    }

    renderError() { 
        if (this.container) {
            this.container.innerHTML = `
                <div class="fixed top-0 left-0 right-0 h-16 z-40 px-4 flex justify-between items-center bg-gray-100/90 dark:bg-dark-bg/90 backdrop-blur-sm">
                    <div></div>
                    <button id="blanks-close-err" class="w-10 h-10 bg-red-50 text-red-500 rounded-full flex items-center justify-center shadow-sm"><svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
                <div class="p-10 text-center text-gray-500 dark:text-gray-400 pt-24">Not enough data.</div>
            `;
            this.bind('#blanks-close-err', 'click', () => window.dispatchEvent(new CustomEvent('router:home')));
        }
    }

    playAudio(full = false) { 
        if (!this.currentData) return;
        const settings = settingsService.get();
        if (full) {
             audioService.speak(this.currentData.cleanSentence, settings.targetLang);
        } else {
            const parts = this.currentData.sentence.split('_______');
            if (parts.length > 1) audioService.speakGapSentence(parts[0], parts[1], settings.targetLang);
            else audioService.speak(this.currentData.sentence, settings.targetLang);
        }
    }

    handleAnswer(id, el) { 
        if (this.isAnswered) return;
        this.isAnswered = true; 
        const correct = this.currentData.target.id === id;
        
        el.className = `quiz-option relative w-full h-full p-2 rounded-2xl shadow-lg flex items-center justify-center transition-all border-2 ${correct ? 'bg-green-500 border-green-600 text-white' : 'bg-red-500 border-red-600 text-white'}`;
        
        if (correct) {
            const slot = this.container.querySelector('#blank-slot');
            const text = this.container.querySelector('#blank-text');
            if (slot) slot.classList.replace('bg-gray-200', 'text-green-600');
            if (text) text.classList.remove('invisible');
            
            const settings = settingsService.get(); // Re-fetch settings for latest state
            if (settings.blanksAutoPlayCorrect) this.playAudio(true);
            setTimeout(() => this.next(), 1000);
        }
    }

    render() {
        if (!this.container) return;
        if (!this.currentData) { this.renderError(); return; }
        
        const { target, sentence, answerWord, choices } = this.currentData;
        const settings = settingsService.get(); // MOVED UP to be accessible
        const fontClass = settings.targetLang === 'ja' ? 'font-jp' : '';

        const parts = sentence.split('_______');
        const bubble = `<span id="blank-slot" class="inline-flex items-center justify-center align-middle mx-1 bg-gray-200 dark:bg-gray-700 rounded-md min-w-[3em] h-[1.4em] border-b-4 border-gray-300 dark:border-gray-600 transition-all align-text-bottom"><span id="blank-text" class="invisible text-[0.9em]">${answerWord}</span></span>`;
        let rendered = parts[0] + bubble + (parts[1]||'');
        
        if (settings.targetLang === 'ja' && parts[0].includes('、')) rendered = rendered.replace(/、/g, '、<br>');

        this.container.innerHTML = `
            <div class="fixed top-0 left-0 right-0 h-16 z-40 px-4 flex justify-between items-center bg-gray-100/90 dark:bg-dark-bg/90 backdrop-blur-sm">
                <div class="flex items-center gap-2"><div class="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-full pl-1 pr-3 py-1 flex items-center shadow-sm"><span class="bg-teal-100 text-teal-600 text-xs font-bold px-2 py-1 rounded-full mr-2">ID</span><span class="font-bold dark:text-white">${target.id}</span></div>
                <button class="game-edit-btn w-8 h-8 flex items-center justify-center bg-gray-200 dark:bg-gray-800 rounded-full text-gray-500 hover:text-indigo-600"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg></button></div>
                <div class="flex items-center gap-3">
                    <button class="game-settings-btn w-10 h-10 bg-white dark:bg-dark-card border border-gray-200 rounded-xl flex items-center justify-center text-gray-500 shadow-sm"><svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg></button>
                    <button id="blanks-random-btn" class="w-10 h-10 bg-white dark:bg-dark-card border border-gray-200 rounded-xl flex items-center justify-center text-indigo-500 shadow-sm"><svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg></button>
                    <button id="blanks-close-btn" class="w-10 h-10 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center shadow-sm"><svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
            </div>
            <div class="w-full h-full pt-20 pb-28 px-4 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
                <div id="blanks-question-box" class="w-full h-full bg-white dark:bg-dark-card rounded-[2rem] shadow-xl border-2 border-indigo-100 dark:border-dark-border p-8 flex flex-col items-center justify-center relative"><p class="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white text-center leading-relaxed ${fontClass}">${rendered}</p><p class="mt-4 text-gray-500 italic text-center w-full">${target.back.sentenceOrigin}</p></div>
                <div class="w-full h-full grid grid-cols-2 grid-rows-2 gap-3">${choices.map(c => `<button class="quiz-option bg-white dark:bg-dark-card border-2 border-gray-100 rounded-2xl shadow-sm hover:shadow-md flex items-center justify-center" data-id="${c.id}"><div class="text-xl font-black text-gray-800 dark:text-white text-center ${fontClass}" data-fit="true">${c.front.main}</div></button>`).join('')}</div>
            </div>
            <div class="fixed bottom-0 left-0 right-0 p-6 z-40 bg-gradient-to-t from-gray-100 via-gray-100 to-transparent dark:from-dark-bg"><div class="max-w-md mx-auto flex gap-4"><button id="blanks-prev-btn" class="flex-1 h-16 bg-white border border-gray-200 rounded-3xl shadow-sm flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg></button><button id="blanks-next-btn" class="flex-1 h-16 bg-indigo-600 text-white rounded-3xl shadow-xl flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg></button></div></div>
        `;

        this.bind('#blanks-next-btn', 'click', () => this.next());
        this.bind('#blanks-prev-btn', 'click', () => this.prev());
        this.bind('#blanks-random-btn', 'click', () => this.random());
        this.bind('#blanks-close-btn', 'click', () => window.dispatchEvent(new CustomEvent('router:home')));
        this.bind('#blanks-question-box', 'click', () => this.playAudio(true));
        this.bind('#blanks-id-input', 'change', (e) => this.next(parseInt(e.target.value)));

        this.container.querySelectorAll('.quiz-option').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleAnswer(parseInt(e.currentTarget.dataset.id), e.currentTarget));
        });
        
        requestAnimationFrame(() => {
            const fitElements = this.container.querySelectorAll('[data-fit="true"]');
            fitElements.forEach(el => textService.fitText(el));
        });

        if (settings.autoPlay) setTimeout(() => this.playAudio(), 300);
    }
}
export const blanksApp = new BlanksApp();

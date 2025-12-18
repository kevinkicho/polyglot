import { blanksService } from '../services/blanksService';
import { textService } from '../services/textService';
import { audioService } from '../services/audioService';
import { settingsService } from '../services/settingsService';
import { vocabService } from '../services/vocabService';

export class BlanksApp {
    constructor() { this.container = null; this.currentData = null; this.isAnswered = false; }
    mount(elementId) { this.container = document.getElementById(elementId); this.random(); }

    random() {
        this.isAnswered = false; audioService.stop();
        const allVocab = vocabService.getAll();
        if(!allVocab || allVocab.length < 4) { this.renderError(); return; }
        
        this.currentData = blanksService.generateQuestion(null);
        this.render();
    }

    next(specificId = null) {
        this.isAnswered = false; audioService.stop();
        if (specificId) {
             this.currentData = blanksService.generateQuestion(specificId); 
        } else {
             const allVocab = vocabService.getAll();
             if(!allVocab || allVocab.length < 4) { this.renderError(); return; }
             const idx = vocabService.findIndexById(this.currentData.target.id);
             const nextIdx = (idx + 1) % allVocab.length;
             this.currentData = blanksService.generateQuestion(allVocab[nextIdx].id);
        }
        this.render();
    }

    prev() { 
        audioService.stop();
        const list = vocabService.getAll();
        if(!list || list.length === 0) return;
        let idx = vocabService.findIndexById(this.currentData.target.id);
        const prevIdx = (idx - 1 + list.length) % list.length;
        this.currentData = blanksService.generateQuestion(list[prevIdx].id);
        this.render();
    }

    renderError() { if(this.container) this.container.innerHTML = "Not enough data."; }

    // ... (Keep handleAnswer, playAudio logic) ...
    playAudio(full = false) { if (this.currentData) audioService.speak(this.currentData.cleanSentence, settingsService.get().targetLang); }
    handleAnswer(id, el) { 
        if(this.isAnswered) return;
        this.isAnswered = true;
        const correct = this.currentData.target.id === id;
        el.className = `quiz-option relative w-full h-full p-2 rounded-2xl shadow-lg flex items-center justify-center transition-all border-2 ${correct ? 'bg-green-500 border-green-600 text-white' : 'bg-red-500 border-red-600 text-white'}`;
        if(correct) setTimeout(() => this.next(), 1000);
    }

    render() {
        if (!this.container) return;
        if (!this.currentData) { this.renderError(); return; }
        
        const { target, sentence, choices } = this.currentData;
        
        this.container.innerHTML = `
            <div class="fixed top-0 left-0 right-0 h-16 z-40 px-4 flex justify-between items-center bg-gray-100/90 dark:bg-dark-bg/90 backdrop-blur-sm">
                <div class="flex items-center"><div class="bg-white dark:bg-dark-card border border-gray-200 rounded-full pl-1 pr-3 py-1 flex items-center shadow-sm"><span class="bg-teal-100 text-teal-600 text-xs font-bold px-2 py-1 rounded-full mr-2">ID</span><input type="number" id="blanks-id-input" class="w-12 bg-transparent border-none text-center font-bold text-sm p-0" value="${target.id}"></div></div>
                <div class="flex items-center gap-3">
                    <button id="blanks-random-btn" class="w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center text-indigo-500 shadow-sm active:scale-90"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg></button>
                    <button id="blanks-close-btn" class="w-10 h-10 bg-red-50 text-red-500 rounded-full flex items-center justify-center shadow-sm active:scale-90"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
            </div>
            <div class="w-full h-full pt-20 pb-28 px-4 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
                <div id="blanks-question-box" class="w-full h-full bg-white dark:bg-dark-card rounded-[2rem] shadow-xl border-2 border-indigo-100 p-8 flex flex-col items-center justify-center relative"><p id="blanks-question-text" class="text-2xl font-bold text-gray-800 dark:text-white text-center" data-fit="true">${sentence}</p><p class="mt-4 text-gray-500 italic text-center w-full">${target.back.sentenceOrigin}</p></div>
                <div class="w-full h-full grid grid-cols-2 grid-rows-2 gap-3">${choices.map(c => `<button class="quiz-option bg-white dark:bg-dark-card border-2 border-gray-100 rounded-2xl shadow-sm hover:shadow-md active:scale-[0.98] flex items-center justify-center" data-id="${c.id}"><div class="text-xl font-black text-gray-800 dark:text-white text-center" data-fit="true">${c.front.main}</div></button>`).join('')}</div>
            </div>
            <div class="fixed bottom-0 left-0 right-0 p-6 z-40 bg-gradient-to-t from-gray-100 via-gray-100 to-transparent"><div class="max-w-md mx-auto flex gap-4"><button id="blanks-prev-btn" class="flex-1 h-16 bg-white border border-gray-200 rounded-3xl shadow-sm flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" /></svg></button><button id="blanks-next-btn" class="flex-1 h-16 bg-indigo-600 text-white rounded-3xl shadow-xl flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" /></svg></button></div></div>
        `;

        document.getElementById('blanks-next-btn').addEventListener('click', () => this.next());
        document.getElementById('blanks-prev-btn').addEventListener('click', () => this.prev());
        document.getElementById('blanks-random-btn').addEventListener('click', () => this.random());
        document.getElementById('blanks-close-btn').addEventListener('click', () => window.dispatchEvent(new CustomEvent('router:home')));
        this.container.querySelectorAll('.quiz-option').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleAnswer(parseInt(e.currentTarget.dataset.id), e.currentTarget));
        });
        requestAnimationFrame(() => {
            this.container.querySelectorAll('[data-fit="true"]').forEach(el => textService.fitText(el));
        });
    }
}
export const blanksApp = new BlanksApp();

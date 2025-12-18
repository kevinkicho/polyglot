import { quizService } from '../services/quizService';
import { textService } from '../services/textService';
import { audioService } from '../services/audioService';
import { settingsService } from '../services/settingsService';
import { vocabService } from '../services/vocabService';

export class QuizApp {
    constructor() { this.container = null; this.currentData = null; this.isAnswered = false; }
    mount(elementId) { this.container = document.getElementById(elementId); if(!this.currentData) this.random(); else this.render(); }

    bind(selector, event, handler) {
        if (!this.container) return;
        const el = this.container.querySelector(selector);
        if (el) el.addEventListener(event, handler);
    }

    random() { 
        const list = vocabService.getAll();
        if(!list || list.length < 4) { this.renderError(); return; }
        this.isAnswered=false; audioService.stop(); 
        this.currentData=quizService.generateQuestion(null); 
        this.render(); 
    }
    
    next(id = null) { 
        this.isAnswered=false; audioService.stop();
        if(id===null && this.currentData) {
            const l=vocabService.getAll(); const i=vocabService.findIndexById(this.currentData.target.id);
            id=l[(i+1)%l.length].id;
        }
        this.currentData=quizService.generateQuestion(id);
        if(this.currentData && window.saveGameHistory) window.saveGameHistory('quiz', this.currentData.target.id);
        this.render();
    }
    
    prev() { if(this.currentData) { const l=vocabService.getAll(); const i=vocabService.findIndexById(this.currentData.target.id); this.next(l[(i-1+l.length)%l.length].id); } }

    renderError() { if(this.container) this.container.innerHTML="<div class='p-10 text-white text-center pt-24'>Not enough vocabulary.</div>"; }

    async submitAnswer(id, el) {
        if(this.isAnswered) return;
        this.isAnswered=true; 
        const correct=this.currentData.target.id===id;
        el.className = `quiz-option relative w-full h-full p-2 rounded-2xl shadow-lg flex items-center justify-center transition-all border-2 ${correct?'bg-green-500 border-green-600 text-white':'bg-red-500 border-red-600 text-white'}`;
        
        const settings = settingsService.get();
        if(correct) {
            if(settings.quizAutoPlayCorrect) {
                const promise = audioService.speak(this.currentData.target.front.main, settings.targetLang);
                if(settings.quizWaitAudio) await promise;
            }
            setTimeout(()=>this.next(), settings.quizWaitAudio ? 100 : 1000);
        }
    }

    render() {
        if(!this.container) return;
        if(!this.currentData) { this.renderError(); return; }
        const { target, choices } = this.currentData;
        
        this.container.innerHTML = `
            <div class="fixed top-0 left-0 right-0 h-16 z-40 px-4 flex justify-between items-center bg-gray-100/90 dark:bg-dark-bg/90 backdrop-blur-sm">
                <div class="flex items-center gap-2"><div class="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-full pl-1 pr-3 py-1 flex items-center shadow-sm"><span class="bg-purple-100 text-purple-600 text-xs font-bold px-2 py-1 rounded-full mr-2">ID</span><input type="number" id="quiz-id-input" class="w-12 bg-transparent border-none text-center font-bold text-gray-700 dark:text-white text-sm p-0" value="${target.id}"></div>
                <button class="game-edit-btn header-btn bg-gray-200 dark:bg-gray-800 rounded-full text-gray-500 hover:text-indigo-600"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg></button></div>
                <div class="flex items-center gap-3">
                    <button class="game-settings-btn header-btn bg-white dark:bg-dark-card border border-gray-200 rounded-xl text-gray-500 shadow-sm"><svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg></button>
                    <button id="quiz-random-btn" class="header-btn bg-white dark:bg-dark-card border border-gray-200 rounded-xl text-indigo-500 shadow-sm"><svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg></button>
                    <button id="quiz-close-btn" class="header-btn bg-red-50 text-red-500 rounded-full shadow-sm"><svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
                </div>
            </div>
            <div class="w-full h-full pt-20 pb-28 px-4 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
                <div id="quiz-question-box" class="w-full h-full bg-white dark:bg-dark-card rounded-[2rem] shadow-xl border-2 border-indigo-100 dark:border-dark-border p-6 flex flex-col items-center justify-center"><span class="font-black text-6xl text-gray-800 dark:text-white text-center" data-fit="true">${target.front.main}</span></div>
                <div class="w-full h-full grid grid-cols-2 grid-rows-2 gap-3">${choices.map(c => `<button class="quiz-option bg-white dark:bg-dark-card border-2 border-gray-100 rounded-2xl shadow-sm hover:shadow-md flex items-center justify-center" data-id="${c.id}"><div class="text-lg font-bold text-gray-700 dark:text-white text-center" data-fit="true">${c.back.definition}</div></button>`).join('')}</div>
            </div>
            <div class="fixed bottom-0 left-0 right-0 p-6 z-40 bg-gradient-to-t from-gray-100 via-gray-100 to-transparent dark:from-dark-bg"><div class="max-w-md mx-auto flex gap-4"><button id="quiz-prev-btn" class="flex-1 h-16 bg-white border border-gray-200 rounded-3xl shadow-sm flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg></button><button id="quiz-next-btn" class="flex-1 h-16 bg-indigo-600 text-white rounded-3xl shadow-xl flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg></button></div></div>
        `;

        this.bind('#quiz-next-btn', 'click', () => this.next());
        this.bind('#quiz-prev-btn', 'click', () => this.prev());
        this.bind('#quiz-random-btn', 'click', () => this.random());
        this.bind('#quiz-close-btn', 'click', () => window.dispatchEvent(new CustomEvent('router:home')));
        this.bind('#quiz-question-box', 'click', () => { if(this.currentData) audioService.speak(this.currentData.target.front.main, settingsService.get().targetLang); });
        this.bind('#quiz-id-input', 'change', (e) => { 
            const newId = parseInt(e.target.value); 
            if (vocabService.findIndexById(newId) !== -1) this.next(newId); 
            else alert('ID not found'); 
        });
        
        this.container.querySelectorAll('.quiz-option').forEach(btn => {
            btn.addEventListener('click', (e) => this.submitAnswer(parseInt(e.currentTarget.dataset.id), e.currentTarget));
        });
        
        requestAnimationFrame(() => {
            const fitElements = this.container.querySelectorAll('[data-fit="true"]');
            fitElements.forEach(el => textService.fitText(el));
        });
        
        if (settingsService.get().autoPlay) setTimeout(() => audioService.speak(target.front.main, settingsService.get().targetLang), 300);
    }
}
export const quizApp = new QuizApp();

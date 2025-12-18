import { quizService } from '../services/quizService';
import { textService } from '../services/textService';
import { audioService } from '../services/audioService';
import { settingsService } from '../services/settingsService';
import { vocabService } from '../services/vocabService';

export class QuizApp {
    constructor() { this.container = null; this.currentData = null; this.isAnswered = false; this.selectedId = null; }
    mount(elementId) { this.container = document.getElementById(elementId); this.next(); }

    next(specificId = null) {
        this.isAnswered = false; this.selectedId = null; audioService.stop();
        
        // [FIX] Prevent Freeze
        const allVocab = vocabService.getAll();
        if (!allVocab || allVocab.length < 4) {
            this.renderError("Not enough vocabulary to generate a quiz (Need 4+ words).");
            return;
        }

        if (specificId === null && this.currentData && this.currentData.target) {
            const currentIdx = vocabService.findIndexById(this.currentData.target.id);
            const nextIdx = (currentIdx + 1) % allVocab.length;
            specificId = allVocab[nextIdx].id;
        }
        
        this.currentData = quizService.generateQuestion(specificId);
        
        if (!this.currentData) {
            this.renderError("Could not generate question.");
            return;
        }
        this.render();
    }

    prev() {
        this.isAnswered = false; this.selectedId = null; audioService.stop();
        if (this.currentData && this.currentData.target) {
            const list = vocabService.getAll();
            const currentIdx = vocabService.findIndexById(this.currentData.target.id);
            const prevIdx = (currentIdx - 1 + list.length) % list.length;
            this.currentData = quizService.generateQuestion(list[prevIdx].id);
            this.render();
        }
    }

    playQuestionAudio() {
        const settings = settingsService.get();
        if (this.currentData && this.currentData.target) {
            audioService.speak(this.currentData.target.front.main, settings.targetLang);
        }
    }

    handleClick(id, buttonElement) {
        if (this.isAnswered) return;
        const settings = settingsService.get();
        if (settings.quizClickMode === 'double') {
            if (this.selectedId !== id) {
                this.selectedId = id;
                this.container.querySelectorAll('.quiz-option').forEach(btn => btn.className = 'quiz-option relative w-full h-full p-2 bg-white dark:bg-dark-card border-2 border-gray-100 dark:border-dark-border rounded-2xl shadow-sm hover:shadow-md active:scale-[0.98] transition-all flex items-center justify-center group overflow-hidden');
                buttonElement.classList.remove('border-gray-100', 'dark:border-dark-border');
                buttonElement.classList.add('ring-4', 'ring-indigo-300', 'border-indigo-500', 'bg-indigo-50', 'dark:bg-indigo-900/20');
                if (settings.quizAnswerAudio) { const choice = this.currentData.choices.find(c => c.id === id); if(choice) audioService.speak(choice.back.definition, settings.originLang); }
                return;
            }
        }
        this.submitAnswer(id, buttonElement);
    }

    submitAnswer(selectedId, buttonElement) {
        this.isAnswered = true;
        const settings = settingsService.get();
        const correctId = this.currentData.target.id;
        const isCorrect = selectedId === correctId;
        const questionBox = document.getElementById('quiz-question-box');
        const questionText = document.getElementById('quiz-question-text');

        buttonElement.className = 'quiz-option relative w-full h-full p-2 rounded-2xl shadow-lg flex items-center justify-center transition-all border-2';

        if (isCorrect) {
            buttonElement.classList.add('bg-green-500', 'text-white', 'border-green-600', 'animate-success-pulse');
            if(questionBox) {
                questionBox.classList.remove('bg-white', 'dark:bg-dark-card', 'border-indigo-100', 'dark:border-dark-border');
                questionBox.classList.add('bg-green-500', 'border-green-600', 'shadow-xl');
            }
            if(questionText) {
                questionText.classList.remove('text-gray-800', 'dark:text-white');
                questionText.classList.add('text-white');
            }
            this.container.querySelectorAll('.quiz-option').forEach(btn => btn.disabled = true);

            if (settings.quizAutoPlayCorrect) {
                if (settings.gameWaitAudio) {
                    audioService.speakWithCallback(this.currentData.target.front.main, settings.targetLang, () => setTimeout(() => this.next(), 500));
                } else {
                    audioService.speak(this.currentData.target.front.main, settings.targetLang);
                    setTimeout(() => this.next(), 1500);
                }
            } else {
                setTimeout(() => this.next(), 1000);
            }
        } else {
            buttonElement.classList.add('bg-red-500', 'text-white', 'border-red-600', 'animate-shake', 'opacity-50', 'cursor-not-allowed');
            this.selectedId = null; this.isAnswered = false; buttonElement.disabled = true;
        }
    }

    renderError(msg) {
        if(!this.container) return;
        this.container.innerHTML = `<div class="flex flex-col items-center justify-center h-full p-8 text-center"><h2 class="text-xl font-bold text-red-400">Error</h2><p class="text-gray-500 mt-2">${msg}</p><button id="quiz-back-btn" class="mt-6 px-6 py-3 bg-gray-200 dark:bg-gray-700 rounded-xl font-bold">Back to Menu</button></div>`;
        document.getElementById('quiz-back-btn').addEventListener('click', () => window.dispatchEvent(new CustomEvent('router:home')));
    }

    render() {
        if (!this.container) return;
        if (!this.currentData || !this.currentData.target) {
            this.container.innerHTML = '<div class="flex items-center justify-center h-full text-gray-500">Loading...</div>';
            return;
        }

        const settings = settingsService.get();
        const { target, choices } = this.currentData;
        const mainText = target.front?.main || "???";
        const subText = target.front?.sub || "";
        const fontClass = settings.targetLang === 'ja' ? 'font-jp' : '';
        let gridClass = choices.length === 2 ? 'grid-cols-1 grid-rows-2' : choices.length === 3 ? 'grid-cols-1 grid-rows-3' : 'grid-cols-2 grid-rows-2';

        this.container.innerHTML = `
            <div class="fixed top-0 left-0 right-0 h-16 z-40 px-4 flex justify-between items-center bg-gray-100/90 dark:bg-dark-bg/90 backdrop-blur-sm">
                <div class="flex items-center"><div class="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-full pl-1 pr-3 py-1 flex items-center shadow-sm"><span class="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wider mr-2">ID</span><input type="number" id="quiz-id-input" class="w-12 bg-transparent border-none text-center font-mono font-bold text-gray-700 dark:text-white focus:ring-0 outline-none text-sm p-0" value="${target.id}"></div></div>
                <div class="flex items-center gap-3"><button id="quiz-random-btn" class="w-10 h-10 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl flex items-center justify-center text-indigo-500 dark:text-dark-primary shadow-sm active:scale-90 transition-transform"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg></button><button id="quiz-close-btn" class="w-10 h-10 bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 rounded-full flex items-center justify-center shadow-sm active:scale-90 transition-transform"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg></button></div>
            </div>
            <div class="w-full h-full pt-20 pb-28 px-4 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 grid-rows-[1fr_1fr] md:grid-rows-1 gap-4">
                <div id="quiz-question-box" class="w-full h-full bg-white dark:bg-dark-card rounded-[2rem] shadow-xl dark:shadow-none border-2 border-indigo-100 dark:border-dark-border p-6 flex flex-col items-center justify-center relative overflow-hidden transition-all duration-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 active:scale-[0.99]">
                    <span class="absolute top-6 w-full text-center text-[10px] font-black uppercase tracking-widest opacity-30 dark:text-gray-400">Select the meaning</span>
                    <div class="flex-grow w-full flex items-center justify-center overflow-hidden"><span id="quiz-question-text" class="font-black text-gray-800 dark:text-white leading-none select-none opacity-0 transition-opacity duration-300 ${fontClass}" data-fit="true">${mainText}</span></div>${subText ? `<div class="mt-4 text-indigo-500 dark:text-dark-primary font-bold text-xl">${subText}</div>` : ''}
                </div>
                <div class="w-full h-full grid ${gridClass} gap-3">${choices.map(choice => `<button class="quiz-option relative w-full h-full p-2 bg-white dark:bg-dark-card border-2 border-gray-100 dark:border-dark-border rounded-2xl shadow-sm hover:shadow-md active:scale-[0.98] transition-all flex items-center justify-center group overflow-hidden" data-id="${choice.id}"><div class="text-lg font-bold text-gray-700 dark:text-gray-200 leading-tight text-center opacity-0 transition-opacity duration-300 w-full px-2" data-fit="true">${choice.back.definition}</div></button>`).join('')}</div>
            </div>
            <div class="fixed bottom-0 left-0 right-0 p-6 z-40 bg-gradient-to-t from-gray-100 via-gray-100 to-transparent dark:from-dark-bg dark:via-dark-bg">
                <div class="max-w-md mx-auto flex gap-4"><button id="quiz-prev-btn" class="flex-1 h-16 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border text-gray-400 dark:text-gray-500 rounded-3xl shadow-sm active:scale-95 transition-all flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" /></svg></button><button id="quiz-next-btn" class="flex-1 h-16 bg-indigo-600 dark:bg-dark-primary text-white border border-transparent rounded-3xl shadow-xl shadow-indigo-200 dark:shadow-none active:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" /></svg></button></div>
            </div>
        `;
        requestAnimationFrame(() => { const fitElements = this.container.querySelectorAll('[data-fit="true"]'); fitElements.forEach(el => { textService.fitText(el); requestAnimationFrame(() => el.classList.remove('opacity-0')); }); });
        if(settings.autoPlay) setTimeout(() => this.playQuestionAudio(), 300);
        this.container.querySelectorAll('.quiz-option').forEach(btn => { btn.addEventListener('click', (e) => this.handleClick(parseInt(e.currentTarget.getAttribute('data-id')), e.currentTarget)); });
        document.getElementById('quiz-question-box').addEventListener('click', () => this.playQuestionAudio());
        document.getElementById('quiz-random-btn').addEventListener('click', () => { this.next(null); });
        document.getElementById('quiz-close-btn').addEventListener('click', () => { audioService.stop(); window.dispatchEvent(new CustomEvent('router:home')); });
        document.getElementById('quiz-id-input').addEventListener('change', (e) => { const newId = parseInt(e.target.value); vocabService.findIndexById(newId) !== -1 ? this.next(newId) : alert('ID not found'); });
    }
}
export const quizApp = new QuizApp();

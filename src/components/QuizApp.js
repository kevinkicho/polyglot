import { quizService } from '../services/quizService';
import { textService } from '../services/textService';
import { audioService } from '../services/audioService';
import { settingsService } from '../services/settingsService';
import { vocabService } from '../services/vocabService';
import { scoreService } from '../services/scoreService';
import { comboManager } from '../managers/ComboManager'; 

export class QuizApp {
    constructor() { 
        this.container = null; 
        this.currentData = null; 
        this.isProcessing = false; 
        this.selectedAnswerId = null;
        this.categories = [];
        this.currentCategory = 'All';
    }

    mount(elementId) { 
        this.container = document.getElementById(elementId); 
        this.updateCategories();
        if(!this.currentData) this.random(); 
        else this.render(); 
    }

    // ... (refresh, updateCategories, setCategory, getFilteredList, bind all unchanged) ...
    refresh() {
        if (this.currentData && this.currentData.target) {
            this.currentData = quizService.generateQuestion(this.currentData.target.id);
            this.render();
        } else {
            this.random();
        }
    }

    updateCategories() {
        const all = vocabService.getAll();
        const cats = new Set(all.map(i => i.category || 'Uncategorized'));
        this.categories = ['All', ...cats];
    }

    setCategory(cat) {
        this.currentCategory = cat;
        this.random();
    }

    getFilteredList() {
        const all = vocabService.getAll();
        if (this.currentCategory === 'All') return all;
        return all.filter(i => (i.category || 'Uncategorized') === this.currentCategory);
    }

    bind(selector, event, handler) {
        if (!this.container) return;
        const el = this.container.querySelector(selector);
        if (el) el.addEventListener(event, handler);
    }

    random() { 
        const list = this.getFilteredList();
        if(!list || list.length < 4) { this.renderError(); return; }
        
        this.isProcessing = false; 
        this.selectedAnswerId = null;
        audioService.stop(); 
        
        const target = list[Math.floor(Math.random() * list.length)];
        this.currentData = quizService.generateQuestion(target.id);
        
        this.render(); 
    }
    
    next(id = null) { 
        this.isProcessing = false; 
        this.selectedAnswerId = null;
        audioService.stop();
        
        const list = this.getFilteredList();
        if(list.length === 0) return;

        if(id === null && this.currentData) {
            const currentItem = vocabService.getAll().find(v => v.id === this.currentData.target.id);
            let listIdx = list.findIndex(i => i.id === currentItem.id);
            if (listIdx === -1) listIdx = 0;
            else listIdx = (listIdx + 1) % list.length;
            
            id = list[listIdx].id;
        }

        this.currentData = quizService.generateQuestion(id);
        if(this.currentData && window.saveGameHistory) window.saveGameHistory('quiz', this.currentData.target.id);
        this.render();
    }
    
    prev() { 
        if(this.currentData) { 
            const list = this.getFilteredList();
            if(list.length === 0) return;

            const currentItem = vocabService.getAll().find(v => v.id === this.currentData.target.id);
            let listIdx = list.findIndex(i => i.id === currentItem.id);
            
            if (listIdx === -1) listIdx = 0;
            else listIdx = (listIdx - 1 + list.length) % list.length;

            this.next(list[listIdx].id); 
        } 
    }

    renderError() { 
        if (this.container) {
            this.container.innerHTML = `<div class="p-10 text-center text-gray-400 pt-24">Not enough vocabulary in this category (need 4+).</div>`;
            this.bind('#quiz-close-err', 'click', () => window.dispatchEvent(new CustomEvent('router:home')));
        }
    }

    handleOptionClick(id, el, choiceText) {
        if (this.isProcessing || window.wasLongPress) return;
        const settings = settingsService.get();
        if (settings.quizDoubleClick) {
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
            scoreService.addScore('quiz', 10); 
        } else {
            el.classList.add('bg-red-500', 'border-red-600', 'text-white');
            el.classList.remove('bg-white', 'dark:bg-dark-card', 'text-gray-700', 'dark:text-white');
            comboManager.dropRank();
        }
        if(correct) {
            const fullText = this.currentData.target.front.main;
            const s = settingsService.get();
            if (s.quizAutoPlayCorrect) {
                if (s.waitForAudio) {
                    await audioService.speak(fullText, s.targetLang);
                    this.next();
                } else {
                    audioService.speak(fullText, s.targetLang);
                    setTimeout(() => this.next(), 1000);
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
        if(!this.currentData) { this.renderError(); return; }
        const { target, choices } = this.currentData;
        
        const pillsHtml = `
            <div class="w-full overflow-x-auto whitespace-nowrap px-4 pb-2 mb-2 flex gap-2 no-scrollbar">
                ${this.categories.map(cat => `
                    <button class="category-pill px-4 py-1 rounded-full text-sm font-bold border ${this.currentCategory === cat ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-dark-card text-gray-500 border-gray-200 dark:border-gray-700'}" data-cat="${cat}">
                        ${cat}
                    </button>
                `).join('')}
            </div>
        `;

        this.container.innerHTML = `
            <div class="fixed top-0 left-0 right-0 h-16 z-40 px-4 flex justify-between items-center bg-gray-100/90 dark:bg-dark-bg/90 backdrop-blur-sm border-b border-white/10">
                <div class="flex items-center gap-2">
                    <div class="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-full pl-1 pr-3 py-1 flex items-center shadow-sm">
                        <span class="bg-purple-100 text-purple-600 text-xs font-bold px-2 py-1 rounded-full mr-2">ID</span>
                        <input type="number" id="quiz-id-input" class="w-12 bg-transparent border-none text-center font-bold text-gray-700 dark:text-white text-sm p-0" value="${target.id}">
                    </div>
                    <button class="game-edit-btn header-icon-btn bg-gray-200 dark:bg-gray-800 rounded-full text-gray-500 hover:text-indigo-600">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                    </button>
                </div>
                <div class="flex items-center gap-2">
                    <button id="score-pill" class="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-full px-3 py-1 flex items-center gap-2 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <span class="text-base">🏆</span>
                        <span class="font-black text-gray-700 dark:text-white text-sm global-score-display">${scoreService.todayScore}</span>
                    </button>
                    <button id="quiz-random-btn" class="header-icon-btn bg-white dark:bg-dark-card border border-gray-200 rounded-xl text-indigo-500 shadow-sm">
                        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                    </button>
                    <button id="quiz-close-btn" class="header-icon-btn bg-red-50 text-red-500 rounded-full shadow-sm">
                        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                </div>
            </div>
            
            <div class="w-full h-full pt-20 pb-28 px-4 max-w-6xl mx-auto flex flex-col gap-2">
                ${pillsHtml}
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                    <div id="quiz-question-box" class="w-full h-full bg-white dark:bg-dark-card rounded-[2rem] shadow-xl border-2 border-indigo-100 dark:border-dark-border p-4 flex flex-col items-center justify-center overflow-hidden">
                        <span class="quiz-question-text font-black text-gray-800 dark:text-white text-center leading-tight w-full break-words" data-fit="true">${textService.smartWrap(target.front.main)}</span>
                    </div>
                    
                    <div class="w-full h-full grid grid-cols-2 grid-rows-2 gap-3">
                        ${choices.map(c => `
                            <button class="quiz-option bg-white dark:bg-dark-card border-2 border-transparent rounded-2xl shadow-sm hover:shadow-md flex flex-col justify-center items-center p-2 overflow-hidden h-full" data-id="${c.id}">
                                <div class="quiz-choice-text text-lg font-bold text-gray-700 dark:text-white text-center leading-tight w-full">${textService.smartWrap(c.back.definition)}</div>
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>
            
            <div class="fixed bottom-0 left-0 right-0 p-6 z-40 bg-gradient-to-t from-gray-100 via-gray-100 to-transparent dark:from-dark-bg">
                <div class="max-w-md mx-auto flex gap-4">
                    <button id="quiz-prev-btn" class="flex-1 h-16 bg-white border border-gray-200 rounded-3xl shadow-sm flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg>
                    </button>
                    <button id="quiz-next-btn" class="flex-1 h-16 bg-indigo-600 text-white rounded-3xl shadow-xl flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>
                    </button>
                </div>
            </div>
        `;

        // ... (Bind methods same as before) ...
        this.bind('#quiz-next-btn', 'click', () => this.next());
        this.bind('#quiz-prev-btn', 'click', () => this.prev());
        this.bind('#quiz-random-btn', 'click', () => this.random());
        this.bind('#quiz-close-btn', 'click', () => window.dispatchEvent(new CustomEvent('router:home')));
        
        this.container.querySelectorAll('.category-pill').forEach(btn => {
            btn.addEventListener('click', (e) => this.setCategory(e.currentTarget.dataset.cat));
        });

        this.bind('#quiz-question-box', 'click', () => {
             if(!this.isProcessing && !window.wasLongPress) {
                 audioService.stop();
                 audioService.speak(target.front.main, settingsService.get().targetLang);
             }
        });

        this.bind('#quiz-id-input', 'change', (e) => { const newId = parseInt(e.target.value); vocabService.findIndexById(newId) !== -1 ? this.next(newId) : alert('ID not found'); });
        
        this.container.querySelectorAll('.quiz-option').forEach(btn => btn.addEventListener('click', (e) => {
            const text = btn.querySelector('.quiz-choice-text').innerText;
            this.handleOptionClick(parseInt(e.currentTarget.dataset.id), e.currentTarget, text);
        }));
        
        requestAnimationFrame(() => {
            if(!this.container) return;
            // FIX: Reduced Max Font Size to 80 (was 130) to prevent aggressive start
            textService.fitText(this.container.querySelector('.quiz-question-text'), 24, 80);
            this.container.querySelectorAll('.quiz-choice-text').forEach(el => {
                textService.fitText(el, 18, 55); 
            });
        });

        if (settingsService.get().autoPlay) setTimeout(() => audioService.speak(target.front.main, settingsService.get().targetLang), 300);
    }
}
export const quizApp = new QuizApp();

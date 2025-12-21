import { vocabService } from '../services/vocabService';
import { settingsService } from '../services/settingsService';
import { audioService } from '../services/audioService';
import { scoreService } from '../services/scoreService';
import { textService } from '../services/textService';

export class WritingApp {
    constructor() {
        this.container = null;
        this.currentIndex = 0;
        this.currentData = null;
        this.isProcessing = false;
        this.categories = [];
        this.currentCategory = 'All';
    }

    mount(elementId) {
        this.container = document.getElementById(elementId);
        this.updateCategories();
        this.random();
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

    random() {
        const list = this.getFilteredList();
        if (list.length === 0) return;
        const randItem = list[Math.floor(Math.random() * list.length)];
        this.currentIndex = vocabService.findIndexById(randItem.id);
        this.loadGame();
    }

    next(id = null) {
        this.isProcessing = false;
        if (id !== null) {
            const idx = vocabService.findIndexById(id);
            if (idx !== -1) this.currentIndex = idx;
        } else {
            const list = this.getFilteredList();
            const currentItem = vocabService.getAll()[this.currentIndex];
            let listIdx = list.findIndex(i => i.id === currentItem.id);
            listIdx = (listIdx + 1) % list.length;
            this.currentIndex = vocabService.findIndexById(list[listIdx].id);
        }
        this.loadGame();
    }

    prev() {
        const list = this.getFilteredList();
        const currentItem = vocabService.getAll()[this.currentIndex];
        let listIdx = list.findIndex(i => i.id === currentItem.id);
        listIdx = (listIdx - 1 + list.length) % list.length;
        this.currentIndex = vocabService.findIndexById(list[listIdx].id);
        this.loadGame();
    }

    gotoId(id) {
        const idx = vocabService.findIndexById(parseInt(id)); // FIX: Added parseInt
        if (idx !== -1) {
            this.currentIndex = idx;
            this.loadGame();
        } else {
            alert("ID not found / IDが見つかりません");
        }
    }

    loadGame() {
        this.isProcessing = false;
        const list = vocabService.getAll();
        if (!list.length) return;
        this.currentData = list[this.currentIndex];
        this.render();
    }

    revealAnswer() {
        const input = document.getElementById('writing-input');
        if(input && this.currentData) {
            input.value = this.currentData.front.main;
            input.focus();
        }
    }

    checkAnswer() {
        if(this.isProcessing) return;
        const input = document.getElementById('writing-input');
        if(!input) return;
        
        const guess = input.value.trim().toLowerCase();
        const correctFull = this.currentData.front.main.toLowerCase();
        
        const variations = correctFull.split(/[・･,、.。]+/);
        const isCorrect = (guess === correctFull) || variations.some(v => v.trim() === guess);
        
        if (isCorrect) {
            this.isProcessing = true;
            input.classList.remove('bg-gray-100', 'dark:bg-gray-800');
            input.classList.add('bg-white', 'text-green-600', 'border-yellow-400', 'ring-4', 'ring-yellow-400', 'animate-celebrate');
            
            scoreService.addScore('writing', 10);
            if (settingsService.get().autoPlay) audioService.speak(this.currentData.front.main, settingsService.get().targetLang);
            setTimeout(() => this.next(), 1000);
        } else {
            input.classList.add('bg-red-100', 'text-red-800', 'shake');
            setTimeout(() => input.classList.remove('shake', 'bg-red-100', 'text-red-800'), 500);
        }
    }

    playHint() {
        audioService.speak(this.currentData.front.main, settingsService.get().targetLang);
    }

    render() {
        if (!this.container) return;
        const originText = this.currentData.back.main || this.currentData.back.definition;

        const pillsHtml = `
            <div class="w-full overflow-x-auto whitespace-nowrap px-4 pb-2 mb-2 flex gap-2 no-scrollbar">
                ${this.categories.map(cat => `
                    <button class="category-pill px-4 py-1 rounded-full text-sm font-bold border ${this.currentCategory === cat ? 'bg-cyan-500 text-white border-cyan-500' : 'bg-white dark:bg-dark-card text-gray-500 border-gray-200 dark:border-gray-700'}" data-cat="${cat}">
                        ${cat}
                    </button>
                `).join('')}
            </div>
        `;

        this.container.innerHTML = `
            <div class="fixed top-0 left-0 right-0 h-16 z-40 px-4 flex justify-between items-center bg-gray-100/90 dark:bg-dark-bg/90 backdrop-blur-sm border-b border-white/10">
                <div class="flex items-center gap-2">
                    <div class="flex items-center bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-full pl-3 pr-1 py-1 shadow-sm">
                        <span class="text-xs font-bold text-gray-400 mr-2 uppercase">ID</span>
                        <input type="number" id="write-id-input" value="${this.currentData.id}" class="w-12 bg-transparent text-sm font-bold text-gray-700 dark:text-white outline-none text-center appearance-none m-0 p-0">
                        <button id="write-go-btn" class="ml-1 w-6 h-6 bg-cyan-100 text-cyan-600 rounded-full flex items-center justify-center hover:bg-cyan-200"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg></button>
                    </div>
                    <button class="game-edit-btn bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-full w-8 h-8 flex items-center justify-center shadow-sm text-gray-500 hover:text-cyan-500 active:scale-95 transition-all">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                    </button>
                    <button id="write-random-btn" class="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-full w-8 h-8 flex items-center justify-center shadow-sm text-gray-500 hover:text-cyan-500 active:scale-95 transition-all">
                        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                    </button>
                </div>
                <div class="flex items-center gap-2">
                    <button id="score-pill" class="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-full px-3 py-1 flex items-center gap-2 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <span class="text-base">🏆</span>
                        <span class="font-black text-gray-700 dark:text-white text-sm global-score-display">${scoreService.todayScore}</span>
                    </button>
                    <button id="write-close-btn" class="header-icon-btn bg-red-50 text-red-500 rounded-full shadow-sm"><svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
            </div>

            <div class="w-full h-full pt-20 pb-40 px-6 max-w-lg mx-auto flex flex-col justify-center gap-6">
                ${pillsHtml}
                <div id="write-q-box" class="bg-white dark:bg-dark-card p-8 rounded-3xl shadow-sm text-center border-2 border-gray-100 dark:border-dark-border cursor-pointer active:scale-95 transition-transform">
                    <span class="text-xs font-bold text-gray-400 uppercase tracking-widest">Translate</span>
                    <h2 class="text-3xl font-black text-gray-800 dark:text-white mt-2 leading-tight">${textService.smartWrap(originText)}</h2>
                </div>

                <div class="relative w-full">
                    <input type="text" id="writing-input" class="w-full h-16 px-6 rounded-2xl bg-gray-100 dark:bg-gray-800 border-2 border-transparent focus:border-cyan-500 outline-none text-2xl font-bold text-center text-gray-800 dark:text-white shadow-inner transition-all z-10" placeholder="Type here..." autocomplete="off">
                    <button id="write-hint-btn" class="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-cyan-500"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg></button>
                </div>
                
                <button id="write-submit-btn" class="w-full h-16 bg-cyan-500 text-white rounded-2xl font-black text-xl shadow-lg shadow-cyan-500/30 active:scale-95 transition-all">CHECK</button>
            </div>

            <div class="fixed bottom-0 left-0 right-0 p-4 z-40 bg-gradient-to-t from-gray-100 via-gray-100 to-transparent dark:from-dark-bg">
                <div class="max-w-lg mx-auto flex gap-4">
                    <button id="write-prev-btn" class="flex-1 h-14 bg-white dark:bg-dark-card border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-95 transition-all">
                        <svg class="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg>
                    </button>
                    <button id="write-next-btn" class="flex-1 h-14 bg-cyan-500 text-white rounded-2xl shadow-lg shadow-cyan-500/30 flex items-center justify-center font-bold tracking-wide active:scale-95 transition-all">
                        <svg class="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>
                    </button>
                </div>
            </div>
        `;

        this.container.querySelector('#write-close-btn').addEventListener('click', () => window.dispatchEvent(new CustomEvent('router:home')));
        this.container.querySelector('#write-random-btn').addEventListener('click', () => this.random());
        this.container.querySelector('#write-prev-btn').addEventListener('click', () => this.prev());
        this.container.querySelector('#write-next-btn').addEventListener('click', () => this.next());
        this.container.querySelector('#write-submit-btn').addEventListener('click', () => this.checkAnswer());
        this.container.querySelector('#write-hint-btn').addEventListener('click', () => this.playHint());
        this.container.querySelector('#write-q-box').addEventListener('click', () => this.revealAnswer());
        
        this.container.querySelectorAll('.category-pill').forEach(btn => {
            btn.addEventListener('click', (e) => this.setCategory(e.currentTarget.dataset.cat));
        });

        // Navigation Logic
        const idInput = this.container.querySelector('#write-id-input');
        const goBtn = this.container.querySelector('#write-go-btn');
        goBtn.addEventListener('click', () => this.gotoId(idInput.value));
        idInput.addEventListener('click', (e) => e.stopPropagation()); // prevent text from being selected when clicked
        
        const textInput = this.container.querySelector('#writing-input');
        textInput.addEventListener('keydown', (e) => e.stopPropagation());
        textInput.addEventListener('keypress', (e) => {
            e.stopPropagation();
            if(e.key === 'Enter') this.checkAnswer();
        });
        
        // Navigation ID Input Enter key
        idInput.addEventListener('keypress', (e) => {
             if(e.key === 'Enter') this.gotoId(idInput.value);
        });
    }
}
export const writingApp = new WritingApp();

import { vocabService } from '../services/vocabService';
import { settingsService } from '../services/settingsService';
import { audioService } from '../services/audioService';
import { scoreService } from '../services/scoreService';
import { textService } from '../services/textService';

export class ReverseApp {
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
        this.isProcessing = false;
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
        const target = list[this.currentIndex];
        
        const others = list.filter(i => i.id !== target.id).sort(() => 0.5 - Math.random()).slice(0, 3);
        const choices = [target, ...others].sort(() => 0.5 - Math.random());
        
        this.currentData = { target, choices };
        this.render();
    }

    handleChoice(id, el) {
        if (this.isProcessing) return;
        
        const chosen = this.currentData.choices.find(c => c.id === id);
        if (chosen) audioService.speak(chosen.front.main, settingsService.get().targetLang);

        this.isProcessing = true;
        const isCorrect = id === this.currentData.target.id;
        
        if (isCorrect) {
            el.classList.replace('bg-white', 'bg-green-500');
            el.classList.replace('dark:bg-dark-card', 'bg-green-500');
            el.classList.add('text-white', 'border-green-600', 'animate-celebrate');
            
            scoreService.addScore('reverse', 10);
            
            setTimeout(() => this.next(), 1000);
        } else {
            el.classList.replace('bg-white', 'bg-red-500');
            el.classList.replace('dark:bg-dark-card', 'bg-red-500');
            el.classList.add('text-white', 'border-red-600', 'shake');
            setTimeout(() => {
                this.isProcessing = false;
                el.classList.remove('shake');
                el.classList.replace('bg-red-500', 'bg-white');
                el.classList.replace('bg-red-500', 'dark:bg-dark-card');
                el.classList.remove('text-white', 'border-red-600');
            }, 500);
        }
    }

    playHint() {
        audioService.speak(this.currentData.target.front.main, settingsService.get().targetLang);
    }

    render() {
        if (!this.container) return;
        const { target, choices } = this.currentData;
        const originText = target.back.main || target.back.definition;

        const pillsHtml = `
            <div class="w-full overflow-x-auto whitespace-nowrap px-4 pb-2 mb-2 flex gap-2 no-scrollbar">
                ${this.categories.map(cat => `
                    <button class="category-pill px-4 py-1 rounded-full text-sm font-bold border ${this.currentCategory === cat ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-white dark:bg-dark-card text-gray-500 border-gray-200 dark:border-gray-700'}" data-cat="${cat}">
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
                        <input type="number" id="rev-id-input" value="${target.id}" class="w-12 bg-transparent text-sm font-bold text-gray-700 dark:text-white outline-none text-center appearance-none m-0 p-0">
                        <button id="rev-go-btn" class="ml-1 w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center hover:bg-indigo-200"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg></button>
                    </div>
                    <button class="game-edit-btn bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-full w-8 h-8 flex items-center justify-center shadow-sm text-gray-500 hover:text-indigo-500 active:scale-95 transition-all">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                    </button>
                    <button id="rev-random-btn" class="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-full w-8 h-8 flex items-center justify-center shadow-sm text-gray-500 hover:text-indigo-500 active:scale-95 transition-all">
                        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                    </button>
                </div>
                <div class="flex items-center gap-2">
                    <button id="score-pill" class="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-full px-3 py-1 flex items-center gap-2 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <span class="text-base">🏆</span>
                        <span class="font-black text-gray-700 dark:text-white text-sm global-score-display">${scoreService.todayScore}</span>
                    </button>
                    <button id="rev-close-btn" class="header-icon-btn bg-red-50 text-red-500 rounded-full shadow-sm"><svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
            </div>

            <div class="w-full h-full pt-20 pb-28 px-4 max-w-lg mx-auto flex flex-col gap-6 justify-center">
                ${pillsHtml}
                <div id="rev-q-box" class="bg-white dark:bg-dark-card p-8 rounded-3xl shadow-sm text-center border-2 border-gray-100 dark:border-dark-border cursor-pointer active:scale-95 transition-transform hover:border-indigo-200 group">
                    <div class="flex items-center justify-center gap-2 mb-2">
                        <span class="text-xs font-bold text-gray-400 uppercase tracking-widest">Select Translation</span>
                        <svg class="w-4 h-4 text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                    </div>
                    <h2 class="question-text text-3xl font-black text-gray-800 dark:text-white leading-tight">${textService.smartWrap(originText)}</h2>
                </div>

                <div class="grid grid-cols-2 gap-3">
                    ${choices.map(c => `
                        <button class="choice-btn bg-white dark:bg-dark-card border-2 border-gray-100 dark:border-dark-border p-1 rounded-2xl shadow-sm hover:shadow-md text-xl font-bold text-gray-700 dark:text-white transition-all active:scale-98 text-center flex flex-col items-center justify-center whitespace-nowrap overflow-hidden min-h-[6rem]" data-id="${c.id}">
                            <span class="choice-text w-full px-1">${textService.smartWrap(c.front.main)}</span>
                        </button>
                    `).join('')}
                </div>
            </div>

            <div class="fixed bottom-0 left-0 right-0 p-4 z-40 bg-gradient-to-t from-gray-100 via-gray-100 to-transparent dark:from-dark-bg">
                <div class="max-w-lg mx-auto flex gap-4">
                    <button id="rev-prev-btn" class="flex-1 h-14 bg-white dark:bg-dark-card border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-95 transition-all">
                        <svg class="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg>
                    </button>
                    <button id="rev-next-btn" class="flex-1 h-14 bg-indigo-500 text-white rounded-2xl shadow-lg shadow-indigo-500/30 flex items-center justify-center font-bold tracking-wide active:scale-95 transition-all">
                        <svg class="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>
                    </button>
                </div>
            </div>
        `;

        this.container.querySelector('#rev-close-btn').addEventListener('click', () => window.dispatchEvent(new CustomEvent('router:home')));
        this.container.querySelector('#rev-random-btn').addEventListener('click', () => this.random());
        this.container.querySelector('#rev-prev-btn').addEventListener('click', () => this.prev());
        this.container.querySelector('#rev-next-btn').addEventListener('click', () => this.next());
        this.container.querySelector('#rev-q-box').addEventListener('click', () => this.playHint());
        
        this.container.querySelectorAll('.category-pill').forEach(btn => {
            btn.addEventListener('click', (e) => this.setCategory(e.currentTarget.dataset.cat));
        });

        // Navigation Logic
        const idInput = this.container.querySelector('#rev-id-input');
        const goBtn = this.container.querySelector('#rev-go-btn');
        goBtn.addEventListener('click', () => this.gotoId(idInput.value));
        idInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') this.gotoId(idInput.value); });
        idInput.addEventListener('click', (e) => e.stopPropagation());

        this.container.querySelectorAll('.choice-btn').forEach(btn => btn.addEventListener('click', (e) => this.handleChoice(parseInt(e.currentTarget.dataset.id), e.currentTarget)));
        
        requestAnimationFrame(() => {
            textService.fitText(this.container.querySelector('.question-text'), 20, 60);
            if(this.container) {
                this.container.querySelectorAll('.choice-text').forEach(el => textService.fitText(el, 22, 60));
            }
        });
    }
}
export const reverseApp = new ReverseApp();

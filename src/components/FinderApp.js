import { vocabService } from '../services/vocabService';
import { settingsService } from '../services/settingsService';
import { audioService } from '../services/audioService';
import { scoreService } from '../services/scoreService';
import { textService } from '../services/textService';

export class FinderApp {
    constructor() {
        this.container = null;
        this.currentData = null;
        this.isProcessing = false;
        this.currentIndex = 0;
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

    random() {
        const list = this.getFilteredList();
        if (list.length === 0) return;
        const randItem = list[Math.floor(Math.random() * list.length)];
        this.currentIndex = vocabService.findIndexById(randItem.id);
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
        const list = vocabService.getAll();
        if (!list || list.length < 9) { 
            if(this.container) this.container.innerHTML = `<div class="p-10 text-center">Not enough vocab (need 9+)</div>`;
            return;
        }
        
        const target = list[this.currentIndex];
        const others = list.filter(i => i.id !== target.id).sort(() => 0.5 - Math.random()).slice(0, 8);
        const choices = [target, ...others].sort(() => 0.5 - Math.random());
        
        this.currentData = { target, choices };
        this.isProcessing = false;
        this.render();
    }

    handleChoice(id, el) {
        if (this.isProcessing) return;
        
        const chosen = this.currentData.choices.find(c => c.id === id);
        if (chosen) audioService.speak(chosen.front.main, settingsService.get().targetLang);

        if (id === this.currentData.target.id) {
            this.isProcessing = true;
            el.classList.remove('bg-white', 'dark:bg-dark-card');
            el.classList.add('bg-green-500', 'text-white', 'border-green-600');
            scoreService.addScore('finder', 10);
            setTimeout(() => this.next(), 1000);
        } else {
            el.classList.add('bg-red-100', 'dark:bg-red-900', 'shake');
            setTimeout(() => el.classList.remove('bg-red-100', 'dark:bg-red-900', 'shake'), 500);
        }
    }

    playHint() {
        audioService.speak(this.currentData.target.front.main, settingsService.get().targetLang);
    }

    render() {
        if (!this.container || !this.currentData) return;
        const { target, choices } = this.currentData;
        const prompt = target.back.main || target.back.definition;

        const pillsHtml = `
            <div class="w-full overflow-x-auto whitespace-nowrap px-4 pb-2 mb-2 flex gap-2 no-scrollbar">
                ${this.categories.map(cat => `
                    <button class="category-pill px-4 py-1 rounded-full text-sm font-bold border ${this.currentCategory === cat ? 'bg-rose-500 text-white border-rose-500' : 'bg-white dark:bg-dark-card text-gray-500 border-gray-200 dark:border-gray-700'}" data-cat="${cat}">
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
                        <input type="number" id="find-id-input" value="${target.id}" class="w-12 bg-transparent text-sm font-bold text-gray-700 dark:text-white outline-none text-center appearance-none m-0 p-0">
                        <button id="find-go-btn" class="ml-1 w-6 h-6 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center hover:bg-rose-200"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg></button>
                    </div>
                    <button class="game-edit-btn bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-full w-8 h-8 flex items-center justify-center shadow-sm text-gray-500 hover:text-rose-500 active:scale-95 transition-all">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                    </button>
                    <button id="find-random-btn" class="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-full w-8 h-8 flex items-center justify-center shadow-sm text-gray-500 hover:text-rose-500 active:scale-95 transition-all">
                        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                    </button>
                </div>
                <div class="flex items-center gap-2">
                    <button id="score-pill" class="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-full px-3 py-1 flex items-center gap-2 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <span class="text-base">🏆</span>
                        <span class="font-black text-gray-700 dark:text-white text-sm global-score-display">${scoreService.todayScore}</span>
                    </button>
                    <button id="find-close-btn" class="header-icon-btn bg-red-50 text-red-500 rounded-full shadow-sm"><svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
            </div>

            <div class="w-full h-full pt-20 pb-28 px-4 max-w-lg mx-auto flex flex-col gap-4">
                ${pillsHtml}
                <div class="bg-white dark:bg-dark-card p-4 rounded-2xl shadow-sm text-center border-2 border-gray-100 dark:border-dark-border min-h-[4rem] flex items-center justify-center">
                    <h2 class="text-xl font-bold text-gray-800 dark:text-white leading-tight">${prompt}</h2>
                </div>

                <div class="grid grid-cols-3 gap-2 flex-1">
                    ${choices.map(c => `
                        <button class="find-choice bg-white dark:bg-dark-card border-2 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:border-rose-300 active:scale-95 transition-all p-1 flex items-center justify-center overflow-hidden" data-id="${c.id}">
                            <span class="find-text w-full text-center font-bold text-gray-700 dark:text-white leading-none">${textService.smartWrap(c.front.main)}</span>
                        </button>
                    `).join('')}
                </div>
            </div>

            <div class="fixed bottom-0 left-0 right-0 p-4 z-40 bg-gradient-to-t from-gray-100 via-gray-100 to-transparent dark:from-dark-bg">
                <div class="max-w-lg mx-auto flex gap-4">
                    <button id="find-prev-btn" class="flex-1 h-14 bg-white dark:bg-dark-card border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-95 transition-all">
                        <svg class="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg>
                    </button>
                    <button id="find-next-btn" class="flex-1 h-14 bg-rose-500 text-white rounded-2xl shadow-lg shadow-rose-500/30 flex items-center justify-center font-bold tracking-wide active:scale-95 transition-all">
                        <svg class="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>
                    </button>
                </div>
            </div>
        `;

        this.container.querySelector('#find-close-btn').addEventListener('click', () => window.dispatchEvent(new CustomEvent('router:home')));
        this.container.querySelector('#find-random-btn').addEventListener('click', () => this.random());
        this.container.querySelector('#find-prev-btn').addEventListener('click', () => this.prev());
        this.container.querySelector('#find-next-btn').addEventListener('click', () => this.next());
        
        this.container.querySelectorAll('.category-pill').forEach(btn => {
            btn.addEventListener('click', (e) => this.setCategory(e.currentTarget.dataset.cat));
        });

        // Navigation Logic
        const idInput = this.container.querySelector('#find-id-input');
        const goBtn = this.container.querySelector('#find-go-btn');
        goBtn.addEventListener('click', () => this.gotoId(idInput.value));
        idInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') this.gotoId(idInput.value); });
        idInput.addEventListener('click', (e) => e.stopPropagation());

        this.container.querySelectorAll('.find-choice').forEach(btn => btn.addEventListener('click', (e) => this.handleChoice(parseInt(e.currentTarget.dataset.id), e.currentTarget)));
        
        requestAnimationFrame(() => {
            if(!this.container) return;
            this.container.querySelectorAll('.find-text').forEach(el => {
                textService.fitText(el, 18, 55, false);
            });
        });
    }
}
export const finderApp = new FinderApp();

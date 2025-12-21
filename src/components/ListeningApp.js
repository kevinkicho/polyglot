import { vocabService } from '../services/vocabService';
import { settingsService } from '../services/settingsService';
import { audioService } from '../services/audioService';
import { textService } from '../services/textService';
import { scoreService } from '../services/scoreService';

export class ListeningApp {
    constructor() {
        this.container = null;
        this.currentIndex = 0;
        this.currentData = null;
        this.isProcessing = false;
        this.isPlaying = false;
        this.categories = [];
        this.currentCategory = 'All';
    }

    mount(elementId) {
        this.container = document.getElementById(elementId);
        this.updateCategories();
        if (!this.currentData) this.random();
        else this.render();
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
        if (list.length === 0) return;
        const randItem = list[Math.floor(Math.random() * list.length)];
        this.currentIndex = vocabService.findIndexById(randItem.id);
        this.loadGame();
    }

    next(id = null) {
        this.isProcessing = false;
        audioService.stop();
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

    playAudio() {
        if (this.currentData && this.currentData.target) {
            this.isPlaying = true;
            this.renderButtonState();
            audioService.speak(this.currentData.target.front.main, settingsService.get().targetLang)
                .then(() => {
                    this.isPlaying = false;
                    this.renderButtonState();
                });
        }
    }

    loadGame() {
        this.isProcessing = false;
        const list = vocabService.getAll(); 
        if (!list || !list.length) return;
        
        const target = list[this.currentIndex];
        
        const others = list.filter(i => i.id !== target.id).sort(() => 0.5 - Math.random()).slice(0, 3);
        const choices = [target, ...others].sort(() => 0.5 - Math.random());
        
        this.currentData = { target, choices };
        this.render();
        if (settingsService.get().autoPlay) setTimeout(() => this.playAudio(), 500);
    }

    async handleChoice(id, el) {
        if (this.isProcessing) return;
        this.isProcessing = true;
        
        const isCorrect = id === this.currentData.target.id;
        if (isCorrect) {
            el.classList.remove('bg-white', 'dark:bg-dark-card');
            el.classList.add('bg-green-500', 'text-white', 'border-green-600');
            scoreService.addScore('listening', 10);
            el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.05)', offset: 0.5 }, { transform: 'scale(1)' }], { duration: 300 });
            setTimeout(() => this.next(), 1000);
        } else {
            el.classList.remove('bg-white', 'dark:bg-dark-card');
            el.classList.add('bg-red-500', 'text-white', 'border-red-600');
            el.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-5px)', offset: 0.2 }, { transform: 'translateX(5px)', offset: 0.4 }, { transform: 'translateX(-5px)', offset: 0.6 }, { transform: 'translateX(5px)', offset: 0.8 }, { transform: 'translateX(0)' }], { duration: 400 });
            this.isProcessing = false; 
        }
    }

    renderButtonState() {
        if(!this.container) return;
        const btn = this.container.querySelector('#listening-play-btn');
        const icon = this.container.querySelector('#listening-play-icon');
        if(!btn || !icon) return;
        if (this.isPlaying) { btn.classList.add('ring-4', 'ring-indigo-300', 'scale-110'); icon.classList.add('animate-pulse'); } 
        else { btn.classList.remove('ring-4', 'ring-indigo-300', 'scale-110'); icon.classList.remove('animate-pulse'); }
    }

    render() {
        if (!this.container || !this.currentData) return;
        const { target, choices } = this.currentData;
        const getLabel = (item) => item.back.definition || item.back.main || "???";

        const pillsHtml = `
            <div class="w-full overflow-x-auto whitespace-nowrap px-6 pb-2 mb-2 flex gap-2 no-scrollbar">
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
                    <div class="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-full pl-1 pr-3 py-1 flex items-center shadow-sm">
                        <span class="bg-blue-100 text-blue-600 text-xs font-bold px-2 py-1 rounded-full mr-2">ID</span>
                        <input type="number" id="listening-id-input" value="${target.id}" class="w-12 bg-transparent text-sm font-bold text-gray-700 dark:text-white outline-none text-center appearance-none m-0 p-0">
                        <button id="listening-go-btn" class="ml-1 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center hover:bg-blue-200"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg></button>
                    </div>
                    <button class="game-edit-btn bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-full w-8 h-8 flex items-center justify-center shadow-sm text-gray-500 hover:text-blue-500 active:scale-95 transition-all">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                    </button>
                    <button id="listening-random-btn" class="header-icon-btn bg-white dark:bg-dark-card border border-gray-200 rounded-xl text-indigo-500 shadow-sm">
                        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                    </button>
                </div>
                <div class="flex items-center gap-2">
                    <button id="score-pill" class="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-full px-3 py-1 flex items-center gap-2 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <span class="text-base">🏆</span>
                        <span class="font-black text-gray-700 dark:text-white text-sm global-score-display">${scoreService.todayScore}</span>
                    </button>
                    <button id="listening-close-btn" class="header-icon-btn bg-red-50 text-red-500 rounded-full shadow-sm"><svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
            </div>

            <div class="w-full h-full pt-20 pb-10 px-6 max-w-lg mx-auto flex flex-col justify-center">
                ${pillsHtml}
                <div class="flex-1 flex flex-col items-center justify-center min-h-[200px]">
                    <button id="listening-play-btn" class="w-32 h-32 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-2xl flex items-center justify-center transform transition-all active:scale-95 hover:shadow-indigo-500/50">
                        <svg id="listening-play-icon" xmlns="http://www.w3.org/2000/svg" class="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        </svg>
                    </button>
                    <p class="mt-6 text-gray-400 font-bold uppercase tracking-widest text-xs animate-pulse">Tap to Listen</p>
                </div>
                <div class="grid grid-cols-1 gap-2 pb-8 w-full">
                    ${choices.map(c => `
                        <button class="choice-btn bg-white dark:bg-dark-card border-2 border-gray-100 dark:border-dark-border p-1 rounded-2xl shadow-sm hover:shadow-md text-xl font-bold text-gray-700 dark:text-white transition-all active:scale-98 text-left h-20 flex items-center overflow-hidden" data-id="${c.id}">
                            <span class="choice-text w-full px-2 leading-relaxed text-center">${textService.smartWrap(getLabel(c))}</span>
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
        
        this.bind('#listening-play-btn', 'click', () => this.playAudio());
        this.bind('#listening-close-btn', 'click', () => window.dispatchEvent(new CustomEvent('router:home')));
        this.bind('#listening-random-btn', 'click', () => this.random());
        
        // Navigation Logic
        const idInput = this.container.querySelector('#listening-id-input');
        if(idInput) {
            idInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') this.next(parseInt(e.target.value)); });
            idInput.addEventListener('click', (e) => e.stopPropagation());
        }
        this.bind('#listening-go-btn', 'click', () => {
            const val = this.container.querySelector('#listening-id-input').value;
            this.next(parseInt(val));
        });

        this.container.querySelectorAll('.category-pill').forEach(btn => {
            btn.addEventListener('click', (e) => this.setCategory(e.currentTarget.dataset.cat));
        });

        this.container.querySelectorAll('.choice-btn').forEach(btn => btn.addEventListener('click', (e) => this.handleChoice(parseInt(e.currentTarget.dataset.id), e.currentTarget)));
        
        requestAnimationFrame(() => {
            if(this.container) {
                this.container.querySelectorAll('.choice-text').forEach(el => textService.fitText(el, 18, 45));
            }
        });
    }
}
export const listeningApp = new ListeningApp();

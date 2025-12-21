import { vocabService } from '../services/vocabService';
import { settingsService } from '../services/settingsService';
import { audioService } from '../services/audioService';
import { scoreService } from '../services/scoreService';
import { textService } from '../services/textService';

export class ConstructorApp {
    constructor() {
        this.container = null;
        this.currentData = null;
        this.currentIndex = 0;
        this.builtChars = [];
        this.isProcessing = false;
        this.charPool = []; 
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
        const item = list[this.currentIndex];

        let targetText = item.front.main;

        // Splitting Logic for synonyms
        const separatorRegex = /[\/·・･,、。.\s]+/;
        const variations = targetText.split(separatorRegex).filter(v => v.trim().length > 0);
        
        let selectedVariation = targetText;
        if (variations.length > 0) {
            selectedVariation = variations[Math.floor(Math.random() * variations.length)];
        }

        // Clean forbidden chars from tiles
        const forbiddenChars = /[\/·・･,、。.\s\t\n]/;
        const chars = selectedVariation.split('').filter(c => !forbiddenChars.test(c));
        
        const cleanTargetWord = chars.join('');

        this.charPool = chars.map((char, i) => ({ char, id: i, used: false })).sort(() => 0.5 - Math.random());
        this.builtChars = [];
        this.currentData = { item, chars, targetWord: cleanTargetWord, displayWord: selectedVariation };
        
        this.render();
    }

    handlePoolClick(poolIdx) {
        if (this.isProcessing) return;
        const c = this.charPool[poolIdx];
        if (c.used) return;

        if(settingsService.get().clickAudio !== false) {
            audioService.speak(c.char, settingsService.get().targetLang);
        }

        this.builtChars.push(poolIdx);
        c.used = true;
        this.render();
        this.checkWin();
    }

    handleBuiltClick(builtPos) {
        if (this.isProcessing) return;
        const poolIdx = this.builtChars[builtPos];
        this.charPool[poolIdx].used = false;
        this.builtChars.splice(builtPos, 1);
        this.render();
    }

    checkWin() {
        const currentStr = this.builtChars.map(idx => this.charPool[idx].char).join('');
        
        if (currentStr === this.currentData.targetWord) {
            this.isProcessing = true;
            scoreService.addScore('constructor', 10);
            
            if(settingsService.get().autoPlay) {
                audioService.speak(this.currentData.displayWord, settingsService.get().targetLang);
            }

            const zone = this.container.querySelector('#const-slots');
            zone.classList.add('animate-celebrate', 'border-green-500', 'bg-green-50', 'dark:bg-green-900/20');
            setTimeout(() => this.next(), 1000);
        }
    }

    playHint() {
        audioService.speak(this.currentData.displayWord, settingsService.get().targetLang);
    }

    render() {
        if (!this.container) return;
        const { item } = this.currentData;
        const originText = item.back.main || item.back.definition;

        const pillsHtml = `
            <div class="w-full overflow-x-auto whitespace-nowrap px-4 pb-2 mb-2 flex gap-2 no-scrollbar">
                ${this.categories.map(cat => `
                    <button class="category-pill px-4 py-1 rounded-full text-sm font-bold border ${this.currentCategory === cat ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white dark:bg-dark-card text-gray-500 border-gray-200 dark:border-gray-700'}" data-cat="${cat}">
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
                        <input type="number" id="const-id-input" value="${item.id}" class="w-12 bg-transparent text-sm font-bold text-gray-700 dark:text-white outline-none text-center appearance-none m-0 p-0">
                        <button id="const-go-btn" class="ml-1 w-6 h-6 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center hover:bg-emerald-200"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg></button>
                    </div>
                    <button class="game-edit-btn bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-full w-8 h-8 flex items-center justify-center shadow-sm text-gray-500 hover:text-emerald-500 active:scale-95 transition-all">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                    </button>
                    <button id="const-random-btn" class="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-full w-8 h-8 flex items-center justify-center shadow-sm text-gray-500 hover:text-emerald-500 active:scale-95 transition-all">
                        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                    </button>
                </div>
                <div class="flex items-center gap-2">
                    <button id="score-pill" class="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-full px-3 py-1 flex items-center gap-2 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <span class="text-base">🏆</span>
                        <span class="font-black text-gray-700 dark:text-white text-sm global-score-display">${scoreService.todayScore}</span>
                    </button>
                    <button id="const-close-btn" class="header-icon-btn bg-red-50 text-red-500 rounded-full shadow-sm"><svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
            </div>

            <div class="w-full h-full pt-20 pb-28 px-4 max-w-lg mx-auto flex flex-col gap-6">
                ${pillsHtml}
                <div id="const-question-box" class="bg-white dark:bg-dark-card p-4 rounded-3xl shadow-sm border-2 border-gray-100 dark:border-dark-border cursor-pointer active:scale-95 transition-transform hover:border-emerald-200 group flex flex-col h-32 justify-center items-center">
                    <span class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Build</span>
                    <h2 class="font-bold text-gray-800 dark:text-white w-full text-center flex-1 flex items-center justify-center whitespace-nowrap" data-fit="true">${textService.smartWrap(originText)}</h2>
                </div>

                <div id="const-slots" class="flex flex-wrap justify-center gap-2 min-h-[4rem] p-3 bg-gray-100 dark:bg-dark-bg/50 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 transition-all">
                    ${this.builtChars.map((poolIdx, i) => `
                        <button class="bg-emerald-500 text-white rounded-lg px-4 py-2 font-black text-xl shadow-md active:scale-95 min-w-[3rem]" data-pos="${i}">${this.charPool[poolIdx].char}</button>
                    `).join('')}
                    ${this.builtChars.length === 0 ? '<span class="text-gray-400 text-sm self-center font-medium animate-pulse">Tap tiles below</span>' : ''}
                </div>

                <div class="flex-1 overflow-y-auto custom-scrollbar">
                    <div class="grid grid-cols-4 gap-2 pb-4">
                        ${this.charPool.map((c, i) => `
                            <button class="choice-tile bg-white dark:bg-dark-card border-2 border-gray-200 dark:border-gray-700 rounded-xl aspect-square font-black text-gray-700 dark:text-white shadow-sm hover:border-emerald-400 active:scale-95 transition-all p-0 flex items-center justify-center overflow-hidden ${c.used ? 'opacity-20 pointer-events-none' : ''}" data-index="${i}">
                                <span class="tile-text w-full text-center leading-none whitespace-nowrap">${c.char}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>

            <div class="fixed bottom-0 left-0 right-0 p-4 z-40 bg-gradient-to-t from-gray-100 via-gray-100 to-transparent dark:from-dark-bg">
                <div class="max-w-lg mx-auto flex gap-4">
                    <button id="const-prev-btn" class="flex-1 h-14 bg-white dark:bg-dark-card border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-95 transition-all">
                        <svg class="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg>
                    </button>
                    <button id="const-next-btn" class="flex-1 h-14 bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-500/30 flex items-center justify-center font-bold tracking-wide active:scale-95 transition-all">
                        <svg class="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>
                    </button>
                </div>
            </div>
        `;

        this.container.querySelector('#const-close-btn').addEventListener('click', () => window.dispatchEvent(new CustomEvent('router:home')));
        this.container.querySelector('#const-question-box').addEventListener('click', () => this.playHint());
        this.container.querySelector('#const-prev-btn').addEventListener('click', () => this.prev());
        this.container.querySelector('#const-next-btn').addEventListener('click', () => this.next());
        this.container.querySelector('#const-random-btn').addEventListener('click', () => this.random());
        
        this.container.querySelectorAll('.category-pill').forEach(btn => {
            btn.addEventListener('click', (e) => this.setCategory(e.currentTarget.dataset.cat));
        });

        // Navigation Logic
        const idInput = this.container.querySelector('#const-id-input');
        const goBtn = this.container.querySelector('#const-go-btn');
        goBtn.addEventListener('click', () => this.gotoId(idInput.value));
        idInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') this.gotoId(idInput.value); });
        idInput.addEventListener('click', (e) => e.stopPropagation());

        this.container.querySelectorAll('.choice-tile').forEach(btn => btn.addEventListener('click', (e) => this.handlePoolClick(parseInt(e.currentTarget.dataset.index))));
        this.container.querySelectorAll('[data-pos]').forEach(btn => btn.addEventListener('click', (e) => this.handleBuiltClick(parseInt(e.currentTarget.dataset.pos))));
        
        requestAnimationFrame(() => {
            textService.fitText(this.container.querySelector('[data-fit="true"]'), 20, 60);
            if(this.container) {
                this.container.querySelectorAll('.tile-text').forEach(el => textService.fitText(el, 28, 64));
            }
        });
    }
}
export const constructorApp = new ConstructorApp();

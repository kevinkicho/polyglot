import { vocabService } from '../services/vocabService';
import { settingsService } from '../services/settingsService';
import { audioService } from '../services/audioService';
import { scoreService } from '../services/scoreService';
import { textService } from '../services/textService';

export class SentencesApp {
    constructor() {
        this.container = null;
        this.currentData = null;
        this.currentIndex = 0;
        this.builtIndices = [];
        this.isProcessing = false;
        this.wordPool = []; 
    }

    mount(elementId) {
        this.container = document.getElementById(elementId);
        this.random();
    }

    // NEW: Allows the app to reload data without changing the question ID
    refresh() {
        this.loadGame();
    }

    random() {
        this.currentIndex = vocabService.getRandomIndex();
        this.loadGame();
    }

    next(id = null) {
        this.isProcessing = false;
        if (id !== null) {
            const idx = vocabService.findIndexById(id);
            if (idx !== -1) this.currentIndex = idx;
        } else {
            const list = vocabService.getAll();
            this.currentIndex = (this.currentIndex + 1) % list.length;
        }
        this.loadGame();
    }

    prev() {
        const list = vocabService.getAll();
        this.currentIndex = (this.currentIndex - 1 + list.length) % list.length;
        this.loadGame();
    }

    gotoId(id) {
        const idx = vocabService.findIndexById(parseInt(id));
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

        let sentence = item.back.sentenceTarget || item.front.main;
        
        let parts;
        if (settingsService.get().targetLang === 'ja') {
            parts = textService.tokenizeJapanese(sentence);
        } else {
            parts = sentence.split(/([\s,.!?、。]+)/).filter(s => s.trim().length > 0);
        }
        
        this.wordPool = parts.map((word, i) => ({ word, id: i, used: false })).sort(() => 0.5 - Math.random());
        this.builtIndices = [];
        this.currentData = { item, parts, sentence };
        this.render();
    }

    handlePoolClick(poolIdx) {
        if (this.isProcessing) return;
        const w = this.wordPool[poolIdx];
        if (w.used) return;

        if(settingsService.get().sentencesWordAudio) {
            audioService.speak(w.word, settingsService.get().targetLang);
        }

        this.builtIndices.push(poolIdx);
        w.used = true;
        this.render();
        this.checkWin();
    }

    handleBuiltClick(builtPos) {
        if (this.isProcessing) return;
        const poolIdx = this.builtIndices[builtPos];
        this.wordPool[poolIdx].used = false;
        this.builtIndices.splice(builtPos, 1);
        this.render();
    }

    async checkWin() {
        const currentStr = this.builtIndices.map(idx => this.wordPool[idx].word).join('');
        const targetStr = this.currentData.parts.join('');
        
        if (currentStr.replace(/\s/g, '') === targetStr.replace(/\s/g, '')) {
            this.isProcessing = true;
            scoreService.addScore('sentences', 10);
            
            if(settingsService.get().autoPlay) {
                await audioService.speak(this.currentData.sentence, settingsService.get().targetLang);
            }

            const zone = this.container.querySelector('#sent-slots');
            zone.classList.add('animate-celebrate', 'border-green-500', 'bg-green-50', 'dark:bg-green-900/20');
            setTimeout(() => this.next(), 500);
        }
    }

    playHint() {
        audioService.speak(this.currentData.sentence, settingsService.get().targetLang);
    }

    render() {
        if (!this.container) return;
        const { item } = this.currentData;
        const originText = item.back.sentenceOrigin || item.back.main || item.back.definition;

        this.container.innerHTML = `
            <div class="fixed top-0 left-0 right-0 h-16 z-40 px-4 flex justify-between items-center bg-gray-100/90 dark:bg-dark-bg/90 backdrop-blur-sm border-b border-white/10">
                <div class="flex items-center gap-2">
                    <div class="flex items-center bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-full pl-3 pr-1 py-1 shadow-sm">
                        <span class="text-xs font-bold text-gray-400 mr-2 uppercase">ID</span>
                        <input type="number" id="sent-id-input" value="${item.id}" class="w-12 bg-transparent text-sm font-bold text-gray-700 dark:text-white outline-none text-center appearance-none m-0 p-0">
                        <button id="sent-go-btn" class="ml-1 w-6 h-6 bg-pink-100 text-pink-600 rounded-full flex items-center justify-center hover:bg-pink-200"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg></button>
                    </div>
                    <button class="game-edit-btn bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-full w-8 h-8 flex items-center justify-center shadow-sm text-gray-500 hover:text-pink-500 active:scale-95 transition-all">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                    </button>
                    <button id="sent-random-btn" class="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-full w-8 h-8 flex items-center justify-center shadow-sm text-gray-500 hover:text-pink-500 active:scale-95 transition-all">
                        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                    </button>
                </div>
                <div class="flex items-center gap-2">
                    <button id="score-pill" class="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-full px-3 py-1 flex items-center gap-2 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <span class="text-base">🏆</span>
                        <span class="font-black text-gray-700 dark:text-white text-sm global-score-display">${scoreService.todayScore}</span>
                    </button>
                    <button id="sent-close-btn" class="header-icon-btn bg-red-50 text-red-500 rounded-full shadow-sm"><svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
            </div>

            <div class="w-full h-full pt-20 pb-28 px-4 max-w-lg mx-auto flex flex-col gap-4">
                <div id="sent-question-box" class="bg-white dark:bg-dark-card p-4 rounded-3xl shadow-sm text-center border-2 border-gray-100 dark:border-dark-border cursor-pointer active:scale-95 transition-transform hover:border-pink-200 group">
                    <h2 class="text-xl font-bold text-gray-800 dark:text-white mt-1" data-fit="true">${textService.smartWrap(originText)}</h2>
                </div>

                <div id="sent-slots" class="flex flex-wrap justify-center content-start gap-2 min-h-[5rem] p-4 bg-gray-100 dark:bg-dark-bg/50 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 transition-all overflow-y-auto custom-scrollbar">
                    ${this.builtIndices.map((poolIdx, i) => `
                        <button class="bg-pink-500 text-white rounded-lg px-3 py-2 font-bold shadow-md active:scale-95 whitespace-nowrap text-xl" data-pos="${i}">${this.wordPool[poolIdx].word}</button>
                    `).join('')}
                    ${this.builtIndices.length === 0 ? '<span class="text-gray-400 text-sm self-center font-medium animate-pulse w-full text-center">Tap words below</span>' : ''}
                </div>

                <div class="flex-1 overflow-y-auto custom-scrollbar">
                    <div class="flex flex-wrap justify-center gap-2 pb-4">
                        ${this.wordPool.map((w, i) => `
                            <button class="flex-grow bg-white dark:bg-dark-card border-2 border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 min-w-[4rem] min-h-[5rem] font-bold text-3xl text-gray-700 dark:text-white shadow-sm hover:border-pink-400 active:scale-95 transition-all whitespace-nowrap flex items-center justify-center ${w.used ? 'opacity-20 pointer-events-none' : ''}" data-index="${i}">
                                <span class="w-full text-center">${w.word}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>

            <div class="fixed bottom-0 left-0 right-0 p-4 z-40 bg-gradient-to-t from-gray-100 via-gray-100 to-transparent dark:from-dark-bg">
                <div class="max-w-lg mx-auto flex gap-4">
                    <button id="sent-prev-btn" class="flex-1 h-14 bg-white dark:bg-dark-card border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-95 transition-all">
                        <svg class="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg>
                    </button>
                    <button id="sent-next-btn" class="flex-1 h-14 bg-pink-500 text-white rounded-2xl shadow-lg shadow-pink-500/30 flex items-center justify-center font-bold tracking-wide active:scale-95 transition-all">
                        <svg class="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>
                    </button>
                </div>
            </div>
        `;

        this.container.querySelector('#sent-close-btn').addEventListener('click', () => window.dispatchEvent(new CustomEvent('router:home')));
        this.container.querySelector('#sent-question-box').addEventListener('click', () => this.playHint());
        this.container.querySelector('#sent-prev-btn').addEventListener('click', () => this.prev());
        this.container.querySelector('#sent-next-btn').addEventListener('click', () => this.next());
        this.container.querySelector('#sent-random-btn').addEventListener('click', () => this.random());
        
        const idInput = this.container.querySelector('#sent-id-input');
        const goBtn = this.container.querySelector('#sent-go-btn');
        goBtn.addEventListener('click', () => this.gotoId(idInput.value));
        idInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') this.gotoId(idInput.value); });

        this.container.querySelectorAll('[data-index]').forEach(btn => btn.addEventListener('click', (e) => this.handlePoolClick(parseInt(e.currentTarget.dataset.index))));
        this.container.querySelectorAll('[data-pos]').forEach(btn => btn.addEventListener('click', (e) => this.handleBuiltClick(parseInt(e.currentTarget.dataset.pos))));
        
        // --- THIS is the critical update: passing 'false' at the end ---
        requestAnimationFrame(() => {
            this.container.querySelectorAll('[data-fit="true"]').forEach(el => textService.fitText(el, 14, 80, false));
        });
    }
}
export const sentencesApp = new SentencesApp();

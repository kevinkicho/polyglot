import { vocabService } from '../services/vocabService';
import { settingsService } from '../services/settingsService';
import { audioService } from '../services/audioService';
import { scoreService } from '../services/scoreService';
import { textService } from '../services/textService';

export class TrueFalseApp {
    constructor() {
        this.container = null;
        this.currentData = null;
        this.currentIndex = 0;
        this.isProcessing = false;
        this.isCorrectPair = false; 
    }

    mount(elementId) {
        this.container = document.getElementById(elementId);
        this.random();
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
        this.isProcessing = false;
        const list = vocabService.getAll();
        this.currentIndex = (this.currentIndex - 1 + list.length) % list.length;
        this.loadGame();
    }

    gotoId(id) {
        const idx = vocabService.findIndexById(id);
        if (idx !== -1) {
            this.currentIndex = idx;
            this.loadGame();
        }
    }

    loadGame() {
        this.isProcessing = false;
        const list = vocabService.getAll();
        if (!list.length) return;
        const correctItem = list[this.currentIndex];
        this.isCorrectPair = Math.random() > 0.5;
        let displayMeaning = "";
        if (this.isCorrectPair) {
            displayMeaning = correctItem.back.main || correctItem.back.definition;
        } else {
            let distractor = list[Math.floor(Math.random() * list.length)];
            while (distractor.id === correctItem.id && list.length > 1) {
                distractor = list[Math.floor(Math.random() * list.length)];
            }
            displayMeaning = distractor.back.main || distractor.back.definition;
        }
        this.currentData = { item: correctItem, displayMeaning };
        this.render();
    }

    playAudio() {
        audioService.speak(this.currentData.item.front.main, settingsService.get().targetLang);
    }

    handleGuess(userGuessedTrue) {
        if (this.isProcessing) return;
        this.isProcessing = true;
        const correct = (userGuessedTrue === this.isCorrectPair);
        
        if (correct) {
            scoreService.addScore('truefalse', 10);
            if (settingsService.get().autoPlay) this.playAudio();
            const box = this.container.querySelector('#tf-card');
            box.classList.add('animate-celebrate', 'border-green-500', 'bg-green-50', 'dark:bg-green-900/20');
            setTimeout(() => this.next(), 800);
        } else {
            const box = this.container.querySelector('#tf-card');
            box.classList.add('shake', 'border-red-500', 'bg-red-50', 'dark:bg-red-900/20');
            setTimeout(() => {
                box.classList.remove('shake', 'border-red-500', 'bg-red-50', 'dark:bg-red-900/20');
                this.isProcessing = false;
            }, 500);
        }
    }

    render() {
        if (!this.container) return;
        const { item, displayMeaning } = this.currentData;

        this.container.innerHTML = `
            <div class="fixed top-0 left-0 right-0 h-16 z-40 px-4 flex justify-between items-center bg-gray-100/90 dark:bg-dark-bg/90 backdrop-blur-sm border-b border-white/10">
                <div class="flex items-center gap-2">
                    <div class="flex items-center bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-full pl-3 pr-1 py-1 shadow-sm">
                        <span class="text-xs font-bold text-gray-400 mr-2 uppercase">ID</span>
                        <input type="number" id="tf-id-input" value="${item.id}" class="w-12 bg-transparent text-sm font-bold text-gray-700 dark:text-white outline-none text-center appearance-none m-0 p-0">
                        <button id="tf-go-btn" class="ml-1 w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center hover:bg-orange-200"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg></button>
                    </div>
                    <button class="game-edit-btn bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-full w-8 h-8 flex items-center justify-center shadow-sm text-gray-500 hover:text-orange-500 active:scale-95 transition-all">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                    </button>
                    <button id="tf-random-btn" class="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-full w-8 h-8 flex items-center justify-center shadow-sm text-gray-500 hover:text-orange-500 active:scale-95 transition-all">
                        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                    </button>
                </div>
                <div class="flex items-center gap-2">
                     <button id="score-pill" class="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-full px-3 py-1 flex items-center gap-2 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <span class="text-base">🏆</span>
                        <span class="font-black text-gray-700 dark:text-white text-sm global-score-display">${scoreService.todayScore}</span>
                    </button>
                    <button id="tf-close-btn" class="header-icon-btn bg-red-50 text-red-500 rounded-full shadow-sm"><svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
            </div>

            <div class="w-full h-full pt-20 pb-28 px-6 flex flex-col items-center justify-center">
                <div id="tf-card" class="w-full max-w-sm bg-white dark:bg-dark-card border-4 border-gray-100 dark:border-dark-border rounded-[2rem] p-8 shadow-xl text-center flex flex-col items-center gap-6 transition-all duration-300">
                    <div class="w-full h-32 flex items-center justify-center" id="tf-q-box">
                        <h1 class="question-text font-black text-gray-800 dark:text-white leading-tight cursor-pointer active:scale-95 transition-transform w-full text-center h-full flex items-center justify-center">${item.front.main}</h1>
                    </div>
                    
                    <div class="w-full pt-2 border-t border-gray-100 dark:border-gray-700">
                        <h2 class="meaning-text text-3xl font-bold text-gray-600 dark:text-gray-300 leading-tight">${displayMeaning}</h2>
                    </div>
                </div>

                <div class="flex gap-4 w-full max-w-sm mt-8">
                     <button id="btn-false" class="flex-1 py-6 bg-red-500 dark:bg-red-700 text-white rounded-2xl shadow-lg shadow-red-500/30 font-black text-2xl active:scale-95 transition-transform">NO</button>
                     <button id="btn-true" class="flex-1 py-6 bg-green-500 dark:bg-green-700 text-white rounded-2xl shadow-lg shadow-green-500/30 font-black text-2xl active:scale-95 transition-transform">YES</button>
                </div>
            </div>

            <div class="fixed bottom-0 left-0 right-0 p-4 z-40 bg-gradient-to-t from-gray-100 via-gray-100 to-transparent dark:from-dark-bg">
                <div class="max-w-lg mx-auto flex gap-4">
                    <button id="tf-prev-btn" class="flex-1 h-14 bg-white dark:bg-dark-card border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-95 transition-all">
                        <svg class="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg>
                    </button>
                    <button id="tf-next-btn" class="flex-1 h-14 bg-orange-500 text-white rounded-2xl shadow-lg shadow-orange-500/30 flex items-center justify-center font-bold tracking-wide active:scale-95 transition-all">
                        <svg class="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>
                    </button>
                </div>
            </div>
        `;

        this.container.querySelector('#tf-close-btn').addEventListener('click', () => window.dispatchEvent(new CustomEvent('router:home')));
        this.container.querySelector('#tf-random-btn').addEventListener('click', () => this.random());
        this.container.querySelector('#tf-prev-btn').addEventListener('click', () => this.prev());
        this.container.querySelector('#tf-next-btn').addEventListener('click', () => this.next());
        this.container.querySelector('#tf-q-box').addEventListener('click', () => this.playAudio());
        this.container.querySelector('#btn-true').addEventListener('click', () => this.handleGuess(true));
        this.container.querySelector('#btn-false').addEventListener('click', () => this.handleGuess(false));

        const idInput = this.container.querySelector('#tf-id-input');
        const goBtn = this.container.querySelector('#tf-go-btn');
        goBtn.addEventListener('click', () => this.gotoId(idInput.value));
        idInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') this.gotoId(idInput.value); });

        requestAnimationFrame(() => {
            textService.fitText(this.container.querySelector('.question-text'), 20, 80);
            textService.fitText(this.container.querySelector('.meaning-text'), 18, 60);
        });
    }
}
export const trueFalseApp = new TrueFalseApp();

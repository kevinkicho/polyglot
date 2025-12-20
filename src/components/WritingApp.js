import { vocabService } from '../services/vocabService';
import { settingsService } from '../services/settingsService';
import { audioService } from '../services/audioService';
import { scoreService } from '../services/scoreService';
import { textService } from '../services/textService';

export class WritingApp {
    constructor() {
        this.container = null;
        this.currentData = null;
        this.currentIndex = 0;
        this.isProcessing = false;
        this.answerState = 'typing'; 
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
        this.answerState = 'typing';
        this.isProcessing = false;
        const list = vocabService.getAll();
        if (!list.length) return;
        this.currentData = { item: list[this.currentIndex] };
        this.render();
        setTimeout(() => { const inp = document.getElementById('writing-input'); if(inp) inp.focus(); }, 100);
    }

    checkAnswer() {
        if(this.isProcessing) return;
        const inp = document.getElementById('writing-input');
        const val = inp.value.trim().toLowerCase();
        const correctMain = this.currentData.item.front.main.toLowerCase();
        if (val === correctMain) this.handleWin();
        else this.handleFail();
    }

    handleWin() {
        this.isProcessing = true;
        this.answerState = 'correct';
        scoreService.addScore('writing', 10);
        if(settingsService.get().autoPlay) audioService.speak(this.currentData.item.front.main, settingsService.get().targetLang);
        this.render();
        setTimeout(() => this.next(), 1500);
    }

    handleFail() {
        const inp = document.getElementById('writing-input');
        inp.classList.add('animate-shake', 'border-red-500', 'text-red-500');
        setTimeout(() => { inp.classList.remove('animate-shake', 'border-red-500', 'text-red-500'); inp.value = ''; inp.focus(); }, 500);
    }

    reveal() { this.answerState = 'revealed'; this.render(); }
    playQuestionAudio() { audioService.speak(this.currentData.item.front.main, settingsService.get().targetLang); }

    render() {
        if (!this.container) return;
        const item = this.currentData.item;
        const questionText = item.back.main || item.back.definition;
        const targetLang = settingsService.get().targetLang;

        let contentHtml = '';
        if (this.answerState === 'typing') {
            contentHtml = `
                <div class="w-full max-w-md">
                    <input type="text" id="writing-input" autocomplete="off" class="w-full bg-white dark:bg-dark-card border-2 border-gray-300 dark:border-gray-600 rounded-2xl p-6 text-center text-3xl font-bold text-gray-800 dark:text-white placeholder-gray-300 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/20 outline-none transition-all shadow-sm" placeholder="Type answer...">
                    <div class="flex gap-2 mt-4">
                        <button id="btn-reveal" class="flex-1 py-4 rounded-xl font-bold text-gray-500 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors">Give Up</button>
                        <button id="btn-check" class="flex-[2] py-4 rounded-xl font-bold text-white bg-cyan-500 hover:bg-cyan-600 shadow-lg shadow-cyan-500/30 transition-all active:scale-95">CHECK</button>
                    </div>
                </div>`;
        } else if (this.answerState === 'correct') {
            contentHtml = `
                <div class="w-full max-w-md bg-green-500 text-white p-8 rounded-3xl shadow-xl text-center animate-bounce-in">
                    <div class="text-6xl mb-2">🎉</div>
                    <div class="text-4xl font-black mb-2">${item.front.main}</div>
                    <div class="text-green-100 font-medium">Correct! +10 pts</div>
                </div>`;
        } else if (this.answerState === 'revealed') {
            contentHtml = `
                <div class="w-full max-w-md bg-white dark:bg-dark-card border-2 border-red-100 dark:border-red-900/30 p-8 rounded-3xl shadow-xl text-center">
                    <div class="text-xs font-bold text-red-400 uppercase tracking-widest mb-2">Answer</div>
                    <div class="text-4xl font-black text-gray-800 dark:text-white mb-6">${item.front.main}</div>
                </div>`;
        }

        this.container.innerHTML = `
            <div class="fixed top-0 left-0 right-0 h-16 z-40 px-4 flex justify-between items-center bg-gray-100/90 dark:bg-dark-bg/90 backdrop-blur-sm border-b border-white/10">
                <div class="flex items-center gap-2">
                    <div class="flex items-center bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-full pl-3 pr-1 py-1 shadow-sm">
                        <span class="text-xs font-bold text-gray-400 mr-2 uppercase">ID</span>
                        <input type="number" id="writing-id-input" value="${item.id}" class="w-12 bg-transparent text-sm font-bold text-gray-700 dark:text-white outline-none text-center appearance-none m-0 p-0">
                        <button id="writing-go-btn" class="ml-1 w-6 h-6 bg-cyan-100 text-cyan-600 rounded-full flex items-center justify-center hover:bg-cyan-200"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg></button>
                    </div>
                    <button id="writing-random-btn" class="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-full w-8 h-8 flex items-center justify-center shadow-sm text-gray-500 hover:text-cyan-500 active:scale-95 transition-all">
                        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                    </button>
                </div>
                <div class="flex items-center gap-2">
                     <button id="score-pill" class="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-full px-3 py-1 flex items-center gap-2 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <span class="text-base">🏆</span>
                        <span class="font-black text-gray-700 dark:text-white text-sm global-score-display">${scoreService.todayScore}</span>
                    </button>
                    <button id="writing-close-btn" class="header-icon-btn bg-red-50 text-red-500 rounded-full shadow-sm"><svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
            </div>

            <div class="w-full h-full pt-20 pb-28 px-6 flex flex-col items-center justify-center">
                <div id="writing-q-box" class="mb-10 text-center cursor-pointer active:scale-95 transition-transform">
                    <span class="text-xs font-bold text-gray-400 uppercase tracking-widest">Translate to ${targetLang.toUpperCase()}</span>
                    <h1 class="text-3xl md:text-5xl font-black text-gray-800 dark:text-white mt-4 max-w-lg leading-tight" data-fit="true">${questionText}</h1>
                    <div class="mt-2 text-cyan-400 text-xs font-bold opacity-0 hover:opacity-100">Tap to hear answer</div>
                </div>
                ${contentHtml}
            </div>

            <div class="fixed bottom-0 left-0 right-0 p-4 z-40 bg-gradient-to-t from-gray-100 via-gray-100 to-transparent dark:from-dark-bg">
                <div class="max-w-lg mx-auto flex gap-4">
                    <button id="writing-prev-btn" class="flex-1 h-14 bg-white dark:bg-dark-card border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-95 transition-all">
                        <svg class="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg>
                    </button>
                    <button id="writing-next-btn" class="flex-1 h-14 bg-cyan-500 text-white rounded-2xl shadow-lg shadow-cyan-500/30 flex items-center justify-center font-bold tracking-wide active:scale-95 transition-all">
                        <svg class="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>
                    </button>
                </div>
            </div>
            <style>.animate-shake{animation:shake 0.4s cubic-bezier(.36,.07,.19,.97) both}.animate-bounce-in{animation:bounceIn 0.5s cubic-bezier(0.68,-0.55,0.265,1.55)}@keyframes bounceIn{0%{transform:scale(0.3);opacity:0}50%{transform:scale(1.05)}70%{transform:scale(0.9)}100%{transform:scale(1);opacity:1}}</style>
        `;
        this.container.querySelector('#writing-close-btn').addEventListener('click', () => window.dispatchEvent(new CustomEvent('router:home')));
        this.container.querySelector('#writing-random-btn').addEventListener('click', () => this.random());
        this.container.querySelector('#writing-prev-btn').addEventListener('click', () => this.prev());
        this.container.querySelector('#writing-next-btn').addEventListener('click', () => this.next());
        this.container.querySelector('#writing-q-box').addEventListener('click', () => this.playQuestionAudio());

        const idInput = this.container.querySelector('#writing-id-input');
        const goBtn = this.container.querySelector('#writing-go-btn');
        goBtn.addEventListener('click', () => this.gotoId(idInput.value));
        idInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') this.gotoId(idInput.value); });
        
        const btnCheck = document.getElementById('btn-check');
        const btnReveal = document.getElementById('btn-reveal');
        const input = document.getElementById('writing-input');
        if(btnCheck) btnCheck.addEventListener('click', () => this.checkAnswer());
        if(btnReveal) btnReveal.addEventListener('click', () => this.reveal());
        if(input) input.addEventListener('keypress', (e) => { if(e.key === 'Enter') this.checkAnswer(); });
        requestAnimationFrame(() => this.container.querySelectorAll('[data-fit="true"]').forEach(el => textService.fitText(el)));
    }
}
export const writingApp = new WritingApp();

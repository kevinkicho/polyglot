import { vocabService } from '../services/vocabService';
import { settingsService } from '../services/settingsService';
import { audioService } from '../services/audioService';
import { textService } from '../services/textService';

export class SentencesApp {
    constructor() {
        this.container = null;
        this.currentIndex = 0;
        this.currentData = null;
        this.userSentence = []; 
        this.shuffledWords = [];
        this.wordBankStatus = []; 
    }

    mount(elementId) { this.container = document.getElementById(elementId); this.next(); }

    next(specificId = null) {
        audioService.stop();
        const list = vocabService.getAll();
        
        // [FIX] Empty List check
        if (!list || list.length === 0) {
            this.renderError("No vocabulary data available.");
            return;
        }

        if (specificId !== null) {
             const index = vocabService.findIndexById(specificId);
             if(index !== -1) this.currentIndex = index; 
        } else if (this.currentData) {
             this.currentIndex = (this.currentIndex + 1) % list.length;
        } else {
             this.currentIndex = vocabService.getRandomIndex();
        }
        this.loadGame();
    }
    
    prev() {
        audioService.stop();
        const list = vocabService.getAll();
        if (!list || list.length === 0) return;
        this.currentIndex = (this.currentIndex - 1 + list.length) % list.length;
        this.loadGame();
    }

    loadGame() {
        const list = vocabService.getFlashcardData();
        if (!list || list.length === 0) return;

        const item = list[this.currentIndex];
        
        // [FIX] Fallback for missing sentence
        const targetSentence = item.back.sentenceTarget || item.front.main || "No Sentence";
        const cleanSentence = targetSentence.replace(/<[^>]*>?/gm, '');
        
        const settings = settingsService.get();
        let words = [];
        
        if (settings.targetLang === 'ja') {
            words = textService.tokenizeJapanese(cleanSentence, item.front.main, true);
        } else if (settings.targetLang === 'zh') {
            words = cleanSentence.split('');
        } else {
            words = cleanSentence.split(' ').filter(w => w.length > 0);
        }

        this.currentData = { ...item, originalWords: [...words], cleanSentence };
        this.shuffledWords = [...words].map((word, id) => ({ word, id })).sort(() => Math.random() - 0.5);
        this.wordBankStatus = new Array(this.shuffledWords.length).fill(false);
        this.userSentence = []; 
        this.render();

        if(settings.autoPlay) setTimeout(() => audioService.speak(this.currentData.cleanSentence, settings.targetLang), 300);
    }

    renderError(msg) {
        if(!this.container) return;
        this.container.innerHTML = `<div class="flex flex-col items-center justify-center h-full p-8 text-center"><h2 class="text-xl font-bold text-gray-400">Error</h2><p class="text-gray-500">${msg}</p><button id="sent-back-btn" class="mt-4 px-4 py-2 bg-gray-200 rounded">Back</button></div>`;
        document.getElementById('sent-back-btn').addEventListener('click', () => window.dispatchEvent(new CustomEvent('router:home')));
    }

    playTargetAudio() { if(this.currentData) audioService.speak(this.currentData.cleanSentence, settingsService.get().targetLang); }

    handleBankClick(bankIndex) {
        if (this.wordBankStatus[bankIndex]) return;
        const wordObj = this.shuffledWords[bankIndex];
        this.userSentence.push({ ...wordObj, bankIndex });
        this.wordBankStatus[bankIndex] = true;
        if(settingsService.get().sentencesWordAudio) audioService.speak(wordObj.word, settingsService.get().targetLang);
        this.render();
        this.checkWin();
    }

    handleUserClick(userIndex) {
        const item = this.userSentence[userIndex];
        this.wordBankStatus[item.bankIndex] = false;
        this.userSentence.splice(userIndex, 1);
        audioService.speak(item.word, settingsService.get().targetLang);
        this.render();
    }

    checkWin() {
        if (this.userSentence.length === this.shuffledWords.length) {
            const userStr = this.userSentence.map(o => o.word).join('');
            const targetStr = this.currentData.originalWords.join('');
            const settings = settingsService.get();

            if (userStr.replace(/\s/g, '') === targetStr.replace(/\s/g, '')) {
                const dropZone = document.getElementById('sentence-drop-zone');
                if(dropZone) dropZone.classList.add('bg-green-100', 'border-green-500', 'dark:bg-green-900/30', 'animate-success-pulse');
                
                if (settings.sentAutoPlayCorrect) {
                    if (settings.gameWaitAudio) {
                        audioService.speakWithCallback(this.currentData.cleanSentence, settings.targetLang, () => setTimeout(() => this.next(), 500));
                    } else {
                        audioService.speak(this.currentData.cleanSentence, settings.targetLang);
                        setTimeout(() => this.next(), 1500);
                    }
                } else {
                    setTimeout(() => this.next(), 1000);
                }
            } else {
                 const dropZone = document.getElementById('sentence-drop-zone');
                 if(dropZone) dropZone.classList.add('bg-red-100', 'border-red-500', 'dark:bg-red-900/30', 'animate-shake');
                 setTimeout(() => this.render(), 500);
            }
        }
    }

    render() {
        if (!this.container || !this.currentData) return;
        const item = this.currentData;
        const settings = settingsService.get();
        const fontClass = settings.targetLang === 'ja' ? 'font-jp' : '';

        this.container.innerHTML = `
            <div class="fixed top-0 left-0 right-0 h-16 z-40 px-4 flex justify-between items-center bg-gray-100/90 dark:bg-dark-bg/90 backdrop-blur-sm">
                <div class="flex items-center"><div class="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-full pl-1 pr-3 py-1 flex items-center shadow-sm"><span class="bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wider mr-2">ID</span><input type="number" id="sent-id-input" class="w-12 bg-transparent border-none text-center font-mono font-bold text-gray-700 dark:text-white focus:ring-0 outline-none text-sm p-0" value="${item.id}"></div></div>
                <div class="flex items-center gap-3">
                    <button id="sent-random-btn" class="w-10 h-10 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl flex items-center justify-center text-indigo-500 dark:text-dark-primary shadow-sm active:scale-90 transition-transform"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg></button>
                    <button id="sent-close-btn" class="w-10 h-10 bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 rounded-full flex items-center justify-center shadow-sm active:scale-90 transition-transform"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
            </div>
            
            <div class="w-full h-full pt-20 pb-28 px-4 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 grid-rows-[1fr_1fr] md:grid-rows-1 gap-4">
                <div id="sent-hint-box" class="w-full h-full bg-white dark:bg-dark-card rounded-[2rem] shadow-xl dark:shadow-none border-2 border-indigo-100 dark:border-dark-border p-4 flex flex-col relative overflow-hidden transition-all">
                    <div class="mt-2 text-center flex-none"><h2 class="text-base md:text-lg font-bold text-gray-500 dark:text-gray-400 leading-snug cursor-pointer hover:text-indigo-500 transition-colors">${item.back?.sentenceOrigin || ''}</h2></div>
                    <div id="sentence-drop-zone" class="flex-grow mt-3 bg-gray-50 dark:bg-black/20 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl p-2 flex flex-wrap content-start gap-2 overflow-y-auto transition-all duration-300 min-h-[180px]">
                        ${this.userSentence.length === 0 ? '<span class="w-full text-center text-gray-400 italic self-center text-sm">Tap words to build</span>' : ''}
                        ${this.userSentence.map((obj, i) => `<button class="user-word px-3 py-2 bg-indigo-600 text-white rounded-lg shadow-md active:scale-95 transition-transform font-bold text-lg md:text-xl border border-indigo-700 ${fontClass}" data-index="${i}">${obj.word}</button>`).join('')}
                    </div>
                </div>
                <div class="w-full h-full bg-gray-100 dark:bg-dark-bg/50 rounded-[2rem] border-2 border-transparent p-2 overflow-y-auto">
                    <div class="flex flex-wrap gap-2 justify-center content-start h-full">
                        ${this.shuffledWords.map((obj, i) => `<button class="bank-word flex-grow min-w-[60px] px-3 py-3 bg-white dark:bg-dark-card border-b-4 border-gray-200 dark:border-dark-border text-gray-800 dark:text-white rounded-xl shadow-sm hover:shadow-md active:scale-95 active:border-b-0 transition-all text-lg md:text-xl font-bold ${fontClass} ${this.wordBankStatus[i] ? 'opacity-0 pointer-events-none' : ''}" data-index="${i}">${obj.word}</button>`).join('')}
                    </div>
                </div>
            </div>
            <div class="fixed bottom-0 left-0 right-0 p-6 z-40 bg-gradient-to-t from-gray-100 via-gray-100 to-transparent dark:from-dark-bg dark:via-dark-bg">
                <div class="max-w-md mx-auto flex gap-4">
                    <button id="sent-prev-btn" class="flex-1 h-16 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border text-gray-400 dark:text-gray-500 rounded-3xl shadow-sm active:scale-95 transition-all flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" /></svg></button>
                    <button id="sent-next-btn" class="flex-1 h-16 bg-indigo-600 dark:bg-dark-primary text-white border border-transparent rounded-3xl shadow-xl shadow-indigo-200 dark:shadow-none active:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" /></svg></button>
                </div>
            </div>
        `;

        this.container.querySelectorAll('.bank-word').forEach(btn => btn.addEventListener('click', () => this.handleBankClick(parseInt(btn.dataset.index))));
        this.container.querySelectorAll('.user-word').forEach(btn => btn.addEventListener('click', () => this.handleUserClick(parseInt(btn.dataset.index))));
        document.getElementById('sent-close-btn').addEventListener('click', () => { audioService.stop(); window.dispatchEvent(new CustomEvent('router:home')); });
        document.getElementById('sent-random-btn').addEventListener('click', () => { this.next(null); });
        document.getElementById('sent-hint-box').addEventListener('click', (e) => { if(!e.target.closest('#sentence-drop-zone')) this.playTargetAudio(); });
        const idInput = document.getElementById('sent-id-input');
        if(idInput) idInput.addEventListener('change', (e) => this.next(parseInt(e.target.value)));
    }
}
export const sentencesApp = new SentencesApp();

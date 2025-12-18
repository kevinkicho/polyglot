import { vocabService } from '../services/vocabService';
import { settingsService } from '../services/settingsService';
import { audioService } from '../services/audioService';
import { textService } from '../services/textService';

export class SentencesApp {
    constructor() { this.container = null; this.currentIndex = 0; this.currentData = null; this.userSentence = []; this.shuffledWords = []; this.wordBankStatus = []; }
    mount(elementId) { this.container = document.getElementById(elementId); this.random(); }

    random() {
        this.currentIndex = vocabService.getRandomIndex();
        this.loadGame();
    }

    next(specificId = null) {
        if (specificId !== null) {
             const index = vocabService.findIndexById(specificId);
             if(index !== -1) this.currentIndex = index; 
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

    loadGame() {
        const list = vocabService.getFlashcardData();
        if (!list || list.length === 0) return;
        const item = list[this.currentIndex];
        
        // Safety check for sentence
        const targetSentence = item.back.sentenceTarget || item.front.main || "No Sentence";
        const cleanSentence = targetSentence.replace(/<[^>]*>?/gm, '');
        const settings = settingsService.get();
        let words = [];
        
        if (settings.targetLang === 'ja') words = textService.tokenizeJapanese(cleanSentence, item.front.main, true);
        else words = cleanSentence.split(' ').filter(w => w.length > 0);

        this.currentData = { ...item, originalWords: [...words], cleanSentence };
        this.shuffledWords = [...words].map((word, id) => ({ word, id })).sort(() => Math.random() - 0.5);
        this.wordBankStatus = new Array(this.shuffledWords.length).fill(false);
        this.userSentence = []; 
        this.render();
    }

    // Helper functions
    playTargetAudio() { if(this.currentData) audioService.speak(this.currentData.cleanSentence, settingsService.get().targetLang); }
    handleBankClick(idx) { if(this.wordBankStatus[idx]) return; const w = this.shuffledWords[idx]; this.userSentence.push({...w, bankIndex: idx}); this.wordBankStatus[idx]=true; this.render(); this.checkWin(); }
    handleUserClick(idx) { const item = this.userSentence[idx]; this.wordBankStatus[item.bankIndex]=false; this.userSentence.splice(idx,1); this.render(); }
    checkWin() { 
        if(this.userSentence.length === this.shuffledWords.length) {
            const u = this.userSentence.map(o=>o.word).join(''); const t = this.currentData.originalWords.join('');
            if(u.replace(/\s/g,'')===t.replace(/\s/g,'')) {
                document.getElementById('sentence-drop-zone').classList.add('bg-green-100');
                setTimeout(()=>this.next(), 1500);
            }
        }
    }

    render() {
        if (!this.container) return;
        const item = this.currentData;
        
        this.container.innerHTML = `
            <div class="fixed top-0 left-0 right-0 h-16 z-40 px-4 flex justify-between items-center bg-gray-100/90 dark:bg-dark-bg/90 backdrop-blur-sm">
                <div class="flex items-center"><div class="bg-white dark:bg-dark-card border border-gray-200 rounded-full pl-1 pr-3 py-1 flex items-center shadow-sm"><span class="bg-pink-100 text-pink-600 text-xs font-bold px-2 py-1 rounded-full mr-2">ID</span><input type="number" id="sent-id-input" class="w-12 bg-transparent border-none text-center font-bold text-sm p-0" value="${item.id}"></div></div>
                <div class="flex items-center gap-3">
                    <button id="sent-random-btn" class="w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center text-indigo-500 shadow-sm active:scale-90"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg></button>
                    <button id="sent-close-btn" class="w-10 h-10 bg-red-50 text-red-500 rounded-full flex items-center justify-center shadow-sm active:scale-90"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
            </div>
            <div class="w-full h-full pt-20 pb-28 px-4 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
                <div id="sent-hint-box" class="w-full h-full bg-white dark:bg-dark-card rounded-[2rem] shadow-xl border-2 border-indigo-100 p-4 flex flex-col relative">
                    <div class="mt-2 text-center flex-none"><h2 class="text-lg font-bold text-gray-500">${item.back.sentenceOrigin}</h2></div>
                    <div id="sentence-drop-zone" class="flex-grow mt-3 bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl p-2 flex flex-wrap content-start gap-2 overflow-y-auto">
                        ${this.userSentence.map((obj, i) => `<button class="user-word px-3 py-2 bg-indigo-600 text-white rounded-lg shadow-md font-bold text-xl border border-indigo-700" data-index="${i}">${obj.word}</button>`).join('')}
                    </div>
                </div>
                <div class="w-full h-full bg-gray-100 rounded-[2rem] p-2 overflow-y-auto"><div class="flex flex-wrap gap-2 justify-center content-start h-full">
                    ${this.shuffledWords.map((obj, i) => `<button class="bank-word flex-grow min-w-[60px] px-3 py-3 bg-white border-b-4 border-gray-200 text-gray-800 rounded-xl shadow-sm text-xl font-bold ${this.wordBankStatus[i] ? 'opacity-0 pointer-events-none' : ''}" data-index="${i}">${obj.word}</button>`).join('')}
                </div></div>
            </div>
            <div class="fixed bottom-0 left-0 right-0 p-6 z-40 bg-gradient-to-t from-gray-100 via-gray-100 to-transparent"><div class="max-w-md mx-auto flex gap-4"><button id="sent-prev-btn" class="flex-1 h-16 bg-white border border-gray-200 rounded-3xl shadow-sm flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" /></svg></button><button id="sent-next-btn" class="flex-1 h-16 bg-indigo-600 text-white rounded-3xl shadow-xl flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" /></svg></button></div></div>
        `;

        document.getElementById('sent-next-btn').addEventListener('click', () => this.next());
        document.getElementById('sent-prev-btn').addEventListener('click', () => this.prev());
        document.getElementById('sent-random-btn').addEventListener('click', () => this.random());
        document.getElementById('sent-close-btn').addEventListener('click', () => window.dispatchEvent(new CustomEvent('router:home')));
        this.container.querySelectorAll('.bank-word').forEach(btn => btn.addEventListener('click', () => this.handleBankClick(parseInt(btn.dataset.index))));
        this.container.querySelectorAll('.user-word').forEach(btn => btn.addEventListener('click', () => this.handleUserClick(parseInt(btn.dataset.index))));
    }
}
export const sentencesApp = new SentencesApp();

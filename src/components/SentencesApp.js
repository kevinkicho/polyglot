import { vocabService } from '../services/vocabService';
import { settingsService } from '../services/settingsService';
import { audioService } from '../services/audioService';
import { textService } from '../services/textService';

export class SentencesApp {
    constructor() { this.container = null; this.currentIndex = 0; this.currentData = null; this.userSentence = []; this.shuffledWords = []; this.wordBankStatus = []; }
    
    mount(elementId) { 
        this.container = document.getElementById(elementId); 
        if (!this.currentData) this.random();
        else this.render();
    }

    bind(selector, event, handler) {
        if (!this.container) return;
        const el = this.container.querySelector(selector);
        if (el) el.addEventListener(event, handler);
    }

    random() { 
        this.currentIndex = vocabService.getRandomIndex(); 
        this.loadGame(); 
    }

    next(id = null) { 
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

    playTargetAudio() {
        if (this.currentData) {
            audioService.speak(this.currentData.cleanSentence, settingsService.get().targetLang);
        }
    }

    loadGame() {
        const list = vocabService.getFlashcardData();
        if (!list || !list.length) { this.renderError(); return; }
        const item = list[this.currentIndex];
        
        const targetSentence = item.back.sentenceTarget || item.front.main || "";
        const clean = targetSentence.replace(/<[^>]*>?/gm, '');
        const settings = settingsService.get();
        let words = settings.targetLang === 'ja' ? textService.tokenizeJapanese(clean, item.front.main, true) : clean.split(' ').filter(w => w.length);

        this.currentData = { ...item, originalWords: words, cleanSentence: clean };
        this.shuffledWords = [...words].map((word, id) => ({ word, id })).sort(() => Math.random() - 0.5);
        this.wordBankStatus = new Array(this.shuffledWords.length).fill(false);
        this.userSentence = []; 
        
        if (window.saveGameHistory) window.saveGameHistory('sentences', item.id);
        
        this.render();
        if (settings.autoPlay) setTimeout(() => this.playTargetAudio(), 300);
    }

    handleBankClick(idx) { 
        if (this.wordBankStatus[idx]) return; 
        const w = this.shuffledWords[idx]; 
        this.userSentence.push({...w, bankIndex: idx}); 
        this.wordBankStatus[idx] = true; 
        if(settingsService.get().sentencesWordAudio) audioService.speak(w.word, settingsService.get().targetLang);
        this.render(); this.checkWin(); 
    }
    
    handleUserClick(idx) { 
        const item = this.userSentence[idx]; 
        this.wordBankStatus[item.bankIndex] = false; 
        this.userSentence.splice(idx, 1); 
        if(settingsService.get().sentencesWordAudio) audioService.speak(item.word, settingsService.get().targetLang);
        this.render(); 
    }
    
    checkWin() { 
        if (this.userSentence.length === this.shuffledWords.length) {
            const u = this.userSentence.map(o => o.word).join(''); 
            const t = this.currentData.originalWords.join('');
            if (u.replace(/\s/g, '') === t.replace(/\s/g, '')) {
                const zone = this.container.querySelector('#sentence-drop-zone');
                if (zone) zone.classList.add('bg-green-100', 'border-green-500');
                if (settingsService.get().sentAutoPlayCorrect) this.playTargetAudio();
                setTimeout(()=>this.next(), 1500);
            }
        }
    }

    renderError() {
        if (this.container) {
            this.container.innerHTML = `<div class="p-10 text-center text-white pt-24">No Data.</div>`;
            this.bind('#sent-close-err', 'click', () => window.dispatchEvent(new CustomEvent('router:home')));
        }
    }

    render() {
        if(!this.container) return;
        const item = this.currentData;
        if (!item) { this.renderError(); return; }
        
        this.container.innerHTML = `
            <div class="fixed top-0 left-0 right-0 h-16 z-40 px-4 flex justify-between items-center bg-gray-100/90 dark:bg-dark-bg/90 backdrop-blur-sm border-b border-white/10">
                <div class="flex items-center gap-2"><div class="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-full pl-1 pr-3 py-1 flex items-center shadow-sm"><span class="bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 text-xs font-bold px-2 py-1 rounded-full mr-2">ID</span><input type="number" id="sent-id-input" class="w-12 bg-transparent border-none text-center font-bold text-gray-700 dark:text-white text-sm p-0" value="${item.id}"></div>
                <button class="game-edit-btn w-8 h-8 flex items-center justify-center bg-gray-200 dark:bg-gray-800 rounded-full text-gray-500 hover:text-indigo-600"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg></button></div>
                <div class="flex items-center gap-2">
                    <button class="game-settings-btn p-1.5 bg-white dark:bg-dark-card border border-gray-200 rounded-xl flex items-center justify-center text-gray-500 shadow-sm"><svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg></button>
                    <button id="sent-random-btn" class="p-1.5 bg-white dark:bg-dark-card border border-gray-200 rounded-xl flex items-center justify-center text-indigo-500 shadow-sm"><svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg></button>
                    <button id="sent-close-btn" class="p-1.5 bg-red-50 text-red-500 rounded-full flex items-center justify-center shadow-sm"><svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
            </div>
            <div class="w-full h-full pt-20 pb-28 px-4 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
                <div id="sent-hint-box" class="w-full h-full bg-white dark:bg-dark-card rounded-[2rem] shadow-xl border-2 border-indigo-100 dark:border-dark-border p-6 flex flex-col relative">
                    <div class="mt-2 text-center flex-none">
                        <h2 class="text-xl font-bold text-gray-500 dark:text-gray-400">${item.back.sentenceOrigin}</h2>
                    </div>
                    <div id="sentence-drop-zone" class="flex-grow mt-4 bg-gray-50 dark:bg-black/20 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl p-6 flex flex-wrap content-start gap-3 overflow-y-auto">
                        ${this.userSentence.map((obj, i) => `<button class="user-word px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:scale-105 transition-transform" data-index="${i}">${obj.word}</button>`).join('')}
                    </div>
                </div>
                <div class="w-full h-full bg-gray-100 dark:bg-dark-bg/50 rounded-[2rem] p-4 overflow-y-auto">
                    <div class="flex flex-wrap gap-3 justify-center content-start h-full">
                        ${this.shuffledWords.map((obj, i) => `<button class="bank-word flex-grow min-w-[80px] px-4 py-3 bg-white dark:bg-dark-card border-b-4 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-white rounded-xl text-lg font-bold ${this.wordBankStatus[i]?'opacity-0 pointer-events-none':''}" data-index="${i}">${obj.word}</button>`).join('')}
                    </div>
                </div>
            </div>
            <div class="fixed bottom-0 left-0 right-0 p-6 z-40 bg-gradient-to-t from-gray-100 via-gray-100 to-transparent dark:from-dark-bg"><div class="max-w-md mx-auto flex gap-4"><button id="sent-prev-btn" class="flex-1 h-16 bg-white border border-gray-200 rounded-3xl shadow-sm flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg></button><button id="sent-next-btn" class="flex-1 h-16 bg-indigo-600 text-white rounded-3xl shadow-xl flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg></button></div></div>
        `;

        this.bind('#sent-next-btn', 'click', () => this.next());
        this.bind('#sent-prev-btn', 'click', () => this.prev());
        this.bind('#sent-random-btn', 'click', () => this.random());
        this.bind('#sent-close-btn', 'click', () => window.dispatchEvent(new CustomEvent('router:home')));
        this.bind('#sent-hint-box', 'click', (e) => { 
            if(!e.target.closest('.user-word')) this.playTargetAudio(); 
        });
        this.bind('#sent-id-input', 'change', (e) => this.next(parseInt(e.target.value)));

        this.container.querySelectorAll('.bank-word').forEach(btn => btn.addEventListener('click', () => this.handleBankClick(parseInt(btn.dataset.index))));
        this.container.querySelectorAll('.user-word').forEach(btn => btn.addEventListener('click', () => this.handleUserClick(parseInt(btn.dataset.index))));
    }
}
export const sentencesApp = new SentencesApp();

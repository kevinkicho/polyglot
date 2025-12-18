import { vocabService } from '../services/vocabService';
import { textService } from '../services/textService';
import { audioService } from '../services/audioService';
import { settingsService } from '../services/settingsService';
import { Card } from './Card';

export class FlashcardApp {
    constructor() {
        this.container = null;
        this.currentIndex = 0;
        this.isFlipped = false;
        this.isMounted = false;
    }

    get currentData() {
        const list = vocabService.getFlashcardData();
        return list && list.length > 0 ? list[this.currentIndex] : null;
    }

    mount(elementId) {
        this.container = document.getElementById(elementId);
        if(!this.isMounted) {
            this.container.addEventListener('touchstart', (e)=>this.handleTouchStart(e), {passive:true});
            this.container.addEventListener('touchend', (e)=>this.handleTouchEnd(e));
            this.isMounted=true;
        }
        this.updateCard();
    }

    goto(id) {
        const idx = vocabService.findIndexById(id);
        if(idx!==-1) { this.currentIndex = idx; this.isFlipped=false; this.updateCard(); }
    }

    refresh() { if(this.container) this.updateCard(); }
    next() { const l=vocabService.getFlashcardData(); if(!l.length)return; this.currentIndex=(this.currentIndex+1)%l.length; this.isFlipped=false; this.updateCard(); }
    prev() { const l=vocabService.getFlashcardData(); if(!l.length)return; this.currentIndex=(this.currentIndex-1+l.length)%l.length; this.isFlipped=false; this.updateCard(); }
    random() { const l=vocabService.getFlashcardData(); if(!l.length)return; this.currentIndex=Math.floor(Math.random()*l.length); this.isFlipped=false; this.updateCard(); }
    
    handleTouchStart(e) { this.touchStartX=e.changedTouches[0].screenX; }
    handleTouchEnd(e) { 
        if(this.touchStartX - e.changedTouches[0].screenX > 50) this.next();
        if(e.changedTouches[0].screenX - this.touchStartX > 50) this.prev();
    }

    updateCard() {
        const container = document.getElementById('card-container');
        if (!container) { this.render(); return; }
        const item = this.currentData;
        if(!item) return;
        
        container.innerHTML = Card(item, this.isFlipped);
        
        // Update ID input safely
        const idInput = document.getElementById('fc-id-input');
        if(idInput) idInput.value = item.id;
        
        requestAnimationFrame(() => {
            const fitElements = container.querySelectorAll('[data-fit="true"]');
            fitElements.forEach(el => textService.fitText(el));
        });

        if(window.saveGameHistory) window.saveGameHistory('flashcard', item.id);
        
        const settings = settingsService.get();
        if(settings.autoPlay && !this.isFlipped && document.body.classList.contains('game-mode')) {
            setTimeout(()=>audioService.speak(item.front.main, settings.targetLang), 300);
        }
    }

    toggleFlip() { this.isFlipped = !this.isFlipped; this.updateCard(); }

    render() {
        if(!this.container) return;
        const list = vocabService.getFlashcardData();
        const item = (list && list.length > 0) ? list[this.currentIndex] : { id: 0 };
        const content = (list && list.length > 0) ? `<div id="card-container" class="w-full max-w-md aspect-[3/4] relative">${Card(item, this.isFlipped)}</div>` : `<div class="p-10 text-center text-white pt-24">No Data</div>`;

        this.container.innerHTML = `
            <div class="fixed top-0 left-0 right-0 h-16 z-40 px-4 flex justify-between items-center bg-gray-100/90 dark:bg-dark-bg/90 backdrop-blur-sm">
                <div class="flex items-center gap-2">
                    <div class="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-full pl-1 pr-3 py-1 flex items-center shadow-sm">
                        <span class="bg-indigo-100 text-indigo-600 text-xs font-bold px-2 py-1 rounded-full mr-2">ID</span>
                        <input type="number" id="fc-id-input" class="w-12 bg-transparent border-none text-center font-mono font-bold dark:text-white text-sm p-0" value="${item.id}">
                    </div>
                    <button class="game-edit-btn w-8 h-8 flex items-center justify-center bg-gray-200 dark:bg-gray-800 rounded-full text-gray-500 hover:text-indigo-600"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg></button>
                </div>
                <div class="flex items-center gap-3">
                    <button class="game-settings-btn w-10 h-10 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl flex items-center justify-center text-gray-500 shadow-sm"><svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg></button>
                    <button id="fc-random-btn" class="w-10 h-10 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl flex items-center justify-center text-indigo-500 shadow-sm active:scale-90 transition-transform"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg></button>
                    <button id="fc-close-btn" class="w-10 h-10 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center shadow-sm active:scale-90 transition-transform"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
            </div>
            <div class="w-full h-full pt-20 pb-28 px-6 flex items-center justify-center">${content}</div>
            <div class="fixed bottom-0 left-0 right-0 p-6 z-40 bg-gradient-to-t from-gray-100 via-gray-100 to-transparent dark:from-dark-bg"><div class="max-w-md mx-auto flex gap-4"><button id="fc-prev-btn" class="flex-1 h-16 bg-white dark:bg-dark-card border border-gray-200 rounded-3xl shadow-sm active:scale-95 transition-all flex items-center justify-center"><svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg></button><button id="fc-next-btn" class="flex-1 h-16 bg-indigo-600 text-white rounded-3xl shadow-xl active:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center"><svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg></button></div></div>
        `;

        // Bind new ID input
        const idInput = document.getElementById('fc-id-input');
        if(idInput) idInput.addEventListener('change', (e) => this.goto(parseInt(e.target.value)));

        if(list.length) {
            document.getElementById('card-container').addEventListener('click', () => this.toggleFlip());
            requestAnimationFrame(() => {
                if(document.getElementById('card-container')) {
                    const fitElements = this.container.querySelectorAll('[data-fit="true"]');
                    fitElements.forEach(el => textService.fitText(el));
                }
            });
        }
        document.getElementById('fc-next-btn').addEventListener('click', () => this.next());
        document.getElementById('fc-prev-btn').addEventListener('click', () => this.prev());
        document.getElementById('fc-random-btn').addEventListener('click', () => this.random());
        document.getElementById('fc-close-btn').addEventListener('click', () => window.dispatchEvent(new CustomEvent('router:home')));
    }
}
export const flashcardApp = new FlashcardApp();

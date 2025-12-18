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
        this.touchStartX = 0;
        this.touchEndX = 0;
    }

    mount(elementId) {
        this.container = document.getElementById(elementId);
        this.render();
    }

    refresh() { if(this.container) this.render(); }

    next() {
        const list = vocabService.getFlashcardData();
        if (!list.length) return;
        this.currentIndex = (this.currentIndex + 1) % list.length;
        this.isFlipped = false;
        this.updateCard();
    }

    prev() {
        const list = vocabService.getFlashcardData();
        if (!list.length) return;
        this.currentIndex = (this.currentIndex - 1 + list.length) % list.length;
        this.isFlipped = false;
        this.updateCard();
    }

    random() {
        const list = vocabService.getFlashcardData();
        if (!list.length) return;
        this.currentIndex = Math.floor(Math.random() * list.length);
        this.isFlipped = false;
        this.updateCard();
    }

    handleTouchStart(e) { this.touchStartX = e.changedTouches[0].screenX; }
    handleTouchEnd(e) {
        this.touchEndX = e.changedTouches[0].screenX;
        if (this.touchStartX - this.touchEndX > 50) this.next();
        if (this.touchEndX - this.touchStartX > 50) this.prev();
    }

    updateCard() {
        const container = document.getElementById('card-container');
        const list = vocabService.getFlashcardData();
        if (!container || !list.length) return;
        
        const item = list[this.currentIndex];
        container.innerHTML = Card(item, this.isFlipped);
        
        document.getElementById('fc-id-display').textContent = item.id;
        
        requestAnimationFrame(() => {
            const fitElements = container.querySelectorAll('[data-fit="true"]');
            fitElements.forEach(el => textService.fitText(el));
        });

        const settings = settingsService.get();
        if (settings.autoPlay && !this.isFlipped) {
            setTimeout(() => audioService.speak(item.front.main, settings.targetLang), 300);
        }
    }

    toggleFlip() {
        this.isFlipped = !this.isFlipped;
        this.updateCard();
    }

    render() {
        if (!this.container) return;
        const list = vocabService.getFlashcardData();
        
        if (!list || list.length === 0) {
            this.container.innerHTML = '<div class="p-10 text-center text-white">No Flashcards Available.<br>Check Database Import.</div>';
            return;
        }

        if (this.currentIndex >= list.length) this.currentIndex = 0;
        const item = list[this.currentIndex];

        this.container.innerHTML = `
            <div class="fixed top-0 left-0 right-0 h-16 z-40 px-4 flex justify-between items-center bg-gray-100/90 dark:bg-dark-bg/90 backdrop-blur-sm">
                <div class="flex items-center"><div class="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-full pl-1 pr-3 py-1 flex items-center shadow-sm"><span class="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wider mr-2">ID</span><span id="fc-id-display" class="font-mono font-bold text-gray-700 dark:text-white text-sm">${item.id}</span></div></div>
                <div class="flex items-center gap-3">
                    <button id="fc-random-btn" class="w-10 h-10 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl flex items-center justify-center text-indigo-500 shadow-sm active:scale-90 transition-transform"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg></button>
                    <button id="fc-close-btn" class="w-10 h-10 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center shadow-sm active:scale-90 transition-transform"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
            </div>
            <div class="w-full h-full pt-20 pb-28 px-6 flex items-center justify-center"><div id="card-container" class="w-full max-w-md aspect-[3/4] relative">${Card(item, this.isFlipped)}</div></div>
            <div class="fixed bottom-0 left-0 right-0 p-6 z-40 bg-gradient-to-t from-gray-100 via-gray-100 to-transparent dark:from-dark-bg dark:via-dark-bg">
                <div class="max-w-md mx-auto flex gap-4">
                    <button id="fc-prev-btn" class="flex-1 h-16 bg-white dark:bg-dark-card border border-gray-200 rounded-3xl shadow-sm active:scale-95 transition-all flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" /></svg></button>
                    <button id="fc-next-btn" class="flex-1 h-16 bg-indigo-600 text-white rounded-3xl shadow-xl active:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" /></svg></button>
                </div>
            </div>
        `;

        document.getElementById('card-container').addEventListener('click', () => this.toggleFlip());
        this.container.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: true });
        this.container.addEventListener('touchend', (e) => this.handleTouchEnd(e));
        document.getElementById('fc-next-btn').addEventListener('click', () => this.next());
        document.getElementById('fc-prev-btn').addEventListener('click', () => this.prev());
        document.getElementById('fc-random-btn').addEventListener('click', () => this.random());
        document.getElementById('fc-close-btn').addEventListener('click', () => window.dispatchEvent(new CustomEvent('router:home')));
        
        requestAnimationFrame(() => {
            const fitElements = this.container.querySelectorAll('[data-fit="true"]');
            fitElements.forEach(el => textService.fitText(el));
        });
    }
}
export const flashcardApp = new FlashcardApp();

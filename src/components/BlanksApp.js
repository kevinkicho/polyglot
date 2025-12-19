import { vocabService } from '../services/vocabService';
import { blanksService } from '../services/blanksService';
import { textService } from '../services/textService';
import { audioService } from '../services/audioService';
import { settingsService } from '../services/settingsService';

export class BlanksApp {
    constructor() { 
        this.container = null; 
        this.currentData = null; 
        this.isProcessing = false;
    }

    mount(elementId) { 
        this.container = document.getElementById(elementId); 
        if(!this.currentData) this.random(); 
        else this.render(); 
    }

    bind(selector, event, handler) {
        if (!this.container) return;
        const el = this.container.querySelector(selector);
        if (el) el.addEventListener(event, handler);
    }

    random() { 
        this.isProcessing = false;
        audioService.stop();
        this.currentData = blanksService.generateQuestion(null); 
        this.render(); 
    }
    
    next(id = null) { 
        this.isProcessing = false;
        audioService.stop();
        if(id===null && this.currentData) {
            const l=vocabService.getAll(); 
            const currentId = this.currentData.target ? this.currentData.target.id : 0;
            const i=vocabService.findIndexById(currentId);
            id=l[(i+1)%l.length].id;
        }
        this.currentData=blanksService.generateQuestion(id);
        if(this.currentData && this.currentData.target && window.saveGameHistory) {
            window.saveGameHistory('blanks', this.currentData.target.id);
        }
        this.render();
    }
    
    prev() { 
        if(this.currentData && this.currentData.target) { 
            const l=vocabService.getAll(); 
            const i=vocabService.findIndexById(this.currentData.target.id); 
            this.next(l[(i-1+l.length)%l.length].id); 
        } 
    }

    renderError() {
        if (this.container) {
            this.container.innerHTML = `
                <div class="fixed top-0 left-0 right-0 h-16 z-40 px-4 flex justify-between items-center bg-gray-100/90 dark:bg-dark-bg/90 backdrop-blur-sm"><div></div><button id="blanks-close-err" class="w-10 h-10 bg-red-50 text-red-500 rounded-full flex items-center justify-center shadow-sm"><svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg></button></div>
                <div class="p-10 text-center text-white pt-24">Not enough vocabulary or sentences.</div>
            `;
            this.bind('#blanks-close-err', 'click', () => window.dispatchEvent(new CustomEvent('router:home')));
        }
    }

    /**
     * Plays the blanked sentence with a pause where the blank is.
     */
    async playBlankedSentence() {
        const { sentence } = this.currentData;
        const lang = settingsService.get().targetLang;
        
        if (!sentence) return;

        // Split by the blank placeholder
        const parts = sentence.split('_______');

        if (parts.length > 1) {
            // Speak Part 1
            if (parts[0].trim()) await audioService.speak(parts[0], lang);
            
            // Artificial Pause (800ms) for the blank
            await new Promise(r => setTimeout(r, 800));
            
            // Speak Part 2
            if (parts[1].trim()) await audioService.speak(parts[1], lang);
        } else {
            // Fallback if no blank found (rare)
            await audioService.speak(sentence, lang);
        }
    }

    async submitAnswer(id, el) {
        if(this.isProcessing) return;
        this.isProcessing = true;

        const correct = this.currentData.target.id === id;
        
        el.classList.remove('border-transparent');
        if (correct) {
            el.classList.add('bg-green-500', 'border-green-600', 'text-white');
            el.classList.remove('bg-white', 'dark:bg-dark-card', 'text-gray-700', 'dark:text-white');
        } else {
            el.classList.add('bg-red-500', 'border-red-600', 'text-white');
            el.classList.remove('bg-white', 'dark:bg-dark-card', 'text-gray-700', 'dark:text-white');
        }

        if(correct) {
            const s = settingsService.get();
            const answerWord = this.currentData.answerWord;
            const fullSentence = this.currentData.target.back.sentenceTarget;

            // FIX: Reveal logic - Insert formatted word into the blank
            const qBox = document.getElementById('blanks-question-box');
            if(qBox) {
                // Find the text container (second child usually)
                const textEl = qBox.querySelector('[data-fit="true"]');
                if (textEl) {
                    const currentHTML = textEl.innerHTML;
                    // Replace the blank with styled answer
                    textEl.innerHTML = currentHTML.replace(
                        '_______', 
                        `<span class="text-indigo-600 dark:text-indigo-400 font-bold border-b-2 border-indigo-500 px-1 inline-block transform scale-110">${answerWord}</span>`
                    );
                }
            }

            if (s.blanksAutoPlayCorrect) {
                if (s.waitForAudio) {
                    await audioService.speak(fullSentence, s.targetLang);
                    this.next();
                } else {
                    audioService.speak(fullSentence, s.targetLang);
                    setTimeout(() => this.next(), 1500);
                }
            } else {
                setTimeout(() => this.next(), 1000);
            }
        } else {
            this.isProcessing = false;
        }
    }

    render() {
        if(!this.container) return;
        if(!this.currentData || !this.currentData.target) { this.renderError(); return; }
        
        // Robust variable access
        const { target, choices, sentence, blankedSentence } = this.currentData;
        const displaySentence = sentence || blankedSentence || "Error: Missing Sentence";
        
        this.container.innerHTML = `
            <div class="fixed top-0 left-0 right-0 h-16 z-40 px-4 flex justify-between items-center bg-gray-100/90 dark:bg-dark-bg/90 backdrop-blur-sm border-b border-white/10">
                <div class="flex items-center gap-2"><div class="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-full pl-1 pr-3 py-1 flex items-center shadow-sm"><span class="bg-teal-100 text-teal-600 text-xs font-bold px-2 py-1 rounded-full mr-2">ID</span><input type="number" id="blanks-id-input" class="w-12 bg-transparent border-none text-center font-bold text-gray-700 dark:text-white text-sm p-0" value="${target.id}"></div>
                <button class="game-edit-btn header-icon-btn bg-gray-200 dark:bg-gray-800 rounded-full text-gray-500 hover:text-indigo-600"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg></button></div>
                <div class="flex items-center gap-2">
                    <button class="game-settings-btn header-icon-btn bg-white dark:bg-dark-card border border-gray-200 rounded-xl text-gray-500 shadow-sm"><svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg></button>
                    <button id="blanks-random-btn" class="header-icon-btn bg-white dark:bg-dark-card border border-gray-200 rounded-xl text-indigo-500 shadow-sm"><svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg></button>
                    <button id="blanks-close-btn" class="header-icon-btn bg-red-50 text-red-500 rounded-full shadow-sm"><svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
                </div>
            </div>
            <div class="w-full h-full pt-20 pb-28 px-4 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
                <div id="blanks-question-box" class="w-full h-full bg-white dark:bg-dark-card rounded-[2rem] shadow-xl border-2 border-indigo-100 dark:border-dark-border p-6 flex flex-col items-center justify-center relative overflow-hidden cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <div class="absolute top-0 left-0 right-0 bg-gray-50 dark:bg-black/20 py-2 px-4 text-center border-b border-gray-100 dark:border-white/5"><span class="text-sm font-bold text-gray-400 uppercase tracking-widest">Fill in the blank</span></div>
                    <div class="text-2xl md:text-3xl font-medium text-gray-800 dark:text-white text-center leading-relaxed" data-fit="true">${displaySentence}</div>
                </div>
                <div class="w-full h-full grid grid-cols-2 grid-rows-2 gap-3">
                    ${choices.map(c => `<button class="quiz-option bg-white dark:bg-dark-card border-2 border-transparent rounded-2xl shadow-sm hover:shadow-md flex items-center justify-center" data-id="${c.id}"><div class="text-lg font-bold text-gray-700 dark:text-white text-center" data-fit="true">${c.front.main}</div></button>`).join('')}
                </div>
            </div>
            <div class="fixed bottom-0 left-0 right-0 p-6 z-40 bg-gradient-to-t from-gray-100 via-gray-100 to-transparent dark:from-dark-bg"><div class="max-w-md mx-auto flex gap-4"><button id="blanks-prev-btn" class="flex-1 h-16 bg-white border border-gray-200 rounded-3xl shadow-sm flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg></button><button id="blanks-next-btn" class="flex-1 h-16 bg-indigo-600 text-white rounded-3xl shadow-xl flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg></button></div></div>
        `;

        this.bind('#blanks-next-btn', 'click', () => this.next());
        this.bind('#blanks-prev-btn', 'click', () => this.prev());
        this.bind('#blanks-random-btn', 'click', () => this.random());
        this.bind('#blanks-close-btn', 'click', () => window.dispatchEvent(new CustomEvent('router:home')));
        this.bind('#blanks-id-input', 'change', (e) => { const newId = parseInt(e.target.value); vocabService.findIndexById(newId) !== -1 ? this.next(newId) : alert('ID not found'); });
        
        // Manual Audio Replay on box click
        this.bind('#blanks-question-box', 'click', () => {
            if (!this.isProcessing) this.playBlankedSentence();
        });

        this.container.querySelectorAll('.quiz-option').forEach(btn => btn.addEventListener('click', (e) => this.submitAnswer(parseInt(e.currentTarget.dataset.id), e.currentTarget)));
        requestAnimationFrame(() => this.container.querySelectorAll('[data-fit="true"]').forEach(el => textService.fitText(el)));

        // FIX: Auto-play the blanked sentence with pause
        if (settingsService.get().autoPlay) {
            setTimeout(() => this.playBlankedSentence(), 300);
        }
    }
}
export const blanksApp = new BlanksApp();

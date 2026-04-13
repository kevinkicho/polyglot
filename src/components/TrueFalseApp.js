import { BaseGameComponent } from './BaseGameComponent';

export class TrueFalseApp extends BaseGameComponent {
    constructor() {
        super();
        this.isCorrectPair = false;
    }

    mount(elementId) {
        super.mount(elementId);
        this.random();
    }

    loadGame() {
        this.isProcessing = false;
        const list = this.vocabService.getAll();
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

    handleKeyPress(e) {
        if (this.isProcessing) return;
        if (e.key === 'y' || e.key === 'Y') { e.preventDefault(); this.handleGuess(true); }
        else if (e.key === 'n' || e.key === 'N') { e.preventDefault(); this.handleGuess(false); }
    }

    playAudio() {
        this.audioService.speak(this.currentData.item.front.main, this.settingsService.get().targetLang);
    }

    handleGuess(userGuessedTrue) {
        if (this.isProcessing) return;
        this.isProcessing = true;
        const correct = (userGuessedTrue === this.isCorrectPair);
        this.recordAnswer(this.currentData.item.id, correct);

        const box = this.container.querySelector('#tf-card');
        const meaningEl = this.container.querySelector('.meaning-text');
        const correctMeaning = this.currentData.item.back.main || this.currentData.item.back.definition;

        if (correct) {
            this.scoreService.addScore('truefalse', 10);
            if (this.settingsService.get().autoPlay) this.playAudio();

            box.classList.add('animate-celebrate', 'border-green-500', 'bg-green-50', 'dark:bg-green-900/20');

            if (!userGuessedTrue && !this.isCorrectPair) {
                if(meaningEl) {
                    meaningEl.innerHTML = `
                        <div class="text-gray-400 text-sm mb-1 line-through opacity-50">${this.textService.smartWrap(this.currentData.displayMeaning)}</div>
                        <span class="font-black text-indigo-600 dark:text-indigo-400 block text-4xl animate-celebrate">${this.textService.smartWrap(correctMeaning)}</span>
                        <span class="block text-xs font-bold text-green-500 mt-2 uppercase tracking-widest">Correct Meaning</span>
                    `;
                }
                this.setTimeout(() => this.next(), 2000);
            } else {
                this.setTimeout(() => this.next(), 800);
            }
        } else {
            box.classList.add('shake', 'border-red-500', 'bg-red-50', 'dark:bg-red-900/20');

            if(meaningEl) {
                if (this.isCorrectPair) {
                    meaningEl.style.color = '#EF4444';
                    meaningEl.innerHTML = `
                        <span class="font-black text-4xl block">${this.textService.smartWrap(correctMeaning)}</span>
                        <span class="block text-xs font-bold text-red-500 mt-2 uppercase tracking-widest">It was correct!</span>
                    `;
                } else {
                    meaningEl.style.color = '#EF4444';
                    meaningEl.innerHTML = `
                        <span class="line-through opacity-50 text-sm block">${this.textService.smartWrap(this.currentData.displayMeaning)}</span>
                        <span class="font-black text-indigo-600 dark:text-indigo-400 block mt-2 text-4xl">${this.textService.smartWrap(correctMeaning)}</span>
                        <span class="block text-xs font-bold text-red-500 mt-2 uppercase tracking-widest">Wrong! Actual meaning:</span>
                    `;
                }
            }

            this.setTimeout(() => {
                box.classList.remove('shake', 'border-red-500', 'bg-red-50', 'dark:bg-red-900/20');
                this.isProcessing = false;
            }, 2500);
        }
    }

    render() {
        if (!this.container) return;
        const { item, displayMeaning } = this.currentData;

        this.container.innerHTML = `
            ${this.renderHeader({ prefix: 'tf', id: item.id, color: 'orange', showRandom: true })}

            <div class="w-full h-full pt-20 pb-28 px-6 flex flex-col items-center justify-center gap-6">
                ${this.renderCategoryPills({ color: 'orange' })}
                <div id="tf-card" class="w-full max-w-sm bg-white dark:bg-dark-card border-4 border-gray-100 dark:border-dark-border rounded-[2rem] p-8 shadow-xl text-center flex flex-col items-center gap-6 transition-all duration-300">
                    <div class="w-full h-32 flex items-center justify-center" id="tf-q-box">
                        <h1 class="question-text font-black text-gray-800 dark:text-white leading-tight cursor-pointer active:scale-95 transition-transform w-full text-center h-full flex items-center justify-center">${this.textService.smartWrap(item.front.main)}</h1>
                    </div>

                    <div class="w-full pt-2 border-t border-gray-100 dark:border-gray-700">
                        <h2 class="meaning-text text-3xl font-bold text-gray-600 dark:text-gray-300 leading-tight">${this.textService.smartWrap(displayMeaning)}</h2>
                    </div>
                </div>

                <div class="flex gap-4 w-full max-w-sm">
                     <button id="btn-false" class="flex-1 py-6 bg-transparent border-4 border-red-500 text-red-500 rounded-2xl font-black text-2xl active:scale-95 transition-transform hover:bg-red-50 dark:hover:bg-red-900/20" aria-label="No, incorrect match">NO</button>
                     <button id="btn-true" class="flex-1 py-6 bg-transparent border-4 border-green-500 text-green-500 rounded-2xl font-black text-2xl active:scale-95 transition-transform hover:bg-green-50 dark:hover:bg-green-900/20" aria-label="Yes, correct match">YES</button>
                </div>
            </div>

            ${this.renderFooter({ prefix: 'tf', color: 'orange' })}
        `;

        this.bindCommonEvents('tf');
        this.bind('#tf-q-box', 'click', () => this.playAudio());
        this.bind('#btn-true', 'click', () => this.handleGuess(true));
        this.bind('#btn-false', 'click', () => this.handleGuess(false));

        this.fitTexts([
            ['.question-text', 20, 80],
            ['.meaning-text', 18, 60]
        ]);
    }
}
export const trueFalseApp = new TrueFalseApp();

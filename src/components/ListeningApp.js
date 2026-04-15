import { BaseGameComponent } from './BaseGameComponent';

export class ListeningApp extends BaseGameComponent {
    constructor() {
        super();
        this.isPlaying = false;
    }

    mount(elementId) {
        super.mount(elementId);
        if (!this.currentData) this.random();
        else this.render();
    }

    playAudio() {
        if (this.currentData && this.currentData.target) {
            this.isPlaying = true;
            this.renderButtonState();
            this.audioService.speak(this.currentData.target.front.main, this.settingsService.get().targetLang)
                .then(() => {
                    this.isPlaying = false;
                    this.renderButtonState();
                });
        }
    }

    loadGame() {
        this.isProcessing = false;
        const list = this.vocabService.getAll();
        if (!list || !list.length) return;

        const target = list[this.currentIndex];
        const others = list.filter(i => i.id !== target.id).sort(() => 0.5 - Math.random()).slice(0, 3);
        const choices = [target, ...others].sort(() => 0.5 - Math.random());

        this.currentData = { target, choices };
        this.render();
        if (this.settingsService.get().autoPlay) this.setTimeout(() => this.playAudio(), 500);
    }

    handleChoice(id, el) {
        if (this.isProcessing) return;
        this.isProcessing = true;

        const isCorrect = id === this.currentData.target.id;
        this.recordAnswer(this.currentData.target.id, isCorrect);
        if (isCorrect) {
            el.classList.remove('bg-white', 'dark:bg-dark-card');
            el.classList.add('bg-green-500', 'text-white', 'border-green-600');
            this.scoreService.addScore('listening', 10);
            el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.05)', offset: 0.5 }, { transform: 'scale(1)' }], { duration: 300 });
            this.setTimeout(() => this.transitionTo(() => this.next()), 1000);
        } else {
            el.classList.remove('bg-white', 'dark:bg-dark-card');
            el.classList.add('bg-red-500', 'text-white', 'border-red-600');
            el.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-5px)', offset: 0.2 }, { transform: 'translateX(5px)', offset: 0.4 }, { transform: 'translateX(-5px)', offset: 0.6 }, { transform: 'translateX(5px)', offset: 0.8 }, { transform: 'translateX(0)' }], { duration: 400 });
            this.isProcessing = false;
        }
    }

    renderButtonState() {
        if (!this.container) return;
        const btn = this.container.querySelector('#listening-play-btn');
        const icon = this.container.querySelector('#listening-play-icon');
        if (!btn || !icon) return;
        if (this.isPlaying) { btn.classList.add('ring-4', 'ring-indigo-300', 'scale-110'); icon.classList.add('animate-pulse'); }
        else { btn.classList.remove('ring-4', 'ring-indigo-300', 'scale-110'); icon.classList.remove('animate-pulse'); }
    }

    next(id = null) {
        this.isProcessing = false;
        this.audioService.stop();
        super.next(id);
    }

    render() {
        if (!this.container || !this.currentData) return;
        const { target, choices } = this.currentData;
        const getLabel = (item) => item.back.definition || item.back.main || "???";

        this.container.innerHTML = `
            ${this.renderHeader({ prefix: 'listening', id: target.id, color: 'indigo', showRandom: true })}

            <div class="w-full h-full pt-20 landscape:pt-12 pb-10 landscape:pb-4 px-6 landscape:px-3 max-w-6xl mx-auto flex flex-col justify-center">
                ${this.renderCategoryPills({ color: 'indigo' })}
                ${this.renderSplitLayout(
                    `<div class="flex-1 flex flex-col items-center justify-center">
                        <button id="listening-play-btn" class="w-32 h-32 landscape:w-20 landscape:h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-2xl flex items-center justify-center transform transition-all active:scale-95 hover:shadow-indigo-500/50">
                            <svg id="listening-play-icon" xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 landscape:h-10 landscape:w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                            </svg>
                        </button>
                        <p class="mt-4 landscape:mt-2 text-gray-400 font-bold uppercase tracking-widest text-xs animate-pulse">Tap to Listen</p>
                    </div>`,
                    `<div class="grid grid-cols-1 md:grid-cols-2 gap-2 landscape:gap-1.5 pb-8 landscape:pb-2 w-full landscape:justify-center landscape:content-center landscape:h-full">
                        ${choices.map(c => `
                            <button class="choice-btn bg-white dark:bg-dark-card border-2 border-gray-100 dark:border-dark-border p-4 landscape:p-2 rounded-2xl landscape:rounded-xl shadow-sm hover:shadow-md text-xl landscape:text-base font-bold text-gray-700 dark:text-white transition-all active:scale-98 text-left flex items-center overflow-hidden" data-id="${c.id}">
                                <span class="choice-text w-full px-2 leading-relaxed text-center">${this.textService.smartWrap(getLabel(c))}</span>
                            </button>
                        `).join('')}
                    </div>`
                )}
            </div>
        `;

        this.bindCommonEvents('listening');
        this.bind('#listening-play-btn', 'click', () => this.playAudio());
        this.container.querySelectorAll('.choice-btn').forEach(btn => btn.addEventListener('click', (e) => this.handleChoice(parseInt(e.currentTarget.dataset.id), e.currentTarget)));

        this.fitTexts([
            ['.choice-text', 18, 45]
        ]);
    }
}
export const listeningApp = new ListeningApp();

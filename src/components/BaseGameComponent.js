import { vocabService } from '../services/vocabService';
import { audioService } from '../services/audioService';
import { scoreService } from '../services/scoreService';
import { settingsService } from '../services/settingsService';
import { textService } from '../services/textService';
import { toast } from '../services/toastService';
import { srsService } from '../services/srsService';

/**
 * Base class for all game components.
 * Provides lifecycle management, category filtering, navigation,
 * HTML rendering helpers, and event binding.
 *
 * Subclasses must override `loadGame()` and call `bindCommonEvents(prefix)`
 * after rendering their HTML.
 */
export class BaseGameComponent {
    constructor() {
        /** @type {HTMLElement|null} */
        this.container = null;
        /** @type {number} */
        this.currentIndex = 0;
        /** @type {Object|null} */
        this.currentData = null;
        /** @type {boolean} */
        this.isProcessing = false;
        /** @type {string[]} */
        this.categories = [];
        /** @type {string} */
        this.currentCategory = 'All';
        /** @type {number[]} */
        this._timers = [];
        /** @type {number[]} */
        this._animFrames = [];
        /** @type {Map<string, {event: string, handler: Function}>} */
        this._bindings = new Map();
    }

    // --- Lifecycle ---

    mount(elementId) {
        this.container = document.getElementById(elementId);
        this.updateCategories();
        if (window.visualViewport) {
            this._viewportHandler = () => {
                if (!this.container) return;
                const bottomBar = this.container.querySelector('.fixed.bottom-0');
                if (bottomBar) {
                    const vh = window.visualViewport.height;
                    const diff = window.innerHeight - vh;
                    if (diff > 100) {
                        bottomBar.style.bottom = `${diff}px`;
                    } else {
                        bottomBar.style.bottom = '';
                    }
                }
            };
            window.visualViewport.addEventListener('resize', this._viewportHandler);
        }
    }

    unmount() {
        this._timers.forEach(id => clearTimeout(id));
        this._timers = [];
        this._animFrames.forEach(id => cancelAnimationFrame(id));
        this._animFrames = [];
        if (this._keyHandler) {
            document.removeEventListener('keydown', this._keyHandler);
            this._keyHandler = null;
        }
        if (this._containerHandler) {
            this.container?.removeEventListener('click', this._containerHandler);
            this._containerHandler = null;
        }
        if (this._viewportHandler && window.visualViewport) {
            window.visualViewport.removeEventListener('resize', this._viewportHandler);
            this._viewportHandler = null;
        }
        this._bindings.clear();
        audioService.stop();
        this.isProcessing = false;
    }

    refresh() {
        if (this.container && !this.container.classList.contains('hidden')) {
            try {
                this.loadGame();
            } catch (e) {
                console.error('[Game] refresh error:', e);
                this._renderCrash(e);
            }
        }
    }

    // Safe setTimeout that auto-tracks for cleanup
    setTimeout(fn, ms) {
        const id = setTimeout(() => {
            if (!this.container) return;
            fn();
        }, ms);
        this._timers.push(id);
        return id;
    }

    // Safe requestAnimationFrame that auto-tracks for cleanup
    raf(fn) {
        const id = requestAnimationFrame(() => {
            if (!this.container) return;
            fn();
        });
        this._animFrames.push(id);
        return id;
    }

    // --- Category Filtering ---

    updateCategories() {
        const all = vocabService.getAll();
        const cats = new Set(all.map(i => i.category || 'Uncategorized'));
        this.categories = ['All', ...cats];
    }

    setCategory(cat) {
        this.currentCategory = cat;
        this.random();
    }

    getFilteredList() {
        const all = vocabService.getAll();
        if (this.currentCategory === 'All') return all;
        return all.filter(i => (i.category || 'Uncategorized') === this.currentCategory);
    }

    // --- Navigation ---

    random() {
        try {
            const list = this.getFilteredList();
            if (list.length === 0) return;
            const randItem = srsService.weightedRandom(list);
            this.currentIndex = vocabService.findIndexById(randItem.id);
            this.loadGame();
        } catch (e) {
            console.error('[Game] random error:', e);
            this._renderCrash(e);
        }
    }

    recordAnswer(vocabId, correct) {
        srsService.recordAnswer(vocabId, correct);
        // Track session stats
        if (!this._sessionStats) this._sessionStats = { correct: 0, wrong: 0, reviewed: new Set() };
        if (correct) this._sessionStats.correct++;
        else this._sessionStats.wrong++;
        this._sessionStats.reviewed.add(vocabId);
    }

    next(id = null) {
        this.isProcessing = false;
        if (id !== null) {
            const idx = vocabService.findIndexById(id);
            if (idx !== -1) this.currentIndex = idx;
        } else {
            const list = this.getFilteredList();
            const currentItem = vocabService.getAll()[this.currentIndex];
            let listIdx = list.findIndex(i => i.id === currentItem.id);
            listIdx = (listIdx + 1) % list.length;
            this.currentIndex = vocabService.findIndexById(list[listIdx].id);
        }
        this.loadGame();
    }

    prev() {
        this.isProcessing = false;
        const list = this.getFilteredList();
        const currentItem = vocabService.getAll()[this.currentIndex];
        let listIdx = list.findIndex(i => i.id === currentItem.id);
        listIdx = (listIdx - 1 + list.length) % list.length;
        this.currentIndex = vocabService.findIndexById(list[listIdx].id);
        this.loadGame();
    }

    gotoId(id) {
        const idx = vocabService.findIndexById(parseInt(id));
        if (idx !== -1) {
            this.currentIndex = idx;
            this.loadGame();
        } else {
            toast.warning("ID not found / IDが見つかりません");
        }
    }

    // Smooth transition between questions — fades out, calls cb, fades in
    transitionTo(cb) {
        if (!this.container) { cb(); return; }
        let fired = false;
        this.container.classList.add('game-transition-out');
        const afterFade = () => {
            if (fired) return;
            fired = true;
            this.container.removeEventListener('transitionend', afterFade);
            cb();
            this.container.classList.remove('game-transition-out');
            this.container.classList.add('game-transition-in');
            this.container.addEventListener('animationend', () => {
                this.container?.classList.remove('game-transition-in');
            }, { once: true });
        };
        this.container.addEventListener('transitionend', afterFade, { once: true });
        // Fallback in case transitionend doesn't fire
        this.setTimeout(() => afterFade(), 200);
    }

    // Override in subclass
    loadGame() {}

    // --- DOM Helpers ---

    bind(selector, event, handler) {
        if (!this.container) return;
        const key = `${event}::${selector}`;
        this._bindings.set(key, { event, selector, handler });
        if (!this._containerHandler) {
            this._containerHandler = (e) => {
                for (const b of this._bindings.values()) {
                    if (b.event !== e.type) continue;
                    const target = e.target.closest(b.selector);
                    if (target && this.container?.contains(target)) {
                        b.handler.call(this, e, target);
                    }
                }
            };
            this.container.addEventListener('click', this._containerHandler);
        }
    }

    closeGame() {
        this._showSessionSummary();
        window.dispatchEvent(new CustomEvent('router:home'));
    }

    _showSessionSummary() {
        if (!this._sessionStats || this._sessionStats.reviewed.size === 0) return;
        const { correct, wrong, reviewed } = this._sessionStats;
        const total = correct + wrong;
        const pct = total ? Math.round((correct / total) * 100) : 0;
        toast.info(`Session: ${reviewed.size} words, ${correct}/${total} correct (${pct}%)`, 4000);
        this._sessionStats = null;
    }

    saveHistory(game, id) {
        if (id && window.saveGameHistory) window.saveGameHistory(game, id);
    }

    fitTexts(selectors) {
        this.raf(() => {
            if (!this.container) return;
            if (Array.isArray(selectors)) {
                selectors.forEach(([selector, min, max, multiLine]) => {
                    if (selector.startsWith('.') || selector.startsWith('[')) {
                        this.container.querySelectorAll(selector).forEach(el => textService.fitText(el, min, max, multiLine));
                    } else {
                        const el = this.container.querySelector(selector);
                        if (el) textService.fitText(el, min, max, multiLine);
                    }
                });
            }
        });
    }

    // --- Shared HTML Fragments ---

    renderHeader({ prefix, title, id, color = 'indigo', showScore = true, showRandom = true, showEdit = true, showId = true }) {
        const idHtml = showId ? `
            <div class="flex items-center bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-full pl-3 pr-1 py-1 shadow-sm">
                <span class="text-xs font-bold text-gray-400 mr-2 uppercase">ID</span>
                <input type="number" id="${prefix}-id-input" value="${id || 0}" class="w-12 bg-transparent text-sm font-bold text-gray-700 dark:text-white outline-none text-center appearance-none m-0 p-0">
                <button id="${prefix}-go-btn" class="ml-1 w-6 h-6 bg-${color}-100 text-${color}-600 rounded-full flex items-center justify-center hover:bg-${color}-200"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg></button>
            </div>` : '';

        const editHtml = showEdit ? `
            <button class="game-edit-btn bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-full w-8 h-8 flex items-center justify-center shadow-sm text-gray-500 hover:text-${color}-500 active:scale-95 transition-all" aria-label="Edit vocabulary">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
            </button>` : '';

        const randomHtml = showRandom ? `
            <button id="${prefix}-random-btn" class="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-full w-8 h-8 flex items-center justify-center shadow-sm text-gray-500 hover:text-${color}-500 active:scale-95 transition-all" aria-label="Random">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
            </button>` : '';

        const scoreHtml = showScore ? `
            <button id="score-pill" class="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-full px-3 py-1 flex items-center gap-2 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors" aria-label="View score">
                <span class="text-base" aria-hidden="true">🏆</span>
                <span class="font-black text-gray-700 dark:text-white text-sm global-score-display">${scoreService.todayScore}</span>
            </button>` : '';

        return `
            <div class="fixed top-0 left-0 right-0 h-16 landscape:h-11 z-40 px-4 landscape:px-3 flex justify-between items-center bg-gray-100/90 dark:bg-dark-bg/90 backdrop-blur-sm border-b border-white/10" role="toolbar" aria-label="${title || 'Game'} toolbar">
                <div class="flex items-center gap-2">
                    ${title ? `<div class="text-xl landscape:text-sm font-black text-${color}-500 tracking-tighter">${title}</div>` : ''}
                    ${idHtml}
                    ${editHtml}
                    ${showRandom ? randomHtml : ''}
                </div>
                <div class="flex items-center gap-2">
                    ${scoreHtml}
                    <button id="${prefix}-close-btn" class="header-icon-btn bg-red-50 text-red-500 rounded-full shadow-sm" aria-label="Close game">
                        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            </div>`;
    }

    renderFooter({ prefix, color = 'indigo' }) {
        return `
            <div class="fixed bottom-0 left-0 right-0 p-4 landscape:p-1.5 z-40 bg-gradient-to-t from-gray-100 via-gray-100 to-transparent dark:from-dark-bg">
                <div class="max-w-lg mx-auto flex gap-4 landscape:gap-2">
                    <button id="${prefix}-prev-btn" class="flex-1 h-14 landscape:h-9 bg-white dark:bg-dark-card border border-gray-200 dark:border-gray-700 rounded-2xl landscape:rounded-xl shadow-sm flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-95 transition-all" aria-label="Previous">
                        <svg class="h-8 w-8 landscape:h-5 landscape:w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg>
                    </button>
                    <button id="${prefix}-next-btn" class="flex-1 h-14 landscape:h-9 bg-${color}-500 text-white rounded-2xl landscape:rounded-xl shadow-lg shadow-${color}-500/30 flex items-center justify-center font-bold tracking-wide active:scale-95 transition-all" aria-label="Next">
                        <svg class="h-8 w-8 landscape:h-5 landscape:w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>
                    </button>
                </div>
            </div>`;
    }

    renderCategoryPills({ color = 'indigo' } = {}) {
        return `
            <div class="w-full overflow-x-auto whitespace-nowrap px-4 pb-2 mb-2 landscape:pb-1 landscape:mb-1 flex gap-2 landscape:gap-1 no-scrollbar" role="tablist" aria-label="Category filter">
                ${this.categories.map(cat => `
                    <button class="category-pill px-4 py-1 landscape:px-2 landscape:py-1 landscape:min-h-[36px] landscape:text-xs rounded-full text-sm font-bold border ${this.currentCategory === cat ? `bg-${color}-500 text-white border-${color}-500` : 'bg-white dark:bg-dark-card text-gray-500 border-gray-200 dark:border-gray-700'}" data-cat="${cat}" role="tab" aria-selected="${this.currentCategory === cat}">
                        ${cat}
                    </button>
                `).join('')}
            </div>`;
    }

    renderSplitLayout(leftHtml, rightHtml, { leftClass = '', rightClass = '' } = {}) {
        return `<div class="flex flex-col landscape:flex-row gap-3 landscape:gap-2 flex-1 min-h-0 w-full">
            <div class="landscape:w-1/2 landscape:h-full min-h-0 flex flex-col ${leftClass}">${leftHtml}</div>
            <div class="landscape:w-1/2 landscape:h-full flex-1 min-h-0 flex flex-col ${rightClass}">${rightHtml}</div>
        </div>`;
    }

    renderError(message = 'Not enough vocabulary in this category.', prefix = '') {
        if (!this.container) return;
        this.container.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full pt-20 px-6 text-center" role="alert">
                <svg class="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div class="text-lg font-bold text-gray-400 dark:text-gray-500 mb-4">${message}</div>
                <button id="${prefix}-close-err" class="px-6 py-2 bg-indigo-600 text-white rounded-full font-bold hover:bg-indigo-700 active:scale-95 transition-all">Go Home</button>
            </div>`;
        this.bind(`#${prefix}-close-err`, 'click', () => this.closeGame());
    }

    _renderCrash(error) {
        if (!this.container) return;
        this.container.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full pt-20 px-6 text-center" role="alert">
                <svg class="w-16 h-16 text-red-300 dark:text-red-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div class="text-lg font-bold text-gray-400 dark:text-gray-500 mb-2">Something went wrong</div>
                <p class="text-sm text-gray-400 mb-4">${error?.message || 'Unknown error'}</p>
                <div class="flex gap-3">
                    <button class="crash-retry px-6 py-2 bg-indigo-600 text-white rounded-full font-bold hover:bg-indigo-700 active:scale-95 transition-all">Retry</button>
                    <button class="crash-home px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full font-bold hover:bg-gray-300 active:scale-95 transition-all">Go Home</button>
                </div>
            </div>`;
        this.bind('.crash-retry', 'click', () => { try { this.loadGame(); } catch (e) { this._renderCrash(e); } });
        this.bind('.crash-home', 'click', () => this.closeGame());
    }

    // --- Common Event Binding ---

    bindCommonEvents(prefix) {
        this.bind(`#${prefix}-close-btn`, 'click', () => this.closeGame());
        this.bind(`#${prefix}-prev-btn`, 'click', () => this.prev());
        this.bind(`#${prefix}-next-btn`, 'click', () => this.next());
        this.bind(`#${prefix}-random-btn`, 'click', () => this.random());

        if (!this.container) return;

        // ID navigation delegation
        const idInput = this.container.querySelector(`#${prefix}-id-input`);
        if (idInput) {
            idInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') this.gotoId(idInput.value); });
            idInput.addEventListener('click', (e) => e.stopPropagation());
        }
        this.bind(`#${prefix}-go-btn`, 'click', () => {
            const input = this.container?.querySelector(`#${prefix}-id-input`);
            if (input) this.gotoId(input.value);
        });

        // Category pills via delegation
        this.bind('.category-pill', 'click', (e) => {
            if (e.dataset?.cat) this.setCategory(e.dataset.cat);
        });

        // Keyboard navigation
        this._keyHandler = (e) => {
            if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) return;
            if (e.key === 'ArrowRight') { e.preventDefault(); this.next(); }
            else if (e.key === 'ArrowLeft') { e.preventDefault(); this.prev(); }
            else if (e.key === 'Escape') { e.preventDefault(); this.closeGame(); }
            else if (this.handleKeyPress) { this.handleKeyPress(e); }
        };
        document.addEventListener('keydown', this._keyHandler);
    }

    // --- Exposed services for subclasses ---
    get vocabService() { return vocabService; }
    get audioService() { return audioService; }
    get scoreService() { return scoreService; }
    get settingsService() { return settingsService; }
    get textService() { return textService; }
    get toast() { return toast; }
}

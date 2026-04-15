import { audioService } from '../services/audioService';
import { textService } from '../services/textService';
import { vocabService } from '../services/vocabService';

/**
 * Maps game name -> dynamic import function.
 * Each returns a Promise resolving to the module's singleton export.
 */
const GAME_LOADERS = {
    flashcard:   () => import(/* webpackChunkName: "game-flashcard" */   '../components/FlashcardApp').then(m => m.flashcardApp),
    quiz:        () => import(/* webpackChunkName: "game-quiz" */        '../components/QuizApp').then(m => m.quizApp),
    sentences:   () => import(/* webpackChunkName: "game-sentences" */   '../components/SentencesApp').then(m => m.sentencesApp),
    blanks:      () => import(/* webpackChunkName: "game-blanks" */      '../components/BlanksApp').then(m => m.blanksApp),
    listening:   () => import(/* webpackChunkName: "game-listening" */   '../components/ListeningApp').then(m => m.listeningApp),
    match:       () => import(/* webpackChunkName: "game-match" */       '../components/MatchApp').then(m => m.matchApp),
    memory:      () => import(/* webpackChunkName: "game-memory" */      '../components/MemoryApp').then(m => m.memoryApp),
    finder:      () => import(/* webpackChunkName: "game-finder" */      '../components/FinderApp').then(m => m.finderApp),
    constructor: () => import(/* webpackChunkName: "game-constructor" */ '../components/ConstructorApp').then(m => m.constructorApp),
    writing:     () => import(/* webpackChunkName: "game-writing" */     '../components/WritingApp').then(m => m.writingApp),
    truefalse:   () => import(/* webpackChunkName: "game-truefalse" */  '../components/TrueFalseApp').then(m => m.trueFalseApp),
    reverse:     () => import(/* webpackChunkName: "game-reverse" */     '../components/ReverseApp').then(m => m.reverseApp),
    speech:      () => import(/* webpackChunkName: "game-speech" */      '../components/SpeechApp').then(m => m.speechApp),
    decoder:     () => import(/* webpackChunkName: "game-decoder" */     '../components/DecoderApp').then(m => m.decoderApp),
    gravity:     () => import(/* webpackChunkName: "game-gravity" */     '../components/GravityApp').then(m => m.gravityApp),
    chat:        () => import(/* webpackChunkName: "game-chat" */       '../components/ChatApp').then(m => m.chatApp),
};

class ViewManager {
    constructor() {
        this.views = {};
        this.currentActiveApp = null;
        this.savedHistory = {};
        this.gameRegistry = Object.create(null);  // cache of loaded instances
        this.gameNames = Object.keys(GAME_LOADERS);
        try { this.savedHistory = JSON.parse(localStorage.getItem('polyglot_history') || '{}'); } catch (e) {}

        window.saveGameHistory = (game, id) => {
            if (id) {
                this.savedHistory[game] = id;
                localStorage.setItem('polyglot_history', JSON.stringify(this.savedHistory));
            }
        };
    }

    registerGame(name, appInstance) {
        this.gameRegistry[name] = appInstance;
    }

    init() {
        // Build views from game names + home
        this.views = { home: document.getElementById('main-menu') };
        this.gameNames.forEach(name => {
            this.views[name] = document.getElementById(`${name}-view`);
        });

        this.bindNavigation();

        window.addEventListener('popstate', (e) => this.render(e.state ? e.state.view : 'home'));
        window.addEventListener('router:home', () => history.back());

        let resizeTimer;
        window.addEventListener('resize', () => {
            if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) return;
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                if (this.currentActiveApp && this.currentActiveApp.render) this.currentActiveApp.render();
                else document.querySelectorAll('[data-fit="true"]').forEach(el => textService.fitText(el));
            }, 100);
        });

        vocabService.subscribe(() => {
            if (this.currentActiveApp && this.currentActiveApp.refresh) {
                this.currentActiveApp.refresh();
            }
        });
    }

    bindNavigation() {
        this.gameNames.forEach(name => {
            const btn = document.getElementById(`menu-${name}-btn`);
            if (btn) btn.addEventListener('click', () => {
                history.pushState({ view: name }, '', `#${name}`);
                this.render(name);
            });
        });
    }

    async render(viewName) {
        audioService.stop();

        // Unmount previous game
        if (this.currentActiveApp && this.currentActiveApp.unmount) {
            this.currentActiveApp.unmount();
        }

        if (viewName === 'home') {
            document.body.classList.remove('game-mode');
            // Dispatch event so dashboard can refresh
            window.dispatchEvent(new CustomEvent('view:home'));
        } else {
            document.body.classList.add('game-mode');
        }

        Object.values(this.views).forEach(el => { if (el) el.classList.add('hidden'); });

        const target = this.views[viewName];
        this.currentActiveApp = null;

        if (target) {
            target.classList.remove('hidden');

            // Lazy-load game component on first access
            if (!this.gameRegistry[viewName] && GAME_LOADERS[viewName]) {
                target.innerHTML = '<div class="flex items-center justify-center h-full"><div class="text-gray-400 font-bold animate-pulse">Loading...</div></div>';
                try {
                    this.gameRegistry[viewName] = await GAME_LOADERS[viewName]();
                } catch (e) {
                    console.error(`[ViewManager] Failed to load ${viewName}:`, e);
                    target.innerHTML = '<div class="flex items-center justify-center h-full text-red-500 font-bold">Failed to load game. Please refresh.</div>';
                    return;
                }
            }

            const app = this.gameRegistry[viewName];
            if (app) {
                app.mount(`${viewName}-view`);
                this.currentActiveApp = app;

                const lastId = this.savedHistory[viewName];
                if (lastId) {
                    if (app.goto) app.goto(lastId);
                    else if (app.next) app.next(lastId);
                }
            }
        }
    }

    getActiveApp() {
        return this.currentActiveApp;
    }
}

export const viewManager = new ViewManager();

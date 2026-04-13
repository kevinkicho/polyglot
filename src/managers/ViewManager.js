import { audioService } from '../services/audioService';
import { textService } from '../services/textService';
import { vocabService } from '../services/vocabService';

class ViewManager {
    constructor() {
        this.views = {};
        this.currentActiveApp = null;
        this.savedHistory = {};
        this.gameRegistry = {};
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
        // Build views from registry + home
        this.views = { home: document.getElementById('main-menu') };
        Object.keys(this.gameRegistry).forEach(name => {
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
        Object.keys(this.gameRegistry).forEach(name => {
            const btn = document.getElementById(`menu-${name}-btn`);
            if (btn) btn.addEventListener('click', () => {
                history.pushState({ view: name }, '', `#${name}`);
                this.render(name);
            });
        });
    }

    render(viewName) {
        audioService.stop();

        // Unmount previous game
        if (this.currentActiveApp && this.currentActiveApp.unmount) {
            this.currentActiveApp.unmount();
        }

        if (viewName === 'home') document.body.classList.remove('game-mode');
        else document.body.classList.add('game-mode');

        Object.values(this.views).forEach(el => { if (el) el.classList.add('hidden'); });

        const target = this.views[viewName];
        this.currentActiveApp = null;

        if (target) {
            target.classList.remove('hidden');

            const app = this.gameRegistry[viewName];
            if (app) {
                app.mount(`${viewName}-view`);
                this.currentActiveApp = app;

                const lastId = this.savedHistory[viewName];
                if (lastId) {
                    // Use goto for flashcard, next for others
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

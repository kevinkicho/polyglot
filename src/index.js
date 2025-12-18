import './services/firebase';
import './styles/main.scss';
import { settingsService } from './services/settingsService';
import { vocabService } from './services/vocabService';
import { dictionaryService } from './services/dictionaryService';
import { auth, signInAnonymously } from './services/firebase';
import { flashcardApp } from './components/FlashcardApp';
import { quizApp } from './components/QuizApp';
import { sentencesApp } from './components/SentencesApp';
import { blanksApp } from './components/BlanksApp';
import { audioService } from './services/audioService';

// Logging (Keep existing)
const originalLog = console.log; const originalWarn = console.warn; const originalError = console.error;
function logToScreen(type, args) { const box = document.getElementById('error-text'); if (box) { const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '); box.innerText += `[${type}] ${msg}\n`; box.scrollTop = box.scrollHeight; } }
console.log = function(...args) { originalLog.apply(console, args); logToScreen('LOG', args); };
console.warn = function(...args) { originalWarn.apply(console, args); logToScreen('WRN', args); };
console.error = function(...args) { originalError.apply(console, args); logToScreen('ERR', args); };

// Router
const views = { home: document.getElementById('main-menu'), flashcard: document.getElementById('flashcard-view'), quiz: document.getElementById('quiz-view'), sentences: document.getElementById('sentences-view'), blanks: document.getElementById('blanks-view') };

function renderView(viewName) {
    audioService.stop();
    Object.values(views).forEach(el => { if(el) el.classList.add('hidden'); });
    const target = views[viewName];
    if (target) {
        target.classList.remove('hidden');
        if (viewName === 'flashcard') flashcardApp.mount('flashcard-view');
        if (viewName === 'quiz') quizApp.mount('quiz-view');
        if (viewName === 'sentences') sentencesApp.mount('sentences-view');
        if (viewName === 'blanks') blanksApp.mount('blanks-view');
    }
}

function navigateTo(viewName) { history.pushState({ view: viewName }, '', `#${viewName}`); renderView(viewName); }
window.addEventListener('popstate', (e) => renderView(e.state ? e.state.view : 'home'));
window.addEventListener('router:home', () => history.back());

// Bind Menu Buttons
const bindNav = (id, view) => { const btn = document.getElementById(id); if(btn) btn.addEventListener('click', () => navigateTo(view)); };
bindNav('menu-flashcard-btn', 'flashcard');
bindNav('menu-quiz-btn', 'quiz');
bindNav('menu-sentences-btn', 'sentences');
bindNav('menu-blanks-btn', 'blanks');

// Init
async function initApp() {
    try {
        const saved = settingsService.get();
        if (saved.darkMode) document.documentElement.classList.add('dark');
        
        updateSplashCheck(0, 'active');
        await signInAnonymously(auth);
        updateSplashCheck(0, 'done');

        updateSplashCheck(1, 'active');
        await vocabService.fetchData();
        updateSplashCheck(1, 'done');

        updateSplashCheck(2, 'active');
        await dictionaryService.fetchData();
        updateSplashCheck(2, 'done');

        const startBtn = document.getElementById('start-app-btn');
        if(startBtn) {
            startBtn.disabled = false;
            startBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            startBtn.classList.add('bg-indigo-600', 'text-white');
            startBtn.innerText = "Start Learning";
            startBtn.onclick = () => {
                document.getElementById('splash-screen').style.display = 'none';
                document.body.classList.remove('is-loading');
                renderView('home');
            };
        }
    } catch(e) { console.error("Init Error", e); }
}

function updateSplashCheck(index, state) {
    const checks = [document.getElementById('check-0'), document.getElementById('check-1'), document.getElementById('check-2')];
    const el = checks[index];
    if(!el) return;
    if (state === 'active') el.style.borderColor = "#6366f1";
    else if (state === 'done') el.style.backgroundColor = "#22c55e";
}
initApp();

// [FIX] REMOVED GLOBAL GAME NAV LISTENERS
// Previously here: document.addEventListener('click', (e) => { if(e.target.closest('#quiz-prev-btn'))... })
// These are now handled exclusively inside the components to prevent double-firing.

// Settings & Dictionary Logic (Standard - Abbreviated for space as they were correct)
const openModal = () => document.getElementById('settings-modal').classList.remove('hidden');
const closeModal = () => document.getElementById('settings-modal').classList.add('hidden');
document.getElementById('settings-open-btn').addEventListener('click', openModal);
document.getElementById('modal-done-btn').addEventListener('click', closeModal);

// ... (Rest of settings bindings match previous correct versions) ...

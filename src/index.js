import './services/firebase';
import './styles/main.scss';
import './styles/combo.scss';
import { settingsService } from './services/settingsService';
import { vocabService } from './services/vocabService';
import { scoreService } from './services/scoreService';
import { srsService } from './services/srsService';
import { viewManager } from './managers/ViewManager';
import { authManager } from './managers/AuthManager';
import { editorManager } from './managers/EditorManager';
import { uiManager } from './managers/UIManager';

// Game imports
import { flashcardApp } from './components/FlashcardApp';
import { quizApp } from './components/QuizApp';
import { sentencesApp } from './components/SentencesApp';
import { blanksApp } from './components/BlanksApp';
import { listeningApp } from './components/ListeningApp';
import { matchApp } from './components/MatchApp';
import { memoryApp } from './components/MemoryApp';
import { finderApp } from './components/FinderApp';
import { constructorApp } from './components/ConstructorApp';
import { writingApp } from './components/WritingApp';
import { trueFalseApp } from './components/TrueFalseApp';
import { reverseApp } from './components/ReverseApp';
import { speechApp } from './components/SpeechApp';
import { decoderApp } from './components/DecoderApp';
import { gravityApp } from './components/GravityApp';

// Register all games
viewManager.registerGame('flashcard', flashcardApp);
viewManager.registerGame('quiz', quizApp);
viewManager.registerGame('sentences', sentencesApp);
viewManager.registerGame('blanks', blanksApp);
viewManager.registerGame('listening', listeningApp);
viewManager.registerGame('match', matchApp);
viewManager.registerGame('memory', memoryApp);
viewManager.registerGame('finder', finderApp);
viewManager.registerGame('constructor', constructorApp);
viewManager.registerGame('writing', writingApp);
viewManager.registerGame('truefalse', trueFalseApp);
viewManager.registerGame('reverse', reverseApp);
viewManager.registerGame('speech', speechApp);
viewManager.registerGame('decoder', decoderApp);
viewManager.registerGame('gravity', gravityApp);

// Polyfills or globals if needed
window.wasLongPress = false;
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW failed', err)); });
}

const LANGUAGES = [
    { code: 'en', name: 'English' }, { code: 'es', name: 'Spanish' }, { code: 'fr', name: 'French' }, { code: 'de', name: 'German' },
    { code: 'ja', name: 'Japanese' }, { code: 'ko', name: 'Korean' }, { code: 'zh', name: 'Chinese' }, { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' }, { code: 'ru', name: 'Russian' }
];

function populateLanguageDropdowns() {
    const targets = ['target-select', 'origin-select'];
    targets.forEach(id => {
        const select = document.getElementById(id);
        if (select && select.options.length < 5) {
            select.innerHTML = '';
            LANGUAGES.forEach(lang => {
                const opt = document.createElement('option');
                opt.value = lang.code;
                opt.textContent = lang.name;
                select.appendChild(opt);
            });
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Core Services
    try { scoreService.init(); } catch(e){ console.error("Score Init Error", e); }
    populateLanguageDropdowns();

    // 2. Initialize Managers
    viewManager.init();
    uiManager.init();
    editorManager.init();

    // 3. Initialize Auth (which triggers data loading)
    authManager.init(async (user) => {
        await loadApplicationData();
    });
});

async function loadApplicationData() {
    const startBtn = document.getElementById('start-app-btn');
    if(startBtn) startBtn.innerText = "Loading Data...";

    try {
        const saved = settingsService.get();
        if(saved.darkMode) document.documentElement.classList.add('dark');

        await vocabService.init();
        srsService.load();

        if (!vocabService.hasData()) throw new Error("No vocabulary data.");

        if(startBtn) {
            startBtn.disabled = false;
            startBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            startBtn.classList.add('bg-indigo-600', 'text-white');
            startBtn.innerText = "Start Learning";
            startBtn.onclick = () => {
                // Initialize speech synth
                const s = new SpeechSynthesisUtterance(''); window.speechSynthesis.speak(s);

                const splash = document.getElementById('splash-screen');
                if(splash) splash.style.display = 'none';
                document.body.classList.remove('is-loading');

                viewManager.render('home');
            };
        }
    } catch(e) {
        console.error("Data Load Error:", e);
        if(startBtn) { startBtn.disabled = false; startBtn.innerText = "Retry"; startBtn.onclick = () => window.location.reload(); }
    }
}

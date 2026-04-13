import './services/firebase';
import './styles/main.scss';
import './styles/combo.scss';
import { settingsService } from './services/settingsService';
import { vocabService } from './services/vocabService';
import { scoreService } from './services/scoreService';
import { srsService } from './services/srsService';
import { offlineQueue } from './services/offlineQueue';
import { viewManager } from './managers/ViewManager';
import { authManager } from './managers/AuthManager';
import { editorManager } from './managers/EditorManager';
import { uiManager } from './managers/UIManager';

// Game components are lazy-loaded by ViewManager on first navigation

function showOnboardingIfNew() {
    if (localStorage.getItem('polyglot_onboarded')) return;
    const overlay = document.getElementById('onboarding-overlay');
    if (!overlay) return;
    overlay.classList.remove('hidden');
    requestAnimationFrame(() => overlay.classList.remove('opacity-0'));
    document.getElementById('onboarding-dismiss').addEventListener('click', () => {
        overlay.classList.add('opacity-0');
        setTimeout(() => overlay.classList.add('hidden'), 300);
        localStorage.setItem('polyglot_onboarded', '1');
    });
}

function updateSRSDashboard() {
    const list = vocabService.getAll();
    const dashboard = document.getElementById('srs-dashboard');
    if (!list.length || !dashboard) return;

    const { due, counts } = srsService.getDueItems(list);
    const total = list.length;

    dashboard.classList.remove('hidden');
    document.getElementById('srs-new').textContent = counts.new;
    document.getElementById('srs-learning').textContent = counts.learning;
    document.getElementById('srs-mastered').textContent = counts.mastered;
    document.getElementById('srs-due-badge').textContent = `${due.length} due`;

    const pctNew = total ? (counts.new / total * 100) : 0;
    const pctLearn = total ? (counts.learning / total * 100) : 0;
    const pctMaster = total ? (counts.mastered / total * 100) : 0;
    document.getElementById('srs-bar-new').style.width = `${pctNew}%`;
    document.getElementById('srs-bar-learning').style.width = `${pctLearn}%`;
    document.getElementById('srs-bar-mastered').style.width = `${pctMaster}%`;
}

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
    offlineQueue.init();
    populateLanguageDropdowns();

    // 2. Initialize Managers
    viewManager.init();
    window.addEventListener('view:home', () => updateSRSDashboard());
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
        await srsService.load();
        vocabService.subscribe(() => updateSRSDashboard());
        updateSRSDashboard();

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
                showOnboardingIfNew();
            };
        }
    } catch(e) {
        console.error("Data Load Error:", e);
        if(startBtn) { startBtn.disabled = false; startBtn.innerText = "Retry"; startBtn.onclick = () => window.location.reload(); }
    }
}

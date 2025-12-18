import './services/firebase';
import './styles/main.scss';
import { settingsService } from './services/settingsService';
import { vocabService } from './services/vocabService';
import { dictionaryService } from './services/dictionaryService';
import { auth, signInAnonymously, onAuthStateChanged, googleProvider, signInWithPopup, signOut, update, ref, db } from './services/firebase';
import { flashcardApp } from './components/FlashcardApp';
import { quizApp } from './components/QuizApp';
import { sentencesApp } from './components/SentencesApp';
import { blanksApp } from './components/BlanksApp';
import { audioService } from './services/audioService';

// --- LOGGING ---
const originalLog = console.log;
const originalError = console.error;

function logToScreen(type, args) {
    const box = document.getElementById('error-text');
    const consoleBox = document.getElementById('error-console');
    if (box && consoleBox) {
        const msg = args.map(a => (a instanceof Error ? `${a.message}\n${a.stack}` : (typeof a === 'object' ? JSON.stringify(a) : String(a)))).join(' ');
        box.innerText += `[${type}] ${msg}\n`;
        box.scrollTop = box.scrollHeight;
        if (type === 'ERR') consoleBox.style.display = 'flex'; 
    }
}

console.log = function(...args) { originalLog.apply(console, args); logToScreen('LOG', args); };
console.error = function(...args) { originalError.apply(console, args); logToScreen('ERR', args); };

window.onerror = function(msg, url, line) { 
    console.error(`Global Error: ${msg} (${url}:${line})`); 
};

document.addEventListener('keydown', (e) => { 
    if (e.key === 'F9') { 
        const el = document.getElementById('error-console'); 
        if (el) el.style.display = (el.style.display === 'none' ? 'flex' : 'none'); 
    }
});

// --- PERSISTENCE ---
let savedHistory = {};
try { 
    savedHistory = JSON.parse(localStorage.getItem('polyglot_history') || '{}'); 
} catch(e) {}

window.saveGameHistory = (game, id) => {
    if (!id) return;
    savedHistory[game] = id;
    localStorage.setItem('polyglot_history', JSON.stringify(savedHistory));
};

document.addEventListener('DOMContentLoaded', () => {
    const views = { 
        home: document.getElementById('main-menu'), 
        flashcard: document.getElementById('flashcard-view'), 
        quiz: document.getElementById('quiz-view'), 
        sentences: document.getElementById('sentences-view'), 
        blanks: document.getElementById('blanks-view') 
    };
    
    const iconOut = document.getElementById('icon-user-out');
    const iconIn = document.getElementById('icon-user-in');
    let currentUser = null;

    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        if (user && !user.isAnonymous) {
            if(iconOut) iconOut.classList.add('hidden');
            if(iconIn) { 
                iconIn.classList.remove('hidden'); 
                iconIn.src = user.photoURL; 
            }
        } else {
            if(iconOut) iconOut.classList.remove('hidden');
            if(iconIn) iconIn.classList.add('hidden');
        }
        updateEditPermissions();
    });

    const loginBtn = document.getElementById('user-login-btn');
    if(loginBtn) {
        loginBtn.addEventListener('click', async () => {
            if (currentUser && !currentUser.isAnonymous) { 
                if(confirm("Log out?")) await signOut(auth); 
            } else { 
                try { await signInWithPopup(auth, googleProvider); } catch(e) { console.error(e); } 
            }
        });
    }

    function updateEditPermissions() {
        const isAdmin = currentUser && currentUser.email === 'kevinkicho@gmail.com';
        document.querySelectorAll('#btn-save-vocab, .btn-save-dict, #btn-add-dict').forEach(btn => {
            btn.style.display = isAdmin ? 'block' : 'none';
        });
    }

    function renderView(viewName) {
        audioService.stop();
        if (viewName === 'home') document.body.classList.remove('game-mode');
        else document.body.classList.add('game-mode');

        Object.values(views).forEach(el => el.classList.add('hidden'));
        const target = views[viewName];
        
        if (target) {
            target.classList.remove('hidden');
            const lastId = savedHistory[viewName];
            try {
                if (viewName === 'flashcard') { flashcardApp.mount('flashcard-view'); if(lastId) flashcardApp.goto(lastId); }
                if (viewName === 'quiz') { quizApp.mount('quiz-view'); if(lastId) quizApp.next(lastId); }
                if (viewName === 'sentences') { sentencesApp.mount('sentences-view'); if(lastId) sentencesApp.next(lastId); }
                if (viewName === 'blanks') { blanksApp.mount('blanks-view'); if(lastId) blanksApp.next(lastId); }
            } catch(e) { console.error(`Error mounting ${viewName}:`, e); }
        }
    }

    const bindNav = (id, view) => { 
        const btn = document.getElementById(id); 
        if(btn) btn.addEventListener('click', () => { 
            history.pushState({view}, '', `#${view}`); 
            renderView(view); 
        }); 
    };
    
    bindNav('menu-flashcard-btn', 'flashcard'); 
    bindNav('menu-quiz-btn', 'quiz'); 
    bindNav('menu-sentences-btn', 'sentences'); 
    bindNav('menu-blanks-btn', 'blanks');
    
    window.addEventListener('popstate', (e) => renderView(e.state ? e.state.view : 'home'));
    window.addEventListener('router:home', () => history.back());

    // --- DICTIONARY ---
    const popup = document.getElementById('dictionary-popup');
    const popupContent = document.getElementById('dict-content');
    const popupClose = document.getElementById('dict-close-btn');
    let longPressTimer;
    
    function showDictionary(text) {
        const results = dictionaryService.lookupText(text);
        if (results.length > 0 && popup) {
            popupContent.innerHTML = results.map(data => `
                <div class="flex flex-col gap-2 mb-4 border-b border-gray-100 dark:border-gray-800 pb-4">
                    <div class="flex items-end gap-3"><div class="text-4xl font-black text-indigo-600 dark:text-indigo-400">${data.simp}</div>${data.trad!==data.simp?`<div class="text-xl text-gray-500 font-serif">${data.trad}</div>`:''}</div>
                    <div class="pl-1 space-y-1">
                        <div class="flex items-center gap-2"><span class="text-[10px] text-gray-400 uppercase font-bold w-12">Pinyin</span><span class="text-lg font-medium text-gray-800 dark:text-white">${data.pinyin||'-'}</span></div>
                        <div class="flex items-start gap-2"><span class="text-[10px] text-gray-400 uppercase font-bold w-12 mt-1">English</span><span class="text-sm text-gray-600 dark:text-gray-300 flex-1">${data.en||'-'}</span></div>
                        <div class="flex items-start gap-2"><span class="text-[10px] text-gray-400 uppercase font-bold w-12 mt-1">Korean</span><span class="text-sm text-gray-600 dark:text-gray-300 flex-1">${data.ko||'-'}</span></div>
                    </div>
                </div>
            `).join('');
            popup.classList.remove('hidden');
            setTimeout(() => popup.classList.remove('opacity-0'), 10);
        }
    }
    
    if(popupClose) popupClose.addEventListener('click', () => { 
        popup.classList.add('opacity-0'); 
        setTimeout(() => popup.classList.add('hidden'), 200); 
    });

    const handleStart = (e) => {
        if (!settingsService.get().dictEnabled) return;
        const target = e.target.closest('.quiz-option, #flashcard-text, #quiz-question-box, #blanks-question-box, .user-word, .bank-word');
        if (!target) return;
        longPressTimer = setTimeout(() => showDictionary(target.textContent.trim()), 600);
    };
    
    const handleEnd = () => clearTimeout(longPressTimer);
    
    document.addEventListener('touchstart', handleStart, {passive:true});
    document.addEventListener('touchend', handleEnd);
    document.addEventListener('mousedown', handleStart);
    document.addEventListener('mouseup', handleEnd);

    // --- EDIT MODAL ---
    const editModal = document.getElementById('edit-modal');
    const tabVocabBtn = document.getElementById('tab-vocab-btn');
    const tabDictBtn = document.getElementById('tab-dict-btn');
    const tabVocab = document.getElementById('edit-tab-vocab');
    const tabDict = document.getElementById('edit-tab-dict');
    let currentEditId = null;

    function switchEditTab(tab) {
        if (tab === 'vocab') {
            if(tabVocab) tabVocab.classList.remove('hidden'); 
            if(tabDict) tabDict.classList.add('hidden');
            if(tabVocabBtn) { tabVocabBtn.classList.replace('bg-gray-200', 'bg-indigo-600'); tabVocabBtn.classList.replace('text-gray-600', 'text-white'); }
            if(tabDictBtn) { tabDictBtn.classList.replace('bg-indigo-600', 'bg-gray-200'); tabDictBtn.classList.replace('text-white', 'text-gray-600'); }
        } else {
            if(tabVocab) tabVocab.classList.add('hidden'); 
            if(tabDict) tabDict.classList.remove('hidden');
            if(tabDictBtn) { tabDictBtn.classList.replace('bg-gray-200', 'bg-indigo-600'); tabDictBtn.classList.replace('text-gray-600', 'text-white'); }
            if(tabVocabBtn) { tabVocabBtn.classList.replace('bg-indigo-600', 'bg-gray-200'); tabVocabBtn.classList.replace('text-white', 'text-gray-600'); }
        }
    }
    
    if(tabVocabBtn) tabVocabBtn.addEventListener('click', () => switchEditTab('vocab'));
    if(tabDictBtn) tabDictBtn.addEventListener('click', () => switchEditTab('dict'));
    
    if(document.getElementById('edit-close-btn')) {
        document.getElementById('edit-close-btn').addEventListener('click', () => { 
            editModal.classList.add('opacity-0'); 
            setTimeout(()=>editModal.classList.add('hidden'), 200); 
        });
    }

    function populateVocabForm(item) {
        const form = document.getElementById('edit-vocab-dynamic-form');
        if(!form) return;
        form.innerHTML = '';
        
        Object.keys(item).sort().forEach(key => {
            if(typeof item[key] === 'object') return; 
            
            const div = document.createElement('div');
            const label = document.createElement('label');
            label.className = "text-xs font-bold uppercase text-gray-400 block mb-1";
            label.textContent = key;
            
            const input = document.createElement('input');
            input.className = "w-full p-3 bg-gray-100 dark:bg-black rounded-xl border border-transparent focus:border-indigo-500 outline-none text-gray-800 dark:text-white vocab-edit-input";
            input.value = item[key] || '';
            input.dataset.key = key;
            
            div.appendChild(label); 
            div.appendChild(input); 
            form.appendChild(div);
        });
    }

    function populateDictionaryEdit(textToScan) {
        const listContainer = document.getElementById('edit-dict-list');
        listContainer.innerHTML = '<div class="text-center text-gray-400 py-4">Scanning...</div>';
        
        const entries = dictionaryService.lookupText(textToScan);
        listContainer.innerHTML = '';
        
        if (entries.length === 0) { 
            listContainer.innerHTML = '<div class="text-center text-gray-400 py-4">No entries found.</div>'; 
            return; 
        }

        entries.forEach(entry => {
            const div = document.createElement('div');
            div.className = "bg-gray-100 dark:bg-black/20 p-4 rounded-xl border border-gray-200 dark:border-gray-700";
            div.innerHTML = `
                <div class="flex justify-between items-center mb-2"><span class="text-2xl font-black text-indigo-600 dark:text-indigo-400">${entry.simp}</span><span class="text-xs font-mono text-gray-400 bg-gray-200 dark:bg-gray-800 px-2 py-1 rounded">ID: ${entry.id || '?'}</span></div>
                <div class="grid grid-cols-1 gap-2 text-sm">
                    <input class="p-2 rounded bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 dark:text-white" value="${entry.pinyin || ''}" placeholder="Pinyin" id="dict-p-${entry.id}">
                    <input class="p-2 rounded bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 dark:text-white" value="${entry.en || ''}" placeholder="English" id="dict-e-${entry.id}">
                    <input class="p-2 rounded bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 dark:text-white" value="${entry.ko || ''}" placeholder="Korean" id="dict-k-${entry.id}">
                    <button class="btn-save-dict w-full mt-2 py-2 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600 transition-colors" data-id="${entry.id}">SAVE ENTRY</button>
                </div>
            `;
            listContainer.appendChild(div);
        });

        document.querySelectorAll('.btn-save-dict').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.dataset.id;
                if(!id) return;
                const p = document.getElementById(`dict-p-${id}`).value;
                const en = document.getElementById(`dict-e-${id}`).value;
                const ko = document.getElementById(`dict-k-${id}`).value;
                try {
                    await update(ref(db, `dictionary/${id}`), { p, e, k: ko });
                    alert('Saved!'); dictionaryService.fetchData();
                } catch(err) { console.error(err); alert('Error'); }
            });
        });
        updateEditPermissions();
    }

    document.addEventListener('click', (e) => {
        if (e.target.closest('.game-edit-btn')) {
            let app = null;
            if (!views.flashcard.classList.contains('hidden')) app = flashcardApp;
            if (!views.quiz.classList.contains('hidden')) app = quizApp;
            if (!views.sentences.classList.contains('hidden')) app = sentencesApp;
            if (!views.blanks.classList.contains('hidden')) app = blanksApp;

            if (app) {
                let item = app.currentData && app.currentData.target ? app.currentData.target : (app.currentData || (app.currentIndex!==undefined ? vocabService.getAll()[app.currentIndex] : null));
                
                if (item) {
                    currentEditId = item.id;
                    editModal.classList.remove('hidden');
                    setTimeout(()=>editModal.classList.remove('opacity-0'), 10);
                    switchEditTab('vocab');
                    
                    if(document.getElementById('edit-vocab-id')) document.getElementById('edit-vocab-id').textContent = `ID: ${item.id}`;
                    
                    populateVocabForm(item);
                    
                    let combinedText = (item.front.main||"") + (item.back.sentenceTarget||"") + (item.front.sub||"") + (item.back.definition||"");
                    if (app.currentData && app.currentData.choices) { 
                        app.currentData.choices.forEach(c => combinedText += (c.front.main||"") + (c.back.definition||"")); 
                    }
                    if (app.shuffledWords) app.shuffledWords.forEach(w => combinedText += w.word);
                    
                    populateDictionaryEdit(combinedText);
                    updateEditPermissions();
                }
            }
        }
    });

    if(document.getElementById('btn-save-vocab')) {
        document.getElementById('btn-save-vocab').addEventListener('click', async () => {
            if (!currentEditId) return;
            const updates = {};
            document.querySelectorAll('.vocab-edit-input').forEach(input => { updates[input.dataset.key] = input.value; });
            try {
                await update(ref(db, `vocab/${currentEditId}`), updates);
                alert('Saved All!'); await vocabService.fetchData();
                if (!views.flashcard.classList.contains('hidden')) flashcardApp.refresh();
            } catch(e) { console.error(e); alert('Error saving.'); }
        });
    }

    // --- SETTINGS ---
    const settingsModal = document.getElementById('settings-modal');
    
    const openSettings = () => { 
        loadSettingsToUI(); 
        settingsModal.classList.remove('hidden'); 
        setTimeout(()=>settingsModal.classList.remove('opacity-0'), 10); 
    };
    
    const closeSettings = () => { 
        settingsModal.classList.add('opacity-0'); 
        setTimeout(()=>settingsModal.classList.add('hidden'), 200); 
    };
    
    document.addEventListener('click', (e) => { if(e.target.closest('.game-settings-btn')) openSettings(); });
    
    if(document.getElementById('settings-open-btn')) document.getElementById('settings-open-btn').addEventListener('click', openSettings);
    if(document.getElementById('header-settings-btn')) document.getElementById('header-settings-btn').addEventListener('click', openSettings);
    if(document.getElementById('modal-done-btn')) document.getElementById('modal-done-btn').addEventListener('click', closeSettings);

    function loadSettingsToUI() {
        const s = settingsService.get();
        const setVal = (id, val) => { const el = document.getElementById(id); if(el) el.value = val; };
        const setChk = (id, val) => { const el = document.getElementById(id); if(el) el.checked = val; };
        
        setVal('target-select', s.targetLang); setVal('origin-select', s.originLang);
        setChk('toggle-dark', s.darkMode); setChk('toggle-audio', s.autoPlay);
        setChk('toggle-vocab', s.showVocab); setChk('toggle-sentence', s.showSentence); setChk('toggle-english', s.showEnglish);
        setChk('toggle-dict-enable', s.dictEnabled); setChk('toggle-dict-audio', s.dictAudio);
        setChk('toggle-quiz-audio', s.quizAnswerAudio); setChk('toggle-quiz-autoplay-correct', s.quizAutoPlayCorrect); setChk('toggle-quiz-wait', s.quizWaitAudio);
        setChk('toggle-sent-audio', s.sentencesWordAudio); setChk('toggle-sent-wait', s.sentWaitAudio);
        setChk('toggle-blanks-audio', s.blanksAnswerAudio); setChk('toggle-blanks-wait', s.blanksWaitAudio);
    }

    function bindSetting(id, key, callback) {
        const el = document.getElementById(id);
        if(!el) return;
        el.addEventListener('change', (e) => {
            settingsService.set(key, e.target.type === 'checkbox' ? e.target.checked : e.target.value);
            if(callback) callback();
        });
    }
    
    function updateAllApps() { if(!views.flashcard.classList.contains('hidden')) flashcardApp.refresh(); }
    
    bindSetting('target-select', 'targetLang', updateAllApps);
    bindSetting('origin-select', 'originLang', updateAllApps);
    bindSetting('toggle-dark', 'darkMode', () => document.documentElement.classList.toggle('dark'));
    bindSetting('toggle-audio', 'autoPlay');
    bindSetting('toggle-vocab', 'showVocab', updateAllApps);
    bindSetting('toggle-sentence', 'showSentence', updateAllApps);
    bindSetting('toggle-english', 'showEnglish', updateAllApps);
    bindSetting('toggle-dict-enable', 'dictEnabled');
    bindSetting('toggle-dict-audio', 'dictAudio');
    bindSetting('toggle-quiz-audio', 'quizAnswerAudio');
    bindSetting('toggle-quiz-autoplay-correct', 'quizAutoPlayCorrect');
    bindSetting('toggle-quiz-wait', 'quizWaitAudio');
    bindSetting('toggle-sent-audio', 'sentencesWordAudio');
    bindSetting('toggle-sent-wait', 'sentWaitAudio');
    bindSetting('toggle-blanks-audio', 'blanksAnswerAudio');
    bindSetting('toggle-blanks-wait', 'blanksWaitAudio');

    const accordions = [
        { btn: 'dict-accordion-btn', content: 'dict-options', arrow: 'accordion-arrow-dict' },
        { btn: 'display-accordion-btn', content: 'display-options', arrow: 'accordion-arrow-1' },
        { btn: 'quiz-accordion-btn', content: 'quiz-options', arrow: 'accordion-arrow-3' },
        { btn: 'sent-accordion-btn', content: 'sent-options', arrow: 'accordion-arrow-sent' },
        { btn: 'blanks-accordion-btn', content: 'blanks-options', arrow: 'accordion-arrow-blanks' }
    ];
    
    accordions.forEach(acc => {
        const btn = document.getElementById(acc.btn); 
        const content = document.getElementById(acc.content); 
        const arrow = document.getElementById(acc.arrow);
        if(btn) btn.addEventListener('click', () => { content.classList.toggle('open'); arrow.classList.toggle('rotate'); });
    });

    // --- INIT ---
    async function initApp() {
        try {
            const saved = settingsService.get();
            loadSettingsToUI();
            if(saved.darkMode) document.documentElement.classList.add('dark');
            await signInAnonymously(auth);
            
            // Explicit check for fetchData
            if (typeof vocabService.fetchData === 'function') {
                await Promise.all([vocabService.fetchData(), dictionaryService.fetchData()]);
            } else {
                console.error("vocabService.fetchData is undefined", vocabService);
            }

            const startBtn = document.getElementById('start-app-btn');
            if(startBtn) {
                startBtn.disabled = false;
                startBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                startBtn.classList.add('bg-indigo-600', 'text-white');
                startBtn.innerText = "Start Learning";
                startBtn.onclick = () => {
                    const s = new SpeechSynthesisUtterance(''); window.speechSynthesis.speak(s);
                    document.getElementById('splash-screen').style.display = 'none';
                    document.body.classList.remove('is-loading');
                    renderView('home');
                };
            }
        } catch(e) { console.error("Init Error", e); }
    }
    
    initApp();
    
    const fsBtn = document.getElementById('fullscreen-btn');
    if(fsBtn) fsBtn.addEventListener('click', () => (!document.fullscreenElement) ? document.documentElement.requestFullscreen() : document.exitFullscreen());
});

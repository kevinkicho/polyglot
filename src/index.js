import './services/firebase';
import './styles/main.scss';
import { settingsService } from './services/settingsService';
import { vocabService } from './services/vocabService';
import { dictionaryService } from './services/dictionaryService';
import { auth, signInAnonymously, onAuthStateChanged, googleProvider, signInWithPopup, signOut, update, ref, get, child, db } from './services/firebase';
import { flashcardApp } from './components/FlashcardApp';
import { quizApp } from './components/QuizApp';
import { sentencesApp } from './components/SentencesApp';
import { blanksApp } from './components/BlanksApp';
import { audioService } from './services/audioService';

// --- PERSISTENCE ---
const savedHistory = JSON.parse(localStorage.getItem('polyglot_history') || '{}');
window.saveGameHistory = (game, id) => {
    if (!id) return;
    savedHistory[game] = id;
    localStorage.setItem('polyglot_history', JSON.stringify(savedHistory));
};

document.addEventListener('DOMContentLoaded', () => {
    
    // --- UI ELEMENTS ---
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

    // --- AUTH LOGIC ---
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
        const saveBtns = document.querySelectorAll('#btn-save-vocab, .btn-save-dict, #btn-add-dict');
        saveBtns.forEach(btn => {
            if(btn.id === 'btn-add-dict') btn.style.display = isAdmin ? 'block' : 'none';
            else btn.disabled = !isAdmin;
        });
    }

    // --- ROUTER ---
    function renderView(viewName) {
        audioService.stop();
        
        if (viewName === 'home') document.body.classList.remove('game-mode');
        else document.body.classList.add('game-mode');

        Object.values(views).forEach(el => { if(el) el.classList.add('hidden'); });
        const target = views[viewName];
        
        if (target) {
            target.classList.remove('hidden');
            const lastId = savedHistory[viewName];
            
            if (viewName === 'flashcard') { flashcardApp.mount('flashcard-view'); if(lastId) flashcardApp.goto(lastId); }
            if (viewName === 'quiz') { quizApp.mount('quiz-view'); if(lastId) quizApp.next(lastId); }
            if (viewName === 'sentences') { sentencesApp.mount('sentences-view'); if(lastId) sentencesApp.next(lastId); }
            if (viewName === 'blanks') { blanksApp.mount('blanks-view'); if(lastId) blanksApp.next(lastId); }
        }
    }

    function navigateTo(viewName) { 
        history.pushState({ view: viewName }, '', `#${viewName}`); 
        renderView(viewName); 
    }
    
    window.addEventListener('popstate', (e) => renderView(e.state ? e.state.view : 'home'));
    window.addEventListener('router:home', () => history.back());

    const bindNav = (id, view) => { 
        const btn = document.getElementById(id); 
        if(btn) btn.addEventListener('click', () => navigateTo(view)); 
    };
    bindNav('menu-flashcard-btn', 'flashcard');
    bindNav('menu-quiz-btn', 'quiz');
    bindNav('menu-sentences-btn', 'sentences');
    bindNav('menu-blanks-btn', 'blanks');

    // --- DICTIONARY POPUP (Viewer) ---
    const popup = document.getElementById('dictionary-popup');
    const popupContent = document.getElementById('dict-content');
    const popupClose = document.getElementById('dict-close-btn');
    let longPressTimer = null;
    let startX = 0, startY = 0;

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
        if (e.type === 'touchstart') { startX = e.touches[0].clientX; startY = e.touches[0].clientY; } 
        else { startX = e.clientX; startY = e.clientY; }
        longPressTimer = setTimeout(() => { showDictionary(target.textContent.trim()); }, 600);
    };
    const handleMove = (e) => {
        if (!longPressTimer) return;
        let cX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
        let cY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
        if (Math.abs(cX - startX) > 10 || Math.abs(cY - startY) > 10) { clearTimeout(longPressTimer); longPressTimer = null; }
    };
    const handleEnd = () => { if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; } };
    document.addEventListener('touchstart', handleStart, {passive:true});
    document.addEventListener('touchend', handleEnd);
    document.addEventListener('mousedown', handleStart);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('touchmove', handleMove);

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
    if(document.getElementById('edit-close-btn')) document.getElementById('edit-close-btn').addEventListener('click', () => { editModal.classList.add('opacity-0'); setTimeout(()=>editModal.classList.add('hidden'), 200); });

    // --- POPULATE DICTIONARY EDIT LIST ---
    function populateDictionaryEdit(textToScan) {
        const listContainer = document.getElementById('edit-dict-list');
        listContainer.innerHTML = '<div class="text-center text-gray-400 py-4">Scanning...</div>';
        
        // Scan full text
        const entries = dictionaryService.lookupText(textToScan);
        
        listContainer.innerHTML = '';
        if (entries.length === 0) {
            listContainer.innerHTML = '<div class="text-center text-gray-400 py-4">No dictionary entries found.</div>';
            return;
        }

        entries.forEach(entry => {
            const div = document.createElement('div');
            div.className = "bg-gray-100 dark:bg-black/20 p-4 rounded-xl border border-gray-200 dark:border-gray-700";
            div.innerHTML = `
                <div class="flex justify-between items-center mb-2">
                    <span class="text-2xl font-black text-indigo-600 dark:text-indigo-400">${entry.simp}</span>
                    <div class="flex items-center gap-2">
                        <span class="text-xs font-mono text-gray-400">ID: ${entry.id || '?'}</span>
                    </div>
                </div>
                <div class="grid grid-cols-1 gap-2 text-sm">
                    <input class="p-2 rounded bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 dark:text-white" value="${entry.pinyin || ''}" placeholder="Pinyin" id="dict-p-${entry.id}">
                    <input class="p-2 rounded bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 dark:text-white" value="${entry.en || ''}" placeholder="English" id="dict-e-${entry.id}">
                    <input class="p-2 rounded bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 dark:text-white" value="${entry.ko || ''}" placeholder="Korean" id="dict-k-${entry.id}">
                    <button class="btn-save-dict w-full mt-2 py-2 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600 transition-colors" data-id="${entry.id}">SAVE ENTRY</button>
                </div>
            `;
            listContainer.appendChild(div);
        });

        // Attach Listeners
        document.querySelectorAll('.btn-save-dict').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.dataset.id;
                if(!id) return;
                const p = document.getElementById(`dict-p-${id}`).value;
                const en = document.getElementById(`dict-e-${id}`).value;
                const ko = document.getElementById(`dict-k-${id}`).value;
                try {
                    await update(ref(db, `dictionary/${id}`), { p, e, k: ko });
                    alert('Saved!');
                    dictionaryService.fetchData();
                } catch(err) { console.error(err); alert('Save failed'); }
            });
        });
        updateEditPermissions();
    }

    // Global Edit Button Listener
    document.addEventListener('click', (e) => {
        if (e.target.closest('.game-edit-btn')) {
            let app = null;
            if (!views.flashcard.classList.contains('hidden')) app = flashcardApp;
            if (!views.quiz.classList.contains('hidden')) app = quizApp;
            if (!views.sentences.classList.contains('hidden')) app = sentencesApp;
            if (!views.blanks.classList.contains('hidden')) app = blanksApp;

            if (app) {
                // Get Main Item
                let item = app.currentData && app.currentData.target ? app.currentData.target : (app.currentData || (app.currentIndex !== undefined ? vocabService.getAll()[app.currentIndex] : null));
                
                if (item) {
                    currentEditId = item.id;
                    editModal.classList.remove('hidden');
                    setTimeout(()=>editModal.classList.remove('opacity-0'), 10);
                    switchEditTab('vocab');
                    
                    document.getElementById('edit-vocab-id').textContent = `ID: ${item.id}`;
                    document.getElementById('inp-vocab-target').value = item.front.main;
                    document.getElementById('inp-vocab-origin').value = item.back.definition;
                    document.getElementById('inp-vocab-sentence-t').value = item.back.sentenceTarget || '';
                    document.getElementById('inp-vocab-sentence-o').value = item.back.sentenceOrigin || '';
                    
                    // --- GATHER TEXT FROM ENTIRE VIEW ---
                    let combinedText = (item.front.main || "") + (item.back.sentenceTarget || "") + (item.front.sub || "") + (item.back.definition || "");
                    
                    // Add Choices/Bank text if available
                    if (app.currentData && app.currentData.choices) {
                        app.currentData.choices.forEach(c => {
                            combinedText += (c.front.main || "") + (c.back.definition || "");
                        });
                    }
                    if (app.shuffledWords) { // Sentences App
                        app.shuffledWords.forEach(w => combinedText += w.word);
                    }

                    populateDictionaryEdit(combinedText);
                    updateEditPermissions();
                }
            }
        }
    });

    const btnSaveVocab = document.getElementById('btn-save-vocab');
    if(btnSaveVocab) {
        btnSaveVocab.addEventListener('click', async () => {
            if (!currentEditId) return;
            const settings = settingsService.get();
            const updates = {};
            updates[`${settings.targetLang}`] = document.getElementById('inp-vocab-target').value;
            updates[`${settings.originLang}`] = document.getElementById('inp-vocab-origin').value;
            updates[`${settings.targetLang}_ex`] = document.getElementById('inp-vocab-sentence-t').value;
            updates[`${settings.originLang}_ex`] = document.getElementById('inp-vocab-sentence-o').value;

            try {
                await update(ref(db, `vocab/${currentEditId}`), updates);
                alert('Saved!');
                await vocabService.fetchData();
                if (!views.flashcard.classList.contains('hidden')) flashcardApp.refresh();
            } catch(e) { console.error(e); alert('Error saving.'); }
        });
    }

    // --- SETTINGS ---
    const settingsModal = document.getElementById('settings-modal');
    const openSettings = () => { settingsModal.classList.remove('hidden'); setTimeout(()=>settingsModal.classList.remove('opacity-0'), 10); };
    const closeSettings = () => { settingsModal.classList.add('opacity-0'); setTimeout(()=>settingsModal.classList.add('hidden'), 200); };
    if(document.getElementById('settings-open-btn')) document.getElementById('settings-open-btn').addEventListener('click', openSettings);
    if(document.getElementById('modal-done-btn')) document.getElementById('modal-done-btn').addEventListener('click', closeSettings);
    document.addEventListener('click', (e) => { if(e.target.closest('.game-settings-btn')) openSettings(); });

    // Updates
    function updateAllApps() { if(!views.flashcard.classList.contains('hidden')) flashcardApp.refresh(); }
    if(document.getElementById('toggle-vocab')) document.getElementById('toggle-vocab').addEventListener('change', updateAllApps);
    if(document.getElementById('target-select')) document.getElementById('target-select').addEventListener('change', (e) => { settingsService.setTarget(e.target.value); updateAllApps(); });

    // --- SETTINGS INIT (Apply saved state to inputs) ---
    function loadSettingsToUI() {
        const s = settingsService.get();
        const setVal = (id, val) => { const el = document.getElementById(id); if(el) el.value = val; };
        const setChk = (id, val) => { const el = document.getElementById(id); if(el) el.checked = val; };

        setVal('target-select', s.targetLang);
        setVal('origin-select', s.originLang);
        setChk('toggle-dark', s.darkMode);
        setChk('toggle-audio', s.autoPlay);
        
        setChk('toggle-vocab', s.showVocab);
        setChk('toggle-sentence', s.showSentence);
        setChk('toggle-english', s.showEnglish);
        
        setChk('toggle-dict-enable', s.dictEnabled);
        setChk('toggle-dict-audio', s.dictAudio);
        
        setChk('toggle-quiz-audio', s.quizAnswerAudio);
        setChk('toggle-quiz-autoplay-correct', s.quizAutoPlayCorrect);
        
        setChk('toggle-sent-audio', s.sentencesWordAudio);
        setChk('toggle-blanks-audio', s.blanksAnswerAudio);
    }

    const accordions = [
        { btn: 'dict-accordion-btn', content: 'dict-options', arrow: 'accordion-arrow-dict' },
        { btn: 'display-accordion-btn', content: 'display-options', arrow: 'accordion-arrow-1' },
        { btn: 'quiz-accordion-btn', content: 'quiz-options', arrow: 'accordion-arrow-3' },
        { btn: 'sent-accordion-btn', content: 'sent-options', arrow: 'accordion-arrow-sent' },
        { btn: 'blanks-accordion-btn', content: 'blanks-options', arrow: 'accordion-arrow-blanks' }
    ];
    accordions.forEach(acc => {
        const btn = document.getElementById(acc.btn); const content = document.getElementById(acc.content); const arrow = document.getElementById(acc.arrow);
        if(btn && content && arrow) {
            btn.addEventListener('click', () => { content.classList.toggle('open'); arrow.classList.toggle('rotate'); });
        }
    });

    // --- INIT ---
    async function initApp() {
        try {
            const saved = settingsService.get();
            loadSettingsToUI(); // Apply settings to UI
            
            if(saved.darkMode) document.documentElement.classList.add('dark');
            await signInAnonymously(auth);
            await Promise.all([vocabService.fetchData(), dictionaryService.fetchData()]);
            
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
        } catch(e) { console.error(e); }
    }
    initApp();
    const fsBtn = document.getElementById('fullscreen-btn');
    if(fsBtn) fsBtn.addEventListener('click', () => (!document.fullscreenElement) ? document.documentElement.requestFullscreen() : document.exitFullscreen());
});

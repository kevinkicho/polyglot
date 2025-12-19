import './services/firebase';
import './styles/main.scss';
import { settingsService } from './services/settingsService';
import { vocabService } from './services/vocabService';
import { dictionaryService } from './services/dictionaryService';
import { auth, onAuthStateChanged, googleProvider, signInWithPopup, signOut, update, ref, db } from './services/firebase';
import { flashcardApp } from './components/FlashcardApp';
import { quizApp } from './components/QuizApp';
import { sentencesApp } from './components/SentencesApp';
import { blanksApp } from './components/BlanksApp';
import { audioService } from './services/audioService';

// --- PWA REGISTRATION ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(reg => {
            console.log('SW Registered:', reg.scope);
        }).catch(err => {
            console.log('SW Registration failed:', err);
        });
    });
}

// --- PERSISTENCE ---
let savedHistory = {};
try { savedHistory = JSON.parse(localStorage.getItem('polyglot_history') || '{}'); } catch (e) { savedHistory = {}; }
window.saveGameHistory = (game, id) => { if (id) { savedHistory[game] = id; localStorage.setItem('polyglot_history', JSON.stringify(savedHistory)); } };

document.addEventListener('DOMContentLoaded', () => {
    
    // --- UI REFS ---
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

    // --- AUTH ---
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        if (user && !user.isAnonymous) {
            if(iconOut) iconOut.classList.add('hidden');
            if(iconIn) { iconIn.classList.remove('hidden'); iconIn.src = user.photoURL; }
        } else {
            if(iconOut) iconOut.classList.remove('hidden');
            if(iconIn) iconIn.classList.add('hidden');
        }
        updateEditPermissions();
    });

    const loginBtn = document.getElementById('user-login-btn');
    if(loginBtn) loginBtn.addEventListener('click', async () => {
        if (currentUser && !currentUser.isAnonymous) { if(confirm("Log out?")) await signOut(auth); } 
        else { try { await signInWithPopup(auth, googleProvider); } catch(e) { console.error(e); } }
    });

    function updateEditPermissions() {
        const isAdmin = currentUser && currentUser.email === 'kevinkicho@gmail.com';
        document.querySelectorAll('#btn-save-vocab, .btn-save-dict, #btn-add-dict').forEach(btn => {
            if(btn.id === 'btn-add-dict') btn.style.display = isAdmin ? 'block' : 'none';
            else { btn.disabled = !isAdmin; btn.style.display = isAdmin ? 'block' : 'none'; }
        });
    }

    // --- ROUTER ---
    function renderView(viewName) {
        audioService.stop(); 
        if (viewName === 'home') document.body.classList.remove('game-mode');
        else document.body.classList.add('game-mode');

        Object.values(views).forEach(el => el.classList.add('hidden'));
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

    const bindNav = (id, view) => { const btn = document.getElementById(id); if(btn) btn.addEventListener('click', () => { history.pushState({view}, '', `#${view}`); renderView(view); }); };
    bindNav('menu-flashcard-btn', 'flashcard'); bindNav('menu-quiz-btn', 'quiz'); bindNav('menu-sentences-btn', 'sentences'); bindNav('menu-blanks-btn', 'blanks');
    window.addEventListener('popstate', (e) => renderView(e.state ? e.state.view : 'home'));
    window.addEventListener('router:home', () => history.back());

    // --- DICTIONARY ---
    const popup = document.getElementById('dictionary-popup');
    const popupContent = document.getElementById('dict-content');
    const popupClose = document.getElementById('dict-close-btn');
    let longPressTimer;
    let startX = 0, startY = 0;

    function showDictionary(text) {
        const results = dictionaryService.lookupText(text);
        if (results.length > 0 && popup) {
            // FIX: Added (|| '') to fallbacks to prevent "undefined"
            popupContent.innerHTML = results.map(data => `
                <div class="dict-entry-row flex flex-col gap-2 mb-4 border-b border-gray-100 dark:border-gray-800 pb-4">
                    <div class="flex items-end gap-3">
                        <div class="dict-headword text-4xl font-black text-indigo-600 dark:text-indigo-400 cursor-pointer hover:opacity-80">${data.s || '?'}</div>
                        ${(data.t && data.t !== data.s) ? `<div class="text-xl text-gray-500 font-serif">${data.t}</div>` : ''}
                    </div>
                    <div class="pl-1 space-y-1">
                        <div class="flex items-center gap-2"><span class="text-[10px] text-gray-400 uppercase font-bold w-12">Pinyin</span><span class="text-lg font-medium text-gray-800 dark:text-white">${data.p || '-'}</span></div>
                        <div class="flex items-start gap-2"><span class="text-[10px] text-gray-400 uppercase font-bold w-12 mt-1">English</span><span class="text-sm text-gray-600 dark:text-gray-300 flex-1">${data.e || '-'}</span></div>
                        <div class="flex items-start gap-2"><span class="text-[10px] text-gray-400 uppercase font-bold w-12 mt-1">Korean</span><span class="text-sm text-gray-600 dark:text-gray-300 flex-1">${data.ko || '-'}</span></div>
                    </div>
                </div>
            `).join('');
            
            if (settingsService.get().dictClickAudio) {
                popupContent.querySelectorAll('.dict-headword').forEach(el => {
                    el.addEventListener('click', (e) => { e.stopPropagation(); audioService.speak(el.textContent.trim(), 'zh'); });
                });
            }

            popup.classList.remove('hidden');
            setTimeout(() => popup.classList.remove('opacity-0'), 10);
        }
    }
    if(popupClose) popupClose.addEventListener('click', () => { popup.classList.add('opacity-0'); setTimeout(() => popup.classList.add('hidden'), 200); });

    const handleStart = (e) => {
        if (!settingsService.get().dictEnabled) return;
        const target = e.target.closest('.quiz-option, #flashcard-text, #quiz-question-box, #blanks-question-box, .user-word, .bank-word');
        if (!target) return;
        if (e.type === 'touchstart') { startX = e.touches[0].clientX; startY = e.touches[0].clientY; } else { startX = e.clientX; startY = e.clientY; }
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
            tabVocab.classList.remove('hidden'); tabDict.classList.add('hidden');
            tabVocabBtn.classList.replace('bg-gray-200', 'bg-indigo-600'); tabVocabBtn.classList.replace('text-gray-600', 'text-white');
            tabDictBtn.classList.replace('bg-indigo-600', 'bg-gray-200'); tabDictBtn.classList.replace('text-white', 'text-gray-600');
        } else {
            tabVocab.classList.add('hidden'); tabDict.classList.remove('hidden');
            tabDictBtn.classList.replace('bg-gray-200', 'bg-indigo-600'); tabDictBtn.classList.replace('text-gray-600', 'text-white');
            tabVocabBtn.classList.replace('bg-indigo-600', 'bg-gray-200'); tabVocabBtn.classList.replace('text-white', 'text-gray-600');
        }
    }
    if(tabVocabBtn) tabVocabBtn.addEventListener('click', () => switchEditTab('vocab'));
    if(tabDictBtn) tabDictBtn.addEventListener('click', () => switchEditTab('dict'));
    document.getElementById('edit-close-btn').addEventListener('click', () => { editModal.classList.add('opacity-0'); setTimeout(()=>editModal.classList.add('hidden'), 200); });

    // --- DICT EDIT ---
    function populateDictionaryEdit(textToScan) {
        const listContainer = document.getElementById('edit-dict-list');
        listContainer.innerHTML = '<div class="text-center text-gray-400 py-4">Scanning...</div>';
        const entries = dictionaryService.lookupText(textToScan);
        listContainer.innerHTML = '';
        if (entries.length === 0) { listContainer.innerHTML = '<div class="text-center text-gray-400 py-4">No entries found.</div>'; return; }

        entries.forEach(entry => {
            const div = document.createElement('div');
            div.className = "bg-gray-100 dark:bg-black/20 p-4 rounded-xl border border-gray-200 dark:border-gray-700";
            div.innerHTML = `
                <div class="flex justify-between items-center mb-2">
                    <span class="text-2xl font-black text-indigo-600 dark:text-indigo-400">${entry.s}</span>
                    <span class="text-xs font-mono text-gray-400 bg-gray-200 dark:bg-gray-800 px-2 py-1 rounded">ID: ${entry.id || '?'}</span>
                </div>
                <div class="grid grid-cols-1 gap-2 text-sm">
                    <input class="p-2 rounded bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 dark:text-white" value="${entry.p || ''}" placeholder="Pinyin" id="dict-p-${entry.id}">
                    <input class="p-2 rounded bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 dark:text-white" value="${entry.e || ''}" placeholder="English" id="dict-e-${entry.id}">
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
                    alert('Saved!');
                    dictionaryService.fetchData();
                } catch(err) { console.error(err); alert('Error'); }
            });
        });
        updateEditPermissions();
    }

    // --- EXPANDED VOCAB EDIT ---
    function renderVocabEditFields(vocabData) {
        const container = document.getElementById('edit-vocab-fields');
        container.innerHTML = '';
        
        // FIX: Using exact keys from your JSON (furi, roma, pin, tr)
        const languages = [
            { code: 'en', label: 'English', extra: [] },
            { code: 'ja', label: 'Japanese', extra: ['furi', 'roma'] }, // ja_furi, ja_roma
            { code: 'zh', label: 'Chinese', extra: ['pin'] },           // zh_pin
            { code: 'ko', label: 'Korean', extra: ['roma'] },           // ko_roma
            { code: 'ru', label: 'Russian', extra: ['tr'] },            // ru_tr
            { code: 'de', label: 'German', extra: [] },
            { code: 'fr', label: 'French', extra: [] },
            { code: 'es', label: 'Spanish', extra: [] },
            { code: 'it', label: 'Italian', extra: [] },
            { code: 'pt', label: 'Portuguese', extra: [] }
        ];

        languages.forEach(lang => {
            const vocabVal = vocabData[lang.code] || '';
            const sentenceVal = vocabData[`${lang.code}_ex`] || '';
            
            // Build extra fields inputs
            let extrasHtml = '';
            if (lang.extra && lang.extra.length > 0) {
                extrasHtml = `<div class="grid grid-cols-2 gap-2 mt-2">`;
                lang.extra.forEach(field => {
                    const key = `${lang.code}_${field}`; // e.g., ja_furi
                    const val = vocabData[key] || '';
                    extrasHtml += `
                        <div>
                            <label class="text-[9px] font-bold uppercase text-gray-500 dark:text-gray-500">${field}</label>
                            <input type="text" data-field="${key}" value="${val}" class="inp-vocab-field w-full p-1.5 bg-white dark:bg-black/40 rounded border border-gray-200 dark:border-gray-600 text-xs dark:text-white focus:border-indigo-500 outline-none">
                        </div>
                    `;
                });
                extrasHtml += `</div>`;
            }

            const html = `
                <div class="bg-gray-50 dark:bg-black/20 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
                    <h4 class="text-xs font-black text-indigo-500 uppercase mb-2 border-b border-gray-200 dark:border-gray-700 pb-1 flex justify-between">
                        ${lang.label} <span class="text-[9px] text-gray-400 font-mono">${lang.code}</span>
                    </h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label class="text-[10px] font-bold uppercase text-gray-400">Word</label>
                            <input type="text" data-field="${lang.code}" value="${vocabVal}" class="inp-vocab-field w-full mt-1 p-2 bg-white dark:bg-black rounded-lg border border-transparent focus:border-indigo-500 outline-none text-sm dark:text-white shadow-sm">
                            ${extrasHtml}
                        </div>
                        <div>
                            <label class="text-[10px] font-bold uppercase text-gray-400">Example</label>
                            <textarea data-field="${lang.code}_ex" rows="3" class="inp-vocab-field w-full mt-1 p-2 bg-white dark:bg-black rounded-lg border border-transparent focus:border-indigo-500 outline-none text-sm dark:text-white shadow-sm">${sentenceVal}</textarea>
                        </div>
                    </div>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', html);
        });
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
                    const fullData = vocabService.getAll().find(v => v.id == item.id);

                    editModal.classList.remove('hidden');
                    setTimeout(()=>editModal.classList.remove('opacity-0'), 10);
                    switchEditTab('vocab');
                    
                    document.getElementById('edit-vocab-id').textContent = `ID: ${item.id}`;
                    renderVocabEditFields(fullData);
                    
                    const scanText = (fullData.ja||'') + (fullData.ja_ex||'') + (fullData.zh||'') + (fullData.ko||'');
                    populateDictionaryEdit(scanText);
                    updateEditPermissions();
                }
            }
        }
    });

    const btnSaveVocab = document.getElementById('btn-save-vocab');
    if(btnSaveVocab) {
        btnSaveVocab.addEventListener('click', async () => {
            if (!currentEditId) return;
            const updates = {};
            document.querySelectorAll('.inp-vocab-field').forEach(input => {
                updates[input.dataset.field] = input.value;
            });
            try {
                await update(ref(db, `vocab/${currentEditId}`), updates);
                alert('Vocab Saved!');
                await vocabService.fetchData();
                if (!views.flashcard.classList.contains('hidden')) flashcardApp.refresh();
            } catch(e) { console.error(e); alert('Error'); }
        });
    }

    // --- SETTINGS ---
    const settingsModal = document.getElementById('settings-modal');
    const openSettings = () => { loadSettingsToUI(); settingsModal.classList.remove('hidden'); setTimeout(()=>settingsModal.classList.remove('opacity-0'), 10); };
    const closeSettings = () => { settingsModal.classList.add('opacity-0'); setTimeout(()=>settingsModal.classList.add('hidden'), 200); };
    
    document.addEventListener('click', (e) => {
        if (e.target.closest('#home-settings-btn') || e.target.closest('.game-settings-btn')) openSettings();
        if (e.target.closest('#modal-done-btn')) closeSettings();
    });

    function loadSettingsToUI() {
        const s = settingsService.get();
        const setVal = (id, val) => { const el = document.getElementById(id); if(el) el.value = val; };
        const setChk = (id, val) => { const el = document.getElementById(id); if(el) el.checked = val; };

        setVal('target-select', s.targetLang); setVal('origin-select', s.originLang);
        setChk('toggle-dark', s.darkMode); setChk('toggle-audio', s.autoPlay); setChk('toggle-wait-audio', s.waitForAudio);
        setVal('font-size-select', s.fontSize);
        setChk('toggle-vocab', s.showVocab); setChk('toggle-sentence', s.showSentence); setChk('toggle-english', s.showEnglish);
        setChk('toggle-dict-enable', s.dictEnabled); setChk('toggle-dict-click-audio', s.dictClickAudio);
        setChk('toggle-quiz-audio', s.quizAnswerAudio); setChk('toggle-quiz-autoplay-correct', s.quizAutoPlayCorrect);
        setChk('toggle-sent-audio', s.sentencesWordAudio); setChk('toggle-blanks-audio', s.blanksAnswerAudio);
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
    bindSetting('toggle-wait-audio', 'waitForAudio');
    bindSetting('font-size-select', 'fontSize', () => document.body.setAttribute('data-font-size', settingsService.get().fontSize));
    bindSetting('toggle-vocab', 'showVocab', updateAllApps);
    bindSetting('toggle-sentence', 'showSentence', updateAllApps);
    bindSetting('toggle-english', 'showEnglish', updateAllApps);
    bindSetting('toggle-dict-enable', 'dictEnabled');
    bindSetting('toggle-dict-click-audio', 'dictClickAudio');
    bindSetting('toggle-quiz-audio', 'quizAnswerAudio');
    bindSetting('toggle-quiz-autoplay-correct', 'quizAutoPlayCorrect');
    bindSetting('toggle-sent-audio', 'sentencesWordAudio');
    bindSetting('toggle-blanks-audio', 'blanksAnswerAudio');

    const accordions = [
        { btn: 'dict-accordion-btn', content: 'dict-options', arrow: 'accordion-arrow-dict' },
        { btn: 'display-accordion-btn', content: 'display-options', arrow: 'accordion-arrow-1' },
        { btn: 'quiz-accordion-btn', content: 'quiz-options', arrow: 'accordion-arrow-3' },
        { btn: 'sent-accordion-btn', content: 'sent-options', arrow: 'accordion-arrow-sent' },
        { btn: 'blanks-accordion-btn', content: 'blanks-options', arrow: 'accordion-arrow-blanks' },
        { btn: 'fonts-accordion-btn', content: 'fonts-options', arrow: 'accordion-arrow-fonts' }
    ];
    accordions.forEach(acc => {
        const btn = document.getElementById(acc.btn); const content = document.getElementById(acc.content); const arrow = document.getElementById(acc.arrow);
        if(btn) btn.addEventListener('click', () => { content.classList.toggle('open'); arrow.classList.toggle('rotate'); });
    });

    // --- INIT ---
    async function initApp() {
        try {
            const saved = settingsService.get();
            loadSettingsToUI();
            if(saved.darkMode) document.documentElement.classList.add('dark');
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

import './services/firebase';
import './styles/main.scss';
import { settingsService } from './services/settingsService';
import { vocabService } from './services/vocabService';
import { dictionaryService } from './services/dictionaryService';
import { scoreService } from './services/scoreService'; 
import { achievementService } from './services/achievementService'; 
import { ACHIEVEMENTS } from './data/achievements';
import { auth, onAuthStateChanged, googleProvider, signInWithPopup, signOut, update, ref, db, signInAnonymously, get } from './services/firebase';
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
import { audioService } from './services/audioService';
import { textService } from './services/textService';

window.wasLongPress = false;

if ('serviceWorker' in navigator) { 
    window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW failed', err)); }); 
}

let savedHistory = {}; 
try { savedHistory = JSON.parse(localStorage.getItem('polyglot_history') || '{}'); } catch (e) {}
window.saveGameHistory = (game, id) => { 
    if (id) { 
        savedHistory[game] = id; 
        localStorage.setItem('polyglot_history', JSON.stringify(savedHistory)); 
    } 
};

let currentActiveApp = null;
let currentUser = null;

const LANGUAGES = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'zh', name: 'Chinese' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'ru', name: 'Russian' }
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
    try { scoreService.init(); } catch(e){ console.error("Score Init Error", e); }

    const views = { 
        home: document.getElementById('main-menu'), 
        flashcard: document.getElementById('flashcard-view'), 
        quiz: document.getElementById('quiz-view'), 
        sentences: document.getElementById('sentences-view'), 
        blanks: document.getElementById('blanks-view'),
        listening: document.getElementById('listening-view'),
        match: document.getElementById('match-view'),
        memory: document.getElementById('memory-view'),
        finder: document.getElementById('finder-view'),
        constructor: document.getElementById('constructor-view'),
        writing: document.getElementById('writing-view'),
        truefalse: document.getElementById('truefalse-view'),
        reverse: document.getElementById('reverse-view')
    };

    const iconOut = document.getElementById('icon-user-out'); 
    const iconIn = document.getElementById('icon-user-in'); 

    onAuthStateChanged(auth, async (user) => {
        currentUser = user;
        if (user) { 
            if(!user.isAnonymous) {
                if(iconOut) iconOut.classList.add('hidden'); 
                if(iconIn) { iconIn.classList.remove('hidden'); iconIn.src = user.photoURL; }
            }
            await loadApplicationData();
        } else { 
            try { await signInAnonymously(auth); } catch(e) { console.error("Auth Error", e); } 
            if(iconOut) iconOut.classList.remove('hidden'); 
            if(iconIn) iconIn.classList.add('hidden'); 
        }
        updateEditPermissions();
    });

    async function loadApplicationData() {
        const startBtn = document.getElementById('start-app-btn');
        if(startBtn) startBtn.innerText = "Loading Data...";

        try {
            populateLanguageDropdowns();
            const saved = settingsService.get(); 
            if(saved.darkMode) document.documentElement.classList.add('dark');
            
            await vocabService.init(); 
            dictionaryService.fetchData();

            if (!vocabService.hasData()) throw new Error("No vocabulary data.");

            if(startBtn) {
                startBtn.disabled = false; 
                startBtn.classList.remove('opacity-50', 'cursor-not-allowed'); 
                startBtn.classList.add('bg-indigo-600', 'text-white'); 
                startBtn.innerText = "Start Learning";
                startBtn.onclick = () => {
                    const s = new SpeechSynthesisUtterance(''); window.speechSynthesis.speak(s);
                    const splash = document.getElementById('splash-screen');
                    if(splash) splash.style.display = 'none'; 
                    document.body.classList.remove('is-loading'); 
                    renderView('home');
                };
            }
        } catch(e) {
            console.error("Data Load Error:", e);
            if(startBtn) { startBtn.disabled = false; startBtn.innerText = "Retry"; startBtn.onclick = () => window.location.reload(); }
        }
    }

    const loginBtn = document.getElementById('user-login-btn');
    if (loginBtn) loginBtn.addEventListener('click', async () => { if (currentUser && !currentUser.isAnonymous) { if(confirm("Log out?")) await signOut(auth); } else { try { await signInWithPopup(auth, googleProvider); } catch(e){} } });

    function updateEditPermissions() { 
        const isAdmin = currentUser && currentUser.email === 'kevinkicho@gmail.com'; 
        const btns = document.querySelectorAll('#btn-save-vocab, #btn-save-dict, #btn-add-dict');
        btns.forEach(btn => { 
            if (isAdmin) {
                btn.classList.remove('hidden');
                btn.disabled = false;
            } else {
                btn.classList.add('hidden');
                btn.disabled = true;
            }
        });
    }

    window.renderVocabEditFields = (data) => {
        const container = document.getElementById('edit-vocab-fields');
        const idLabel = document.getElementById('edit-vocab-id');
        if (idLabel) idLabel.textContent = `ID: ${data.id}`;
        
        container.dataset.fbKey = data.firebaseKey || '';

        if (!container) return;
        container.innerHTML = '';
        
        const isAdmin = currentUser && currentUser.email === 'kevinkicho@gmail.com';
        
        const fields = [
            'ja', 'ja_furi', 'ja_roma', 'ja_ex',
            'en', 'en_ex',
            'zh', 'zh_pin', 'zh_ex',
            'ko', 'ko_roma', 'ko_ex',
            'de', 'de_ex',
            'es', 'es_ex',
            'fr', 'fr_ex',
            'it', 'it_ex',
            'pt', 'pt_ex',
            'ru', 'ru_tr', 'ru_ex'
        ];
        
        fields.forEach(key => {
            const val = data[key] || '';
            let content;
            if (isAdmin) {
                content = `<input class="vocab-input w-full bg-gray-100 dark:bg-gray-800 border-none rounded-lg p-3 text-gray-800 dark:text-white font-medium focus:ring-2 ring-indigo-500 outline-none" data-key="${key}" value="${val}">`;
            } else {
                content = `<div class="w-full bg-transparent border-b border-gray-200 dark:border-gray-700 py-2 text-gray-700 dark:text-gray-300 font-medium select-text">${val || '<span class="text-gray-400 italic">Empty</span>'}</div>`;
            }
            container.insertAdjacentHTML('beforeend', `<div><label class="block text-xs font-bold text-gray-400 mb-1 uppercase">${key}</label>${content}</div>`);
        });
    }

    window.populateDictionaryEdit = (text) => {
         const list = document.getElementById('edit-dict-list');
         if(!list) return;
         if(!text) {
             list.innerHTML = `<div class="text-gray-400 text-sm italic p-2">No text content available to look up.</div>`;
             return;
         }
         
         const uniqueChars = Array.from(new Set(text.split(''))).join('');
         const results = dictionaryService.lookupText(uniqueChars);
         
         if (results.length === 0) {
             list.innerHTML = `<div class="text-gray-400 text-sm italic p-2">No dictionary entries found for characters in this game.</div>`;
             return;
         }

         const isAdmin = currentUser && currentUser.email === 'kevinkicho@gmail.com';
         let html = '';

         results.forEach(entry => {
             const koVal = entry.k || ''; 

             if (isAdmin) {
                 html += `
                    <div class="p-3 border-b border-gray-100 dark:border-gray-700 last:border-0 dict-edit-row" data-fb-key="${entry.firebaseKey}">
                        <div class="flex gap-2 mb-2 items-center">
                            <input class="dict-input w-16 bg-gray-100 dark:bg-gray-800 border-none rounded p-2 text-xl font-bold text-indigo-600 text-center" data-field="s" value="${entry.s}" placeholder="Char">
                            <button class="bg-indigo-100 text-indigo-600 w-10 h-10 rounded-full flex items-center justify-center hover:bg-indigo-200 active:scale-95 transition-all flex-shrink-0" onclick="window.playDictAudio('${entry.s}')">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>
                            </button>
                            <input class="dict-input w-full bg-gray-100 dark:bg-gray-800 border-none rounded p-2 text-sm" data-field="p" value="${entry.p}" placeholder="Pinyin">
                        </div>
                        <div class="flex gap-2 mb-2">
                            <input class="dict-input w-full bg-gray-100 dark:bg-gray-800 border-none rounded p-2 text-sm" data-field="t" value="${entry.t}" placeholder="Traditional">
                            <input class="dict-input w-full bg-gray-100 dark:bg-gray-800 border-none rounded p-2 text-sm" data-field="k" value="${koVal}" placeholder="Korean / Definition">
                        </div>
                        <textarea class="dict-input w-full bg-gray-100 dark:bg-gray-800 border-none rounded p-2 text-sm h-16" data-field="e" placeholder="English">${entry.e}</textarea>
                    </div>`;
             } else {
                 html += `
                    <div class="flex items-start gap-4 p-3 border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-white/5 transition-transform">
                        <div class="flex flex-col items-center gap-1">
                            <div class="text-4xl font-black text-indigo-600 dark:text-indigo-400 font-serif">${entry.s}</div>
                            <button class="bg-indigo-50 text-indigo-600 p-2 rounded-full hover:bg-indigo-100 active:scale-95 transition-all" onclick="window.playDictAudio('${entry.s}')">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>
                            </button>
                        </div>
                        <div class="flex-1">
                            <div class="flex gap-2 items-baseline mb-1">
                                <span class="text-lg font-bold text-gray-800 dark:text-white">${entry.p}</span>
                                ${entry.t && entry.t !== entry.s ? `<span class="text-xs text-gray-400">(${entry.t})</span>` : ''}
                            </div>
                            <div class="text-sm text-gray-600 dark:text-gray-300 leading-snug">${entry.e}</div>
                            ${koVal ? `<div class="text-xs text-indigo-500 mt-1 font-medium">${koVal}</div>` : ''}
                        </div>
                    </div>`;
             }
         });
         list.innerHTML = html;
    }

    window.playDictAudio = (text) => {
        audioService.speak(text, 'zh-CN');
    };

    const saveDictBtn = document.getElementById('btn-save-dict');
    if(saveDictBtn) {
        saveDictBtn.addEventListener('click', async () => {
            const rows = document.querySelectorAll('.dict-edit-row');
            if(rows.length === 0) return;
            saveDictBtn.innerText = "Saving...";
            saveDictBtn.disabled = true;
            try {
                const updates = [];
                rows.forEach(row => {
                    const key = row.dataset.fbKey;
                    if(key) {
                        const getVal = (f) => row.querySelector(`[data-field="${f}"]`).value;
                        updates.push(dictionaryService.saveEntry(key, {
                            s: getVal('s'), t: getVal('t'), p: getVal('p'), e: getVal('e'), k: getVal('k')
                        }));
                    }
                });
                await Promise.all(updates);
                alert("Dictionary saved!");
            } catch(e) { console.error(e); alert("Error."); } 
            finally { saveDictBtn.innerText = "SAVE DICTIONARY"; saveDictBtn.disabled = false; }
        });
    }

    const saveVocabBtn = document.getElementById('btn-save-vocab');
    if(saveVocabBtn) {
        saveVocabBtn.addEventListener('click', async () => {
            const container = document.getElementById('edit-vocab-fields');
            const key = container.dataset.fbKey;
            if(!key) return alert("Error: No record ID");
            
            saveVocabBtn.innerText = "Saving...";
            saveVocabBtn.disabled = true;
            try {
                const inputs = container.querySelectorAll('.vocab-input');
                const data = {};
                inputs.forEach(i => data[i.dataset.key] = i.value);
                await vocabService.saveItem(key, data);
                alert("Vocabulary saved!");
            } catch(e) { console.error(e); alert("Save failed"); } 
            finally { saveVocabBtn.innerText = "SAVE VOCAB"; saveVocabBtn.disabled = false; }
        });
    }

    function renderView(viewName) { 
        audioService.stop(); 
        if (viewName === 'home') document.body.classList.remove('game-mode'); 
        else document.body.classList.add('game-mode'); 
        
        Object.values(views).forEach(el => { if(el) el.classList.add('hidden'); }); 
        
        const target = views[viewName]; 
        currentActiveApp = null; 

        if (target) { 
            target.classList.remove('hidden'); 
            const lastId = savedHistory[viewName]; 
            
            if (viewName === 'flashcard' && views.flashcard) { flashcardApp.mount('flashcard-view'); currentActiveApp = flashcardApp; if(lastId) flashcardApp.goto(lastId); } 
            if (viewName === 'quiz' && views.quiz) { quizApp.mount('quiz-view'); currentActiveApp = quizApp; if(lastId) quizApp.next(lastId); } 
            if (viewName === 'sentences' && views.sentences) { sentencesApp.mount('sentences-view'); currentActiveApp = sentencesApp; if(lastId) sentencesApp.next(lastId); } 
            if (viewName === 'blanks' && views.blanks) { blanksApp.mount('blanks-view'); currentActiveApp = blanksApp; if(lastId) blanksApp.next(lastId); }
            if (viewName === 'listening' && views.listening) { listeningApp.mount('listening-view'); currentActiveApp = listeningApp; if(lastId) listeningApp.next(lastId); }
            if (viewName === 'match' && views.match) { matchApp.mount('match-view'); currentActiveApp = matchApp; }
            if (viewName === 'memory' && views.memory) { memoryApp.mount('memory-view'); currentActiveApp = memoryApp; }
            if (viewName === 'finder' && views.finder) { finderApp.mount('finder-view'); currentActiveApp = finderApp; }
            if (viewName === 'constructor' && views.constructor) { constructorApp.mount('constructor-view'); currentActiveApp = constructorApp; }
            if (viewName === 'writing' && views.writing) { writingApp.mount('writing-view'); currentActiveApp = writingApp; }
            if (viewName === 'truefalse' && views.truefalse) { trueFalseApp.mount('truefalse-view'); currentActiveApp = trueFalseApp; }
            if (viewName === 'reverse' && views.reverse) { reverseApp.mount('reverse-view'); currentActiveApp = reverseApp; }
        } 
    }

    const bindNav = (id, view) => { const btn = document.getElementById(id); if(btn) btn.addEventListener('click', () => { history.pushState({view}, '', `#${view}`); renderView(view); }); };
    ['flashcard','quiz','sentences','blanks','listening','match','memory','finder','constructor','writing','truefalse','reverse'].forEach(v => bindNav(`menu-${v}-btn`, v));

    window.addEventListener('popstate', (e) => renderView(e.state ? e.state.view : 'home'));
    window.addEventListener('router:home', () => history.back());
    vocabService.subscribe(() => { if (views.flashcard && !views.flashcard.classList.contains('hidden')) flashcardApp.refresh(); });

    let resizeTimer;
    window.addEventListener('resize', () => {
        if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) return;
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => { if (currentActiveApp && currentActiveApp.render) currentActiveApp.render(); else document.querySelectorAll('[data-fit="true"]').forEach(el => textService.fitText(el)); }, 100);
    });

    // ... Achievements & Score ...
    const achPopup = document.getElementById('achievement-popup');
    window.addEventListener('achievement:unlocked', (e) => {
        const ach = e.detail; const t = document.getElementById('ach-popup-title'); const d = document.getElementById('ach-popup-desc'); const p = document.getElementById('ach-popup-pts');
        if(!t||!d||!p||!achPopup) return;
        t.textContent = ach.title; d.textContent = ach.desc; p.textContent = ach.points;
        achPopup.classList.remove('hidden'); setTimeout(() => achPopup.classList.add('hidden'), 4000);
    });
    const achBtn = document.getElementById('ach-btn');
    if(achBtn) achBtn.addEventListener('click', async () => {
        const achModal = document.getElementById('ach-list-modal');
        const achContent = document.getElementById('ach-list-content');
        if(!achModal || !achContent) return;
        achModal.classList.remove('hidden'); setTimeout(()=>achModal.classList.remove('opacity-0'),10);
        achContent.innerHTML = '<div class="text-center p-4 text-white">Loading...</div>';
        let unlockedMap = {};
        if (currentUser) {
            try { unlockedMap = await achievementService.getUserAchievements(currentUser.uid) || {}; } catch(e){ console.error(e); }
        }
        const totalPoints = Object.values(unlockedMap).reduce((sum, item) => { const achDef = ACHIEVEMENTS.find(a => a.title === item.title); return sum + (achDef ? achDef.points : 0);}, 0);
        let html = `
        <div class="mb-8 flex flex-col items-center">
            <div class="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1">Total Score</div>
            <div class="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-tr from-indigo-500 to-purple-500 dark:from-white dark:to-gray-400 font-mono tracking-tighter">${totalPoints}</div>
            <div class="h-1 w-12 bg-indigo-500 rounded-full mt-2 opacity-50"></div>
        </div>`;
        const sorted = [...ACHIEVEMENTS].sort((a,b) => { const aU = !!unlockedMap[a.id], bU = !!unlockedMap[b.id]; if (aU && !bU) return -1; if (!aU && bU) return 1; return b.points - a.points; });
        sorted.forEach(ach => {
            const unlocked = !!unlockedMap[ach.id];
            const bg = unlocked ? 'bg-white/10 border-indigo-500/30' : 'bg-black/20 border-white/5 opacity-50 grayscale';
            const textCol = unlocked ? 'text-gray-800 dark:text-white' : 'text-gray-500';
            const ic = unlocked ? '🏆' : '🔒';
            html += `<div class="flex items-center gap-4 p-4 rounded-2xl border ${bg} backdrop-blur-sm transition-all hover:bg-white/15"><div class="text-3xl">${ic}</div><div class="flex-1"><h4 class="font-bold text-sm ${textCol}">${ach.title}</h4><p class="text-[10px] text-gray-400 leading-tight mt-1">${ach.desc}</p></div><div class="text-xs font-black text-indigo-400 font-mono">+${ach.points}</div></div>`;
        });
        achContent.innerHTML = html;
    });
    const achClose = document.getElementById('ach-list-close');
    if (achClose) achClose.addEventListener('click', ()=>{ const m = document.getElementById('ach-list-modal'); if(m) { m.classList.add('opacity-0'); setTimeout(()=>m.classList.add('hidden'),200); }});

    const scoreModal = document.getElementById('score-modal');
    const scoreClose = document.getElementById('score-close-btn');
    let chartDataCache=null, showingWeeklyScore=false;
    scoreService.subscribe((s) => { document.querySelectorAll('.global-score-display').forEach(el=>el.textContent=s); });
    
    document.addEventListener('click', (e) => {
        if(e.target.closest('#score-pill')) showScoreChart();
        if(e.target.closest('#home-settings-btn')) openSettings();
        if(e.target.closest('#modal-done-btn')) closeSettings();
        
        if (e.target.closest('.game-edit-btn')) {
            let app = currentActiveApp; 
            if (app) {
                let item = null;
                if (app.currentData) {
                    item = app.currentData.target || app.currentData.item || (app.currentData.id ? app.currentData : null);
                }
                
                if (!item && app.currentIndex !== undefined) {
                    const all = vocabService.getAll();
                    if(all.length > app.currentIndex) item = all[app.currentIndex];
                }

                if (item && item.id !== undefined) {
                    currentEditId = item.id;
                    const fullData = vocabService.getAll().find(v => v.id == item.id);
                    if(fullData) {
                        const em = document.getElementById('edit-modal');
                        if(em) { em.classList.remove('hidden'); setTimeout(()=>em.classList.remove('opacity-0'), 10); }
                        switchEditTab('vocab');
                        window.renderVocabEditFields(fullData); 
                        
                        let combinedText = "";
                        const getText = (v) => {
                            if(!v) return "";
                            return (v.zh||"") + (v.zh_ex||"") + (v.front?.main||"") + (v.back?.main||"") + (v.back?.definition||"");
                        };

                        if (app.currentData) {
                            if (app.currentData.target) combinedText += getText(app.currentData.target);
                            if (app.currentData.choices && Array.isArray(app.currentData.choices)) {
                                app.currentData.choices.forEach(c => combinedText += getText(c));
                            }
                            if (app.currentData.item) combinedText += getText(app.currentData.item);
                            if (app.currentData.displayMeaning) combinedText += app.currentData.displayMeaning;
                            if (app.currentData.sentence) combinedText += app.currentData.sentence;
                            if (app.currentData.targetWord) combinedText += app.currentData.targetWord;
                            if (!app.currentData.target && !app.currentData.item && app.currentData.id) combinedText += getText(app.currentData);
                        }
                        
                        if (app.cards && Array.isArray(app.cards)) {
                            app.cards.forEach(c => combinedText += (c.text || ""));
                        }

                        if (app.constructor.name === 'WritingApp' && app.currentData) {
                             combinedText += getText(app.currentData);
                        }

                        window.populateDictionaryEdit(combinedText);
                        updateEditPermissions();
                    }
                }
            }
        }
    });

    if(scoreClose) scoreClose.addEventListener('click', ()=>{ if(scoreModal) { scoreModal.classList.add('opacity-0'); setTimeout(()=>scoreModal.classList.add('hidden'),200); }});
    const scoreTotalToggle = document.getElementById('score-total-toggle');
    if(scoreTotalToggle) scoreTotalToggle.addEventListener('click', ()=>{ showingWeeklyScore=!showingWeeklyScore; updateScoreDisplay(); });
    
    function updateScoreDisplay() {
        const label = document.getElementById('score-display-label');
        const val = document.getElementById('modal-today-score');
        if (!chartDataCache || !label || !val) return;
        if (showingWeeklyScore) {
            const total = chartDataCache.reduce((sum, d) => sum + d.total, 0);
            label.textContent = "Weekly Total"; val.textContent = total;
        } else {
            const todayStr = scoreService.getDateStr(new Date());
            const todayData = chartDataCache.find(d => d.dateStr === todayStr) || { total: 0 };
            label.textContent = "Today's Score"; val.textContent = todayData.total;
        }
    }

    async function showScoreChart() {
        if(!scoreModal) return;
        scoreModal.classList.remove('hidden'); setTimeout(()=>scoreModal.classList.remove('opacity-0'), 10);
        const container = document.getElementById('score-chart-container');
        const tooltipArea = document.getElementById('chart-tooltip-area');
        if(container) container.innerHTML = '<div class="flex justify-center items-center h-full text-gray-500">Loading...</div>';

        const curr = new Date(); const day = curr.getDay() || 7; curr.setDate(curr.getDate() - (day - 1)); curr.setHours(0,0,0,0);
        const weekDates = []; for (let i = 0; i < 7; i++) { const d = new Date(curr); d.setDate(curr.getDate() + i); weekDates.push(scoreService.getDateStr(d)); }
        const todayStr = scoreService.getDateStr(new Date());

        try {
            const statsRef = scoreService.getUserStatsRef(); 
            if (!statsRef) throw new Error("No User");
            const snap = await get(statsRef); 
            const data = snap.exists() ? snap.val() : {};
            const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            const getVal = (obj, key) => (obj && typeof obj[key] === 'number') ? obj[key] : 0;

            chartDataCache = weekDates.map((date, i) => {
                const d = data[date] || {};
                const fc = getVal(d, 'flashcard'), qz = getVal(d, 'quiz'), st = getVal(d, 'sentences'), bl = getVal(d, 'blanks');
                const li = getVal(d, 'listening'), ma = getVal(d, 'match'), me = getVal(d, 'memory'), fi = getVal(d, 'finder');
                const co = getVal(d, 'constructor'), wr = getVal(d, 'writing'), tf = getVal(d, 'truefalse'), rv = getVal(d, 'reverse');
                return { dateStr: date, label: dayLabels[i], fc, qz, st, bl, li, ma, me, fi, co, wr, tf, rv, total: fc+qz+st+bl+li+ma+me+fi+co+wr+tf+rv };
            });
            const maxScore = Math.max(...chartDataCache.map(s => s.total), 50);
            let html = '';
            chartDataCache.forEach((s, idx) => {
                const heightPct = Math.round((s.total / maxScore) * 100);
                const isToday = s.dateStr === todayStr;
                const labelColor = isToday ? 'text-indigo-600 dark:text-indigo-400 font-black' : 'text-gray-400';
                const t = s.total || 1;
                html += `
                <div class="chart-bar-container group relative" data-idx="${idx}">
                    <div class="chart-bar flex-col-reverse border-2 border-white dark:border-gray-700 shadow-sm" style="height: ${heightPct}%;">
                        ${s.fc>0?`<div style="height:${(s.fc/t)*100}%;" class="w-full bg-indigo-500"></div>`:''}
                        ${s.qz>0?`<div style="height:${(s.qz/t)*100}%;" class="w-full bg-purple-500"></div>`:''}
                        ${s.st>0?`<div style="height:${(s.st/t)*100}%;" class="w-full bg-pink-500"></div>`:''}
                        ${s.bl>0?`<div style="height:${(s.bl/t)*100}%;" class="w-full bg-teal-500"></div>`:''}
                        ${s.li>0?`<div style="height:${(s.li/t)*100}%;" class="w-full bg-blue-500"></div>`:''}
                        ${s.ma>0?`<div style="height:${(s.ma/t)*100}%;" class="w-full bg-yellow-500"></div>`:''}
                        ${s.me>0?`<div style="height:${(s.me/t)*100}%;" class="w-full bg-purple-400"></div>`:''}
                        ${s.fi>0?`<div style="height:${(s.fi/t)*100}%;" class="w-full bg-rose-500"></div>`:''}
                        ${s.co>0?`<div style="height:${(s.co/t)*100}%;" class="w-full bg-emerald-500"></div>`:''}
                        ${s.wr>0?`<div style="height:${(s.wr/t)*100}%;" class="w-full bg-cyan-500"></div>`:''}
                        ${s.tf>0?`<div style="height:${(s.tf/t)*100}%;" class="w-full bg-orange-500"></div>`:''}
                        ${s.rv>0?`<div style="height:${(s.rv/t)*100}%;" class="w-full bg-indigo-400"></div>`:''}
                    </div>
                    <span class="chart-label ${labelColor}">${s.label.charAt(0)}</span>
                </div>`;
            });
            if(container) {
                container.innerHTML = html;
                updateScoreDisplay();
                container.querySelectorAll('.chart-bar-container').forEach(el => { 
                    el.addEventListener('click', (e) => { 
                        e.stopPropagation(); 
                        container.querySelectorAll('.chart-bar').forEach(b => b.classList.remove('ring-2', 'ring-indigo-400')); 
                        el.querySelector('.chart-bar').classList.add('ring-2', 'ring-indigo-400'); 
                        const s=chartDataCache[el.dataset.idx]; 
                        if(tooltipArea) {
                            let details = '';
                            if(s.fc) details += `<span class="text-indigo-500">FC:${s.fc}</span> `;
                            if(s.qz) details += `<span class="text-purple-500">QZ:${s.qz}</span> `;
                            if(s.st) details += `<span class="text-pink-500">ST:${s.st}</span> `;
                            if(s.bl) details += `<span class="text-teal-500">BL:${s.bl}</span> `;
                            if(s.li) details += `<span class="text-blue-500">LI:${s.li}</span> `;
                            if(s.ma) details += `<span class="text-yellow-500">MA:${s.ma}</span> `;
                            tooltipArea.innerHTML = `<div class="flex flex-col items-center"><span class="text-gray-500 dark:text-gray-300 uppercase font-bold text-xs mb-1">${s.label} - Total: ${s.total}</span><div class="flex gap-2 text-[10px] font-bold flex-wrap justify-center">${details || 'No activity'}</div></div>`; 
                        }
                    }); 
                });
            }
        } catch (e) { console.error("Chart Error", e); if(container) container.innerHTML = `<div class="text-red-500 p-4 text-xs">Error</div>`; }
    }

    const settingsModal = document.getElementById('settings-modal');
    const openSettings = () => { if(settingsModal){ loadSettingsToUI(); settingsModal.classList.remove('hidden'); setTimeout(()=>settingsModal.classList.remove('opacity-0'), 10); }};
    const closeSettings = () => { if(settingsModal){ settingsModal.classList.add('opacity-0'); setTimeout(()=>settingsModal.classList.add('hidden'), 200); }};
    
    function loadSettingsToUI() {
        const s = settingsService.get();
        const setVal = (id, val) => { const el = document.getElementById(id); if(el) el.value = val; };
        const setChk = (id, val) => { const el = document.getElementById(id); if(el) el.checked = val; };
        setVal('target-select', s.targetLang); setVal('origin-select', s.originLang);
        setChk('toggle-dark', s.darkMode); setVal('volume-slider', s.volume !== undefined ? s.volume : 1.0); setVal('font-family-select', s.fontFamily); setVal('font-weight-select', s.fontWeight);
        setChk('toggle-vocab', s.showVocab); setChk('toggle-sentence', s.showSentence); setChk('toggle-english', s.showEnglish);
        setChk('toggle-sent-anim', s.sentencesWinAnim !== false);
    }
    
    function bindSetting(id, key, cb) { const el = document.getElementById(id); if(el) el.addEventListener('change', (e) => { settingsService.set(key, e.target.type==='checkbox'?e.target.checked:e.target.value); if(cb) cb(); }); }
    
    // UPDATED LANGUAGE HANDLER
    const onLanguageChange = () => {
        const s = settingsService.get();
        vocabService.remapLanguages(s.targetLang, s.originLang);
        // Instant update if possible
        if (currentActiveApp && currentActiveApp.refresh) {
            currentActiveApp.refresh();
        } else if (currentActiveApp && currentActiveApp.render) {
            // Fallback for simple apps
            currentActiveApp.render();
        }
    };

    bindSetting('target-select', 'targetLang', onLanguageChange); 
    bindSetting('origin-select', 'originLang', onLanguageChange);

    bindSetting('toggle-dark', 'darkMode', () => document.documentElement.classList.toggle('dark')); bindSetting('volume-slider', 'volume'); bindSetting('font-family-select', 'fontFamily', () => document.querySelectorAll('[data-fit="true"]').forEach(el => textService.fitText(el))); bindSetting('font-weight-select', 'fontWeight', () => document.querySelectorAll('[data-fit="true"]').forEach(el => textService.fitText(el))); bindSetting('toggle-vocab', 'showVocab', ()=>flashcardApp.refresh()); bindSetting('toggle-sentence', 'showSentence', ()=>flashcardApp.refresh()); bindSetting('toggle-english', 'showEnglish', ()=>flashcardApp.refresh()); bindSetting('toggle-sent-anim', 'sentencesWinAnim');
    [{btn:'display-accordion-btn',c:'display-options',a:'accordion-arrow-1'},{btn:'sent-accordion-btn',c:'sent-options',a:'accordion-arrow-sent'},{btn:'fonts-accordion-btn',c:'fonts-options',a:'accordion-arrow-fonts'}].forEach(o=>{ const b=document.getElementById(o.btn), c=document.getElementById(o.c), a=document.getElementById(o.a); if(b) b.addEventListener('click', ()=>{ c.classList.toggle('open'); a.classList.toggle('rotate'); }); });

    let currentEditId = null;
    function switchEditTab(tab) {
        const tabVocab = document.getElementById('edit-tab-vocab'); const tabDict = document.getElementById('edit-tab-dict'); const tabVocabBtn = document.getElementById('tab-vocab-btn'); const tabDictBtn = document.getElementById('tab-dict-btn');
        if(!tabVocab || !tabDict) return;
        if (tab === 'vocab') { tabVocab.classList.remove('hidden'); tabDict.classList.add('hidden'); tabVocabBtn.classList.replace('bg-gray-200', 'bg-indigo-600'); tabVocabBtn.classList.replace('text-gray-600', 'text-white'); tabDictBtn.classList.replace('bg-indigo-600', 'bg-gray-200'); tabDictBtn.classList.replace('text-white', 'text-gray-600'); } 
        else { tabVocab.classList.add('hidden'); tabDict.classList.remove('hidden'); tabDictBtn.classList.replace('bg-gray-200', 'bg-indigo-600'); tabDictBtn.classList.replace('text-gray-600', 'text-white'); tabVocabBtn.classList.replace('bg-indigo-600', 'bg-gray-200'); tabVocabBtn.classList.replace('text-white', 'text-gray-600'); }
    }
    const tabVocabBtn = document.getElementById('tab-vocab-btn'); if(tabVocabBtn) tabVocabBtn.addEventListener('click', () => switchEditTab('vocab'));
    const tabDictBtn = document.getElementById('tab-dict-btn'); if(tabDictBtn) tabDictBtn.addEventListener('click', () => switchEditTab('dict'));
    const ec = document.getElementById('edit-close-btn'); if(ec) ec.addEventListener('click', () => { const em=document.getElementById('edit-modal'); if(em){ em.classList.add('opacity-0'); setTimeout(()=>em.classList.add('hidden'), 200); }});
    
    const fsBtn = document.getElementById('fullscreen-btn'); 
    if(fsBtn) fsBtn.addEventListener('click', () => (!document.fullscreenElement) ? document.documentElement.requestFullscreen() : document.exitFullscreen());
});

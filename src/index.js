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
import { audioService } from './services/audioService';
import { textService } from './services/textService';

window.wasLongPress = false;

if ('serviceWorker' in navigator) { window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js'); }); }
let savedHistory = {}; try { savedHistory = JSON.parse(localStorage.getItem('polyglot_history') || '{}'); } catch (e) {}
window.saveGameHistory = (game, id) => { if (id) { savedHistory[game] = id; localStorage.setItem('polyglot_history', JSON.stringify(savedHistory)); } };

document.addEventListener('DOMContentLoaded', () => {
    const views = { home: document.getElementById('main-menu'), flashcard: document.getElementById('flashcard-view'), quiz: document.getElementById('quiz-view'), sentences: document.getElementById('sentences-view'), blanks: document.getElementById('blanks-view') };
    const iconOut = document.getElementById('icon-user-out'); const iconIn = document.getElementById('icon-user-in'); let currentUser = null;

    onAuthStateChanged(auth, async (user) => {
        currentUser = user;
        if (user && !user.isAnonymous) { iconOut.classList.add('hidden'); iconIn.classList.remove('hidden'); iconIn.src = user.photoURL; }
        else { try { await signInAnonymously(auth); } catch(e){} iconOut.classList.remove('hidden'); iconIn.classList.add('hidden'); }
        updateEditPermissions();
    });

    document.getElementById('user-login-btn').addEventListener('click', async () => { if (currentUser && !currentUser.isAnonymous) { if(confirm("Log out?")) await signOut(auth); } else { try { await signInWithPopup(auth, googleProvider); } catch(e){} } });
    function updateEditPermissions() { const isAdmin = currentUser && currentUser.email === 'kevinkicho@gmail.com'; document.querySelectorAll('#btn-save-vocab, .btn-save-dict, #btn-add-dict').forEach(btn => { if(btn.id === 'btn-add-dict') btn.style.display = isAdmin ? 'block' : 'none'; else { btn.disabled = !isAdmin; btn.style.display = isAdmin ? 'block' : 'none'; } }); }
    function renderView(viewName) { audioService.stop(); if (viewName === 'home') document.body.classList.remove('game-mode'); else document.body.classList.add('game-mode'); Object.values(views).forEach(el => el.classList.add('hidden')); const target = views[viewName]; if (target) { target.classList.remove('hidden'); const lastId = savedHistory[viewName]; if (viewName === 'flashcard') { flashcardApp.mount('flashcard-view'); if(lastId) flashcardApp.goto(lastId); } if (viewName === 'quiz') { quizApp.mount('quiz-view'); if(lastId) quizApp.next(lastId); } if (viewName === 'sentences') { sentencesApp.mount('sentences-view'); if(lastId) sentencesApp.next(lastId); } if (viewName === 'blanks') { blanksApp.mount('blanks-view'); if(lastId) blanksApp.next(lastId); } } }
    const bindNav = (id, view) => { const btn = document.getElementById(id); if(btn) btn.addEventListener('click', () => { history.pushState({view}, '', `#${view}`); renderView(view); }); };
    bindNav('menu-flashcard-btn', 'flashcard'); bindNav('menu-quiz-btn', 'quiz'); bindNav('menu-sentences-btn', 'sentences'); bindNav('menu-blanks-btn', 'blanks');
    window.addEventListener('popstate', (e) => renderView(e.state ? e.state.view : 'home'));
    window.addEventListener('router:home', () => history.back());
    vocabService.subscribe(() => { if (!views.flashcard.classList.contains('hidden')) flashcardApp.refresh(); });

    // --- ACHIEVEMENT POPUP ---
    const achPopup = document.getElementById('achievement-popup');
    window.addEventListener('achievement:unlocked', (e) => {
        const ach = e.detail;
        document.getElementById('ach-popup-title').textContent = ach.title;
        document.getElementById('ach-popup-desc').textContent = ach.desc;
        document.getElementById('ach-popup-pts').textContent = ach.points;
        achPopup.classList.remove('hidden');
        
        // Funky sound effect
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3'); 
        audio.volume = 0.5; audio.play().catch(()=>{});

        setTimeout(() => { achPopup.classList.add('hidden'); }, 4000);
    });

    // --- ACHIEVEMENT LIST ---
    const achBtn = document.getElementById('ach-btn');
    const achModal = document.getElementById('ach-list-modal');
    const achClose = document.getElementById('ach-list-close');
    const achContent = document.getElementById('ach-list-content');

    achBtn.addEventListener('click', async () => {
        achModal.classList.remove('hidden'); setTimeout(()=>achModal.classList.remove('opacity-0'), 10);
        achContent.innerHTML = '<div class="text-center p-4">Loading...</div>';
        const unlockedMap = currentUser ? await achievementService.getUserAchievements(currentUser.uid) : {};
        let html = '';
        const sorted = [...ACHIEVEMENTS].sort((a,b) => {
            const aU = !!unlockedMap[a.id], bU = !!unlockedMap[b.id];
            if (aU && !bU) return -1; if (!aU && bU) return 1; return b.points - a.points;
        });
        sorted.forEach(ach => {
            const unlocked = !!unlockedMap[ach.id];
            const bgClass = unlocked ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-orange-200 dark:bg-gray-800 dark:border-yellow-900' : 'bg-gray-50 border-gray-100 dark:bg-black/20 dark:border-gray-800 opacity-60';
            const icon = unlocked ? '🏆' : '🔒';
            const textClass = unlocked ? 'text-gray-900 dark:text-white' : 'text-gray-400';
            html += `<div class="flex items-center gap-3 p-3 rounded-xl border ${bgClass}"><div class="text-2xl">${icon}</div><div class="flex-1"><h4 class="font-bold text-sm ${textClass}">${ach.title}</h4><p class="text-[10px] text-gray-500">${ach.desc}</p></div><div class="text-xs font-black text-orange-500">+${ach.points}</div></div>`;
        });
        achContent.innerHTML = html;
    });
    achClose.addEventListener('click', () => { achModal.classList.add('opacity-0'); setTimeout(()=>achModal.classList.add('hidden'), 200); });

    // --- SCORE CHART ---
    const scoreModal = document.getElementById('score-modal');
    const scoreClose = document.getElementById('score-close-btn');
    let chartDataCache = null; let showingWeeklyScore = false; let activeBarIndex = -1;

    scoreService.subscribe((score) => { document.querySelectorAll('.global-score-display').forEach(el => el.textContent = score); });

    document.addEventListener('click', (e) => {
        if (e.target.closest('#score-pill')) showScoreChart();
        if (e.target.closest('#home-settings-btn')) openSettings();
        if (e.target.closest('#modal-done-btn')) closeSettings();
        
        // EDIT BUTTON LOGIC (Preserved)
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
                    editModal.classList.remove('hidden'); setTimeout(()=>editModal.classList.remove('opacity-0'), 10);
                    const scrollContainer = editModal.querySelector('.flex-1.overflow-y-auto'); if(scrollContainer) scrollContainer.scrollTop = 0;
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

    if(scoreClose) scoreClose.addEventListener('click', () => { scoreModal.classList.add('opacity-0'); setTimeout(() => scoreModal.classList.add('hidden'), 200); });

    document.getElementById('score-total-toggle').addEventListener('click', () => {
        showingWeeklyScore = !showingWeeklyScore;
        updateScoreDisplay();
    });

    function updateScoreDisplay() {
        const label = document.getElementById('score-display-label');
        const val = document.getElementById('modal-today-score');
        if (!chartDataCache) return;
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
        scoreModal.classList.remove('hidden'); setTimeout(() => scoreModal.classList.remove('opacity-0'), 10);
        const container = document.getElementById('score-chart-container');
        container.innerHTML = '<div class="w-full text-center text-gray-400">Loading...</div>';

        const curr = new Date(); const day = curr.getDay() || 7; if(day !== 1) curr.setHours(-24 * (day - 1));
        const weekDates = []; for (let i = 0; i < 7; i++) { const d = new Date(curr); d.setDate(curr.getDate() + i); weekDates.push(scoreService.getDateStr(d)); }
        const todayStr = scoreService.getDateStr(new Date());

        try {
            const statsRef = scoreService.getUserStatsRef(); let data = {};
            if (statsRef) { const snap = await get(statsRef); if (snap.exists()) data = snap.val(); }
            const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
            chartDataCache = weekDates.map((date, i) => {
                const d = data[date] || {};
                return { dateStr: date, label: dayLabels[i], fc: d.flashcard || 0, qz: d.quiz || 0, st: d.sentences || 0, bl: d.blanks || 0, total: (d.flashcard||0) + (d.quiz||0) + (d.sentences||0) + (d.blanks||0) };
            });
            const maxScore = Math.max(...chartDataCache.map(s => s.total), 50);
            let html = '';
            chartDataCache.forEach((s, idx) => {
                const heightPct = Math.round((s.total / maxScore) * 100);
                const isToday = s.dateStr === todayStr;
                const labelColor = isToday ? 'text-indigo-600 dark:text-indigo-400 font-black' : 'text-gray-400';
                const fcPct = s.total ? (s.fc / s.total) * 100 : 0;
                const qzPct = s.total ? (s.qz / s.total) * 100 : 0;
                const stPct = s.total ? (s.st / s.total) * 100 : 0;
                const blPct = s.total ? (s.bl / s.total) * 100 : 0;

                html += `
                    <div class="chart-bar-container group relative" data-idx="${idx}">
                        <div class="chart-breakdown" id="tooltip-${idx}">
                            <div class="text-fc">${s.fc}</div><div class="text-qz">${s.qz}</div>
                            <div class="text-st">${s.st}</div><div class="text-bl">${s.bl}</div>
                        </div>
                        <div class="chart-bar flex-col-reverse" style="height: ${heightPct}%;">
                            ${s.fc > 0 ? `<div style="height:${fcPct}%;" class="w-full bg-indigo-500"></div>` : ''}
                            ${s.qz > 0 ? `<div style="height:${qzPct}%;" class="w-full bg-purple-500"></div>` : ''}
                            ${s.st > 0 ? `<div style="height:${stPct}%;" class="w-full bg-pink-500"></div>` : ''}
                            ${s.bl > 0 ? `<div style="height:${blPct}%;" class="w-full bg-teal-500"></div>` : ''}
                        </div>
                        <span class="chart-label ${labelColor}">${s.label}</span>
                    </div>
                `;
            });
            container.innerHTML = html;
            updateScoreDisplay();

            container.querySelectorAll('.chart-bar-container').forEach(el => {
                el.addEventListener('click', (e) => {
                    e.stopPropagation(); const idx = el.dataset.idx;
                    container.querySelectorAll('.chart-breakdown').forEach(t => t.classList.remove('visible'));
                    if (activeBarIndex !== idx) { document.getElementById(`tooltip-${idx}`).classList.add('visible'); activeBarIndex = idx; } else { activeBarIndex = -1; }
                });
            });
            scoreModal.addEventListener('click', () => { container.querySelectorAll('.chart-breakdown').forEach(t => t.classList.remove('visible')); activeBarIndex = -1; });
        } catch (e) { container.innerHTML = '<div class="text-red-500 text-sm">Error</div>'; }
    }

    // --- (Rest of standard logic) ---
    const popup = document.getElementById('dictionary-popup');
    const popupContent = document.getElementById('dict-content');
    const popupClose = document.getElementById('dict-close-btn');
    let longPressTimer;
    let startX = 0, startY = 0;

    function showDictionary(text) {
        window.wasLongPress = true;
        const results = dictionaryService.lookupText(text);
        if (results.length > 0 && popup) {
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
            popup.classList.remove('hidden'); setTimeout(() => popup.classList.remove('opacity-0'), 10);
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
    const handleEnd = () => { 
        if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; } 
        if (window.wasLongPress) setTimeout(() => { window.wasLongPress = false; }, 200);
    };
    document.addEventListener('touchstart', handleStart, {passive:true});
    document.addEventListener('touchend', handleEnd);
    document.addEventListener('mousedown', handleStart);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('touchmove', handleMove);

    // --- SETTINGS (Same as before) ---
    const settingsModal = document.getElementById('settings-modal');
    const openSettings = () => { loadSettingsToUI(); settingsModal.classList.remove('hidden'); setTimeout(()=>settingsModal.classList.remove('opacity-0'), 10); };
    const closeSettings = () => { settingsModal.classList.add('opacity-0'); setTimeout(()=>settingsModal.classList.add('hidden'), 200); };
    
    // Bind settings logic
    function loadSettingsToUI() {
        const s = settingsService.get();
        const setVal = (id, val) => { const el = document.getElementById(id); if(el) el.value = val; };
        const setChk = (id, val) => { const el = document.getElementById(id); if(el) el.checked = val; };
        
        setVal('target-select', s.targetLang); 
        setVal('origin-select', s.originLang);
        setChk('toggle-dark', s.darkMode); 
        setChk('toggle-audio', s.autoPlay); 
        setChk('toggle-wait-audio', s.waitForAudio);
        setVal('volume-slider', s.volume !== undefined ? s.volume : 1.0);

        setVal('font-size-select', s.fontSize);
        setVal('font-family-select', s.fontFamily);
        setVal('font-weight-select', s.fontWeight);
        setChk('toggle-vocab', s.showVocab); setChk('toggle-sentence', s.showSentence); setChk('toggle-english', s.showEnglish);
        setChk('toggle-dict-enable', s.dictEnabled); setChk('toggle-dict-click-audio', s.dictClickAudio);
        setChk('toggle-quiz-audio', s.quizAnswerAudio); setChk('toggle-quiz-autoplay-correct', s.quizAutoPlayCorrect); setChk('toggle-quiz-double', s.quizDoubleClick);
        setChk('toggle-sent-audio', s.sentencesWordAudio);
        setChk('toggle-blanks-audio', s.blanksAnswerAudio); setChk('toggle-blanks-double', s.blanksDoubleClick);
    }

    function bindSetting(id, key, callback) {
        const el = document.getElementById(id); if(!el) return;
        el.addEventListener('change', (e) => { settingsService.set(key, e.target.type === 'checkbox' ? e.target.checked : e.target.value); if(callback) callback(); });
    }

    function updateAllApps() { if(!views.flashcard.classList.contains('hidden')) flashcardApp.refresh(); }
    
    bindSetting('target-select', 'targetLang', updateAllApps); bindSetting('origin-select', 'originLang', updateAllApps);
    bindSetting('toggle-dark', 'darkMode', () => document.documentElement.classList.toggle('dark'));
    bindSetting('toggle-audio', 'autoPlay'); bindSetting('toggle-wait-audio', 'waitForAudio');
    bindSetting('volume-slider', 'volume');
    bindSetting('font-size-select', 'fontSize', () => document.querySelectorAll('[data-fit="true"]').forEach(el => textService.fitText(el)));
    bindSetting('font-family-select', 'fontFamily', () => document.querySelectorAll('[data-fit="true"]').forEach(el => textService.fitText(el)));
    bindSetting('font-weight-select', 'fontWeight', () => document.querySelectorAll('[data-fit="true"]').forEach(el => textService.fitText(el)));
    bindSetting('toggle-vocab', 'showVocab', updateAllApps); bindSetting('toggle-sentence', 'showSentence', updateAllApps); bindSetting('toggle-english', 'showEnglish', updateAllApps);
    bindSetting('toggle-dict-enable', 'dictEnabled'); bindSetting('toggle-dict-click-audio', 'dictClickAudio');
    bindSetting('toggle-quiz-audio', 'quizAnswerAudio'); bindSetting('toggle-quiz-autoplay-correct', 'quizAutoPlayCorrect'); bindSetting('toggle-quiz-double', 'quizDoubleClick');
    bindSetting('toggle-sent-audio', 'sentencesWordAudio');
    bindSetting('toggle-blanks-audio', 'blanksAnswerAudio'); bindSetting('toggle-blanks-double', 'blanksDoubleClick');

    async function initApp() {
        try {
            const saved = settingsService.get(); loadSettingsToUI();
            if(saved.darkMode) document.documentElement.classList.add('dark');
            await vocabService.init(); 
            dictionaryService.fetchData();

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

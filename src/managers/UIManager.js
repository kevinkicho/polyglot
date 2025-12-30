import { scoreService } from '../services/scoreService';
import { achievementService } from '../services/achievementService';
import { settingsService } from '../services/settingsService';
import { vocabService } from '../services/vocabService';
import { textService } from '../services/textService';
import { ACHIEVEMENTS } from '../data/achievements';
import { get } from '../services/firebase';
import { authManager } from './AuthManager';

class UIManager {
    constructor() {
        this.chartDataCache = null;
        this.showingWeeklyScore = false;
    }

    init() {
        this.bindScore();
        this.bindAchievements();
        this.bindSettings();
        
        // Fullscreen
        const fsBtn = document.getElementById('fullscreen-btn'); 
        if(fsBtn) fsBtn.addEventListener('click', () => (!document.fullscreenElement) ? document.documentElement.requestFullscreen() : document.exitFullscreen());
    }

    // --- ACHIEVEMENTS ---
    bindAchievements() {
        const achPopup = document.getElementById('achievement-popup');
        window.addEventListener('achievement:unlocked', (e) => {
            const ach = e.detail; 
            const t = document.getElementById('ach-popup-title'); 
            const d = document.getElementById('ach-popup-desc'); 
            const p = document.getElementById('ach-popup-pts');
            if(!t||!d||!p||!achPopup) return;
            
            t.textContent = ach.title; 
            d.textContent = ach.desc; 
            // Ensure we are displaying a number
            p.textContent = '+' + (typeof ach.points === 'number' ? ach.points : 0); 
            achPopup.classList.remove('hidden'); 
            setTimeout(() => achPopup.classList.add('hidden'), 4000);
        });

        const achBtn = document.getElementById('ach-btn');
        if(achBtn) achBtn.addEventListener('click', () => this.showAchievementsModal());
        
        const achClose = document.getElementById('ach-list-close');
        if (achClose) achClose.addEventListener('click', ()=>{ const m = document.getElementById('ach-list-modal'); if(m) { m.classList.add('opacity-0'); setTimeout(()=>m.classList.add('hidden'),200); }});
    }

    async showAchievementsModal() {
        const achModal = document.getElementById('ach-list-modal');
        const achContent = document.getElementById('ach-list-content');
        if(!achModal || !achContent) return;
        achModal.classList.remove('hidden'); setTimeout(()=>achModal.classList.remove('opacity-0'),10);
        achContent.innerHTML = '<div class="text-center p-4 text-white">Loading...</div>';
        
        let unlockedMap = {};
        const currentUser = authManager.getCurrentUser();
        if (currentUser) {
            try { unlockedMap = await achievementService.getUserAchievements(currentUser.uid) || {}; } catch(e){ console.error(e); }
        }
        
        const totalPoints = Object.values(unlockedMap).reduce((sum, item) => { 
            const achDef = ACHIEVEMENTS.find(a => a.title === item.title); 
            return sum + (achDef && typeof achDef.points === 'number' ? achDef.points : 0);
        }, 0);

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
    }

    // --- SCORE CHART ---
    bindScore() {
        scoreService.subscribe((s) => { 
            document.querySelectorAll('.global-score-display').forEach(el => {
                // Double check to prevent "function" strings
                el.textContent = (typeof s === 'number') ? s : 0; 
            }); 
        });
        
        // Bind to score pill (now added to HTML)
        const scorePill = document.getElementById('score-pill');
        if(scorePill) scorePill.addEventListener('click', () => this.showScoreChart());
        
        const scoreClose = document.getElementById('score-close-btn');
        const scoreModal = document.getElementById('score-modal');
        if(scoreClose) scoreClose.addEventListener('click', ()=>{ if(scoreModal) { scoreModal.classList.add('opacity-0'); setTimeout(()=>scoreModal.classList.add('hidden'),200); }});
        
        const scoreTotalToggle = document.getElementById('score-total-toggle');
        if(scoreTotalToggle) scoreTotalToggle.addEventListener('click', ()=>{ this.showingWeeklyScore=!this.showingWeeklyScore; this.updateScoreDisplay(); });
    }

    async showScoreChart() {
        const scoreModal = document.getElementById('score-modal');
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
            const getVal = (obj, key) => (obj && Object.prototype.hasOwnProperty.call(obj, key) && typeof obj[key] === 'number') ? obj[key] : 0;

            this.chartDataCache = weekDates.map((date, i) => {
                const d = data[date] || {};
                const fc = getVal(d, 'flashcard'), qz = getVal(d, 'quiz'), st = getVal(d, 'sentences'), bl = getVal(d, 'blanks');
                const li = getVal(d, 'listening'), ma = getVal(d, 'match'), me = getVal(d, 'memory'), fi = getVal(d, 'finder');
                const co = getVal(d, 'constructor'), wr = getVal(d, 'writing'), tf = getVal(d, 'truefalse'), rv = getVal(d, 'reverse');
                return { dateStr: date, label: dayLabels[i], fc, qz, st, bl, li, ma, me, fi, co, wr, tf, rv, total: fc+qz+st+bl+li+ma+me+fi+co+wr+tf+rv };
            });
            const maxScore = Math.max(...this.chartDataCache.map(s => s.total), 50);
            let html = '';
            this.chartDataCache.forEach((s, idx) => {
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
                this.updateScoreDisplay();
                container.querySelectorAll('.chart-bar-container').forEach(el => { 
                    el.addEventListener('click', (e) => { 
                        e.stopPropagation(); 
                        container.querySelectorAll('.chart-bar').forEach(b => b.classList.remove('ring-2', 'ring-indigo-400')); 
                        el.querySelector('.chart-bar').classList.add('ring-2', 'ring-indigo-400'); 
                        const s=this.chartDataCache[el.dataset.idx]; 
                        if(tooltipArea) {
                            let details = '';
                            if(s.fc) details += `<span class="text-indigo-500">FC:${s.fc}</span> `;
                            if(s.qz) details += `<span class="text-purple-500">QZ:${s.qz}</span> `;
                            if(s.st) details += `<span class="text-pink-500">ST:${s.st}</span> `;
                            if(s.bl) details += `<span class="text-teal-500">BL:${s.bl}</span> `;
                            if(s.li) details += `<span class="text-blue-500">LI:${s.li}</span> `;
                            if(s.ma) details += `<span class="text-yellow-500">MA:${s.ma}</span> `;
                            if(s.me) details += `<span class="text-purple-400">ME:${s.me}</span> `;
                            if(s.fi) details += `<span class="text-rose-500">FI:${s.fi}</span> `;
                            if(s.co) details += `<span class="text-emerald-500">CO:${s.co}</span> `;
                            if(s.wr) details += `<span class="text-cyan-500">WR:${s.wr}</span> `;
                            if(s.tf) details += `<span class="text-orange-500">TF:${s.tf}</span> `;
                            if(s.rv) details += `<span class="text-indigo-400">RV:${s.rv}</span> `;
                            tooltipArea.innerHTML = `<div class="flex flex-col items-center"><span class="text-gray-500 dark:text-gray-300 uppercase font-bold text-xs mb-1">${s.label} - Total: ${s.total}</span><div class="flex gap-2 text-[10px] font-bold flex-wrap justify-center">${details || 'No activity'}</div></div>`; 
                        }
                    }); 
                });
            }
        } catch (e) { console.error("Chart Error", e); if(container) container.innerHTML = `<div class="text-red-500 p-4 text-xs">Error</div>`; }
    }

    updateScoreDisplay() {
        const label = document.getElementById('score-display-label');
        const val = document.getElementById('modal-today-score');
        if (!this.chartDataCache || !label || !val) return;
        if (this.showingWeeklyScore) {
            const total = this.chartDataCache.reduce((sum, d) => sum + d.total, 0);
            label.textContent = "Weekly Total"; val.textContent = total;
        } else {
            const todayStr = scoreService.getDateStr(new Date());
            const todayData = this.chartDataCache.find(d => d.dateStr === todayStr) || { total: 0 };
            label.textContent = "Today's Score"; val.textContent = todayData.total;
        }
    }

    // --- SETTINGS ---
    bindSettings() {
        document.addEventListener('click', (e) => {
            if(e.target.closest('#home-settings-btn')) this.openSettings();
            if(e.target.closest('#modal-done-btn')) this.closeSettings();
        });

        // Toggle Dark Mode
        document.getElementById('toggle-dark').addEventListener('change', () => document.documentElement.classList.toggle('dark')); 
        
        this.bindSetting('toggle-dark', 'darkMode'); 
        this.bindSetting('volume-slider', 'volume'); 
        this.bindSetting('toggle-vocab', 'showVocab'); 
        this.bindSetting('toggle-sentence', 'showSentence'); 
        this.bindSetting('toggle-english', 'showEnglish'); 
        this.bindSetting('toggle-sent-anim', 'sentencesWinAnim');
        this.bindSetting('toggle-quiz-double', 'quizDoubleClick');
        this.bindSetting('toggle-blanks-double', 'blanksDoubleClick');

        // Language Selects
        const onLanguageChange = () => {
            const s = settingsService.get();
            vocabService.remapLanguages(s.targetLang, s.originLang);
        };
        this.bindSetting('target-select', 'targetLang', onLanguageChange); 
        this.bindSetting('origin-select', 'originLang', onLanguageChange);

        // Accordion Logic (Fonts Removed)
        [
            {btn:'display-accordion-btn',c:'display-options',a:'accordion-arrow-1'},
            {btn:'sent-accordion-btn',c:'sent-options',a:'accordion-arrow-sent'},
            {btn:'quiz-accordion-btn',c:'quiz-options',a:'accordion-arrow-3'},
            {btn:'blanks-accordion-btn',c:'blanks-options',a:'accordion-arrow-blanks'}
        ].forEach(o=>{ const b=document.getElementById(o.btn), c=document.getElementById(o.c), a=document.getElementById(o.a); if(b) b.addEventListener('click', ()=>{ c.classList.toggle('open'); a.classList.toggle('rotate'); }); });
    }

    bindSetting(id, key, cb) { 
        const el = document.getElementById(id); 
        if(el) el.addEventListener('change', (e) => { 
            settingsService.set(key, e.target.type==='checkbox'?e.target.checked:e.target.value); 
            if(cb) cb(); 
        }); 
    }

    openSettings() { 
        const settingsModal = document.getElementById('settings-modal');
        if(settingsModal){ 
            this.loadSettingsToUI(); 
            settingsModal.classList.remove('hidden'); 
            setTimeout(()=>settingsModal.classList.remove('opacity-0'), 10); 
        }
    }

    closeSettings() { 
        const settingsModal = document.getElementById('settings-modal');
        if(settingsModal){ 
            settingsModal.classList.add('opacity-0'); 
            setTimeout(()=>settingsModal.classList.add('hidden'), 200); 
        }
    }

    loadSettingsToUI() {
        const s = settingsService.get();
        const setVal = (id, val) => { const el = document.getElementById(id); if(el) el.value = val; };
        const setChk = (id, val) => { const el = document.getElementById(id); if(el) el.checked = val; };
        setVal('target-select', s.targetLang); setVal('origin-select', s.originLang);
        setChk('toggle-dark', s.darkMode); setVal('volume-slider', s.volume !== undefined ? s.volume : 1.0);
        setChk('toggle-vocab', s.showVocab); setChk('toggle-sentence', s.showSentence); setChk('toggle-english', s.showEnglish);
        setChk('toggle-sent-anim', s.sentencesWinAnim !== false);
        setChk('toggle-quiz-double', s.quizDoubleClick);
        setChk('toggle-blanks-double', s.blanksDoubleClick);
    }
}

export const uiManager = new UIManager();

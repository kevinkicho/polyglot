import { scoreService } from '../services/scoreService';
import { get } from '../services/firebase';

class ScoreChartManager {
    constructor() {
        this.chartDataCache = null;
        this.showingWeeklyScore = false;
    }

    init() {
        scoreService.subscribe((s) => {
            document.querySelectorAll('.global-score-display').forEach(el => {
                el.textContent = (typeof s === 'number') ? s : 0;
            });
        });

        const scorePill = document.getElementById('score-pill');
        if (scorePill) scorePill.addEventListener('click', () => this.showScoreChart());

        const scoreClose = document.getElementById('score-close-btn');
        const scoreModal = document.getElementById('score-modal');
        if (scoreClose) scoreClose.addEventListener('click', () => {
            if (scoreModal) { scoreModal.classList.add('opacity-0'); setTimeout(() => scoreModal.classList.add('hidden'), 200); }
        });

        const scoreTotalToggle = document.getElementById('score-total-toggle');
        if (scoreTotalToggle) scoreTotalToggle.addEventListener('click', () => {
            this.showingWeeklyScore = !this.showingWeeklyScore;
            this.updateScoreDisplay();
        });
    }

    async showScoreChart() {
        const scoreModal = document.getElementById('score-modal');
        if (!scoreModal) return;
        scoreModal.classList.remove('hidden'); setTimeout(() => scoreModal.classList.remove('opacity-0'), 10);
        const container = document.getElementById('score-chart-container');
        const tooltipArea = document.getElementById('chart-tooltip-area');
        if (container) container.innerHTML = '<div class="flex justify-center items-center h-full text-gray-500">Loading...</div>';

        const curr = new Date(); const day = curr.getDay() || 7; curr.setDate(curr.getDate() - (day - 1)); curr.setHours(0, 0, 0, 0);
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
                return { dateStr: date, label: dayLabels[i], fc, qz, st, bl, li, ma, me, fi, co, wr, tf, rv, total: fc + qz + st + bl + li + ma + me + fi + co + wr + tf + rv };
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
                        ${s.fc > 0 ? `<div style="height:${(s.fc / t) * 100}%;" class="w-full bg-indigo-500"></div>` : ''}
                        ${s.qz > 0 ? `<div style="height:${(s.qz / t) * 100}%;" class="w-full bg-purple-500"></div>` : ''}
                        ${s.st > 0 ? `<div style="height:${(s.st / t) * 100}%;" class="w-full bg-pink-500"></div>` : ''}
                        ${s.bl > 0 ? `<div style="height:${(s.bl / t) * 100}%;" class="w-full bg-teal-500"></div>` : ''}
                        ${s.li > 0 ? `<div style="height:${(s.li / t) * 100}%;" class="w-full bg-blue-500"></div>` : ''}
                        ${s.ma > 0 ? `<div style="height:${(s.ma / t) * 100}%;" class="w-full bg-yellow-500"></div>` : ''}
                        ${s.me > 0 ? `<div style="height:${(s.me / t) * 100}%;" class="w-full bg-purple-400"></div>` : ''}
                        ${s.fi > 0 ? `<div style="height:${(s.fi / t) * 100}%;" class="w-full bg-rose-500"></div>` : ''}
                        ${s.co > 0 ? `<div style="height:${(s.co / t) * 100}%;" class="w-full bg-emerald-500"></div>` : ''}
                        ${s.wr > 0 ? `<div style="height:${(s.wr / t) * 100}%;" class="w-full bg-cyan-500"></div>` : ''}
                        ${s.tf > 0 ? `<div style="height:${(s.tf / t) * 100}%;" class="w-full bg-orange-500"></div>` : ''}
                        ${s.rv > 0 ? `<div style="height:${(s.rv / t) * 100}%;" class="w-full bg-indigo-400"></div>` : ''}
                    </div>
                    <span class="chart-label ${labelColor}">${s.label.charAt(0)}</span>
                </div>`;
            });
            if (container) {
                container.innerHTML = html;
                this.updateScoreDisplay();
                container.querySelectorAll('.chart-bar-container').forEach(el => {
                    el.addEventListener('click', (e) => {
                        e.stopPropagation();
                        container.querySelectorAll('.chart-bar').forEach(b => b.classList.remove('ring-2', 'ring-indigo-400'));
                        el.querySelector('.chart-bar').classList.add('ring-2', 'ring-indigo-400');
                        const s = this.chartDataCache[el.dataset.idx];
                        if (tooltipArea) {
                            let details = '';
                            if (s.fc) details += `<span class="text-indigo-500">FC:${s.fc}</span> `;
                            if (s.qz) details += `<span class="text-purple-500">QZ:${s.qz}</span> `;
                            if (s.st) details += `<span class="text-pink-500">ST:${s.st}</span> `;
                            if (s.bl) details += `<span class="text-teal-500">BL:${s.bl}</span> `;
                            if (s.li) details += `<span class="text-blue-500">LI:${s.li}</span> `;
                            if (s.ma) details += `<span class="text-yellow-500">MA:${s.ma}</span> `;
                            if (s.me) details += `<span class="text-purple-400">ME:${s.me}</span> `;
                            if (s.fi) details += `<span class="text-rose-500">FI:${s.fi}</span> `;
                            if (s.co) details += `<span class="text-emerald-500">CO:${s.co}</span> `;
                            if (s.wr) details += `<span class="text-cyan-500">WR:${s.wr}</span> `;
                            if (s.tf) details += `<span class="text-orange-500">TF:${s.tf}</span> `;
                            if (s.rv) details += `<span class="text-indigo-400">RV:${s.rv}</span> `;
                            tooltipArea.innerHTML = `<div class="flex flex-col items-center"><span class="text-gray-500 dark:text-gray-300 uppercase font-bold text-xs mb-1">${s.label} - Total: ${s.total}</span><div class="flex gap-2 text-[10px] font-bold flex-wrap justify-center">${details || 'No activity'}</div></div>`;
                        }
                    });
                });
            }
        } catch (e) { console.error("Chart Error", e); if (container) container.innerHTML = `<div class="text-red-500 p-4 text-xs">Error</div>`; }
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
}

export const scoreChartManager = new ScoreChartManager();

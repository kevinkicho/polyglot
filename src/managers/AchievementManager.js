import { achievementService } from '../services/achievementService';
import { ACHIEVEMENTS } from '../data/achievements';
import { authManager } from './AuthManager';

class AchievementManager {
    init() {
        const achPopup = document.getElementById('achievement-popup');
        window.addEventListener('achievement:unlocked', (e) => {
            const ach = e.detail;
            const t = document.getElementById('ach-popup-title');
            const d = document.getElementById('ach-popup-desc');
            const p = document.getElementById('ach-popup-pts');
            if (!t || !d || !p || !achPopup) return;

            t.textContent = ach.title;
            d.textContent = ach.desc;
            p.textContent = '+' + (typeof ach.points === 'number' ? ach.points : 0);
            achPopup.classList.remove('hidden');
            setTimeout(() => achPopup.classList.add('hidden'), 4000);
        });

        const achBtn = document.getElementById('ach-btn');
        if (achBtn) achBtn.addEventListener('click', () => this.showModal());

        const achClose = document.getElementById('ach-list-close');
        if (achClose) achClose.addEventListener('click', () => {
            const m = document.getElementById('ach-list-modal');
            if (m) { m.classList.add('opacity-0'); setTimeout(() => m.classList.add('hidden'), 200); }
        });
    }

    async showModal() {
        const achModal = document.getElementById('ach-list-modal');
        const achContent = document.getElementById('ach-list-content');
        if (!achModal || !achContent) return;
        achModal.classList.remove('hidden'); setTimeout(() => achModal.classList.remove('opacity-0'), 10);
        achContent.innerHTML = '<div class="text-center p-4 text-white">Loading...</div>';

        let unlockedMap = {};
        const currentUser = authManager.getCurrentUser();
        if (currentUser) {
            try { unlockedMap = await achievementService.getUserAchievements(currentUser.uid) || {}; } catch (e) { console.error(e); }
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
        const sorted = [...ACHIEVEMENTS].sort((a, b) => { const aU = !!unlockedMap[a.id], bU = !!unlockedMap[b.id]; if (aU && !bU) return -1; if (!aU && bU) return 1; return b.points - a.points; });
        sorted.forEach(ach => {
            const unlocked = !!unlockedMap[ach.id];
            const bg = unlocked ? 'bg-white/10 border-indigo-500/30' : 'bg-black/20 border-white/5 opacity-50 grayscale';
            const textCol = unlocked ? 'text-gray-800 dark:text-white' : 'text-gray-500';
            const ic = unlocked ? '🏆' : '🔒';
            html += `<div class="flex items-center gap-4 p-4 rounded-2xl border ${bg} backdrop-blur-sm transition-all hover:bg-white/15"><div class="text-3xl">${ic}</div><div class="flex-1"><h4 class="font-bold text-sm ${textCol}">${ach.title}</h4><p class="text-[10px] text-gray-400 leading-tight mt-1">${ach.desc}</p></div><div class="text-xs font-black text-indigo-400 font-mono">+${ach.points}</div></div>`;
        });
        achContent.innerHTML = html;
    }
}

export const achievementManager = new AchievementManager();

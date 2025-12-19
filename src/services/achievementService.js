import { db, ref, get, update, child } from './firebase';
import { ACHIEVEMENTS } from '../data/achievements';

class AchievementService {
    constructor() {
        this.unlockedIds = new Set();
        this.userId = null;
    }

    async checkLoginAchievements(userId) {
        this.userId = userId;
        const statsRef = ref(db, `users/${userId}/stats`);
        const snapshot = await get(statsRef);
        const data = snapshot.val() || {};
        
        // Count unique dates for total login
        const dates = Object.keys(data).filter(k => k.match(/^\d{2}-\d{2}-\d{4}$/));
        this.evaluate(userId, 'login_total', dates.length);

        // Check streaks (Simplified: just counts total days for now, complex streak logic requires sorting dates)
        // For a robust app, you'd parse dates and check continuity.
        // Falling back to total days as proxy for now or using a stored streak counter if added later.
        this.evaluate(userId, 'login_streak', dates.length); 
    }

    async checkScoreAchievements(userId, gameType, pointsAdded, currentDailyScore) {
        this.userId = userId;
        const totalRef = child(ref(db, `users/${userId}/stats`), 'total');
        const snap = await get(totalRef);
        const totals = snap.val() || {};
        
        // Total Score
        this.evaluate(userId, 'score_total', totals.score || 0);
        
        // Game specific totals
        const wins = totals[`${gameType}_wins`] || 0;
        this.evaluate(userId, `${gameType}_total`, wins); // For Flashcards (flips)
        this.evaluate(userId, `${gameType}_wins`, wins);  // For Games (wins)

        // Streaks (In-session memory or DB persisted)
        // We rely on scoreService passing us streak data or fetching from DB
        const streakRef = child(ref(db, `users/${userId}/stats`), 'streaks');
        const streakSnap = await get(streakRef);
        const streaks = streakSnap.val() || {};
        this.evaluate(userId, `${gameType}_streak`, streaks[gameType] || 0);

        // Daily Volume
        this.evaluate(userId, 'daily_score', currentDailyScore);

        // Time Based
        const h = new Date().getHours();
        if (h < 6) this.evaluate(userId, 'time_early', 1);
        if (h >= 12 && h < 13) this.evaluate(userId, 'time_lunch', 1);
        if (h >= 23) this.evaluate(userId, 'time_late', 1);
    }

    async evaluate(userId, type, val) {
        // Optimization: Cache unlocked IDs locally to avoid DB reads
        if (this.unlockedIds.size === 0) {
            const uSnap = await get(ref(db, `users/${userId}/achievements`));
            if (uSnap.exists()) {
                Object.keys(uSnap.val()).forEach(k => this.unlockedIds.add(k));
            }
        }

        const candidates = ACHIEVEMENTS.filter(a => a.type === type && !this.unlockedIds.has(a.id));

        candidates.forEach(ach => {
            if (val >= ach.target) {
                this.unlock(userId, ach);
            }
        });
    }

    unlock(userId, achievement) {
        if (this.unlockedIds.has(achievement.id)) return;
        this.unlockedIds.add(achievement.id);

        const updates = {};
        updates[`users/${userId}/achievements/${achievement.id}`] = {
            id: achievement.id,
            title: achievement.title,
            desc: achievement.desc,
            points: achievement.points,
            timestamp: Date.now()
        };

        update(ref(db), updates).then(() => {
            this.showPopup(achievement);
        });
    }

    showPopup(ach) {
        const event = new CustomEvent('achievement:unlocked', { detail: ach });
        window.dispatchEvent(event);
    }
    
    async getUserAchievements(userId) {
        const snap = await get(ref(db, `users/${userId}/achievements`));
        return snap.val() || {};
    }
}

export const achievementService = new AchievementService();

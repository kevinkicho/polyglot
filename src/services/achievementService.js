import { db, ref, get, child, update, increment } from './firebase';
import { ACHIEVEMENTS } from '../data/achievements';

class AchievementService {
    async getUserAchievements(uid) {
        if (!uid) return {};
        try {
            const dbRef = ref(db);
            const snapshot = await get(child(dbRef, `users/${uid}/achievements`));
            return snapshot.exists() ? snapshot.val() : {};
        } catch (error) {
            console.error("Error fetching achievements:", error);
            return {};
        }
    }

    // Called when user logs in
    async checkLoginAchievements(uid) {
        this.unlock(uid, 'login_1');
    }

    // Called by scoreService whenever points are added
    async checkScoreAchievements(uid, gameKey, pointsAdded, newTodayScore) {
        if (!uid) return;

        // Fetch current stats from DB to be accurate
        const statsRef = ref(db);
        const snapshot = await get(child(statsRef, `users/${uid}/stats`));
        if (!snapshot.exists()) return;
        const stats = snapshot.val();

        const totalScore = (stats.total && stats.total.score) || 0;
        const gameWins = (stats.total && stats.total[`${gameKey}_wins`]) || 0;
        const gameStreak = (stats.streaks && stats.streaks[gameKey]) || 0;
        const currentHour = new Date().getHours();

        // Filter achievements that match the current context
        const potentialUnlocks = ACHIEVEMENTS.filter(ach => {
            // 1. Check Game Specific (Streak & Volume)
            if (ach.gameKey === gameKey) {
                if (ach.category === 'streak' && gameStreak >= ach.target) return true;
                if (ach.category === 'volume' && gameWins >= ach.target) return true;
            }
            
            // 2. Check Score Specific
            if (ach.category === 'score_total' && totalScore >= ach.target) return true;
            if (ach.category === 'score_daily' && newTodayScore >= ach.target) return true;

            // 3. Check Time Specific
            if (ach.category === 'time') {
                if (ach.id === 'time_early' && currentHour < ach.target) return true;
                if (ach.id === 'time_late' && currentHour >= ach.target) return true;
            }

            return false;
        });

        // Try to unlock them
        for (const ach of potentialUnlocks) {
            await this.unlock(uid, ach.id, ach);
        }
    }

    async unlock(uid, achId, achData = null) {
        const achRef = ref(db, `users/${uid}/achievements/${achId}`);
        const snapshot = await get(achRef);

        if (!snapshot.exists()) {
            // It's new! Unlock it.
            const data = achData || ACHIEVEMENTS.find(a => a.id === achId);
            if (!data) return;

            const updates = {};
            updates[`users/${uid}/achievements/${achId}`] = {
                unlockedAt: Date.now(),
                title: data.title
            };
            // Add points for the achievement itself
            updates[`users/${uid}/stats/total/score`] = increment(data.points);
            
            await update(ref(db), updates);

            // Trigger the UI popup
            window.dispatchEvent(new CustomEvent('achievement:unlocked', { detail: data }));
            
            // Play a sound if available
            const audio = new Audio('/sounds/achievement.mp3'); // Optional
            audio.play().catch(() => {}); 
        }
    }
}

export const achievementService = new AchievementService();

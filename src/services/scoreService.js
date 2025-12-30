import { db, auth, ref, update, increment, onValue, get } from './firebase';
import { achievementService } from './achievementService';
import { comboManager } from '../managers/ComboManager'; // Ensure this import exists

class ScoreService {
    constructor() {
        this.todayScore = 0;
        this.subscribers = [];
        this.userId = null;
        this.isInitialized = false;
    }

    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;

        auth.onAuthStateChanged(user => {
            if (user) {
                this.userId = user.uid;
                this.listenToToday();
                achievementService.checkLoginAchievements(user.uid);
            } else {
                this.userId = null;
                this.todayScore = 0;
                this.notify();
            }
        });
    }

    getDateStr(dateObj = new Date()) {
        const m = String(dateObj.getMonth() + 1).padStart(2, '0');
        const d = String(dateObj.getDate()).padStart(2, '0');
        const y = dateObj.getFullYear();
        return `${m}-${d}-${y}`;
    }

    listenToToday() {
        if (!this.userId) return;
        const dateStr = this.getDateStr();
        const todayRef = ref(db, `users/${this.userId}/stats/${dateStr}`);
        
        onValue(todayRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const games = ['flashcard', 'quiz', 'sentences', 'blanks', 'listening', 'match', 'memory', 'finder', 'constructor', 'writing', 'truefalse', 'reverse', 'speech', 'decoder', 'gravity'];
                this.todayScore = games.reduce((sum, g) => {
                    if (Object.prototype.hasOwnProperty.call(data, g) && typeof data[g] === 'number') {
                        return sum + data[g];
                    }
                    return sum;
                }, 0);
            } else {
                this.todayScore = 0;
            }
            this.notify();
        });
    }

    async getSnapshot() {
        if (!this.userId) return null;
        try {
            const snap = await get(ref(db, `users/${this.userId}/stats`));
            return snap.exists() ? snap.val() : null;
        } catch (e) {
            console.error("Snapshot failed", e);
            return null;
        }
    }

    async migrateStats(oldData) {
        if (!this.userId || !oldData) return;
        const updates = {};
        Object.keys(oldData).forEach(dateKey => {
            const dateObj = oldData[dateKey];
            if (typeof dateObj === 'object') {
                Object.keys(dateObj).forEach(metric => {
                    const val = dateObj[metric];
                    if (typeof val === 'number') {
                        updates[`users/${this.userId}/stats/${dateKey}/${metric}`] = increment(val);
                    }
                });
            }
        });
        if (Object.keys(updates).length > 0) {
            try {
                await update(ref(db), updates);
            } catch (e) { console.error("Migration failed", e); }
        }
    }

    addScore(gameType, points) {
        if (!this.userId) return;
        const dateStr = this.getDateStr();
        
        // CRITICAL: This line triggers the visual combo
        if (points > 0) comboManager.increment();

        const updates = {};
        updates[`users/${this.userId}/stats/${dateStr}/${gameType}`] = increment(points);
        updates[`users/${this.userId}/stats/total/${gameType}`] = increment(points);
        updates[`users/${this.userId}/stats/total/score`] = increment(points);
        
        if (points > 0) {
             updates[`users/${this.userId}/stats/total/${gameType}_wins`] = increment(1);
             updates[`users/${this.userId}/stats/streaks/${gameType}`] = increment(1);
        }

        update(ref(db), updates)
            .then(() => {
                achievementService.checkScoreAchievements(this.userId, gameType, points, this.todayScore + points);
            })
            .catch(err => console.error("Score update failed", err));
    }

    subscribe(cb) {
        this.subscribers.push(cb);
        cb(this.todayScore);
    }

    notify() {
        this.subscribers.forEach(cb => cb(this.todayScore));
        const displays = document.querySelectorAll('.global-score-display');
        if (displays.length) {
            displays.forEach(el => el.textContent = this.todayScore);
        }
    }

    getUserStatsRef() {
        if (!this.userId) return null;
        return ref(db, `users/${this.userId}/stats`);
    }
}

export const scoreService = new ScoreService();

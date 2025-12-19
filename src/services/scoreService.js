import { db, auth, ref, update, increment, onValue } from './firebase';
import { achievementService } from './achievementService';

class ScoreService {
    constructor() {
        this.todayScore = 0;
        this.subscribers = [];
        this.userId = null;
        
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
                this.todayScore = (data.flashcard || 0) + (data.quiz || 0) + (data.sentences || 0) + (data.blanks || 0);
            } else {
                this.todayScore = 0;
            }
            this.notify();
        });
    }

    addScore(gameType, points) {
        if (!this.userId) return;
        const dateStr = this.getDateStr();
        
        const updates = {};
        // Daily
        updates[`users/${this.userId}/stats/${dateStr}/${gameType}`] = increment(points);
        // Totals
        updates[`users/${this.userId}/stats/total/${gameType}`] = increment(points);
        updates[`users/${this.userId}/stats/total/score`] = increment(points);
        
        // Wins/Streaks
        if (points > 0) {
             updates[`users/${this.userId}/stats/total/${gameType}_wins`] = increment(1);
             updates[`users/${this.userId}/stats/streaks/${gameType}`] = increment(1);
        } else {
             // Reset streak on loss if needed (optional logic)
             // updates[`users/${this.userId}/stats/streaks/${gameType}`] = 0; 
        }

        update(ref(db), updates)
            .then(() => {
                // Pass current score + points for evaluation
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
        document.querySelectorAll('.global-score-display').forEach(el => {
            el.textContent = this.todayScore;
        });
    }

    getUserStatsRef() {
        if (!this.userId) return null;
        return ref(db, `users/${this.userId}/stats`);
    }
}

export const scoreService = new ScoreService();

import { db, auth, ref, update, increment, onValue } from './firebase';

class ScoreService {
    constructor() {
        this.todayScore = 0;
        this.subscribers = [];
        this.userId = null;
        
        // Listen for Auth changes to attach score listener
        auth.onAuthStateChanged(user => {
            if (user) {
                this.userId = user.uid;
                this.listenToToday();
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
        return `${m}-${d}-${y}`; // Format: MM-DD-YYYY matches typical string keys
    }

    listenToToday() {
        if (!this.userId) return;
        const dateStr = this.getDateStr();
        // Path: users/{uid}/stats/{date}
        const todayRef = ref(db, `users/${this.userId}/stats/${dateStr}`);
        
        onValue(todayRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                // Sum all game modes
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
        // Atomic increment in DB
        updates[`users/${this.userId}/stats/${dateStr}/${gameType}`] = increment(points);
        
        update(ref(db), updates).catch(err => console.error("Score update failed", err));
    }

    subscribe(cb) {
        this.subscribers.push(cb);
        cb(this.todayScore); // Immediate callback
    }

    notify() {
        this.subscribers.forEach(cb => cb(this.todayScore));
        // Update DOM directly if element exists (optimization for multiple pills)
        document.querySelectorAll('.global-score-display').forEach(el => {
            el.textContent = this.todayScore;
        });
    }

    // Helper to get raw DB ref for weekly history
    getUserStatsRef() {
        if (!this.userId) return null;
        return ref(db, `users/${this.userId}/stats`);
    }
}

export const scoreService = new ScoreService();

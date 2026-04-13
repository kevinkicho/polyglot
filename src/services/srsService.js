import { db, ref, get, update, auth } from './firebase';
import { offlineQueue } from './offlineQueue';

/**
 * Lightweight Leitner-box spaced repetition.
 *
 * Each vocab item gets a "box" level (1-5):
 *   Box 1: new / wrong — highest review priority
 *   Box 2-4: intermediate
 *   Box 5: mastered — lowest priority
 *
 * On correct answer: item moves up one box (max 5).
 * On wrong answer: item drops back to box 1.
 *
 * When picking a random item, lower boxes are weighted more heavily
 * so weak words appear more often.
 *
 * Data stored at: users/{uid}/srs/{vocabId} = { box, lastReview }
 */
class SrsService {
    constructor() {
        this.data = {};
        this.isLoaded = false;
    }

    async load() {
        const uid = auth.currentUser?.uid;
        if (!uid || this.isLoaded) return;

        try {
            const snap = await get(ref(db, `users/${uid}/srs`));
            this.data = snap.exists() ? snap.val() : {};
            this.isLoaded = true;
        } catch (e) {
            console.error('[SRS] Load failed:', e);
            this.data = {};
        }
    }

    getBox(vocabId) {
        return this.data[vocabId]?.box || 1;
    }

    async recordAnswer(vocabId, correct) {
        const uid = auth.currentUser?.uid;
        if (!uid) return;

        const current = this.getBox(vocabId);
        const newBox = correct ? Math.min(current + 1, 5) : 1;

        this.data[vocabId] = { box: newBox, lastReview: Date.now() };

        const updates = { [`users/${uid}/srs/${vocabId}`]: this.data[vocabId] };
        try {
            await update(ref(db), updates);
        } catch (e) {
            console.error('[SRS] Save failed, queuing offline:', e);
            offlineQueue.enqueue(updates);
        }
    }

    /**
     * Pick a weighted-random item from a vocab list.
     * Items in lower boxes get higher weight, and items reviewed
     * longer ago get a time-decay bonus so stale items surface sooner.
     *
     * Box weights: [1]=8, [2]=4, [3]=2, [4]=1, [5]=0.5
     * Time bonus: multiplier from 1.0 (just reviewed) up to 2.0 (24h+ ago)
     *
     * @param {import('./vocabService').VocabItem[]} list
     * @returns {import('./vocabService').VocabItem|null}
     */
    weightedRandom(list) {
        if (list.length === 0) return null;
        if (list.length === 1) return list[0];

        const boxWeights = { 1: 8, 2: 4, 3: 2, 4: 1, 5: 0.5 };
        const now = Date.now();
        const DAY_MS = 86400000;

        const weights = list.map(item => {
            const box = this.getBox(item.id);
            const baseWeight = boxWeights[box] || 1;

            // Time decay: items not reviewed recently get a bonus
            const lastReview = this.data[item.id]?.lastReview || 0;
            const hoursSince = lastReview ? (now - lastReview) / 3600000 : 24;
            // Clamp to 1.0 - 2.0 range: linear ramp over 24 hours
            const timeMultiplier = 1 + Math.min(hoursSince / 24, 1);

            return baseWeight * timeMultiplier;
        });

        const totalWeight = weights.reduce((s, w) => s + w, 0);
        let r = Math.random() * totalWeight;

        for (let i = 0; i < list.length; i++) {
            r -= weights[i];
            if (r <= 0) return list[i];
        }

        return list[list.length - 1];
    }

    /**
     * Get items due for review based on box-dependent intervals.
     * Box 1: always due, Box 2: 4h, Box 3: 1d, Box 4: 3d, Box 5: 7d
     * @param {import('./vocabService').VocabItem[]} list
     * @returns {{ due: import('./vocabService').VocabItem[], counts: {new: number, learning: number, mastered: number} }}
     */
    getDueItems(list) {
        const now = Date.now();
        const intervals = { 1: 0, 2: 4 * 3600000, 3: 86400000, 4: 3 * 86400000, 5: 7 * 86400000 };
        let newCount = 0, learningCount = 0, masteredCount = 0;
        const due = [];

        for (const item of list) {
            const box = this.getBox(item.id);
            const lastReview = this.data[item.id]?.lastReview || 0;
            const elapsed = now - lastReview;

            if (box <= 1) newCount++;
            else if (box <= 3) learningCount++;
            else masteredCount++;

            if (!lastReview || elapsed >= intervals[box]) {
                due.push(item);
            }
        }

        return { due, counts: { new: newCount, learning: learningCount, mastered: masteredCount } };
    }
}

export const srsService = new SrsService();

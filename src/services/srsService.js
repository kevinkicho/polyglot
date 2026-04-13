import { db, ref, get, update, auth } from './firebase';

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

        try {
            await update(ref(db), {
                [`users/${uid}/srs/${vocabId}`]: this.data[vocabId]
            });
        } catch (e) {
            console.error('[SRS] Save failed:', e);
        }
    }

    /**
     * Pick a weighted-random item from a vocab list.
     * Items in lower boxes get higher weight.
     * Box weights: [1]=8, [2]=4, [3]=2, [4]=1, [5]=0.5
     * @param {import('./vocabService').VocabItem[]} list
     * @returns {import('./vocabService').VocabItem|null}
     */
    weightedRandom(list) {
        if (list.length === 0) return null;
        if (list.length === 1) return list[0];

        const boxWeights = { 1: 8, 2: 4, 3: 2, 4: 1, 5: 0.5 };

        const weights = list.map(item => {
            const box = this.getBox(item.id);
            return boxWeights[box] || 1;
        });

        const totalWeight = weights.reduce((s, w) => s + w, 0);
        let r = Math.random() * totalWeight;

        for (let i = 0; i < list.length; i++) {
            r -= weights[i];
            if (r <= 0) return list[i];
        }

        return list[list.length - 1];
    }
}

export const srsService = new SrsService();

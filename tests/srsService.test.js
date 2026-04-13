import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Firebase
vi.mock('../src/services/firebase', () => ({
    db: {},
    ref: vi.fn(),
    get: vi.fn(() => Promise.resolve({ exists: () => false, val: () => null })),
    update: vi.fn(() => Promise.resolve()),
    auth: { currentUser: { uid: 'test-user-123' } },
}));

describe('SrsService', () => {
    let srsService;

    beforeEach(async () => {
        vi.resetModules();
        const mod = await import('../src/services/srsService.js');
        srsService = mod.srsService;
        // Reset internal state
        srsService.data = {};
        srsService.isLoaded = true;
    });

    it('returns box 1 for unknown items', () => {
        expect(srsService.getBox(999)).toBe(1);
    });

    it('records correct answer — box goes up', async () => {
        srsService.data[42] = { box: 2, lastReview: 0 };
        await srsService.recordAnswer(42, true);
        expect(srsService.data[42].box).toBe(3);
    });

    it('records wrong answer — box drops to 1', async () => {
        srsService.data[42] = { box: 4, lastReview: 0 };
        await srsService.recordAnswer(42, false);
        expect(srsService.data[42].box).toBe(1);
    });

    it('caps box at 5', async () => {
        srsService.data[42] = { box: 5, lastReview: 0 };
        await srsService.recordAnswer(42, true);
        expect(srsService.data[42].box).toBe(5);
    });

    it('weightedRandom returns an item from the list', () => {
        const list = [
            { id: 1, front: { main: 'a' } },
            { id: 2, front: { main: 'b' } },
            { id: 3, front: { main: 'c' } },
        ];
        const result = srsService.weightedRandom(list);
        expect(list).toContain(result);
    });

    it('weightedRandom favors lower boxes', () => {
        // Item 1 = box 1 (weight 8), Item 2 = box 5 (weight 0.5)
        srsService.data[1] = { box: 1, lastReview: 0 };
        srsService.data[2] = { box: 5, lastReview: 0 };

        const list = [
            { id: 1, front: { main: 'weak' } },
            { id: 2, front: { main: 'strong' } },
        ];

        const counts = { 1: 0, 2: 0 };
        for (let i = 0; i < 1000; i++) {
            counts[srsService.weightedRandom(list).id]++;
        }

        // Item 1 should appear roughly 16x more (8 / 0.5)
        expect(counts[1]).toBeGreaterThan(counts[2] * 5);
    });

    it('weightedRandom handles single item list', () => {
        const list = [{ id: 1, front: { main: 'only' } }];
        expect(srsService.weightedRandom(list)).toBe(list[0]);
    });

    it('weightedRandom handles empty list', () => {
        expect(srsService.weightedRandom([])).toBeNull();
    });
});

import { describe, it, expect } from 'vitest';
import { GAME_TYPES } from '../src/config/gameTypes';

describe('GAME_TYPES', () => {
    it('contains exactly 15 game types', () => {
        expect(GAME_TYPES).toHaveLength(15);
    });

    it('contains all expected game types', () => {
        const expected = [
            'flashcard', 'quiz', 'sentences', 'blanks', 'listening',
            'match', 'memory', 'finder', 'constructor', 'writing',
            'truefalse', 'reverse', 'speech', 'decoder', 'gravity'
        ];
        expect(GAME_TYPES).toEqual(expected);
    });

    it('has no duplicates', () => {
        const unique = new Set(GAME_TYPES);
        expect(unique.size).toBe(GAME_TYPES.length);
    });
});
